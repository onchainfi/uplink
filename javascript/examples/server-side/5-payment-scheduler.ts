/**
 * Payment Scheduler
 * 
 * Schedule and process recurring/delayed payments:
 * - Recurring subscriptions
 * - Delayed payments
 * - Payment schedules
 * - Automatic retries
 * - Status tracking
 * 
 * Use cases:
 * - Subscription billing
 * - Scheduled payouts
 * - Vesting schedules
 * - Recurring expenses
 */

import { Uplink } from '@onchainfi/uplink';
import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface ScheduledPayment {
  id: string;
  orderId: string;
  recipient: string;
  amount: string;
  network?: 'base' | 'solana';
  
  // Schedule settings
  scheduleType: 'once' | 'recurring';
  nextRun: Date;
  interval?: number; // milliseconds (for recurring)
  endDate?: Date;
  
  // Status
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  lastRun?: Date;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  
  // Payment details
  lastTxHash?: string;
  lastError?: string;
  metadata?: any;
  
  createdAt: Date;
  updatedAt: Date;
}

interface SchedulerStats {
  totalSchedules: number;
  activeSchedules: number;
  pausedSchedules: number;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  apiKey: process.env.ONCHAIN_API_KEY!,
  basePrivateKey: process.env.BASE_PRIVATE_KEY!,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY!,
  apiUrl: process.env.API_URL || 'https://api.onchain.fi',
  
  // Scheduler settings
  checkInterval: 10000, // Check for due payments every 10 seconds
  maxRetries: 3,
  retryDelay: 30000, // 30 seconds between retries
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
// IN-MEMORY STORAGE
// ============================================================================

const schedules = new Map<string, ScheduledPayment>();
let schedulerInterval: NodeJS.Timeout | null = null;

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
 * Calculate next run time for recurring payment
 */
function calculateNextRun(schedule: ScheduledPayment): Date {
  if (schedule.scheduleType === 'once') {
    return new Date(0); // Never run again
  }

  if (!schedule.interval) {
    throw new Error('Recurring payment must have interval');
  }

  const nextRun = new Date(schedule.lastRun || schedule.nextRun);
  nextRun.setTime(nextRun.getTime() + schedule.interval);

  // Check if past end date
  if (schedule.endDate && nextRun > schedule.endDate) {
    return new Date(0); // Mark as completed
  }

  return nextRun;
}

// ============================================================================
// SCHEDULER FUNCTIONS
// ============================================================================

/**
 * Create a new scheduled payment
 */
function createSchedule(params: {
  orderId: string;
  recipient: string;
  amount: string;
  scheduleType: 'once' | 'recurring';
  nextRun: Date;
  interval?: number;
  endDate?: Date;
  metadata?: any;
}): ScheduledPayment {
  const network = detectNetwork(params.recipient);
  
  const schedule: ScheduledPayment = {
    id: crypto.randomUUID(),
    orderId: params.orderId,
    recipient: params.recipient,
    amount: params.amount,
    network,
    scheduleType: params.scheduleType,
    nextRun: params.nextRun,
    interval: params.interval,
    endDate: params.endDate,
    status: 'active',
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    metadata: params.metadata,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  schedules.set(schedule.id, schedule);
  
  console.log(`📅 Schedule created: ${schedule.id}`);
  console.log(`   Type: ${schedule.scheduleType}`);
  console.log(`   Next run: ${schedule.nextRun.toISOString()}`);
  if (schedule.interval) {
    console.log(`   Interval: ${schedule.interval / 1000}s`);
  }
  console.log();

  return schedule;
}

/**
 * Execute a scheduled payment
 */
async function executeScheduledPayment(schedule: ScheduledPayment): Promise<void> {
  console.log(`\n💰 Executing scheduled payment: ${schedule.id}`);
  console.log(`   Order: ${schedule.orderId}`);
  console.log(`   Network: ${schedule.network}`);
  console.log(`   Amount: ${schedule.amount} USDC`);
  console.log(`   Recipient: ${schedule.recipient}`);

  const uplink = getUplink(schedule.network!);
  
  try {
    // Generate unique idempotency key for this run
    const idempotencyKey = `${schedule.orderId}-${Date.now()}`;
    
    const txHash = await uplink.pay({
      to: schedule.recipient,
      amount: schedule.amount,
      idempotencyKey,
      metadata: {
        ...schedule.metadata,
        scheduleId: schedule.id,
        runNumber: schedule.totalRuns + 1,
      },
    });

    // Payment successful
    schedule.totalRuns++;
    schedule.successfulRuns++;
    schedule.lastRun = new Date();
    schedule.lastTxHash = txHash;
    schedule.lastError = undefined;
    schedule.updatedAt = new Date();

    console.log(`   ✅ Payment successful: ${txHash}`);

    // Calculate next run
    if (schedule.scheduleType === 'recurring') {
      schedule.nextRun = calculateNextRun(schedule);
      
      if (schedule.nextRun.getTime() === 0) {
        schedule.status = 'completed';
        console.log(`   ✓ Schedule completed (reached end date)`);
      } else {
        console.log(`   ✓ Next run: ${schedule.nextRun.toISOString()}`);
      }
    } else {
      schedule.status = 'completed';
      console.log(`   ✓ One-time payment completed`);
    }

    schedules.set(schedule.id, schedule);

  } catch (error: any) {
    // Payment failed
    schedule.totalRuns++;
    schedule.failedRuns++;
    schedule.lastRun = new Date();
    schedule.lastError = error.message;
    schedule.updatedAt = new Date();

    console.error(`   ❌ Payment failed: ${error.message}`);

    // Retry logic
    if (schedule.failedRuns < config.maxRetries) {
      console.log(`   🔄 Will retry (attempt ${schedule.failedRuns + 1}/${config.maxRetries})`);
      
      // Schedule retry
      const retryTime = new Date();
      retryTime.setTime(retryTime.getTime() + config.retryDelay);
      schedule.nextRun = retryTime;
    } else {
      console.log(`   ⛔ Max retries reached, pausing schedule`);
      schedule.status = 'paused';
    }

    schedules.set(schedule.id, schedule);
  }
}

/**
 * Check for due payments and execute them
 */
async function checkAndExecutePayments(): Promise<void> {
  const now = new Date();
  const dueSchedules = Array.from(schedules.values())
    .filter(s => s.status === 'active' && s.nextRun <= now);

  if (dueSchedules.length === 0) {
    return; // Nothing to do
  }

  console.log(`\n⏰ Found ${dueSchedules.length} due payment(s)`);

  for (const schedule of dueSchedules) {
    try {
      await executeScheduledPayment(schedule);
    } catch (error) {
      console.error(`Failed to execute schedule ${schedule.id}:`, error);
    }
  }
}

/**
 * Start the scheduler
 */
function startScheduler(): void {
  if (schedulerInterval) {
    console.log('⚠️  Scheduler already running');
    return;
  }

  console.log('🚀 Starting payment scheduler...');
  console.log(`   Check interval: ${config.checkInterval / 1000}s\n`);

  schedulerInterval = setInterval(async () => {
    await checkAndExecutePayments();
  }, config.checkInterval);
}

/**
 * Stop the scheduler
 */
function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('🛑 Scheduler stopped');
  }
}

/**
 * Get scheduler statistics
 */
function getStats(): SchedulerStats {
  const allSchedules = Array.from(schedules.values());
  
  return {
    totalSchedules: allSchedules.length,
    activeSchedules: allSchedules.filter(s => s.status === 'active').length,
    pausedSchedules: allSchedules.filter(s => s.status === 'paused').length,
    totalPayments: allSchedules.reduce((sum, s) => sum + s.totalRuns, 0),
    successfulPayments: allSchedules.reduce((sum, s) => sum + s.successfulRuns, 0),
    failedPayments: allSchedules.reduce((sum, s) => sum + s.failedRuns, 0),
  };
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

async function main() {
  console.log('📅 Payment Scheduler\n');

  // Example 1: One-time delayed payment
  console.log('📋 Example 1: One-time Payment (5 seconds from now)');
  const oneTimeRun = new Date();
  oneTimeRun.setSeconds(oneTimeRun.getSeconds() + 5);
  
  createSchedule({
    orderId: 'delayed-001',
    recipient: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
    amount: '0.05',
    scheduleType: 'once',
    nextRun: oneTimeRun,
    metadata: {
      description: 'Delayed payment test',
    },
  });

  // Example 2: Recurring payment (every 30 seconds for 2 minutes)
  console.log('📋 Example 2: Recurring Payment (every 30s for 2 minutes)');
  const recurringStart = new Date();
  recurringStart.setSeconds(recurringStart.getSeconds() + 10);
  const recurringEnd = new Date();
  recurringEnd.setMinutes(recurringEnd.getMinutes() + 2);
  
  createSchedule({
    orderId: 'subscription-001',
    recipient: '3YCjDyWy38gSapaibhevJsRB6dxXGHQdzMtPkMUaUnPV',
    amount: '0.05',
    scheduleType: 'recurring',
    nextRun: recurringStart,
    interval: 30000, // 30 seconds
    endDate: recurringEnd,
    metadata: {
      description: 'Subscription payment',
      plan: 'monthly',
    },
  });

  // Example 3: Immediate recurring payment (starts now, every 20 seconds)
  console.log('📋 Example 3: Immediate Recurring (every 20s, no end date)');
  
  createSchedule({
    orderId: 'vesting-001',
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '0.05',
    scheduleType: 'recurring',
    nextRun: new Date(), // Start immediately
    interval: 20000, // 20 seconds
    metadata: {
      description: 'Vesting schedule',
    },
  });

  // Start the scheduler
  startScheduler();

  // Print status every 15 seconds
  setInterval(() => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SCHEDULER STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const stats = getStats();
    console.log(`Total Schedules: ${stats.totalSchedules}`);
    console.log(`Active: ${stats.activeSchedules}`);
    console.log(`Paused: ${stats.pausedSchedules}`);
    console.log(`Total Payments: ${stats.totalPayments}`);
    console.log(`Successful: ${stats.successfulPayments} ✅`);
    console.log(`Failed: ${stats.failedPayments} ${stats.failedPayments > 0 ? '❌' : ''}`);
    
    // Show active schedules
    const activeSchedules = Array.from(schedules.values()).filter(s => s.status === 'active');
    if (activeSchedules.length > 0) {
      console.log('\nActive Schedules:');
      activeSchedules.forEach(s => {
        const nextIn = Math.max(0, s.nextRun.getTime() - Date.now());
        console.log(`  • ${s.orderId} (${s.scheduleType})`);
        console.log(`    Next: ${nextIn > 0 ? Math.round(nextIn / 1000) + 's' : 'now'}`);
        console.log(`    Runs: ${s.successfulRuns}/${s.totalRuns}`);
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }, 15000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down scheduler...');
    stopScheduler();
    
    const stats = getStats();
    console.log('\n📊 Final Statistics:');
    console.log(`   Total Schedules: ${stats.totalSchedules}`);
    console.log(`   Total Payments: ${stats.totalPayments}`);
    console.log(`   Successful: ${stats.successfulPayments}`);
    console.log(`   Failed: ${stats.failedPayments}`);
    console.log('\n✅ Goodbye!\n');
    
    process.exit(0);
  });
}

// ============================================================================
// RUN
// ============================================================================

main().catch((error) => {
  console.error('\n💥 Scheduler crashed:', error);
  process.exit(1);
});

