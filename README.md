# Kaspa Wallet Bundler

A production-safe JavaScript SDK for generating Kaspa addresses from extended public keys (KPUB/XPUB). Supports all major Kaspa wallet formats: Kaspium, Kasware (12/24-word), and Legacy KDX.

## 🔒 Security

**Production builds are SAFE for public use** - they only expose watch-only functions that work with public extended keys. No private keys or mnemonics are ever required or exposed.

### What's Safe:
- ✅ Generating addresses from KPUB/XPUB/TPUB (public keys only)
- ✅ Detecting wallet formats
- ✅ Converting between KPUB and XPUB formats
- ✅ All processing happens in the browser (no server calls)

### What's NOT Exposed in Production:
- ❌ Wallet generation from mnemonics
- ❌ Private key operations
- ❌ Console logging of sensitive data

## 🚀 Use Cases

### WordPress Plugins
**Safe to ship** - Production build exposes only public-key operations.

```javascript
// User provides their KPUB (public key - safe to share)
const kpub = "kpub2HhT43oHcjLUWbVdiqfspNUHKD4n2qaUTvVZ23FDtWAYp3JcB7ahsWMKTMqocvhmift3debvEnhWwA2TgY4icXdQCPRCW38b3gxUUbTT6DB";

// Generate 10 addresses (watch-only, safe)
const result = await kaspaWallet.generateAddressesUniversal(kpub, 0, 10);
console.log(result.addresses); // Array of kaspa: addresses
```

**Important:** Always instruct users to use their **extended public key (KPUB/XPUB)** - NEVER their mnemonic/seed phrase.

### Frontend JS Projects
**Recommended** - The production build is safe for any frontend project.

- ✅ No network calls
- ✅ All processing in browser
- ✅ Watch-only (public keys only)
- ✅ No telemetry or tracking

### Best Practices

1. **Only use public extended keys** - KPUB, XPUB, or TPUB formats
2. **Never ask for mnemonics** - This SDK doesn't need them in production
3. **Namespace in WordPress** - Consider custom namespacing to avoid conflicts:
   ```javascript
   window.myPluginKaspa = kaspaWallet; // Instead of direct access
   ```

## 📦 Install / Publish

```bash
npm install
npm run build  # Production build (safe, watch-only)
npm run build-debug  # Development build (includes sensitive APIs for testing)
```

### Publish to npm

This package ships both the browser bundle and full source:

- `build/kaspa-wallet.js` (IIFE for direct `<script>` use)
- `src/` (ESM source for bundlers)

The npm manifest includes only: `build/kaspa-wallet.js`, `src/`, `LICENSE`, `README.md`.

```bash
npm version patch   # or minor/major
npm publish --access public
```

## 🔧 Usage

### Generate Addresses from KPUB/XPUB

```javascript
// Works with any Kaspa extended public key format
const kpub = "kpub2HhT43oHcjLUWbVdiqfspNUHKD4n2qaUTvVZ23FDtWAYp3JcB7ahsWMKTMqocvhmift3debvEnhWwA2TgY4icXdQCPRCW38b3gxUUbTT6DB";

// Generate 5 addresses starting from index 0
const result = await kaspaWallet.generateAddressesUniversal(kpub, 0, 5);

result.addresses.forEach(addr => {
    console.log(`Address ${addr.index}: ${addr.address}`);
    console.log(`Path: ${addr.path}`);
});
```

### Detect Wallet Format

```javascript
const format = kaspaWallet.detectKPUBFormat(kpub);
console.log(format); // 'kaspium', 'standard', or 'testnet'

const walletInfo = kaspaWallet.detectWalletType(kpub);
console.log(walletInfo); // { wallet: 'kaspium', format: 'kpub', ... }
```

### Convert KPUB to XPUB

```javascript
const xpub = kaspaWallet.convertKaspiumKPUB(kpub);
console.log(xpub); // Standard XPUB format
```

## 🛠️ Supported Wallet Formats

- **Kaspium** (KPUB format) - `m/44'/111111'/0'`
- **Kasware 24-word** (XPUB) - `m/44'/111111'/0'`
- **Kasware 12-word** (XPUB) - `m/44'/972/0'`
- **Legacy KDX** (XPUB) - `m/44'/972/0'`
- **Testnet** (TPUB) - Supported for address generation

## 📝 Development

For development/testing, use the debug build which includes additional functions:

```bash
npm run build-debug
```

Development build exposes:
- `generate()` - Generate new wallet (testing only)
- `generateKPUBForWallet()` - Generate KPUB from mnemonic (testing only)
- `test*` functions - Testing helpers

**Never use debug builds in production or with real user data.**

## ⚠️ Security Warnings

1. **Only use extended public keys (KPUB/XPUB/TPUB)** - Never ask users for mnemonics or private keys
2. **Production build is safe** - Development builds expose sensitive APIs - only use for testing
3. **No server dependencies** - All operations run in the browser
4. **Other scripts can access** - `window.kaspaWallet` is globally accessible (acceptable for public-key operations)

## 📄 License

See LICENSE file for details.
