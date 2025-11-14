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

