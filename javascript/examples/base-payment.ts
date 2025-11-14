/**
 * Simple Base (EVM) payment example
 * 
 * This example shows basic usage:
 * 1. Initialize Uplink with API key and private key
 * 2. Make a payment in one line
 */

import { Uplink } from '../src/index.js';

// Load from environment variables
const API_KEY = process.env.ONCHAIN_API_KEY || '';
const PRIVATE_KEY = process.env.UPLINK_TEST_PRIVATE_KEY || '';

const RECIPIENT = process.env.TEST_RECIPIENT_BASE || 'BaseAddressHere'; // Base receiver
const AMOUNT = '$0.01'; // Test amount

async function main() {
  console.log('🚀 Uplink Base Payment Example');
  console.log('=' .repeat(60));
  console.log();

  // Check environment variables
  if (!API_KEY) {
    console.error('❌ ONCHAIN_API_KEY not set');
    console.error('   Run: source ../.env');
    process.exit(1);
  }

  if (!PRIVATE_KEY) {
    console.error('❌ UPLINK_TEST_PRIVATE_KEY not set');
    console.error('   Run: source ../.env');
    process.exit(1);
  }

  // Initialize Uplink
  const uplink = new Uplink({
    apiKey: API_KEY,
    privateKey: PRIVATE_KEY,
    network: 'base',
    apiUrl: process.env.UPLINK_API_URL || 'https://api.onchain.fi',
  });

  console.log(`✓ Uplink initialized`);
  console.log(`✓ Network: base`);
  console.log(`✓ Address: ${uplink.address}`);
  console.log();

  // Make payment
  console.log('💸 Making payment...');
  console.log(`   From: ${uplink.address}`);
  console.log(`   To: ${RECIPIENT}`);
  console.log(`   Amount: ${AMOUNT}`);
  console.log();

  try {
    const txHash = await uplink.pay({
      to: RECIPIENT,
      amount: AMOUNT,
      priority: 'balanced',
      metadata: {
        test: 'uplink-js-base',
        version: '0.1.0',
      },
    });

    console.log();
    console.log('✅ Payment successful!');
    console.log(`   Transaction: ${txHash}`);
    console.log(`   View on BaseScan: https://basescan.org/tx/${txHash}`);
    console.log();
  } catch (error) {
    console.error('❌ Payment failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);

