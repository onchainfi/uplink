/**
 * Error Handling Patterns
 * 
 * This example demonstrates how to handle all error scenarios gracefully:
 * - Authentication errors
 * - Payment failures
 * - Network errors
 * - Validation errors
 * - Insufficient amounts
 * - Fee mismatches
 * 
 * Learn best practices for production-ready error handling.
 */

import { 
  Uplink,
  AuthenticationError,
  PaymentError,
  NetworkError,
  ValidationError,
} from '@onchainfi/uplink';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.BASE_PRIVATE_KEY!,
  apiUrl: process.env.API_URL || 'https://api.onchain.fi',
};

// ============================================================================
// Example 1: Basic Error Handling
// ============================================================================

async function exampleBasicErrorHandling() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛡️  Example 1: Basic Error Handling');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.privateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  try {
    const txHash = await uplink.pay({
      to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
    });
    
    console.log('✅ Payment successful!');
    console.log(`TX: ${txHash}\n`);
    
  } catch (error) {
    // Always check if error is an Error instance
    if (error instanceof Error) {
      console.error('❌ Payment failed:', error.message);
      
      // Log full error for debugging (in development only)
      if (process.env.NODE_ENV === 'development') {
        console.error('Stack trace:', error.stack);
      }
    } else {
      console.error('❌ Unknown error:', error);
    }
    
    // Decide whether to retry, alert user, or fail gracefully
    // (don't throw - handle it)
  }
}

// ============================================================================
// Example 2: Typed Error Handling
// ============================================================================

async function exampleTypedErrorHandling() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Example 2: Typed Error Handling');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.privateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  try {
    const txHash = await uplink.pay({
      to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
      amount: '0.10',
    });
    
    console.log(`✅ Success: ${txHash}\n`);
    
  } catch (error) {
    // Handle different error types appropriately
    
    if (error instanceof AuthenticationError) {
      console.error('🔑 Authentication failed - check your API key');
      console.error('   Get a key: https://onchain.fi/get-api-key');
      // Don't retry - user needs to fix API key
      
    } else if (error instanceof ValidationError) {
      console.error('📝 Validation failed:', error.message);
      console.error('   Check your payment parameters');
      // Don't retry - fix the input data
      
    } else if (error instanceof PaymentError) {
      console.error('💸 Payment failed:', error.message);
      
      // Check if it's insufficient funds
      if (error.message.includes('Insufficient payment amount')) {
        console.error('   💡 Increase payment amount to cover fees');
      }
      // Check if it's a fee mismatch
      else if (error.message.includes('Fee validation failed')) {
        console.error('   ⚠️  SDK/server fee mismatch - please report this bug');
      }
      // Other payment errors - might be transient
      else {
        console.error('   💡 Payment may be retried');
      }
      
    } else if (error instanceof NetworkError) {
      console.error('🌐 Network error:', error.message);
      console.error('   💡 Retry recommended - may be temporary');
      // Implement exponential backoff retry
      
    } else {
      console.error('❓ Unknown error:', error);
      // Log to monitoring service
    }
  }
}

// ============================================================================
// Example 3: Production Error Handling with Retry Logic
// ============================================================================

async function exampleProductionErrorHandling() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏭 Example 3: Production Error Handling + Retry');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const uplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.privateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${MAX_RETRIES}...`);
      
      const txHash = await uplink.pay({
        to: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
        amount: '0.10',
        
        // Use idempotency key for safe retries
        idempotencyKey: 'payment-order-12345',
      });
      
      console.log(`✅ Success on attempt ${attempt}: ${txHash}\n`);
      return txHash; // Success - exit retry loop
      
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      
      if (error instanceof NetworkError) {
        console.error(`❌ Network error on attempt ${attempt}: ${error.message}`);
        
        if (isLastAttempt) {
          console.error('💥 All retries exhausted\n');
          throw error;
        }
        
        console.log(`⏳ Retrying in ${RETRY_DELAY_MS}ms...\n`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue; // Retry
        
      } else if (error instanceof ValidationError || error instanceof AuthenticationError) {
        // Don't retry validation/auth errors - they won't resolve
        console.error('❌ Non-retryable error:', error.message);
        throw error;
        
      } else {
        // Other errors - retry
        console.error(`❌ Error on attempt ${attempt}: ${error instanceof Error ? error.message : error}`);
        
        if (isLastAttempt) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }
    }
  }
}

// ============================================================================
// Example 4: Graceful Degradation
// ============================================================================

async function exampleGracefulDegradation() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 Example 4: Graceful Degradation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Scenario: Cross-chain payment fails, fallback to same-chain\n');

  const baseUplink = new Uplink({
    apiKey: config.apiKey,
    privateKey: config.privateKey,
    network: 'base',
    apiUrl: config.apiUrl,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  const recipient = '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0';
  const amount = '1.00';

  try {
    console.log('1️⃣  Attempting cross-chain payment...');
    
    const txHash = await baseUplink.pay({
      to: '4apjKqtDAu8PBwTraCTsmQNv6c7mGnwq3vhQufroAxNg',  // Solana recipient
      amount,
      sourceNetwork: 'base',
      destinationNetwork: 'solana',
    });
    
    console.log(`✅ Cross-chain successful: ${txHash}\n`);
    
  } catch (error) {
    console.log('❌ Cross-chain failed');
    console.log('2️⃣  Falling back to same-chain Base payment...\n');
    
    try {
      // Fallback: Pay to Base address instead
      const txHash = await baseUplink.pay({
        to: recipient,  // Base recipient (fallback)
        amount,
      });
      
      console.log(`✅ Fallback successful: ${txHash}`);
      console.log('💡 Paid on Base instead of Solana\n');
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed');
      console.error('   Alert: Manual intervention required\n');
      throw fallbackError;
    }
  }
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

async function main() {
  console.log('\n🚀 Uplink SDK - Error Handling Examples');
  console.log('========================================\n');
  
  if (!config.apiKey || !config.privateKey) {
    console.error('❌ Missing required environment variables');
    console.error('   ONCHAIN_API_KEY');
    console.error('   BASE_PRIVATE_KEY\n');
    process.exit(1);
  }

  try {
    await exampleBasicErrorHandling();
    await exampleTypedErrorHandling();
    await exampleProductionErrorHandling();
    await exampleGracefulDegradation();
    
    console.log('\n✅ All error handling examples completed!\n');
    
  } catch (error) {
    // Top-level catch - something went very wrong
    console.error('\n💥 Critical error in examples\n');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

