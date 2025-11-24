/**
 * Uplink - Handles interactions with Onchain Aggregator for x402 payments
 * 
 * Supports:
 * - Base → Base
 * - Solana → Solana
 * - Any network where sourceNetwork === destinationNetwork
 * 
 * Cross-chain payments (Base → Solana, etc.) will be integrated shortly.
 */

import { EVMSigner, SolanaSigner } from './signer.js';
import {
  UplinkConfig,
  PaymentParams,
  PaymentResult,
  PreparePaymentResponse,
  CalculatedFees,
} from './types.js';
import {
  UplinkError,
  AuthenticationError,
  PaymentError,
  NetworkError,
  ValidationError,
} from './errors.js';

export class Uplink {
  private config: Required<UplinkConfig>;
  private evmSigner?: EVMSigner;
  private solanaSigner?: SolanaSigner;
  public address?: string;

  constructor(config: UplinkConfig) {
    // Validate API key
    if (!config.apiKey) {
      throw new ValidationError('API key is required');
    }

    // CRITICAL: Validate fee acceptance flags
    if (!config.createAtaFeeAcceptance) {
      throw new ValidationError(
        '❌ CREATE_ATA_FEE_ACCEPTANCE must be set to true\n\n' +
        'Solana payments may require ATA creation (Associated Token Account) which adds ~$0.40 fee.\n' +
        'The backend pays this upfront and recovers it from your payment.\n\n' +
        'Example:\n' +
        '  Payment: $1.00\n' +
        '  Processing fee: $0.01 (0.1%)\n' +
        '  ATA creation: $0.40 (if recipient needs new USDC account)\n' +
        '  Recipient receives: $0.59\n\n' +
        'To acknowledge and accept this fee structure:\n' +
        '  new Uplink({\n' +
        '    ...\n' +
        '    createAtaFeeAcceptance: true  // ← Required\n' +
        '  })\n\n' +
        'Documentation: https://docs.onchain.fi/fees/ata-creation'
      );
    }

    if (!config.minimumCrosschainFeeAcceptance) {
      throw new ValidationError(
        '❌ MINIMUM_CROSSCHAIN_FEE_ACCEPTANCE must be set to true\n\n' +
        'Cross-chain payments (Base ↔ Solana) have a minimum fee of $0.01 USD.\n' +
        'This ensures bridge operations are economically viable.\n\n' +
        'Example:\n' +
        '  Small payment: $0.05\n' +
        '  Processing fee: $0.01 (minimum enforced, 20% of amount)\n' +
        '  Recipient receives: $0.04\n\n' +
        'To acknowledge and accept this minimum fee:\n' +
        '  new Uplink({\n' +
        '    ...\n' +
        '    minimumCrosschainFeeAcceptance: true  // ← Required\n' +
        '  })\n\n' +
        'Documentation: https://docs.onchain.fi/fees/crosschain'
      );
    }

    // Security warning for hardcoded private keys
    if (config.privateKey && !config.privateKey.startsWith('env:')) {
      if (config.privateKey.startsWith('0x') || 
          (config.privateKey.length === 64 && /^[0-9a-fA-F]+$/.test(config.privateKey))) {
        console.warn(
          '⚠️  WARNING: Private key appears to be hardcoded. Use environment variables!\n' +
          '   Example: new Uplink({ privateKey: process.env.UPLINK_PRIVATE_KEY })'
        );
      }
    }

    // Set defaults
    this.config = {
      apiKey: config.apiKey,
      privateKey: config.privateKey ?? '',
      network: config.network ?? 'base',
      apiUrl: config.apiUrl ?? 'https://api.onchain.fi',
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1.0,
      timeout: config.timeout ?? 120.0,
      solanaRpcUrl: config.solanaRpcUrl ?? 'https://api.mainnet-beta.solana.com',
      createAtaFeeAcceptance: config.createAtaFeeAcceptance ?? false,
      minimumCrosschainFeeAcceptance: config.minimumCrosschainFeeAcceptance ?? false,
    };

    // Initialize signers if private key provided
    if (config.privateKey) {
      if (this.config.network.startsWith('solana')) {
        this.solanaSigner = new SolanaSigner(config.privateKey, this.config.solanaRpcUrl);
        this.address = this.solanaSigner.publicKey.toBase58();
      } else {
        this.evmSigner = new EVMSigner(config.privateKey, this.config.network);
        this.address = this.evmSigner.address;
      }
    }
  }

  /**
   * Prepare payment by fetching fee config, checking ATA, and getting signing address
   * @private
   */
  private async preparePayment(params: PaymentParams): Promise<PreparePaymentResponse> {
    const {
      to,
      amount,
      sourceNetwork,
      destinationNetwork,
    } = params;

    // Parse and normalize amount
    const normalizedAmount = this._parseAmount(amount);

    // Determine networks
    const srcNetwork = sourceNetwork || this.config.network;
    const dstNetwork = destinationNetwork || this._detectNetworkFromAddress(to);

    console.log(`[Uplink] 🔍 Preparing payment: ${srcNetwork} → ${dstNetwork}, ${normalizedAmount} USDC`);

    try {
      const response = await fetch(`${this.config.apiUrl}/v1/uplink/prepare-payment`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'uplink-js/2.0.0',
        },
        body: JSON.stringify({
          to,
          amount: normalizedAmount,
          sourceNetwork: srcNetwork,
          destinationNetwork: dstNetwork,
          token: 'USDC',
        }),
        signal: AbortSignal.timeout(this.config.timeout * 1000),
      });

      if (response.status === 401) {
        throw new AuthenticationError('Invalid API key');
      }

      const data = await response.json() as any;

      if (response.status !== 200 || data.status !== 'success') {
        const reason = data.error?.message || data.message || 'Unknown error';
        throw new PaymentError(`Payment preparation failed: ${reason}`, reason);
      }

      return data.data;
    } catch (error) {
      if (error instanceof UplinkError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${this.config.timeout}s`);
      }
      throw new NetworkError(`Network request failed: ${error}`);
    }
  }

  /**
   * Calculate fees locally based on server-provided config
   * Matches FeeCalculationService logic on backend
   * @private
   */
  private calculateFees(prepareData: PreparePaymentResponse, grossAmount: string): CalculatedFees {
    const { feeConfig, ataCheck } = prepareData;
    const grossAmountNum = parseFloat(grossAmount);

    if (isNaN(grossAmountNum) || grossAmountNum <= 0) {
      throw new ValidationError('Invalid amount for fee calculation');
    }

    // Determine fee percentage
    let feePercent: number;
    if (prepareData.isCrossChain) {
      feePercent = feeConfig.crosschainFeePercent;
    } else {
      // Same-chain uses tier-based fee (all currently 0.1%)
      feePercent = feeConfig.samechainFeePercent;
    }

    // Calculate percentage-based fee
    let processingFee = (grossAmountNum * feePercent) / 100;
    let minimumFeeApplied = false;

    // Apply minimum fee for cross-chain payments
    if (prepareData.isCrossChain && feeConfig.minimumCrosschainFee > 0) {
      if (processingFee < feeConfig.minimumCrosschainFee) {
        processingFee = feeConfig.minimumCrosschainFee;
        minimumFeeApplied = true;
      }
    }

    // Calculate ATA fee if needed
    const ataFee = ataCheck.needsCreation ? feeConfig.ataCreationFee : 0;

    // Calculate totals
    const totalFees = processingFee + ataFee;
    const netAmount = Math.max(0, grossAmountNum - totalFees);

    return {
      grossAmount: grossAmountNum.toFixed(6),
      processingFee: processingFee.toFixed(6),
      processingFeePercent: feePercent,
      ataFee: ataFee.toFixed(6),
      totalFees: totalFees.toFixed(6),
      netAmount: netAmount.toFixed(6),
      minimumFeeApplied,
    };
  }

  /**
   * Make a same-chain or cross-chain payment (combined verify + settle)
   * 
   * New flow with fee validation:
   * 1. Prepare payment (get fee config, check ATA, get signing address)
   * 2. Calculate fees locally
   * 3. Validate amount >= fees
   * 4. Sign transaction
   * 5. Execute payment with fee validation
   */
  async pay(params: PaymentParams): Promise<string> {
    const {
      to,
      amount,
      paymentHeader,
      priority = 'balanced',
      idempotencyKey,
      metadata,
    } = params;

    // Validate: need either payment_header OR private_key
    if (!paymentHeader && !this.config.privateKey) {
      throw new ValidationError(
        'Must provide paymentHeader OR configure privateKey. ' +
        'Mode A: new Uplink({ privateKey: ... }) | ' +
        'Mode B: uplink.pay({ paymentHeader: ... })'
      );
    }

    // Step 1: Prepare payment
    console.log(`\n[Uplink] 🚀 Starting payment to ${to}, amount: ${amount}`);
    const prepareData = await this.preparePayment(params);

    // Step 2: Calculate fees locally (validates against server calculation)
    const calculatedFees = this.calculateFees(prepareData, amount);

    // Step 3: Validate amount is sufficient
    const grossAmountNum = parseFloat(calculatedFees.grossAmount);
    const totalFeesNum = parseFloat(calculatedFees.totalFees);

    if (grossAmountNum < totalFeesNum) {
      throw new ValidationError(
        `Insufficient payment amount\n\n` +
        `Payment: $${grossAmountNum.toFixed(2)}\n` +
        `Required fees: $${totalFeesNum.toFixed(2)}\n` +
        `  - Processing: $${calculatedFees.processingFee}\n` +
        (parseFloat(calculatedFees.ataFee) > 0 
          ? `  - ATA Creation: $${calculatedFees.ataFee}\n`
          : '') +
        `Recipient would receive: $${calculatedFees.netAmount} (negative!)\n\n` +
        `Minimum payment: $${(totalFeesNum + 0.01).toFixed(2)}`
      );
    }

    // Log fee breakdown
    console.log(`[Uplink] 💰 Fee Breakdown:`);
    console.log(`   Gross Amount: $${calculatedFees.grossAmount}`);
    console.log(`   Processing Fee: $${calculatedFees.processingFee} (${calculatedFees.processingFeePercent}%)`);
    if (parseFloat(calculatedFees.ataFee) > 0) {
      console.log(`   ATA Creation: $${calculatedFees.ataFee}`);
    }
    if (calculatedFees.minimumFeeApplied) {
      console.log(`   ⚠️  Minimum cross-chain fee applied`);
    }
    console.log(`   Total Fees: $${calculatedFees.totalFees}`);
    console.log(`   Net to Recipient: $${calculatedFees.netAmount}`);

    // Step 4: Sign transaction (if Mode A)
    let finalPaymentHeader: string;
    
    if (paymentHeader) {
      // Mode B: Use provided payment header
      finalPaymentHeader = paymentHeader;
      console.log(`[Uplink] ✍️  Using pre-signed payment header`);
    } else {
      // Mode A: SDK creates payment header
      console.log(`[Uplink] ✍️  Signing transaction to ${prepareData.signToAddress}`);
      console.log(`[Uplink] 📝 ${prepareData.signToDescription}`);
      
      const priority = params.priority || 'balanced';
      finalPaymentHeader = await this._signPayment(
        prepareData.signToAddress,  // Sign to intermediate wallet or adapter
        amount,
        prepareData.sourceNetwork,
        prepareData.destinationNetwork,
        priority  // Pass priority for facilitator selection
      );
      
      console.log(`[Uplink] ✅ Transaction signed`);
    }

    // Step 5: Execute payment with fee validation
    try {
      const requestPayload = {
        paymentHeader: finalPaymentHeader,
        to,
        amount: calculatedFees.grossAmount,
        sourceNetwork: prepareData.sourceNetwork,
        destinationNetwork: prepareData.destinationNetwork,
        token: 'USDC',
        priority,
        ...(idempotencyKey && { idempotencyKey }),
        ...(metadata && { metadata }),
        ...(prepareData.bridgeOrderId && { bridgeOrderId: prepareData.bridgeOrderId }),
        // Pass calculated fees for server validation
        calculatedFees: {
          processingFee: calculatedFees.processingFee,
          ataFee: calculatedFees.ataFee,
          totalFees: calculatedFees.totalFees,
          netAmount: calculatedFees.netAmount,
        },
      };

      console.log(`\n[Uplink] 📤 Sending payment request to API...`);
      console.log(`   Type: ${prepareData.isCrossChain ? 'cross-chain' : 'same-chain'}`);
      console.log(`   ${prepareData.sourceNetwork} → ${prepareData.destinationNetwork}`);
      console.log();

      const response = await fetch(`${this.config.apiUrl}/v1/uplink/pay`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'uplink-js/2.0.0',
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(this.config.timeout * 1000),
      });

      console.log(`[Uplink] 📥 API Response: ${response.status}`);

      if (response.status === 401) {
        throw new AuthenticationError('Invalid API key');
      }

      const data = await response.json() as any;

      if (response.status !== 200 || data.status !== 'success') {
        const reason = data.data?.reason || data.error?.message || data.message || 'Unknown error';
        
        // Special handling for fee mismatch errors
        if (data.error?.code === 'FEE_MISMATCH') {
          throw new PaymentError(
            `Fee validation failed: ${reason}\n\n` +
            `Your calculation: $${calculatedFees.totalFees}\n` +
            `Server calculation: $${data.error.serverCalculation?.totalFees}\n\n` +
            `This should never happen. Please report this issue.`,
            reason
          );
        }
        
        throw new PaymentError(`Payment failed: ${reason}`, reason);
      }

      const result: PaymentResult = data.data;
      
      console.log(`\n[Uplink] ✅ Payment successful!`);
      console.log(`   Transaction Hash: ${result.txHash}`);
      console.log(`   Facilitator: ${result.facilitator}`);
      console.log();
      
      return result.txHash;
    } catch (error) {
      if (error instanceof UplinkError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${this.config.timeout}s`);
      }
      throw new NetworkError(`Network request failed: ${error}`);
    }
  }

  /**
   * Sign a same-chain payment and create x402 header
   * Fetches optimal facilitator's fee payer for Solana transactions
   */
  private async _signPayment(
    to: string,
    amount: string,
    sourceNetwork: string,
    destinationNetwork: string,
    priority: string = 'balanced'
  ): Promise<string> {
    if (sourceNetwork.startsWith('solana')) {
      if (!this.solanaSigner) {
        throw new ValidationError('Solana signer not configured');
      }
      
      // Fetch optimal facilitator's fee payer from API
      let feePayerAddress: string | undefined;
      try {
        const response = await fetch(
          `${this.config.apiUrl}/v1/facilitators/ranked?network=${sourceNetwork}&priority=${priority}`,
          {
            headers: {
              'X-API-Key': this.config.apiKey,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000),  // 5s timeout for facilitator lookup
          }
        );
        
        if (response.ok) {
          const data = await response.json() as any;
          const topFacilitator = data.data?.facilitators?.[0];
          if (topFacilitator?.solanaFeePayer) {
            feePayerAddress = topFacilitator.solanaFeePayer;
            console.log(`[Uplink] Using fee payer from API (${topFacilitator.facilitatorName}):`, feePayerAddress);
          }
        }
      } catch (error) {
        // Fallback if API call fails
        console.warn('[Uplink] Failed to fetch facilitator fee payer from API, using fallback:', error);
      }
      
      return this.solanaSigner.signPayment(to, amount, sourceNetwork, destinationNetwork, feePayerAddress);
    } else {
      if (!this.evmSigner) {
        throw new ValidationError('EVM signer not configured');
      }
      return this.evmSigner.signPayment(to, amount, sourceNetwork, destinationNetwork);
    }
  }

  /**
   * Parse amount to normalized format
   * Supports: "$10", "10.50", "10 USDC"
   */
  private _parseAmount(amount: string): string {
    let normalized = amount.trim();

    // Remove currency symbols and labels
    normalized = normalized.replace(/[$]/g, '').replace(/USDC/gi, '').trim();

    // Parse to float and format
    const value = parseFloat(normalized);
    if (isNaN(value)) {
      throw new ValidationError(`Invalid amount format: ${amount}`);
    }

    return value.toFixed(2);
  }

  /**
   * Auto-detect network from address format
   */
  private _detectNetworkFromAddress(address: string): string {
    const addr = address.trim();

    // EVM addresses (0x...)
    if (addr.startsWith('0x') && addr.length === 42) {
      return 'base';
    }

    // Solana addresses (base58, 32-44 chars)
    if (addr.length >= 32 && addr.length <= 44 && 
        /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr)) {
      return 'solana';
    }

    // ENS domains
    if (addr.includes('.eth')) {
      return 'base';
    }

    // Default to configured network
    return this.config.network;
  }
}

