/**
 * Advanced Features
 * 
 * This example demonstrates advanced Uplink SDK capabilities:
 * - Idempotency (safe retries)
 * - Payment metadata
 * - Priority routing
 * - Multiple networks
 * - Batch operations
 * 
 * Production-ready patterns for complex use cases.
 */

import { Uplink } from '@onchainfi/uplink';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  apiKey: process.env.ONCHAIN_API_KEY!,
  basePrivateKey: process.env.BASE_PRIVATE_KEY!,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY!,
  apiUrl: process.env.API_URL || 'https://api.onchain.fi',
};

// ============================================================================
// Example 1: Idempotency - Safe Retries
// ============================================================================

async function exampleIdempotency() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('♻️  Example 1: Idempotency (Safe Retries)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  // Generate unique key (in production, use order ID, user ID, etc.)
  const idempotencyKey = `payment-${Date.now()}`;

  console.log(`Idempotency key: ${idempotencyKey}`);
  console.log('This prevents duplicate payments if network fails\n');

  try {
    // First call - creates payment
    console.log('1️⃣  First call (creates payment)...');
    const txHash1 = await uplink.pay({
      to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
      idempotencyKey,  // ← Prevents duplicates
    });
    console.log(`   TX: ${txHash1}\n`);

    // Second call with same key - returns cached result (no duplicate payment)
    console.log('2️⃣  Second call (same key - should return cached)...');
    const txHash2 = await uplink.pay({
      to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
      idempotencyKey,  // ← Same key = no duplicate
    });
    console.log(`   TX: ${txHash2}\n`);

    if (txHash1 === txHash2) {
      console.log('✅ Idempotency working! Same TX returned, no duplicate payment\n');
    } else {
      console.log('⚠️  Different TXs - idempotency may not be working\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 2: Payment Metadata (Tracking & Analytics)
// ============================================================================

async function exampleMetadata() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Example 2: Payment Metadata');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log('Use metadata to track payments in your system:\n');

  try {
    const txHash = await uplink.pay({
      to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
      
      // Attach any custom data for tracking
      metadata: {
        // E-commerce
        orderId: 'order-abc-123',
        customerId: 'user-456',
        productId: 'sku-789',
        
        // AI Agent
        agentId: 'gpt-4-assistant',
        taskId: 'task-xyz',
        requestId: 'req-001',
        
        // SaaS
        subscriptionId: 'sub-premium-monthly',
        planName: 'Pro Plan',
        
        // General
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
      },
    });

    console.log('✅ Payment with metadata successful!');
    console.log(`TX: ${txHash}`);
    console.log('\n💡 Metadata is stored and can be queried via Analytics API\n');
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 3: Priority Routing
// ============================================================================

async function examplePriorityRouting() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Example 3: Priority Routing');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  const recipient = '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0';
  const amount = '0.10';

  console.log('Priority options:\n');
  console.log('  "speed"       → Fastest facilitator (best for urgent payments)');
  console.log('  "cost"        → Cheapest facilitator (best for high volume)');
  console.log('  "reliability" → Most reliable facilitator (best for critical payments)');
  console.log('  "balanced"    → Best overall (default, recommended)\n');

  try {
    // Speed priority - for urgent payments
    console.log('1️⃣  Speed priority (urgent payment)...');
    const speedTx = await uplink.pay({
      to: recipient,
      amount,
      priority: 'speed',  // ← Routes to fastest facilitator
    });
    console.log(`   ✅ Completed: ${speedTx}\n`);

    // Cost priority - for high volume
    console.log('2️⃣  Cost priority (batch processing)...');
    const costTx = await uplink.pay({
      to: recipient,
      amount,
      priority: 'cost',  // ← Routes to cheapest facilitator
    });
    console.log(`   ✅ Completed: ${costTx}\n`);

    // Balanced priority - default, best for most cases
    console.log('3️⃣  Balanced priority (recommended)...');
    const balancedTx = await uplink.pay({
      to: recipient,
      amount,
      priority: 'balanced',  // ← Best overall (default)
    });
    console.log(`   ✅ Completed: ${balancedTx}\n`);

    console.log('💡 All priorities succeed, but route through different facilitators\n');
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 4: Multi-Network Client
// ============================================================================

async function exampleMultiNetworkClient() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 Example 4: Multi-Network Client');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create separate clients for each network
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

  console.log(`Base wallet: ${uplinkBase.address}`);
  console.log(`Solana wallet: ${uplinkSolana.address}`);
  console.log('\n💡 Use separate instances for better performance\n');

  try {
    // Base payment
    console.log('1️⃣  Base payment...');
    const baseTx = await uplinkBase.pay({
      to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
    });
    console.log(`   ✅ Base: ${baseTx}\n`);

    // Solana payment (parallel, not sequential)
    console.log('2️⃣  Solana payment...');
    const solanaTx = await uplinkSolana.pay({
      to: '4apjKqtDAu8PBwTraCTsmQNv6c7mGnwq3vhQufroAxNg',
      amount: '0.05',
    });
    console.log(`   ✅ Solana: ${solanaTx}\n`);

    console.log('✅ Multi-network payments successful!\n');
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 5: Batch Payments (Sequential)
// ============================================================================

async function exampleBatchPayments() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 Example 5: Batch Payments');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  // List of payments to process
  const payments = [
    { to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0', amount: '0.10' },
    { to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', amount: '0.20' },
    { to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0', amount: '0.15' },
  ];

  console.log(`Processing ${payments.length} payments...\n`);

  const results = [];
  
  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];
    console.log(`${i + 1}/${payments.length}: Paying ${payment.amount} USDC to ${payment.to.slice(0, 10)}...`);
    
    try {
      const txHash = await uplink.pay({
        ...payment,
        idempotencyKey: `batch-${Date.now()}-${i}`,  // Unique key per payment
        metadata: {
          batchId: 'batch-001',
          paymentIndex: i,
          totalInBatch: payments.length,
        },
      });
      
      results.push({ success: true, txHash, ...payment });
      console.log(`   ✅ Success: ${txHash}\n`);
      
    } catch (error) {
      results.push({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        ...payment 
      });
      console.log(`   ❌ Failed: ${error instanceof Error ? error.message : error}\n`);
      // Continue processing remaining payments
    }
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Batch complete: ${successful}/${payments.length} succeeded, ${failed} failed\n`);
  
  return results;
}

// ============================================================================
// Example 6: Custom Configuration (Timeouts, Retries)
// ============================================================================

async function exampleCustomConfiguration() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚙️  Example 6: Custom Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Custom Uplink configuration for production environments
  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    
    // Fee acceptance
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
    
    // Custom timeouts and retries
    timeout: 180,           // 3 minutes for cross-chain (default: 120s)
    maxRetries: 5,          // More retries for production (default: 3)
    retryDelay: 2.0,        // 2 seconds between retries (default: 1s)
    
    // Custom Solana RPC (for better performance)
    solanaRpcUrl: 'https://your-private-rpc.com',  // Optional: use your own RPC
  });

  console.log('Custom configuration:');
  console.log('  Timeout: 180s (good for cross-chain)');
  console.log('  Max retries: 5 (more resilient)');
  console.log('  Retry delay: 2s (more patient)\n');

  try {
    const txHash = await uplink.pay({
      to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
    });
    
    console.log('✅ Payment with custom config successful!');
    console.log(`TX: ${txHash}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 7: Combined - Production Payment Function
// ============================================================================

async function productionPaymentExample() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏭 Example 7: Production Payment Function');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
    timeout: 180,
    maxRetries: 3,
  });

  // Production-ready payment function with all features
  async function processPayment(params: {
    recipient: string;
    amount: string;
    orderId: string;
    description?: string;
  }) {
    const { recipient, amount, orderId, description } = params;
    
    console.log(`Processing payment: ${orderId}`);
    console.log(`  To: ${recipient}`);
    console.log(`  Amount: $${amount}`);
    if (description) console.log(`  Desc: ${description}`);
    console.log();

    try {
      const txHash = await uplink.pay({
        to: recipient,
        amount,
        
        // Idempotency for safe retries
        idempotencyKey: orderId,
        
        // Rich metadata for tracking
        metadata: {
          orderId,
          description,
          timestamp: new Date().toISOString(),
          version: '2.1.0',
        },
        
        // Balanced priority for most use cases
        priority: 'balanced',
      });

      console.log(`✅ Payment ${orderId} successful!`);
      console.log(`   TX: ${txHash}\n`);
      
      // In production: Store txHash in your database
      // await db.payments.update({ orderId, txHash, status: 'completed' });
      
      return { success: true, txHash, orderId };
      
    } catch (error) {
      console.error(`❌ Payment ${orderId} failed: ${error instanceof Error ? error.message : error}\n`);
      
      // In production: Log error and update status
      // await db.payments.update({ orderId, status: 'failed', error: error.message });
      // await alerting.notify('Payment failed', { orderId, error });
      
      return { success: false, orderId, error: error instanceof Error ? error.message : 'Unknown' };
    }
  }

  // Process multiple payments
  const order1 = await processPayment({
    recipient: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
    amount: '1.50',
    orderId: 'prod-order-001',
    description: 'API Credits Purchase',
  });

  const order2 = await processPayment({
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    amount: '5.00',
    orderId: 'prod-order-002',
    description: 'Premium Subscription',
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Summary:');
  console.log(`  Order 1: ${order1.success ? '✅' : '❌'} ${order1.orderId}`);
  console.log(`  Order 2: ${order2.success ? '✅' : '❌'} ${order2.orderId}\n`);
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function main() {
  console.log('\n🚀 Uplink SDK - Advanced Features Examples');
  console.log('==========================================\n');
  
  if (!config.apiKey || !config.basePrivateKey) {
    console.error('❌ Missing required environment variables');
    console.error('   ONCHAIN_API_KEY');
    console.error('   BASE_PRIVATE_KEY\n');
    process.exit(1);
  }

  try {
    await exampleIdempotency();
    await exampleMetadata();
    await examplePriorityRouting();
    await exampleBatchPayments();
    await exampleCustomConfiguration();
    await productionPaymentExample();
    
    console.log('\n✅ All advanced examples completed!\n');
    
  } catch (error) {
    console.error('\n❌ Example failed\n');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  exampleIdempotency,
  exampleMetadata,
  examplePriorityRouting,
  exampleMultiNetworkClient,
  exampleBatchPayments,
  exampleCustomConfiguration,
  productionPaymentExample,
};

