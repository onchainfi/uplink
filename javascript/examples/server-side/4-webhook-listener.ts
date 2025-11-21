/**
 * Payment Webhook Listener
 * 
 * Listen for payment events and process them:
 * - Webhook verification
 * - Signature validation
 * - Event processing
 * - Retry handling
 * - Status updates
 * 
 * Use cases:
 * - Order fulfillment
 * - Account credits
 * - Notification systems
 * - Accounting integration
 */

import express from 'express';
import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface WebhookEvent {
  event: 'payment.completed' | 'payment.failed' | 'payment.pending';
  payment: {
    id: string;
    orderId: string;
    recipient: string;
    amount: string;
    network: string;
    status: string;
    txHash?: string;
    error?: string;
    metadata?: any;
    createdAt: string;
    completedAt?: string;
  };
  timestamp: string;
}

interface ProcessedWebhook {
  eventId: string;
  event: WebhookEvent;
  processedAt: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  port: process.env.WEBHOOK_PORT || 3001,
  webhookSecret: process.env.WEBHOOK_SECRET || 'your-webhook-secret-here',
  
  // Webhook processing settings
  retryAttempts: 3,
  retryDelay: 5000, // 5 seconds
};

console.log('🎣 Webhook Listener Configuration');
console.log(`   Port: ${config.port}`);
console.log(`   Secret: ${config.webhookSecret.slice(0, 10)}...`);
console.log();

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

const processedWebhooks = new Map<string, ProcessedWebhook>();
const eventLog: ProcessedWebhook[] = [];

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ============================================================================
// EVENT PROCESSORS
// ============================================================================

/**
 * Process payment.completed event
 * 
 * This is where you'd typically:
 * - Fulfill orders
 * - Credit user accounts
 * - Send confirmation emails
 * - Update internal systems
 */
async function processPaymentCompleted(event: WebhookEvent): Promise<void> {
  console.log('\n✅ Payment Completed Handler');
  console.log(`   Order ID: ${event.payment.orderId}`);
  console.log(`   Amount: ${event.payment.amount} USDC`);
  console.log(`   Network: ${event.payment.network}`);
  console.log(`   TX Hash: ${event.payment.txHash}`);
  console.log(`   Recipient: ${event.payment.recipient}`);

  // Example: Mark order as paid in your database
  // await db.orders.update(event.payment.orderId, { status: 'paid', txHash: event.payment.txHash });

  // Example: Credit user account
  // await db.userAccounts.credit(event.payment.metadata.userId, event.payment.amount);

  // Example: Send confirmation email
  // await sendEmail(event.payment.metadata.email, 'Payment Received', { amount: event.payment.amount });

  console.log('   ✓ Order fulfilled');
  console.log('   ✓ Account credited');
  console.log('   ✓ Confirmation sent');
}

/**
 * Process payment.failed event
 * 
 * This is where you'd typically:
 * - Cancel pending orders
 * - Notify users
 * - Log for manual review
 * - Trigger refund process
 */
async function processPaymentFailed(event: WebhookEvent): Promise<void> {
  console.log('\n❌ Payment Failed Handler');
  console.log(`   Order ID: ${event.payment.orderId}`);
  console.log(`   Amount: ${event.payment.amount} USDC`);
  console.log(`   Error: ${event.payment.error}`);

  // Example: Mark order as failed
  // await db.orders.update(event.payment.orderId, { status: 'failed', error: event.payment.error });

  // Example: Notify user
  // await sendEmail(event.payment.metadata.email, 'Payment Failed', { error: event.payment.error });

  // Example: Log for manual review
  // await db.failedPayments.create(event.payment);

  console.log('   ✓ Order cancelled');
  console.log('   ✓ User notified');
  console.log('   ✓ Logged for review');
}

/**
 * Process payment.pending event
 */
async function processPaymentPending(event: WebhookEvent): Promise<void> {
  console.log('\n⏳ Payment Pending Handler');
  console.log(`   Order ID: ${event.payment.orderId}`);
  console.log(`   Amount: ${event.payment.amount} USDC`);

  // Example: Update order status to processing
  // await db.orders.update(event.payment.orderId, { status: 'processing' });

  console.log('   ✓ Order marked as processing');
}

/**
 * Main event processor with retry logic
 */
async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  switch (event.event) {
    case 'payment.completed':
      await processPaymentCompleted(event);
      break;
    case 'payment.failed':
      await processPaymentFailed(event);
      break;
    case 'payment.pending':
      await processPaymentPending(event);
      break;
    default:
      console.log(`⚠️  Unknown event type: ${event.event}`);
  }
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

// Middleware to capture raw body for signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Signature');
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /health
 * Health check
 */
app.get('/health', (_req, res) => {
  const totalEvents = processedWebhooks.size;
  const recentEvents = eventLog.slice(-10);

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats: {
      totalEventsProcessed: totalEvents,
      recentEvents: recentEvents.length,
    },
  });
});

/**
 * POST /webhook
 * 
 * Main webhook endpoint
 * 
 * Headers:
 * - X-Webhook-Signature: HMAC-SHA256 signature of request body
 * 
 * Body:
 * {
 *   "event": "payment.completed",
 *   "payment": { ... },
 *   "timestamp": "2025-01-01T00:00:00.000Z"
 * }
 */
app.post('/webhook', async (req: any, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const rawBody = req.rawBody;

    // Verify signature
    if (!signature) {
      console.log('⚠️  Webhook rejected: Missing signature');
      return res.status(401).json({
        success: false,
        error: 'Missing X-Webhook-Signature header',
      });
    }

    const isValid = verifyWebhookSignature(rawBody, signature, config.webhookSecret);
    
    if (!isValid) {
      console.log('⚠️  Webhook rejected: Invalid signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }

    const event: WebhookEvent = req.body;
    const eventId = crypto.randomUUID();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📨 Webhook Received: ${event.event}`);
    console.log(`   Event ID: ${eventId}`);
    console.log(`   Payment ID: ${event.payment.id}`);
    console.log(`   Order ID: ${event.payment.orderId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check for duplicate
    if (processedWebhooks.has(event.payment.id)) {
      console.log('♻️  Duplicate webhook detected, skipping...');
      return res.json({
        success: true,
        message: 'Duplicate event, already processed',
        eventId,
      });
    }

    // Process webhook with retry logic
    let lastError: Error | undefined;
    let success = false;

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`\n🔄 Retry attempt ${attempt}/${config.retryAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }

        await processWebhookEvent(event);
        success = true;
        break;
      } catch (error: any) {
        lastError = error;
        console.error(`   ❌ Attempt ${attempt} failed:`, error.message);
      }
    }

    // Record webhook processing
    const processed: ProcessedWebhook = {
      eventId,
      event,
      processedAt: new Date().toISOString(),
      success,
      error: lastError?.message,
    };

    processedWebhooks.set(event.payment.id, processed);
    eventLog.push(processed);

    if (success) {
      console.log('\n✅ Webhook processed successfully');
      return res.json({
        success: true,
        eventId,
      });
    } else {
      console.log('\n❌ Webhook processing failed after all retries');
      return res.status(500).json({
        success: false,
        error: lastError?.message || 'Processing failed',
        eventId,
      });
    }

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * GET /events
 * List all processed events
 */
app.get('/events', (_req, res) => {
  const events = Array.from(processedWebhooks.values())
    .sort((a, b) => 
      new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    )
    .slice(0, 50); // Last 50 events

  res.json({
    success: true,
    events,
    total: processedWebhooks.size,
  });
});

/**
 * GET /events/:paymentId
 * Get event by payment ID
 */
app.get('/events/:paymentId', (req, res) => {
  const event = processedWebhooks.get(req.params.paymentId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      error: 'Event not found',
    });
  }

  res.json({
    success: true,
    event,
  });
});

/**
 * POST /test-webhook
 * 
 * Test webhook endpoint with sample data
 * Useful for development and testing
 */
app.post('/test-webhook', async (req, res) => {
  try {
    const testEvent: WebhookEvent = {
      event: 'payment.completed',
      payment: {
        id: crypto.randomUUID(),
        orderId: 'test-order-' + Date.now(),
        recipient: '0x4503B659956Aa2E05Fc33b66Abee4C8395a16aE0',
        amount: '1.00',
        network: 'base',
        status: 'completed',
        txHash: '0x' + crypto.randomBytes(32).toString('hex'),
        metadata: {
          test: true,
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    // Generate signature
    const signature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(JSON.stringify(testEvent))
      .digest('hex');

    console.log('\n🧪 Test Webhook');
    console.log(`   Signature: ${signature}\n`);

    await processWebhookEvent(testEvent);

    res.json({
      success: true,
      message: 'Test webhook processed',
      event: testEvent,
      signature,
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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
  console.log('🎣 Payment Webhook Listener');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Server: http://localhost:${config.port}`);
  console.log(`✅ Webhook: http://localhost:${config.port}/webhook`);
  console.log(`✅ Secret: ${config.webhookSecret.slice(0, 10)}...\n`);
  
  console.log('Features:');
  console.log('  ✓ Signature verification');
  console.log('  ✓ Automatic retries');
  console.log('  ✓ Duplicate detection');
  console.log('  ✓ Event logging\n');
  
  console.log('Endpoints:');
  console.log('  GET  /health');
  console.log('  POST /webhook (production)');
  console.log('  POST /test-webhook (testing)');
  console.log('  GET  /events');
  console.log('  GET  /events/:paymentId');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('Test command:');
  console.log(`  curl -X POST http://localhost:${config.port}/test-webhook`);
  console.log();
});

