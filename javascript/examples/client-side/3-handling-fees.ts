/**
 * Handling Fees & Edge Cases
 * 
 * This example demonstrates how to handle various fee scenarios and edge cases:
 * - Understanding fee structure
 * - Handling minimum fees
 * - ATA creation costs
 * - Insufficient payment amounts
 * - Small payments
 * 
 * Learn how the fee system works and avoid common pitfalls.
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
// Example 1: Small Cross-Chain Payment (Minimum Fee Enforcement)
// ============================================================================

async function exampleSmallCrossChainPayment() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💵 Example 1: Small Cross-Chain Payment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log('Scenario: Small cross-chain payment ($0.05)');
  console.log('Expected: Minimum fee of $0.01 will be applied');
  console.log('Fee percentage: 20% of payment (vs normal 0.1%)\n');

  try {
    const txHash = await uplink.pay({
      to: '4apjKqtDAu8PBwTraCTsmQNv6c7mGnwq3vhQufroAxNg',
      amount: '0.05',  // Small amount
      sourceNetwork: 'base',
      destinationNetwork: 'solana',
    });

    console.log('\n✅ Small payment successful!');
    console.log(`TX: ${txHash}`);
    console.log('\n📊 Fee breakdown:');
    console.log('   Payment: $0.05');
    console.log('   Fee: $0.01 (minimum enforced, 20% of payment)');
    console.log('   Recipient gets: $0.04\n');
    console.log('💡 Tip: Minimum $0.01 fee makes very small cross-chain payments expensive');
    console.log('   Consider batching small payments for better economics\n');
    
  } catch (error) {
    console.error('❌ Payment failed:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 2: Understanding ATA Creation Fees
// ============================================================================

async function exampleATAFeeBreakdown() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏦 Example 2: ATA Creation Fee Breakdown');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.solanaPrivateKey,
    network: 'solana',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log('What is ATA?');
  console.log('  Associated Token Account - required for receiving SPL tokens');
  console.log('  First-time USDC recipients need one created');
  console.log('  Costs ~0.002 SOL (~$0.40) to create\n');

  console.log('How Onchain handles it:');
  console.log('  1. Backend checks if recipient has USDC ATA');
  console.log('  2. If not, backend pays ~$0.40 to create it');
  console.log('  3. Backend recovers $0.40 from your payment');
  console.log('  4. Recipient receives: Payment - Processing Fee - $0.40\n');

  console.log('Example scenarios:\n');
  
  console.log('  Scenario A: Existing ATA');
  console.log('    Payment: $10.00');
  console.log('    Processing: $0.01 (0.1%)');
  console.log('    ATA: $0.00 (not needed)');
  console.log('    Recipient: $9.99 ✅\n');
  
  console.log('  Scenario B: Fresh wallet needing ATA');
  console.log('    Payment: $10.00');
  console.log('    Processing: $0.01 (0.1%)');
  console.log('    ATA: $0.40 (backend creates)');
  console.log('    Recipient: $9.59 ✅\n');
  
  console.log('  Scenario C: Insufficient payment');
  console.log('    Payment: $0.30');
  console.log('    Processing: $0.01 (0.1%)');
  console.log('    ATA: $0.40 (needed)');
  console.log('    Total fees: $0.41 > $0.30 ❌');
  console.log('    Result: REJECTED (insufficient)\n');

  console.log('💡 Tips:');
  console.log('   - SDK automatically detects ATA need');
  console.log('   - SDK rejects if amount < fees');
  console.log('   - You only pay once per recipient');
  console.log('   - Future payments to same recipient have no ATA fee\n');
}

// ============================================================================
// Example 3: Handling Insufficient Payment Amount
// ============================================================================

async function exampleInsufficientAmount() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  Example 3: Insufficient Payment (Expected Failure)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log('Attempting to pay $0.20 to fresh Solana wallet');
  console.log('This WILL FAIL because fees exceed payment:\n');

  try {
    await uplink.pay({
      to: 'Cjxho2tPvMbyb1RJvYWjzbfNQTZmT1cBYCLTxdwv3J7e',  // Fresh wallet
      amount: '0.20',  // Too small for ATA creation
      sourceNetwork: 'base',
      destinationNetwork: 'solana',
    });

    console.log('❌ This should not print - payment should have been rejected\n');
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient payment amount')) {
      console.log('✅ Payment correctly rejected!');
      console.log('Error message:\n');
      console.log(error.message);
      console.log('\n💡 This is EXPECTED behavior - SDK protects you from bad payments');
      console.log('   Minimum payment for fresh Solana wallet: $0.42 ($0.01 + $0.41)\n');
    } else {
      console.error('❌ Unexpected error:', error.message);
      throw error;
    }
  }
}

// ============================================================================
// Example 4: Cost Optimization Strategies
// ============================================================================

async function exampleCostOptimization() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Example 4: Cost Optimization Strategies');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Strategy 1: Same-chain when possible');
  console.log('  Base → Base:    $10 payment → $0.01 fee (0.1%)');
  console.log('  Base → Solana:  $10 payment → $0.01 fee (0.1%, $0.01 min)');
  console.log('  Result: Same cost! ✅\n');

  console.log('Strategy 2: Batch small payments');
  console.log('  Bad:  10 × $0.05 payments = 10 × $0.01 fee = $0.10 in fees (20%)');
  console.log('  Good: 1 × $0.50 payment = 1 × $0.01 fee = $0.01 in fees (2%)');
  console.log('  Savings: $0.09 (90% fee reduction!) ✅\n');

  console.log('Strategy 3: Check recipient ATA status before large batches');
  console.log('  If sending to 100 fresh Solana wallets:');
  console.log('  - Check if they need ATAs first');
  console.log('  - Group by ATA status');
  console.log('  - Consider one-time ATA setup payment');
  console.log('  - Then send actual payments (no ATA fee)\n');

  console.log('Strategy 4: Use appropriate priority');
  console.log('  - priority: "cost" → Routes to cheapest facilitator');
  console.log('  - priority: "speed" → Routes to fastest facilitator');
  console.log('  - priority: "balanced" → Best overall (default) ✅\n');
}

// ============================================================================
// Example 5: Fee Calculation Preview (No Payment)
// ============================================================================

async function exampleFeeEstimation() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧮 Example 5: Fee Calculation Examples');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Same-Chain (0.1% fee):');
  console.log('  $0.01 → $0.000001 fee → $0.009999 net');
  console.log('  $1.00 → $0.001000 fee → $0.999000 net');
  console.log('  $100  → $0.100000 fee → $99.900000 net\n');

  console.log('Cross-Chain (0.1% fee, $0.01 minimum):');
  console.log('  $0.05 → $0.01 fee (min) → $0.04 net (20% fee!)');
  console.log('  $0.10 → $0.01 fee (min) → $0.09 net (10% fee)');
  console.log('  $1.00 → $0.01 fee (min) → $0.99 net (1% fee)');
  console.log('  $100  → $0.10 fee       → $99.90 net (0.1% fee)\n');

  console.log('With ATA Creation (+$0.40):');
  console.log('  $0.50 → $0.01 + $0.40 = $0.41 fees → $0.09 net');
  console.log('  $1.00 → $0.01 + $0.40 = $0.41 fees → $0.59 net');
  console.log('  $10.0 → $0.01 + $0.40 = $0.41 fees → $9.59 net\n');

  console.log('💡 The SDK shows exact fee breakdown before signing!');
  console.log('   Look for the "Fee Breakdown" section in console output\n');
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function main() {
  console.log('\n🚀 Uplink SDK - Fee Handling Examples');
  console.log('======================================\n');
  
  if (!config.apiKey) {
    console.error('❌ ONCHAIN_API_KEY not set');
    process.exit(1);
  }

  try {
    // Educational examples (no actual payments)
    await exampleATAFeeBreakdown();
    await exampleCostOptimization();
    await exampleFeeEstimation();
    
    // Live examples (actual payments)
    if (config.basePrivateKey) {
      await exampleSmallCrossChainPayment();
      await exampleInsufficientAmount();
    }
    
    console.log('\n✅ All fee examples completed!\n');
    
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
  exampleSmallCrossChainPayment, 
  exampleATAFeeBreakdown, 
  exampleInsufficientAmount,
  exampleCostOptimization,
  exampleFeeEstimation,
};

