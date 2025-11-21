# Server-Side Examples

Professional, production-ready server-side integration examples for Uplink SDK. These examples demonstrate how to build robust payment systems for AI agents and backend services.

## 📚 Examples Overview

### 1. Express Basic (`1-express-basic.ts`)
**Simple Express server integration**
- Basic payment endpoints
- Same-chain and cross-chain support
- Auto-network detection
- Health monitoring
- Perfect starting point

**Use when:** You need a quick API to accept payments

```bash
npm install express @onchainfi/uplink
tsx 1-express-basic.ts
```

**Endpoints:**
- `POST /pay` - Simple payment (auto-detects network)
- `POST /pay-crosschain` - Cross-chain payment
- `GET /health` - Health check

---

### 2. Express Production (`2-express-production.ts`)
**Full-featured production server**
- Database persistence (in-memory, easily adaptable)
- Idempotency for safe retries
- Webhook notifications
- Payment history & tracking
- Comprehensive error handling

**Use when:** You're building a production payment system

```bash
tsx 2-express-production.ts
```

**Features:**
- ✓ Idempotent payments via `orderId`
- ✓ Payment status tracking
- ✓ Webhook notifications
- ✓ Pagination & filtering
- ✓ Retry logic

**Endpoints:**
- `POST /payments` - Create payment with idempotency
- `POST /payments/crosschain` - Cross-chain payment
- `GET /payments` - List payments (paginated)
- `GET /payments/:id` - Get payment by ID
- `GET /payments/order/:orderId` - Get by order ID

---

### 3. Batch Processor (`3-batch-processor.ts`)
**Process multiple payments efficiently**
- Batch processing with rate limiting
- Automatic retries for failed payments
- Progress tracking
- CSV export
- Network grouping for efficiency

**Use when:** You need to process multiple payments at once

```bash
tsx 3-batch-processor.ts
```

**Use cases:**
- 💰 Payroll distribution
- 🎁 Airdrops
- 💸 Bulk refunds
- 📊 Mass payouts

**Features:**
- Configurable batch size
- Delay between batches (rate limiting)
- Retry failed payments automatically
- CSV import/export support

---

### 4. Webhook Listener (`4-webhook-listener.ts`)
**Listen for payment events**
- Webhook signature verification
- Automatic retry logic
- Duplicate detection
- Event logging
- Custom event handlers

**Use when:** You need to respond to payment events

```bash
tsx 4-webhook-listener.ts
```

**Events:**
- `payment.completed` - Payment successful
- `payment.failed` - Payment failed
- `payment.pending` - Payment processing

**Features:**
- HMAC-SHA256 signature verification
- Automatic retries (3 attempts)
- Duplicate detection
- Event history

**Endpoints:**
- `POST /webhook` - Production webhook
- `POST /test-webhook` - Test webhook with sample data
- `GET /events` - List processed events
- `GET /events/:paymentId` - Get event by payment ID

---

### 5. Payment Scheduler (`5-payment-scheduler.ts`)
**Schedule recurring and delayed payments**
- One-time delayed payments
- Recurring subscriptions
- Automatic retries
- Schedule management
- Real-time status tracking

**Use when:** You need scheduled or recurring payments

```bash
tsx 5-payment-scheduler.ts
```

**Use cases:**
- 💳 Subscription billing
- 📅 Scheduled payouts
- 🔒 Vesting schedules
- 🔁 Recurring expenses

**Features:**
- One-time and recurring schedules
- Configurable intervals
- End dates for finite schedules
- Automatic retry on failure
- Pause/resume support

---

## 🚀 Quick Start

### Prerequisites

```bash
npm install @onchainfi/uplink express
```

### Environment Variables

Create a `.env` file:

```bash
# Required
ONCHAIN_API_KEY=onchain_your_api_key_here
BASE_PRIVATE_KEY=0x...
SOLANA_PRIVATE_KEY=base58...

# Optional
API_URL=https://api.onchain.fi
PORT=3000

# Production features
WEBHOOK_URL=https://your-domain.com/webhook
WEBHOOK_SECRET=your-webhook-secret
```

### Run Examples

```bash
# Basic server
tsx 1-express-basic.ts

# Production server
tsx 2-express-production.ts

# Batch processor
tsx 3-batch-processor.ts

# Webhook listener
tsx 4-webhook-listener.ts

# Payment scheduler
tsx 5-payment-scheduler.ts
```

---

## 📖 Common Patterns

### Pattern 1: Idempotent Payments

Always use `idempotencyKey` to make payments safe to retry:

```typescript
await uplink.pay({
  to: recipient,
  amount: '1.00',
  idempotencyKey: 'order-123', // Same key = same payment
});
```

### Pattern 2: Network Detection

Auto-detect network from address format:

```typescript
function detectNetwork(address: string): 'base' | 'solana' {
  if (address.startsWith('0x')) return 'base';
  if (address.length >= 32 && address.length <= 44) return 'solana';
  throw new Error('Invalid address');
}
```

### Pattern 3: Error Handling

Always handle errors gracefully:

```typescript
try {
  const txHash = await uplink.pay({ to, amount });
  // Success: update database, send confirmation
} catch (error) {
  if (error instanceof AuthenticationError) {
    // API key issue
  } else if (error instanceof PaymentError) {
    // Payment failed: insufficient funds, network error, etc.
  }
}
```

### Pattern 4: Webhook Verification

Always verify webhook signatures:

```typescript
function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}
```

---

## 🏗️ Architecture Patterns

### Microservices Architecture

```
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼───────┐
│Payment│ │ Webhook  │
│Service│ │ Service  │
└───┬───┘ └──┬───────┘
    │        │
    └────┬───┘
         │
    ┌────▼─────┐
    │  Uplink  │
    └──────────┘
```

### Event-Driven Architecture

```
┌──────────┐    payment.created     ┌──────────┐
│   API    │─────────────────────▶ │  Queue   │
└──────────┘                        └────┬─────┘
                                         │
                  ┌──────────────────────┼──────────────────┐
                  │                      │                  │
            ┌─────▼─────┐        ┌──────▼────┐     ┌──────▼──────┐
            │  Payment  │        │ Analytics │     │ Notification│
            │ Processor │        │  Service  │     │   Service   │
            └───────────┘        └───────────┘     └─────────────┘
```

---

## 🔒 Security Best Practices

### 1. Environment Variables
✅ **DO:** Store keys in environment variables
```typescript
apiKey: process.env.ONCHAIN_API_KEY
```

❌ **DON'T:** Hardcode keys
```typescript
apiKey: 'onchain_abc123...' // Never do this!
```

### 2. Webhook Verification
✅ **DO:** Always verify webhook signatures
```typescript
if (!verifySignature(payload, signature, secret)) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### 3. Rate Limiting
✅ **DO:** Implement rate limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/pay', limiter);
```

### 4. Input Validation
✅ **DO:** Validate all inputs
```typescript
if (!recipient || !amount) {
  return res.status(400).json({ error: 'Missing required fields' });
}

if (parseFloat(amount) <= 0) {
  return res.status(400).json({ error: 'Invalid amount' });
}
```

---

## 📊 Monitoring & Logging

### Health Checks

Implement comprehensive health checks:

```typescript
app.get('/health', async (req, res) => {
  const checks = {
    uplink: await checkUplinkConnection(),
    database: await checkDatabaseConnection(),
    redis: await checkRedisConnection(),
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  
  res.status(healthy ? 200 : 503).json(checks);
});
```

### Structured Logging

Use structured logging for better debugging:

```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  event: 'payment_completed',
  orderId: 'order-123',
  txHash: '0x...',
  amount: '1.00',
  network: 'base',
}));
```

---

## 🧪 Testing

### Unit Tests

```typescript
describe('Payment API', () => {
  it('should create payment with valid inputs', async () => {
    const response = await request(app)
      .post('/payments')
      .send({
        orderId: 'test-001',
        recipient: '0x...',
        amount: '1.00',
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Payment Flow', () => {
  it('should process payment end-to-end', async () => {
    // Create payment
    const payment = await createPayment(...);
    expect(payment.status).toBe('pending');
    
    // Wait for completion
    await waitForPayment(payment.id);
    
    // Verify webhook received
    const webhook = await getWebhookEvent(payment.id);
    expect(webhook.event).toBe('payment.completed');
  });
});
```

---

## 🆘 Troubleshooting

### Common Issues

**Issue: "Invalid API key"**
- Check `ONCHAIN_API_KEY` is set correctly
- Verify key is active at [onchain.fi](https://onchain.fi)

**Issue: "Insufficient funds"**
- Check wallet balances on Base/Solana
- Ensure enough USDC for payment + fees

**Issue: "Network timeout"**
- Cross-chain payments take 20-30 seconds (CCTP attestation)
- Increase timeout: `timeout: 120` (seconds)

**Issue: "ATA creation fee too high"**
- For Solana destinations, new wallets need ATA (~$0.40)
- Set `createAtaFeeAcceptance: true` to acknowledge

---

## 📚 Additional Resources

- [Uplink Documentation](https://onchain.fi/docs/uplink)
- [API Reference](https://api.onchain.fi/docs)
- [Client-Side Examples](../client-side/README.md)
- [GitHub Issues](https://github.com/onchainfi/uplink/issues)
- [Discord Community](https://discord.gg/onchain)

---

## 💡 Pro Tips

1. **Use idempotency keys** - Always provide `idempotencyKey` for safe retries
2. **Batch when possible** - Process multiple payments in batches for efficiency
3. **Monitor webhooks** - Set up webhook listeners for real-time updates
4. **Handle retries** - Implement exponential backoff for failed payments
5. **Log everything** - Comprehensive logging helps debug issues
6. **Test in staging** - Use staging API for development: `https://staging.onchain.fi`

---

## 🤝 Contributing

Found an issue or have a suggestion? Open an issue on [GitHub](https://github.com/onchainfi/uplink/issues).

---

## 📄 License

AGPL-3.0 - See [LICENSE](../../LICENSE) for details.

