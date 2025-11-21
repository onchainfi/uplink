# Changelog

All notable changes to the Uplink SDK will be documented in this file.

## [2.1.1] - 2024-11-21

### 📝 Documentation

**Updates:**
- Clarified Mode A vs Mode B in server-side README
- Added "How it works" sections explaining where private keys are stored
- Made explicit that private keys NEVER leave user's server/client
- Added complete Mode B signing example with EIP-712 for Base
- Updated comparison table with security clarifications

**Key Clarifications:**
- Mode A: Private key on YOUR server, signing happens locally, only signed tx sent to API
- Mode B: Private key on client/hardware, never touches server, only signed tx sent to API
- Both modes: Private keys NEVER sent to Onchain API

---

## [2.1.0] - 2024-11-21

### 📚 Examples & Documentation

**New Examples:**
- ✅ **10 comprehensive examples** added (5 client-side, 5 server-side)
- ✅ **Client-side examples** for AI agents, bots, and CLI tools
  - Basic same-chain payments
  - Cross-chain payments (Base ↔ Solana)
  - Fee handling and edge cases
  - Error handling patterns
  - Advanced features (idempotency, metadata, priority)
- ✅ **Server-side examples** for APIs and backend services
  - Express basic integration
  - Production-ready server with database
  - Batch payment processor
  - Webhook listener with signature verification
  - Payment scheduler (recurring & delayed)
- ✅ **Comprehensive READMEs** for both client and server examples
  - Common patterns and best practices
  - Security guidelines
  - Architecture patterns
  - Troubleshooting guides
  - Real-world use cases

**Documentation Updates:**
- Updated all READMEs with fee acceptance flags
- Added examples section to main documentation
- Updated DEPLOYMENT.md with multi-network setup
- Consistent initialization patterns across all docs

**What Developers Get:**
- Copy-paste ready code for every use case
- Professional patterns for production
- Security best practices built-in
- Clear learning path from basic to advanced

### 🚀 Major Changes - Fee Transparency & Validation

**Breaking Changes:**
- **REQUIRED**: `createAtaFeeAcceptance: true` must be set in config
- **REQUIRED**: `minimumCrosschainFeeAcceptance: true` must be set in config
- Agents must explicitly acknowledge fee structure before making payments

**New Features:**

### 🚀 Major Changes - Fee Transparency & Validation

**Breaking Changes:**
- **REQUIRED**: `createAtaFeeAcceptance: true` must be set in config
- **REQUIRED**: `minimumCrosschainFeeAcceptance: true` must be set in config
- Agents must explicitly acknowledge fee structure before making payments

**New Features:**
- ✅ **Transparent Fee Calculation** - SDK now calculates and displays all fees upfront
- ✅ **ATA Fee Awareness** - $0.40 ATA creation fee automatically checked and applied
- ✅ **Minimum Fee Enforcement** - $0.01 minimum for cross-chain payments
- ✅ **Server-Side Validation** - All fees validated against backend `FeeCalculationService`
- ✅ **Detailed Logging** - Clear breakdown of gross amount, fees, and net recipient amount
- ✅ **Insufficient Funds Detection** - Rejects payments where amount < fees

**Technical Changes:**
- Added `POST /v1/uplink/prepare-payment` endpoint integration
- Fee calculation now matches backend `FeeCalculationService` exactly
- Added `createAtaFeeAcceptance` and `minimumCrosschainFeeAcceptance` config options
- Enhanced error messages with fee breakdowns
- Fee validation prevents double-calculation bugs

**What Agents Get:**
- Know exact costs BEFORE signing transactions
- Clear error messages when payments would fail
- Protection against insufficient payment amounts
- Automatic ATA creation handling for fresh Solana wallets

**Migration from 2.0.x:**
```typescript
// OLD (will throw error):
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
});

// NEW (required):
const uplink = new Uplink({
  apiKey: process.env.ONCHAIN_API_KEY!,
  privateKey: process.env.UPLINK_PRIVATE_KEY!,
  createAtaFeeAcceptance: true,              // ← Required
  minimumCrosschainFeeAcceptance: true,      // ← Required
});
```

**Fee Structure:**
- Same-chain: 0.1% (all tiers currently equal)
- Cross-chain: 0.1% with $0.01 minimum
- ATA creation: $0.40 (when Solana recipient needs new USDC account)

**Example Fee Scenarios:**
```
Scenario 1: $10 Base → Base payment
  Gross: $10.00
  Fee:   $0.01 (0.1%)
  Net:   $9.99

Scenario 2: $10 Base → Solana (existing ATA)
  Gross: $10.00
  Fee:   $0.01 (0.1%, minimum enforced)
  Net:   $9.99

Scenario 3: $1 Base → Solana (needs ATA)
  Gross: $1.00
  Fee:   $0.01 (0.1%) + $0.40 (ATA) = $0.41
  Net:   $0.59

Scenario 4: $0.05 Base → Solana (minimum fee)
  Gross: $0.05
  Fee:   $0.01 (minimum enforced, 20% of payment)
  Net:   $0.04
```

---

## [2.0.0] - 2025-11-19

### 🚀 Major Changes - Two-Hop Architecture & Cross-Chain Support

**Breaking Changes:**
- Payment signing now routes through intermediate wallets (same-chain) or CCTP adapters (cross-chain)
- All agent integrations must upgrade to v2.0.0 (v1.x no longer works)

**New Features:**
- ✅ **Cross-chain payments** - Full support for Base↔Solana via CCTP
- ✅ **Two-hop architecture** - Same-chain payments route through intermediate wallets
- ✅ **Automatic Solana ATA creation** - Fresh wallets receive USDC without pre-setup
- ✅ **All 4 network combinations** - Base→Base, Solana→Solana, Base→Solana, Solana→Base

**Technical Changes:**
- Added `/v1/facilitators/config` endpoint integration for fetching intermediate wallets
- Added `/v1/bridge/prepare` integration for cross-chain payments
- Updated signing flow to use intermediate addresses instead of final recipients
- Added `bridgeOrderId` field to link cross-chain payments
- Updated `_signPayment()` to accept both source and destination networks

**What Agents Get:**
- Same simple API: `uplink.pay({ to, amount, sourceNetwork, destinationNetwork })`
- No code changes required - upgrade is transparent
- Cross-chain now works (was previously blocked)
- Automatic fee collection and handling

**Migration:**
```bash
# Update to v2.0.0
npm install @onchainfi/uplink@2.0.0

# No code changes needed!
# Old code:
await uplink.pay({ to: '0x4503...', amount: '0.1' });

# Still works the same way, but now with:
# - Two-hop architecture
# - Cross-chain support
# - ATA creation
```

**Testing:**
- All 6 test routes validated on staging
- Base→Base: ✅ 6.3s
- Solana→Base: ✅ 19.6s
- Solana→Solana: ✅ 4.7s
- Base→Solana: ✅ 18.1s
- Base→Solana (fresh): ✅ 13.2s (ATA created)
- Solana→Solana (fresh): ✅ 4.7s (ATA created)

---

## [1.0.1] - 2025-11-XX

### Bug Fixes
- Initial release fixes

## [1.0.0] - 2025-11-XX

### Initial Release
- Basic same-chain payment support
- Base and Solana network support
- EIP-712 and Solana transaction signing

