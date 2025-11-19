# Changelog

All notable changes to the Uplink SDK will be documented in this file.

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

