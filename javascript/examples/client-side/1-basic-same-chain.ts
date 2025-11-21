/**
 * Basic Same-Chain Payments
 * 
 * This example demonstrates simple same-chain USDC payments on Base and Solana.
 * Perfect for getting started with Uplink SDK.
 * 
 * Features:
 * - Base → Base payments (EVM)
 * - Solana → Solana payments
 * - Automatic fee calculation
 * - Clear console output
 */

import { Uplink } from '@onchainfi/uplink';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Get your API key: https://onchain.fi/get-api-key
  apiKey: process.env.ONCHAIN_API_KEY!,
  
  // Your wallet private keys (keep these secure!)
  basePrivateKey: process.env.BASE_PRIVATE_KEY!,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY!,
  
  // API endpoint (staging for testing, production by default)
  apiUrl: process.env.API_URL || 'https://api.onchain.fi',
};

// ============================================================================
// Example 1: Base → Base Payment
// ============================================================================

async function exampleBaseToBase() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📘 Example 1: Base → Base Payment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize Uplink for Base network
  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.basePrivateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    
    // REQUIRED: Acknowledge fee structure
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log(`Your wallet: ${uplink.address}`);
  console.log('Network: Base (Ethereum L2)');
  console.log('Payment type: Same-chain (two-hop via intermediate wallet)\n');

  try {
    // Make the payment
    const txHash = await uplink.pay({
      to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',  // Recipient
      amount: '0.10',                                     // $0.10 USDC
      priority: 'balanced',                               // Speed/cost balance
    });

    console.log('\n✅ Payment successful!');
    console.log(`Transaction: ${txHash}`);
    console.log(`View: https://basescan.org/tx/${txHash}`);
    
  } catch (error) {
    console.error('❌ Payment failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// ============================================================================
// Example 2: Solana → Solana Payment
// ============================================================================

async function exampleSolanaToSolana() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🟣 Example 2: Solana → Solana Payment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize Uplink for Solana network
  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.solanaPrivateKey,
    network: 'solana',
    apiUrl: config.apiUrl,
    
    // REQUIRED: Acknowledge fee structure
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log(`Your wallet: ${uplink.address}`);
  console.log('Network: Solana');
  console.log('Payment type: Same-chain (two-hop via intermediate wallet)\n');

  try {
    // Make the payment
    const txHash = await uplink.pay({
      to: '4apjKqtDAu8PBwTraCTsmQNv6c7mGnwq3vhQufroAxNg',  // Recipient
      amount: '0.10',                                         // $0.10 USDC
      priority: 'balanced',                                   // Speed/cost balance
    });

    console.log('\n✅ Payment successful!');
    console.log(`Transaction: ${txHash}`);
    console.log(`View: https://solscan.io/tx/${txHash}`);
    
  } catch (error) {
    console.error('❌ Payment failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// ============================================================================
// Example 3: Fee-Aware Payment (with ATA creation check)
// ============================================================================

async function exampleFeeAwarePayment() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 Example 3: Fee-Aware Payment (Solana with ATA)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.solanaPrivateKey,
    network: 'solana',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log(`Your wallet: ${uplink.address}`);
  console.log('Recipient: Fresh Solana wallet (needs ATA creation)');
  console.log('Expected fees: $0.000500 (processing) + $0.40 (ATA creation)\n');

  try {
    // Payment to fresh wallet - SDK will detect ATA need and apply fee
    const txHash = await uplink.pay({
      to: 'CHpBTdAwANWPfssfv2xcdF1cU8mzeU887h17YbZHavyo',  // Fresh wallet
      amount: '0.50',  // Need at least $0.41 for fees ($0.40 ATA + $0.005 processing)
      priority: 'balanced',
    });

    console.log('\n✅ Payment successful! ATA created and funded!');
    console.log(`Transaction: ${txHash}`);
    console.log(`View: https://solscan.io/tx/${txHash}`);
    console.log('\nNote: Recipient received ~$0.095 after $0.40 ATA creation fee');
    
  } catch (error) {
    console.error('❌ Payment failed:', error instanceof Error ? error.message : error);
    
    // This error is EXPECTED if amount is too small for ATA creation
    if (error instanceof Error && error.message.includes('Insufficient payment amount')) {
      console.log('\n💡 Tip: ATA creation requires ~$0.40. Ensure payment is at least $0.41');
    }
    
    throw error;
  }
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function main() {
  console.log('\n🚀 Uplink SDK - Basic Same-Chain Payment Examples');
  console.log('================================================\n');
  
  // Verify environment variables
  if (!config.apiKey) {
    console.error('❌ ONCHAIN_API_KEY not set');
    console.error('Get your key: https://onchain.fi/get-api-key\n');
    process.exit(1);
  }
  
  if (!config.basePrivateKey && !config.solanaPrivateKey) {
    console.error('❌ No private keys set (BASE_PRIVATE_KEY or SOLANA_PRIVATE_KEY)');
    console.error('Set at least one to run examples\n');
    process.exit(1);
  }

  try {
    // Run Base example if key is available
    if (config.basePrivateKey) {
      await exampleBaseToBase();
    }
    
    // Run Solana examples if key is available
    if (config.solanaPrivateKey) {
      await exampleSolanaToSolana();
      await exampleFeeAwarePayment();
    }
    
    console.log('\n✅ All examples completed successfully!\n');
    
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
export { exampleBaseToBase, exampleSolanaToSolana, exampleFeeAwarePayment };

