# Onchain Uplink

<p>
  JavaScript/TypeScript SDK for making x402 payments on Base and Solana.
</p>

## Quickstart

**1. Install**
```bash
npm install @onchainfi/uplink
```

**2. Get API Key**

Visit [onchain.fi/get-api-key](https://onchain.fi/get-api-key)

**3. Make a Payment**
```typescript
import { Uplink } from '@onchainfi/uplink';

const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  network: 'base',  // or 'solana'
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});

const txHash = await uplink.pay({
  to: '0xRecipient...',
  amount: '$10'
});

console.log(`Paid! TX: ${txHash}`);
```

That's it! Same-chain payments on Base and Solana.

---

## 📚 Examples

**New to Uplink?** Check out our comprehensive examples:

- 🎯 **[Client-Side Examples](./examples/client-side/)** - AI agents, bots, CLI tools (5 examples)
- 🚀 **[Server-Side Examples](./examples/server-side/)** - APIs, backend services (5 examples)

Both include detailed READMEs with patterns, best practices, and real-world use cases.

---

## Installation

```bash
npm install @onchainfi/uplink
# or
yarn add @onchainfi/uplink
# or
pnpm add @onchainfi/uplink
```

## Full Example

```typescript
import { Uplink } from '@onchainfi/uplink';

// Initialize
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  network: 'base',
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});

// Make a payment
const txHash = await uplink.pay({
  to: '0xRecipient...',
  amount: '$10.50'
});
console.log(`Payment sent: ${txHash}`);
```

## Two Modes

### Mode A: SDK Signs (Convenience)

SDK handles signing with your private key:

```typescript
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});

const txHash = await uplink.pay({
  to: '0xRecipient...',
  amount: '$10'
});
```

### Mode B: Pre-Signed (Advanced/Secure)

You sign externally (hardware wallet, custom signer, etc.):

```typescript
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});

// Sign with your external signer
const paymentHeader = await myExternalSigner.sign({
  to: '0xRecipient...',
  amount: '10.00'
});

// Pass pre-signed header
const txHash = await uplink.pay({
  to: '0xRecipient...',
  amount: '$10',
  paymentHeader
});
```

## Amount Formats

All these work:

```typescript
await uplink.pay({ to: '0x...', amount: '$10' });      // Dollar sign
await uplink.pay({ to: '0x...', amount: '10.50' });    // Plain number
await uplink.pay({ to: '0x...', amount: '10 USDC' });  // With token
```


## Advanced Features

### Idempotency (Safe Retries)

```typescript
const txHash = await uplink.pay({
  to: '0x...',
  amount: '$10',
  idempotencyKey: 'unique-payment-id-123'
});

// Retry safe - same key returns same tx_hash
const txHash2 = await uplink.pay({
  to: '0x...',
  amount: '$10',
  idempotencyKey: 'unique-payment-id-123'
});

// txHash === txHash2
```

### Metadata Tracking

```typescript
const txHash = await uplink.pay({
  to: '0x...',
  amount: '$10',
  metadata: {
    agent_id: 'gpt-4-assistant',
    task_id: 'abc-123',
    purpose: 'API credits'
  }
});
```

### Routing Priority

```typescript
// Optimize for speed
await uplink.pay({ to: '0x...', amount: '$10', priority: 'speed' });

// Optimize for cost
await uplink.pay({ to: '0x...', amount: '$10', priority: 'cost' });

// Optimize for reliability
await uplink.pay({ to: '0x...', amount: '$10', priority: 'reliability' });

// Balanced (default)
await uplink.pay({ to: '0x...', amount: '$10', priority: 'balanced' });
```

## Error Handling

```typescript
import {
  SamechainClient,
  PaymentError,
  AuthenticationError,
  NetworkError
} from '@onchainfi/uplink';

try {
  const txHash = await uplink.pay({ to: '0x...', amount: '$10' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof PaymentError) {
    console.error(`Payment failed: ${error.reason}`);
  } else if (error instanceof NetworkError) {
    console.error('Network request failed');
  }
}
```

## Configuration

```typescript
const uplink = new Uplink({
  apiKey: 'onchain_xxx',
  privateKey: '0x...',
  network: 'base',                      // Default: 'base'
  apiUrl: 'https://api.onchain.fi',     // Default: 'https://api.onchain.fi' (production)
  maxRetries: 3,                        // Default: 3
  retryDelay: 1.0,                      // Default: 1.0 (seconds)
  timeout: 120.0,                       // Default: 120.0 (seconds)
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',  // Default: Solana mainnet RPC
  createAtaFeeAcceptance: true,         // Required: Acknowledge ATA fees
  minimumCrosschainFeeAcceptance: true, // Required: Acknowledge cross-chain minimums
});
```

### Environment Configuration

**Production (Default):**
```typescript
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
  // Uses production API: https://api.onchain.fi
});
```

**Staging/Testing:**
```typescript
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  apiUrl: 'https://staging.onchain.fi',  // Override for testing
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});
```

Or via environment variable:
```bash
export UPLINK_API_URL=https://staging.onchain.fi
```

## Security Best Practices

### ✅ DO: Use Environment Variables

```typescript
import { Uplink } from '@onchainfi/uplink';

const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});
```

### ❌ DON'T: Hardcode Keys

```typescript
// BAD - Will trigger security warning
const uplink = new Uplink({
  apiKey: 'onchain_abc123...',
  privateKey: '0x1234567...'
});
```

## Getting API Keys

1. **Onchain API Key**: Visit [onchain.fi/get-api-key](https://onchain.fi/get-api-key)
2. **Private Key**: Use your wallet's export function (store securely!)

## Requirements

- Node.js >= 18.0.0 (for native fetch)
- TypeScript (optional, but recommended)

## License

AGPL-3.0

## Links

- [Documentation](https://onchain.fi/docs/uplink)
- [Examples](./examples/) - Client-side & server-side examples
- [GitHub](https://github.com/onchainfi/uplink)
- [Support](mailto:dev@onchain.fi)

