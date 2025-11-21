/**
 * Cross-Chain Payments
 * 
 * This example demonstrates cross-chain USDC payments via CCTP bridge.
 * Supports Base ↔ Solana transfers with automatic bridge handling.
 * 
 * Features:
 * - Base → Solana (EVM to Solana)
 * - Solana → Base (Solana to EVM)
 * - Automatic CCTP bridge coordination
 * - ATA creation handling
 * - Minimum fee enforcement ($0.01)
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
// Example 1: Base → Solana (Cross-Chain)
// ============================================================================

async function exampleBaseToSolana() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌉 Example 1: Base → Solana (Cross-Chain)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize Uplink for Base (source network)
  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log(`Source wallet (Base): ${uplink.address}`);
  console.log('Payment type: Cross-chain (CCTP bridge)');
  console.log('Bridge time: ~15-20 seconds\n');

  try {
    const txHash = await uplink.pay({
      to: '4apjKqtDAu8PBwTraCTsmQNv6c7mGnwq3vhQufroAxNg',  // Solana recipient
      amount: '1.00',                                         // $1.00 USDC
      sourceNetwork: 'base',                                  // Explicitly set source
      destinationNetwork: 'solana',                           // Explicitly set destination
      priority: 'balanced',
      
      // Optional: Track this payment in your system
      metadata: {
        orderId: 'order-12345',
        customerEmail: 'customer@example.com',
      },
    });

    console.log('\n✅ Cross-chain payment successful!');
    console.log(`Destination TX (Solana): ${txHash}`);
    console.log(`View: https://solscan.io/tx/${txHash}`);
    console.log('\n💡 Funds bridged via CCTP and arrived on Solana');
    console.log('   Expected fee: $0.01 (0.1% with $0.01 minimum)');
    console.log('   Recipient receives: ~$0.99\n');
    
  } catch (error) {
    console.error('❌ Payment failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// ============================================================================
// Example 2: Solana → Base (Cross-Chain)
// ============================================================================

async function exampleSolanaToBase() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌉 Example 2: Solana → Base (Cross-Chain)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize Uplink for Solana (source network)
  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.solanaPrivateKey,
    network: 'solana',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log(`Source wallet (Solana): ${uplink.address}`);
  console.log('Payment type: Cross-chain (CCTP bridge)');
  console.log('Bridge time: ~15-20 seconds\n');

  try {
    const txHash = await uplink.pay({
      to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',    // Base recipient
      amount: '1.00',                                         // $1.00 USDC
      sourceNetwork: 'solana',                                // Explicitly set source
      destinationNetwork: 'base',                             // Explicitly set destination
      priority: 'balanced',
    });

    console.log('\n✅ Cross-chain payment successful!');
    console.log(`Destination TX (Base): ${txHash}`);
    console.log(`View: https://basescan.org/tx/${txHash}`);
    console.log('\n💡 Funds bridged via CCTP and arrived on Base');
    console.log('   Expected fee: $0.01 (0.1% with $0.01 minimum)');
    console.log('   Recipient receives: ~$0.99\n');
    
  } catch (error) {
    console.error('❌ Payment failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// ============================================================================
// Example 3: Base → Solana with ATA Creation
// ============================================================================

async function exampleBaseToSolanaFreshWallet() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌉 Example 3: Base → Solana (Fresh Wallet + ATA)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log(`Source wallet (Base): ${uplink.address}`);
  console.log('Recipient: Fresh Solana wallet (needs USDC account creation)');
  console.log('Expected fees: $0.01 (processing) + $0.40 (ATA creation)\n');

  try {
    // Pay to fresh wallet - SDK automatically detects ATA need and applies fee
    const txHash = await uplink.pay({
      to: 'Cjxho2tPvMbyb1RJvYWjzbfNQTZmT1cBYCLTxdwv3J7e',  // Fresh Solana wallet
      amount: '1.00',                                         // Need at least $0.41 for fees
      sourceNetwork: 'base',
      destinationNetwork: 'solana',
      priority: 'balanced',
    });

    console.log('\n✅ Cross-chain payment successful!');
    console.log(`Destination TX (Solana): ${txHash}`);
    console.log(`View: https://solscan.io/tx/${txHash}`);
    console.log('\n💡 ATA created and funded on Solana');
    console.log('   Processing fee: $0.01');
    console.log('   ATA creation: $0.40');
    console.log('   Recipient receives: ~$0.59\n');
    
  } catch (error) {
    console.error('❌ Payment failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function main() {
  console.log('\n🚀 Uplink SDK - Cross-Chain Payment Examples');
  console.log('==============================================\n');
  
  // Verify configuration
  if (!config.apiKey) {
    console.error('❌ ONCHAIN_API_KEY not set');
    console.error('Get your key: https://onchain.fi/get-api-key\n');
    process.exit(1);
  }

  try {
    // Run Base → Solana examples
    if (config.basePrivateKey) {
      await exampleBaseToSolana();
      await exampleBaseToSolanaFreshWallet();
    }
    
    // Run Solana → Base example
    if (config.solanaPrivateKey) {
      await exampleSolanaToBase();
    }
    
    console.log('\n✅ All cross-chain examples completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Example failed\n');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// Export for use in other scripts
export { exampleBaseToSolana, exampleSolanaToBase, exampleBaseToSolanaFreshWallet };

