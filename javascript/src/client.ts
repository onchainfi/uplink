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
   * Make a same-chain payment (combined verify + settle)
   * 
   * SAME-CHAIN ONLY: sourceNetwork must equal destinationNetwork
   */
  async pay(params: PaymentParams): Promise<string> {
    const {
      to,
      amount,
      paymentHeader,
      sourceNetwork,
      destinationNetwork,
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

    // Parse and normalize amount
    const normalizedAmount = this._parseAmount(amount);

    // Determine networks
    const srcNetwork = sourceNetwork || this.config.network;
    const dstNetwork = destinationNetwork || this._detectNetworkFromAddress(to);

    // Determine payment type and fetch correct signing address
    const isCrossChain = srcNetwork !== dstNetwork;
    let signToAddress = to; // Default to final recipient
    let bridgeOrderId: string | undefined;

    // SAME-CHAIN: Fetch intermediate wallet from backend config
    if (!isCrossChain) {
      console.log(`[Uplink] 💰 Same-chain ${srcNetwork} → ${srcNetwork}`);
      
      try {
        const configResponse = await fetch(`${this.config.apiUrl}/v1/facilitators/config`, {
          method: 'GET',
          headers: { 'X-API-Key': this.config.apiKey },
        });
        
        if (configResponse.ok) {
          const configData = await configResponse.json() as any;
          const intermediateWallet = configData.data?.samechainIntermediateWallet?.[srcNetwork];
          
          if (intermediateWallet) {
            signToAddress = intermediateWallet;
            console.log(`[Uplink] 💰 Signing to intermediate wallet: ${signToAddress}`);
            console.log(`[Uplink] 💰 Final recipient: ${to}`);
          } else {
            console.warn(`[Uplink] ⚠️  No intermediate wallet for ${srcNetwork}`);
          }
        }
      } catch (error) {
        console.warn(`[Uplink] ⚠️  Could not fetch config:`, error);
      }
    }

    // CROSS-CHAIN: Call bridge/prepare to get adapter address
    if (isCrossChain) {
      console.log(`[Uplink] 🌉 Cross-chain ${srcNetwork} → ${dstNetwork}`);
      
      const prepareResponse = await fetch(`${this.config.apiUrl}/v1/bridge/prepare`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceNetwork: srcNetwork,
          destinationNetwork: dstNetwork,
          recipientAddress: to,
          amount: normalizedAmount,
        }),
      });
      
      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json().catch(() => ({})) as any;
        throw new PaymentError(
          `Bridge preparation failed: ${errorData.message || prepareResponse.statusText}`
        );
      }
      
      const bridgeData = await prepareResponse.json() as any;
      signToAddress = bridgeData.data.depositAddress;
      bridgeOrderId = bridgeData.data.orderId;
      
      console.log(`[Uplink] 🌉 Adapter: ${signToAddress}`);
      console.log(`[Uplink] 🌉 Bridge ID: ${bridgeOrderId}`);
      console.log(`[Uplink] 🌉 Final recipient: ${to} (on ${dstNetwork})`);
    }

    // Get payment header (sign if Mode A, use provided if Mode B)
    let finalPaymentHeader: string;
    
    if (paymentHeader) {
      // Mode B: Use provided payment header
      finalPaymentHeader = paymentHeader;
    } else {
      // Mode A: SDK creates payment header
      finalPaymentHeader = await this._signPayment(
        signToAddress,  // ✅ Sign to intermediate wallet or adapter
        normalizedAmount,
        srcNetwork,
        dstNetwork  // ✅ Pass both networks for cross-chain metadata
      );
    }

    // Call Uplink API
    try {
      const requestPayload = {
        paymentHeader: finalPaymentHeader,
        to,
        amount: normalizedAmount,
        sourceNetwork: srcNetwork,
        destinationNetwork: dstNetwork,
        token: 'USDC',
        priority,
        ...(idempotencyKey && { idempotencyKey }),
        ...(metadata && { metadata }),
        ...(bridgeOrderId && { bridgeOrderId }),  // ✅ For cross-chain linking
      };

      console.log(`\n[DEBUG] Uplink API Request:`);
      console.log(`  Endpoint: /v1/uplink/pay`);
      console.log(`  Type: ${isCrossChain ? 'cross-chain' : 'same-chain'}`);
      console.log(`  Source: ${srcNetwork}`);
      console.log(`  Destination: ${dstNetwork}`);
      console.log(`  To: ${to}`);
      console.log(`  Amount: ${normalizedAmount}`);
      console.log(`  Payment Header Length: ${finalPaymentHeader.length} chars`);
      if (bridgeOrderId) console.log(`  Bridge Order ID: ${bridgeOrderId}`);
      console.log();

      const response = await fetch(`${this.config.apiUrl}/v1/uplink/pay`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'uplink-js/0.1.0',
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(this.config.timeout * 1000),
      });

      console.log(`[DEBUG] API Response:`);
      console.log(`  Status Code: ${response.status}`);

      if (response.status === 401) {
        throw new AuthenticationError('Invalid API key');
      }

      const data = await response.json() as any;
      console.log(`  Response data:`, data);
      console.log();

      if (response.status !== 200 || data.status !== 'success') {
        const reason = data.data?.reason || data.error?.message || data.message || 'Unknown error';
        throw new PaymentError(`Payment failed: ${reason}`, reason);
      }

      const result: PaymentResult = data.data;
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
   */
  private async _signPayment(
    to: string,
    amount: string,
    sourceNetwork: string,
    destinationNetwork: string
  ): Promise<string> {
    if (sourceNetwork.startsWith('solana')) {
      if (!this.solanaSigner) {
        throw new ValidationError('Solana signer not configured');
      }
      return this.solanaSigner.signPayment(to, amount, sourceNetwork, destinationNetwork);
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

