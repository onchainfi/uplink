# Client-Side Examples

Professional, production-ready client-side integration examples for Uplink SDK. These examples are perfect for AI agents, bots, CLI tools, and automated payment systems.

## 📚 Examples Overview

### 1. Basic Same-Chain (`1-basic-same-chain.ts`)
**Simple same-chain payments on Base and Solana**
- Base → Base (EVM payments)
- Solana → Solana payments
- Automatic fee calculation
- Clear console output
- Perfect starting point

**Use when:** You need simple, same-chain USDC payments

```bash
tsx 1-basic-same-chain.ts
```

**What it covers:**
- ✓ Initializing Uplink for Base
- ✓ Initializing Uplink for Solana
- ✓ Making payments on each network
- ✓ Understanding fees
- ✓ Transaction confirmation

---

### 2. Cross-Chain (`2-cross-chain.ts`)
**Cross-chain payments via CCTP bridge**
- Base → Solana (EVM to Solana)
- Solana → Base (Solana to EVM)
- Automatic CCTP bridge coordination
- ATA creation handling
- ~15-20 second bridge time

**Use when:** You need to send USDC between Base and Solana

```bash
tsx 2-cross-chain.ts
```

**What it covers:**
- ✓ Cross-chain initialization
- ✓ Base → Solana payments
- ✓ Solana → Base payments
- ✓ CCTP bridge mechanics
- ✓ Bridge timing expectations

**Important:** Cross-chain payments have a minimum $0.01 fee and take ~15-20 seconds for CCTP attestation.

---

### 3. Handling Fees (`3-handling-fees.ts`)
**Understanding and handling fee scenarios**
- Same-chain fees (0.1% standard)
- Cross-chain fees (1% + $0.01 minimum)
- ATA creation fees (~$0.40 on Solana)
- Fee acceptance requirements
- Edge cases and validation

**Use when:** You need to understand the complete fee structure

```bash
tsx 3-handling-fees.ts
```

**Fee Breakdown:**

**Same-Chain (Base → Base, Solana → Solana):**
- Fee: 0.1% (standard tier)
- Example: $10.00 payment = $0.01 fee
- Recipient receives: $9.99

**Cross-Chain (Base ↔ Solana):**
- Fee: 1% with $0.01 minimum
- Example: $10.00 payment = $0.10 fee
- Recipient receives: $9.90

**Solana ATA Creation:**
- Cost: ~$0.40 (one-time, if recipient has no USDC account)
- Backend creates ATA and deducts from payment
- Example: $1.00 payment with ATA = $0.40 fee + $0.01 processing = $0.59 to recipient

**What it covers:**
- ✓ Fee configuration explained
- ✓ Small payment handling
- ✓ ATA creation scenarios
- ✓ Fee acceptance requirements
- ✓ Calculating net amounts

---

### 4. Error Handling (`4-error-handling.ts`)
**Comprehensive error handling patterns**
- Authentication errors (invalid API key)
- Validation errors (invalid addresses, amounts)
- Payment errors (insufficient funds, network issues)
- Network errors (timeouts, connectivity)
- Retry strategies with exponential backoff

**Use when:** You need robust error handling for production

```bash
tsx 4-error-handling.ts
```

**Error Types:**

```typescript
AuthenticationError    // Invalid API key
ValidationError        // Invalid input (address, amount)
PaymentError          // Payment failed (funds, network)
NetworkError          // Request timeout, connectivity
```

**What it covers:**
- ✓ All error types explained
- ✓ Try-catch patterns
- ✓ Error recovery strategies
- ✓ Exponential backoff retry
- ✓ User-friendly error messages
- ✓ Logging best practices

---

### 5. Advanced Features (`5-advanced-features.ts`)
**Advanced SDK capabilities**
- Idempotency (safe retries with same key)
- Metadata tracking (custom data)
- Priority routing (speed/cost/reliability)
- Pre-signed transactions (Mode B)
- Production patterns

**Use when:** You need advanced features for production systems

```bash
tsx 5-advanced-features.ts
```

**Features Demonstrated:**

**Idempotency:**
```typescript
await uplink.pay({
  to: recipient,
  amount: '10.00',
  idempotencyKey: 'unique-key-123', // Same key = same result
});
```

**Metadata:**
```typescript
await uplink.pay({
  to: recipient,
  amount: '10.00',
  metadata: {
    orderId: 'order-123',
    customerId: 'user-456',
    purpose: 'subscription',
  }
});
```

**Priority Routing:**
```typescript
// Optimize for speed
await uplink.pay({ to, amount, priority: 'speed' });

// Optimize for cost
await uplink.pay({ to, amount, priority: 'cost' });

// Optimize for reliability
await uplink.pay({ to, amount, priority: 'reliability' });
```

**What it covers:**
- ✓ Idempotency for safe retries
- ✓ Custom metadata tracking
- ✓ Priority routing strategies
- ✓ Pre-signed transactions (Mode B)
- ✓ Production-ready patterns

---

## 🚀 Quick Start

### Prerequisites

```bash
npm install @onchainfi/uplink
```

### Environment Variables

Create a `.env` file:

```bash
# Required
ONCHAIN_API_KEY=onchain_your_api_key_here
BASE_PRIVATE_KEY=0x...
SOLANA_PRIVATE_KEY=base58...

# Optional
API_URL=https://api.onchain.fi  # Use staging for testing
```

**Get API Key:** [onchain.fi/get-api-key](https://onchain.fi/get-api-key)

### Run Examples

```bash
# Start with basics
tsx 1-basic-same-chain.ts

# Try cross-chain
tsx 2-cross-chain.ts

# Understand fees
tsx 3-handling-fees.ts

# Learn error handling
tsx 4-error-handling.ts

# Explore advanced features
tsx 5-advanced-features.ts
```

---

## 📖 Common Patterns

### Pattern 1: Initialize Uplink

```typescript
import { Uplink } from '@onchainfi/uplink';

const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.BASE_PRIVATE_KEY!,
  network: 'base', // or 'solana'
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});
```

### Pattern 2: Simple Payment

```typescript
const txHash = await uplink.pay({
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  amount: '10.00', // USDC amount
});

console.log(`Payment successful: ${txHash}`);
```

### Pattern 3: Cross-Chain Payment

```typescript
const txHash = await uplink.pay({
  to: 'SolanaAddress...',
  amount: '10.00',
  sourceNetwork: 'base',
  destinationNetwork: 'solana',
});

// Returns destination chain txHash (Solana in this case)
```

### Pattern 4: Safe Retry with Idempotency

```typescript
const orderId = 'order-123';

try {
  const txHash = await uplink.pay({
    to: recipient,
    amount: '10.00',
    idempotencyKey: orderId,
  });
} catch (error) {
  // Safe to retry - same key returns same result
  const txHash = await uplink.pay({
    to: recipient,
    amount: '10.00',
    idempotencyKey: orderId, // Same key!
  });
}
```

### Pattern 5: Error Handling

```typescript
import { 
  AuthenticationError, 
  PaymentError, 
  NetworkError 
} from '@onchainfi/uplink';

try {
  const txHash = await uplink.pay({ to, amount });
  // Success
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof PaymentError) {
    console.error('Payment failed:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network timeout');
  }
}
```

---

## 🏗️ Use Cases

### AI Agent Payments

```typescript
// Agent pays for API calls
async function payForAPICredits(amount: string) {
  const uplink = new Uplink({
    apiKey: process.env.ONCHAIN_API_KEY!,
    privateKey: process.env.AGENT_PRIVATE_KEY!,
    network: 'base',
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  return await uplink.pay({
    to: API_PROVIDER_ADDRESS,
    amount,
    metadata: {
      agentId: 'agent-001',
      service: 'api-credits',
      timestamp: Date.now(),
    },
  });
}
```

### Bot Payments

```typescript
// Discord bot processes tips
async function sendTip(
  fromUserId: string, 
  toAddress: string, 
  amount: string
) {
  const uplink = new Uplink({
    apiKey: process.env.ONCHAIN_API_KEY!,
    privateKey: process.env.BOT_PRIVATE_KEY!,
    network: 'solana',
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  const txHash = await uplink.pay({
    to: toAddress,
    amount,
    idempotencyKey: `tip-${fromUserId}-${Date.now()}`,
    metadata: {
      type: 'tip',
      from: fromUserId,
      platform: 'discord',
    },
  });

  return txHash;
}
```

### CLI Tool Payments

```typescript
// Command line payment tool
async function cliPay(recipient: string, amount: string) {
  // Auto-detect network from address
  const network = recipient.startsWith('0x') ? 'base' : 'solana';
  
  const uplink = new Uplink({
    apiKey: process.env.ONCHAIN_API_KEY!,
    privateKey: process.env[`${network.toUpperCase()}_PRIVATE_KEY`]!,
    network,
    createAtaFeeAcceptance: true,
    minimumCrosschainFeeAcceptance: true,
  });

  console.log(`Sending ${amount} USDC to ${recipient}...`);
  
  const txHash = await uplink.pay({ to: recipient, amount });
  
  console.log(`✅ Success! TX: ${txHash}`);
  return txHash;
}
```

---

## 🔒 Security Best Practices

### 1. Never Hardcode Private Keys

✅ **DO:**
```typescript
privateKey: process.env.BASE_PRIVATE_KEY
```

❌ **DON'T:**
```typescript
privateKey: '0x1234567890...' // Never!
```

### 2. Use Environment Variables

```bash
# .env file (never commit this!)
ONCHAIN_API_KEY=onchain_abc123...
BASE_PRIVATE_KEY=0x...
SOLANA_PRIVATE_KEY=base58...
```

```typescript
// Load with dotenv
import 'dotenv/config';

const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.BASE_PRIVATE_KEY!,
});
```

### 3. Validate Inputs

```typescript
function validateAmount(amount: string): boolean {
  const value = parseFloat(amount);
  return !isNaN(value) && value > 0;
}

function validateAddress(address: string, network: string): boolean {
  if (network === 'base') {
    return address.startsWith('0x') && address.length === 42;
  } else {
    return address.length >= 32 && address.length <= 44;
  }
}
```

### 4. Handle Errors Gracefully

```typescript
async function safePayment(to: string, amount: string) {
  try {
    const txHash = await uplink.pay({ to, amount });
    return { success: true, txHash };
  } catch (error) {
    console.error('Payment failed:', error);
    return { success: false, error: error.message };
  }
}
```

---

## 📊 Fee Calculator

### Same-Chain Fees

```typescript
function calculateSameChainFees(amount: number) {
  const feePercent = 0.001; // 0.1%
  const processingFee = amount * feePercent;
  const netAmount = amount - processingFee;
  
  return {
    grossAmount: amount,
    processingFee,
    netAmount,
  };
}

// Example: $100 payment
// Processing: $0.10 (0.1%)
// Recipient receives: $99.90
```

### Cross-Chain Fees

```typescript
function calculateCrossChainFees(amount: number, hasATA: boolean = true) {
  const feePercent = 0.01; // 1%
  const minimumFee = 0.01; // $0.01 minimum
  
  let processingFee = Math.max(amount * feePercent, minimumFee);
  let ataFee = hasATA ? 0 : 0.40; // $0.40 if ATA needed
  let totalFees = processingFee + ataFee;
  let netAmount = Math.max(0, amount - totalFees);
  
  return {
    grossAmount: amount,
    processingFee,
    ataFee,
    totalFees,
    netAmount,
  };
}

// Example: $10 Base → Solana (existing ATA)
// Processing: $0.10 (1%)
// ATA: $0.00 (already exists)
// Recipient receives: $9.90

// Example: $1 Base → Solana (new wallet)
// Processing: $0.01 (1%, but minimum applied)
// ATA: $0.40 (needs creation)
// Total fees: $0.41
// Recipient receives: $0.59
```

---

## 🧪 Testing

### Test in Staging

```typescript
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.BASE_PRIVATE_KEY!,
  network: 'base',
  apiUrl: 'https://staging.onchain.fi', // Staging environment
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});
```

### Test Small Amounts

Start with small test payments:

```typescript
// Test with $0.10
const txHash = await uplink.pay({
  to: testRecipient,
  amount: '0.10',
});
```

### Verify Transactions

```typescript
const txHash = await uplink.pay({ to, amount });

// Base: Check on BaseScan
console.log(`View on BaseScan: https://basescan.org/tx/${txHash}`);

// Solana: Check on Solscan
console.log(`View on Solscan: https://solscan.io/tx/${txHash}`);
```

---

## 🆘 Troubleshooting

### Common Issues

**Issue: "createAtaFeeAcceptance must be set to true"**

Solution:
```typescript
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.SOLANA_PRIVATE_KEY!,
  network: 'solana',
  createAtaFeeAcceptance: true, // ← Required!
  minimumCrosschainFeeAcceptance: true,
});
```

**Issue: "minimumCrosschainFeeAcceptance must be set to true"**

Solution: Set both fee acceptance flags:
```typescript
createAtaFeeAcceptance: true,
minimumCrosschainFeeAcceptance: true,
```

**Issue: "Invalid API key"**

Solutions:
- Check API key is correct
- Verify key is active at [onchain.fi](https://onchain.fi)
- Ensure no extra spaces in environment variable

**Issue: "Insufficient payment amount"**

Solution: Payment must cover fees
```typescript
// ❌ BAD: $0.10 with $0.40 ATA fee
await uplink.pay({ to, amount: '0.10' }); // Will fail!

// ✅ GOOD: $1.00 covers $0.40 ATA + $0.01 processing
await uplink.pay({ to, amount: '1.00' }); // Success!
```

**Issue: "Cross-chain payment timeout"**

Solution: Cross-chain takes 15-20 seconds
```typescript
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.BASE_PRIVATE_KEY!,
  network: 'base',
  timeout: 120, // Increase timeout to 120 seconds
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});
```

---

## 💡 Pro Tips

1. **Always use idempotency keys** for production payments
2. **Start with small amounts** when testing
3. **Handle errors gracefully** - network issues happen
4. **Log transaction hashes** for tracking and support
5. **Test in staging first** before production
6. **Validate inputs** before calling the API
7. **Account for fees** when calculating amounts
8. **Use metadata** to track payment purposes

---

## 📚 Additional Resources

- [Uplink SDK Documentation](https://onchain.fi/docs/uplink)
- [API Reference](https://api.onchain.fi/docs)
- [Server-Side Examples](../server-side/README.md)
- [Get API Key](https://onchain.fi/get-api-key)
- [GitHub Issues](https://github.com/onchainfi/uplink/issues)
- [Discord Community](https://discord.gg/onchain)

---

## 🤝 Contributing

Found an issue or have a suggestion? Open an issue on [GitHub](https://github.com/onchainfi/uplink/issues).

---

## 📄 License

AGPL-3.0 - See [LICENSE](../../LICENSE) for details.

