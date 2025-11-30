/**
 * Type definitions for Uplink SDK
 */

export type NetworkType = 'base' | 'solana';
export type PriorityType = 'speed' | 'cost' | 'reliability' | 'balanced';

export interface PaymentResult {
  txHash: string;
  verified: boolean;
  settled: boolean;
  sourceNetwork: string;
  destinationNetwork: string;
  facilitator: string;
  amount: string;
  token: string;
  to: string;
}

export interface UplinkConfig {
  apiKey: string;
  privateKey?: string;
  network?: NetworkType;
  apiUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  solanaRpcUrl?: string;
  
  /**
   * SDK will add $0.40 fee for ATA creation on Solana (if needed)
   * 
   * IMPORTANT: You must explicitly set this to `true` to acknowledge
   * that your application understands and accepts this additional fee.
   * 
   * When a Solana address receives USDC for the first time, an Associated
   * Token Account (ATA) must be created. This costs ~0.002 SOL (~$0.40).
   * The backend pays this upfront and recovers it from your payment.
   * 
   * Example:
   * - Payment: $1.00
   * - Processing fee: $0.01 (0.1%)
   * - ATA creation: $0.40 (if needed)
   * - Recipient receives: $0.59
   * 
   * @default false
   */
  createAtaFeeAcceptance?: boolean;
  
  /**
   * Cross-chain payments have a minimum fee of $0.01 USD
   * 
   * IMPORTANT: You must explicitly set this to `true` to acknowledge
   * that your application understands and accepts this minimum fee.
   * 
   * Cross-chain payments (Base ↔ Solana) use CCTP bridge and have
   * a minimum $0.01 processing fee regardless of payment amount.
   * 
   * Example:
   * - Small payment: $0.05
   * - Processing fee: $0.01 (minimum enforced, 20% of amount)
   * - Recipient receives: $0.04
   * 
   * @default false
   */
  minimumCrosschainFeeAcceptance?: boolean;
}

export interface PaymentParams {
  to: string;
  amount: string;
  paymentHeader?: string;
  sourceNetwork?: string;
  destinationNetwork?: string;
  priority?: PriorityType;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface FeeConfig {
  tier: 'STANDARD' | 'REDUCED' | 'COMPLIMENTARY';
  samechainFeePercent: number;
  crosschainFeePercent: number;
  minimumCrosschainFee: number;
  ataCreationFee: number;
}

export interface ATACheck {
  needsCreation: boolean;
  applicable: boolean;
}

export interface CalculatedFees {
  grossAmount: string;
  processingFee: string;
  processingFeePercent: number;
  ataFee: string;
  totalFees: string;
  netAmount: string;
  minimumFeeApplied: boolean;
}

export interface PreparePaymentResponse {
  feeConfig: FeeConfig;
  ataCheck: ATACheck;
  calculatedFees: CalculatedFees;
  signToAddress: string;
  signToDescription: string;
  bridgeOrderId?: string;
  sourceNetwork: string;
  destinationNetwork: string;
  isCrossChain: boolean;
}

/**
 * Facilitator with signed payment header
 * Used for Solana payments where each facilitator requires a different fee payer signature
 */
export interface FacilitatorHeader {
  facilitatorName: string;
  facilitatorId: string;
  paymentHeader: string;
  solanaFeePayer?: string;
}

