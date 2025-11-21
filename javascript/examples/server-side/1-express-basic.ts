/**
 * Express Server - Basic Integration
 * 
 * Simple Express server with Uplink integration for payment processing.
 * Perfect starting point for backend payment APIs.
 * 
 * Features:
 * - Single payment endpoint
 * - Health check
 * - Error handling
 * - CORS enabled
 * - Request validation
 */

import express from 'express';
import { Uplink } from '@onchainfi/uplink';

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  port: process.env.PORT || 3000,
  apiKey: process.env.ONCHAIN_API_KEY!,
  basePrivateKey: process.env.BASE_PRIVATE_KEY!,
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY!,
  apiUrl: process.env.API_URL || 'https://api.onchain.fi',
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
// INITIALIZE UPLINK (once at server startup)
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
// EXPRESS APP SETUP
// ============================================================================

const app = express();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    wallets: {
      base: uplinkBase.address,
      solana: uplinkSolana.address,
    },
  });
});

/**
 * POST /pay
 * 
 * Process a payment (auto-detects network from address)
 * 
 * Request body:
 * {
 *   "to": "0x... or Solana address",
 *   "amount": "1.00",
 *   "orderId": "order-123",
 *   "description": "Optional description"
 * }
 */
app.post('/pay', async (req, res) => {
  try {
    const { to, amount, orderId, description } = req.body;

    // Validate required fields
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: to',
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: amount',
      });
    }

    // Auto-detect network from address format
    const isSolanaAddress = !to.startsWith('0x') && to.length >= 32 && to.length <= 44;
    const network = isSolanaAddress ? 'solana' : 'base';
    const uplink = isSolanaAddress ? uplinkSolana : uplinkBase;

    console.log(`💸 Processing ${network} payment: ${amount} USDC to ${to.slice(0, 10)}...`);

    // Execute payment
    const txHash = await uplink.pay({
      to,
      amount,
      idempotencyKey: orderId,  // Safe retries
      metadata: {
        orderId,
        description,
        requestTime: new Date().toISOString(),
      },
    });

    console.log(`✅ Payment successful: ${txHash}\n`);

    // Return success
    res.json({
      success: true,
      txHash,
      network,
      amount,
      recipient: to,
      explorer: network === 'base'
        ? `https://basescan.org/tx/${txHash}`
        : `https://solscan.io/tx/${txHash}`,
    });

  } catch (error) {
    console.error('❌ Payment failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /pay-crosschain
 * 
 * Process a cross-chain payment
 * 
 * Request body:
 * {
 *   "from": "base" or "solana",
 *   "to": "base" or "solana",
 *   "recipient": "0x... or Solana address",
 *   "amount": "1.00",
 *   "orderId": "order-123"
 * }
 */
app.post('/pay-crosschain', async (req, res) => {
  try {
    const { from, to, recipient, amount, orderId } = req.body;

    // Validate required fields
    if (!from || !to || !recipient || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: from, to, recipient, amount',
      });
    }

    // Validate networks
    if (!['base', 'solana'].includes(from) || !['base', 'solana'].includes(to)) {
      return res.status(400).json({
        success: false,
        error: 'Supported networks: base, solana',
      });
    }

    // Get appropriate Uplink instance for source network
    const uplink = from === 'base' ? uplinkBase : uplinkSolana;

    console.log(`🌉 Processing cross-chain: ${from} → ${to}, ${amount} USDC`);

    // Execute payment
    const txHash = await uplink.pay({
      to: recipient,
      amount,
      sourceNetwork: from,
      destinationNetwork: to,
      idempotencyKey: orderId,
      metadata: {
        orderId,
        crosschain: true,
        requestTime: new Date().toISOString(),
      },
    });

    console.log(`✅ Cross-chain payment successful: ${txHash}\n`);

    // Return success
    res.json({
      success: true,
      txHash,
      sourceNetwork: from,
      destinationNetwork: to,
      amount,
      recipient,
      explorer: to === 'base'
        ? `https://basescan.org/tx/${txHash}`
        : `https://solscan.io/tx/${txHash}`,
    });

  } catch (error) {
    console.error('❌ Cross-chain payment failed:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /wallets
 * Get server wallet addresses
 */
app.get('/wallets', (_req, res) => {
  res.json({
    base: {
      address: uplinkBase.address,
      network: 'base',
    },
    solana: {
      address: uplinkSolana.address,
      network: 'solana',
    },
  });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Server error:', err);
  
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(config.port, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Express + Uplink Payment Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Server running on http://localhost:${config.port}`);
  console.log(`✅ Base wallet: ${uplinkBase.address}`);
  console.log(`✅ Solana wallet: ${uplinkSolana.address}\n`);
  
  console.log('Available endpoints:');
  console.log(`  GET  /health`);
  console.log(`  GET  /wallets`);
  console.log(`  POST /pay`);
  console.log(`  POST /pay-crosschain`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('Example requests:\n');
  console.log(`  # Same-chain payment`);
  console.log(`  curl -X POST http://localhost:${config.port}/pay \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"to":"0x4503...","amount":"1.00","orderId":"order-123"}'`);
  console.log();
  console.log(`  # Cross-chain payment`);
  console.log(`  curl -X POST http://localhost:${config.port}/pay-crosschain \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"from":"base","to":"solana","recipient":"4apj...","amount":"1.00"}'`);
  console.log();
});

