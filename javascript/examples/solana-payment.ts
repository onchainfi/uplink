/**
 * Solana payment example
 * 
 * Tests same-chain USDC payment on Solana.
 */

import { Uplink } from '../src/index.js';

// Load from environment variables
const API_KEY = process.env.ONCHAIN_API_KEY || '';
const PRIVATE_KEY = process.env.UPLINK_SOLANA_PRIVATE_KEY || '';

const RECIPIENT = process.env.TEST_RECIPIENT_SOLANA || 'SolanaAddressHere'; // Solana receiver
const AMOUNT = '$0.05'; // Test amount

async function main() {
  console.log('🚀 Uplink Solana Payment Example');
  console.log('=' .repeat(60));
  console.log();

  // Check environment variables
  if (!API_KEY) {
    console.error('❌ ONCHAIN_API_KEY not set');
    console.error('   Run: export ONCHAIN_API_KEY=your-key');
    process.exit(1);
  }

  if (!PRIVATE_KEY) {
    console.error('❌ UPLINK_SOLANA_PRIVATE_KEY not set');
    console.error('   Run: export UPLINK_SOLANA_PRIVATE_KEY=your-key');
    process.exit(1);
  }

  // Initialize Uplink for Solana
  const uplink = new Uplink({
    apiKey: API_KEY,
    privateKey: PRIVATE_KEY,
    network: 'solana',
    apiUrl: process.env.API_URL || 'https://api.onchain.fi',
  });

  console.log(`✓ Uplink initialized`);
  console.log(`✓ Network: solana`);
  console.log(`✓ Address: ${uplink.address}`);
  console.log();

  // Make payment
  console.log('💸 Making Solana payment...');
  console.log(`   From: ${uplink.address}`);
  console.log(`   To: ${RECIPIENT}`);
  console.log(`   Amount: ${AMOUNT}`);
  console.log();

  try {
    console.log('   🔐 Signing Solana transaction...');
    
    const txHash = await uplink.pay({
      to: RECIPIENT,
      amount: AMOUNT,
      priority: 'balanced',
      metadata: {
        test: 'uplink-js-solana',
        version: '0.1.0',
      },
    });

    console.log();
    console.log('✅ Solana payment successful!');
    console.log(`   Transaction: ${txHash}`);
    console.log(`   View on Solscan: https://solscan.io/tx/${txHash}`);
    console.log();
  } catch (error) {
    console.error('❌ Payment failed:', error);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

main().catch(console.error);

