# Deployment Guide

## Environment Configuration

The Uplink SDK supports multiple environments through configuration.

### Default Behavior (Production)

By default, the SDK connects to **production**:

```typescript
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});
// Connects to: https://api.onchain.fi
```

### Testing/Staging

To use staging, explicitly set the `apiUrl`:

```typescript
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  apiUrl: 'https://staging.onchain.fi',
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});
```

Or use environment variable:

```bash
export UPLINK_API_URL=https://staging.onchain.fi
node your-script.js
```

## Environment Variables

### Required

- `ONCHAIN_API_KEY` - Your Onchain API key
- `UPLINK_PRIVATE_KEY` - Wallet private key (for Mode A)
- `BASE_PRIVATE_KEY` - Base network private key (for multi-network apps)
- `SOLANA_PRIVATE_KEY` - Solana network private key (for multi-network apps)

### Optional

- `UPLINK_API_URL` - Override API endpoint (default: `https://api.onchain.fi`)
- `SOLANA_RPC_URL` - Override Solana RPC (default: `https://api.mainnet-beta.solana.com`)

## Deployment Checklist

### Pre-Production

- [ ] Test with `apiUrl: 'https://staging.onchain.fi'`
- [ ] Verify all payments complete successfully
- [ ] Test error handling
- [ ] Verify idempotency works

### Production

- [ ] Remove any hardcoded `apiUrl` overrides
- [ ] Ensure `UPLINK_API_URL` env var is NOT set (or set to production)
- [ ] Verify production API key is set
- [ ] Monitor first transactions closely

## Common Mistakes

### ❌ DON'T: Hardcode staging in production

```typescript
// BAD - Will use staging in production!
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  apiUrl: 'https://staging.onchain.fi',  // ❌ WRONG!
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
});
```

### ✅ DO: Use environment-based configuration

```typescript
// GOOD - Defaults to production, can override via env var
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
  ...(process.env.UPLINK_API_URL && { apiUrl: process.env.UPLINK_API_URL })
});
```

### ✅ DO: Keep staging explicit and opt-in

```typescript
// GOOD - Clear when using staging
const isProduction = process.env.NODE_ENV === 'production';

const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  createAtaFeeAcceptance: true,
  minimumCrosschainFeeAcceptance: true,
  ...((!isProduction) && { apiUrl: 'https://staging.onchain.fi' })
});
```

## Testing

```bash
# Test with staging
export UPLINK_API_URL=https://staging.onchain.fi
npm test

# Test with production (default)
unset UPLINK_API_URL
npm test
```

## Monitoring

When deploying to production:

1. Start with small test transactions
2. Monitor API response times
3. Watch for any error patterns
4. Verify transaction hashes on block explorers

## Support

- Staging issues: Use for testing only
- Production issues: Contact dev@onchain.fi

