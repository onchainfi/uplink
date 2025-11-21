/**
 * Batch Payment Processor
 * 
 * Process multiple payments efficiently with:
 * - Batch processing
 * - Rate limiting
 * - Retry logic
 * - Progress tracking
 * - CSV import/export
 * 
 * Use cases:
 * - Payroll distribution
 * - Airdrops
 * - Bulk refunds
 * - Mass payouts
 */

import { Uplink } from '@onchainfi/uplink';
import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface PaymentRequest {
  id: string;
  recipient: string;
  amount: string;
  description?: string;
  metadata?: any;
}

interface BatchPayment extends PaymentRequest {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  error?: string;
  attempts: number;
  processedAt?: string;
}

interface BatchResult {
  batchId: string;
  total: number;
  successful: number;
  failed: number;
  duration: number;
  payments: BatchPayment[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  apiKey: process.env.ONCHAIN_API_KEY!,
  basePrivateKey: process.env.BASE_PRIVATE_KEY!,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY!,
  apiUrl: process.env.API_URL || 'https://api.onchain.fi',
  
  // Batch processing settings
  batchSize: 5,           // Process 5 payments at a time
  delayBetweenBatches: 2000,  // 2 seconds between batches
  maxRetries: 3,          // Retry failed payments up to 3 times
  retryDelay: 5000,       // 5 seconds between retries
};

// Validate environment
if (!config.apiKey || !config.basePrivateKey || !config.solanaPrivateKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   ONCHAIN_API_KEY');
  console.error('   BASE_PRIVATE_KEY');
  console.error('   SOLANA_PRIVATE_KEY');
  process.exit(1);
}

// ============================================================================
// INITIALIZE UPLINK
// ============================================================================

const uplinkBase = new Uplink({
  apiKey: config.apiKey,
  privateKey: config.basePrivateKey,
  network: 'base',
  apiUrl: config.apiUrl,
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});

const uplinkSolana = new Uplink({
  apiKey: config.apiKey,
  privateKey: config.solanaPrivateKey,
  network: 'solana',
  apiUrl: config.apiUrl,
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});

console.log('✅ Uplink initialized');
console.log(`   Base wallet: ${uplinkBase.address}`);
console.log(`   Solana wallet: ${uplinkSolana.address}\n`);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect network from address format
 */
function detectNetwork(address: string): 'base' | 'solana' {
  if (address.startsWith('0x')) return 'base';
  if (address.length >= 32 && address.length <= 44) return 'solana';
  throw new Error(`Invalid address format: ${address}`);
}

/**
 * Get Uplink instance for network
 */
function getUplink(network: 'base' | 'solana'): Uplink {
  return network === 'base' ? uplinkBase : uplinkSolana;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process a single payment with retry logic
 */
async function processSinglePayment(
  payment: BatchPayment,
  uplink: Uplink
): Promise<void> {
  payment.status = 'processing';
  payment.attempts++;

  try {
    const txHash = await uplink.pay({
      to: payment.recipient,
      amount: payment.amount,
      idempotencyKey: payment.id,
      metadata: payment.metadata,
    });

    payment.status = 'completed';
    payment.txHash = txHash;
    payment.processedAt = new Date().toISOString();

    console.log(`  ✅ ${payment.id}: ${txHash.slice(0, 10)}...`);
  } catch (error: any) {
    payment.error = error.message;

    // Retry if we haven't exceeded max attempts
    if (payment.attempts < config.maxRetries) {
      console.log(`  ⚠️  ${payment.id}: Failed (attempt ${payment.attempts}/${config.maxRetries}), will retry...`);
      payment.status = 'pending'; // Mark for retry
    } else {
      payment.status = 'failed';
      payment.processedAt = new Date().toISOString();
      console.log(`  ❌ ${payment.id}: ${error.message}`);
    }
  }
}

/**
 * Process payments in batches with rate limiting
 */
async function processBatch(payments: PaymentRequest[]): Promise<BatchResult> {
  const batchId = crypto.randomUUID();
  const startTime = Date.now();

  console.log(`\n🚀 Starting batch ${batchId}`);
  console.log(`   Total payments: ${payments.length}`);
  console.log(`   Batch size: ${config.batchSize}`);
  console.log('═'.repeat(60));

  // Convert to BatchPayment objects
  const batchPayments: BatchPayment[] = payments.map(p => ({
    ...p,
    status: 'pending',
    attempts: 0,
  }));

  // Group payments by network for efficiency
  const basePayments = batchPayments.filter(p => detectNetwork(p.recipient) === 'base');
  const solanaPayments = batchPayments.filter(p => detectNetwork(p.recipient) === 'solana');

  console.log(`\n📊 Payment distribution:`);
  console.log(`   Base: ${basePayments.length}`);
  console.log(`   Solana: ${solanaPayments.length}\n`);

  // Process Base payments in batches
  if (basePayments.length > 0) {
    console.log('💰 Processing Base payments...\n');
    await processBatchByNetwork(basePayments, uplinkBase, 'Base');
  }

  // Process Solana payments in batches
  if (solanaPayments.length > 0) {
    console.log('\n💰 Processing Solana payments...\n');
    await processBatchByNetwork(solanaPayments, uplinkSolana, 'Solana');
  }

  // Retry failed payments (up to maxRetries)
  const failedPayments = batchPayments.filter(p => p.status === 'pending' || p.status === 'processing');
  
  if (failedPayments.length > 0) {
    console.log(`\n🔄 Retrying ${failedPayments.length} failed payments...\n`);
    await sleep(config.retryDelay);
    
    for (const payment of failedPayments) {
      if (payment.attempts < config.maxRetries) {
        const network = detectNetwork(payment.recipient);
        const uplink = getUplink(network);
        await processSinglePayment(payment, uplink);
      }
    }
  }

  // Calculate results
  const duration = Date.now() - startTime;
  const successful = batchPayments.filter(p => p.status === 'completed').length;
  const failed = batchPayments.filter(p => p.status === 'failed').length;

  const result: BatchResult = {
    batchId,
    total: batchPayments.length,
    successful,
    failed,
    duration,
    payments: batchPayments,
  };

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 BATCH SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Batch ID: ${batchId}`);
  console.log(`Total: ${result.total}`);
  console.log(`Successful: ${result.successful} ✅`);
  console.log(`Failed: ${result.failed} ${result.failed > 0 ? '❌' : ''}`);
  console.log(`Success Rate: ${((successful / result.total) * 100).toFixed(1)}%`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log('═'.repeat(60) + '\n');

  return result;
}

/**
 * Process a batch of payments for a specific network
 */
async function processBatchByNetwork(
  payments: BatchPayment[],
  uplink: Uplink,
  networkName: string
): Promise<void> {
  const chunks = [];
  
  // Split into chunks of batchSize
  for (let i = 0; i < payments.length; i += config.batchSize) {
    chunks.push(payments.slice(i, i + config.batchSize));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`${networkName} Batch ${i + 1}/${chunks.length} (${chunk.length} payments):`);

    // Process chunk in parallel
    await Promise.all(
      chunk.map(payment => processSinglePayment(payment, uplink))
    );

    // Rate limiting: delay between batches
    if (i < chunks.length - 1) {
      await sleep(config.delayBetweenBatches);
    }
  }
}

/**
 * Export results to CSV format
 */
function exportToCSV(result: BatchResult): string {
  const lines = [
    'ID,Recipient,Amount,Status,TxHash,Error,Attempts',
    ...result.payments.map(p => 
      `${p.id},${p.recipient},${p.amount},${p.status},${p.txHash || ''},${p.error || ''},${p.attempts}`
    ),
  ];
  
  return lines.join('\n');
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

async function main() {
  console.log('🔄 Batch Payment Processor\n');

  // Example 1: Small batch (same-chain)
  console.log('📋 Example 1: Base Payroll (5 payments)');
  
  const basePayments: PaymentRequest[] = [
    {
      id: 'payroll-001',
      recipient: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
      description: 'Employee salary - Alice',
    },
    {
      id: 'payroll-002',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '0.10',
      description: 'Employee salary - Bob',
    },
    {
      id: 'payroll-003',
      recipient: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
      description: 'Employee salary - Carol',
    },
    {
      id: 'payroll-004',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '0.10',
      description: 'Employee salary - David',
    },
    {
      id: 'payroll-005',
      recipient: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
      description: 'Employee salary - Eve',
    },
  ];

  const result1 = await processBatch(basePayments);

  // Export to CSV
  const csv = exportToCSV(result1);
  console.log('📄 CSV Export:\n');
  console.log(csv);
  console.log();

  // Example 2: Mixed networks
  console.log('\n📋 Example 2: Mixed Network Batch');
  
  const mixedPayments: PaymentRequest[] = [
    {
      id: 'airdrop-001',
      recipient: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.05',
      description: 'Airdrop to Base user',
    },
    {
      id: 'airdrop-002',
      recipient: '3YCjDyWy38gSapaibhevJsRB6dxXGHQdzMtPkMUaUnPV',
      amount: '0.05',
      description: 'Airdrop to Solana user',
    },
    {
      id: 'airdrop-003',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      amount: '0.05',
      description: 'Airdrop to Base user',
    },
  ];

  const result2 = await processBatch(mixedPayments);

  // Final summary
  console.log('\n🎉 All batches completed!');
  console.log(`Total payments: ${result1.total + result2.total}`);
  console.log(`Total successful: ${result1.successful + result2.successful}`);
  console.log(`Total failed: ${result1.failed + result2.failed}`);
}

// ============================================================================
// RUN
// ============================================================================

main().catch((error) => {
  console.error('\n💥 Batch processor crashed:', error);
  process.exit(1);
});

