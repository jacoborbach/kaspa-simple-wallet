# Kaspa Simple Wallet

Simple, reliable Kaspa wallet generation and HD address derivation for browsers and Node.js. No complex setup required.

## 🚀 Features

- ✅ **Generate secure Kaspa wallets** - Create 24-word mnemonic phrases
- ✅ **HD wallet support** - Generate extended public keys (KPUB) for watch-only wallets
- ✅ **Unlimited address generation** - Derive unique addresses for payments
- ✅ **Browser and Node.js compatible** - Works everywhere JavaScript runs
- ✅ **Zero configuration** - No complex framework initialization
- ✅ **Production ready** - Used in live WordPress/WooCommerce stores
- ✅ **Security focused** - Proper mnemonic handling patterns

## 📦 Installation

### NPM
```bash
npm install kaspa-simple-wallet
```

### CDN (Browser)
```html
<script src="https://unpkg.com/kaspa-simple-wallet/kaspa-wallet.js"></script>
```

### Download
Download `kaspa-wallet.js` and include it in your project.

## 🎯 Quick Start

### Browser Usage
```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://unpkg.com/kaspa-simple-wallet/kaspa-wallet.js"></script>
</head>
<body>
    <script>
        async function createWallet() {
            // Generate a new Kaspa wallet
            const wallet = await kaspaWallet.generate();
            
            console.log('Mnemonic:', wallet.mnemonic);
            console.log('Address:', wallet.address);
            
            // Generate KPUB for HD wallet
            const kpubData = await kaspaWallet.generateKPUB(wallet.mnemonic);
            console.log('KPUB:', kpubData.kpub);
            
            // Generate addresses for payments
            const address1 = await kaspaWallet.deriveAddress(kpubData.kpub, 0);
            const address2 = await kaspaWallet.deriveAddress(kpubData.kpub, 1);
            
            console.log('Payment Address 1:', address1.address);
            console.log('Payment Address 2:', address2.address);
        }
        
        createWallet();
    </script>
</body>
</html>
```

### Node.js/ES6 Usage
```javascript
import { 
    generateKaspaWallet, 
    generateKPUBFromMnemonic, 
    deriveAddressFromKPUB 
} from 'kaspa-simple-wallet';

async function example() {
    // Generate wallet
    const wallet = await generateKaspaWallet();
    console.log('New wallet:', wallet.address);
    
    // Generate KPUB for HD operations
    const kpubData = await generateKPUBFromMnemonic(wallet.mnemonic);
    
    // Generate unique addresses for orders
    const orderAddress1 = await deriveAddressFromKPUB(kpubData.kpub, 1);
    const orderAddress2 = await deriveAddressFromKPUB(kpubData.kpub, 2);
    
    console.log('Order 1 address:', orderAddress1.address);
    console.log('Order 2 address:', orderAddress2.address);
}

example();
```

## 🛒 E-commerce Integration

Perfect for accepting Kaspa payments in online stores:

```javascript
// One-time setup: Generate master wallet
const masterWallet = await kaspaWallet.generate();
const kpub = await kaspaWallet.generateKPUB(masterWallet.mnemonic);

// Store KPUB safely (no private keys!)
// User should backup mnemonic offline

// For each order: Generate unique payment address
async function generatePaymentAddress(orderID) {
    const paymentAddress = await kaspaWallet.deriveAddress(kpub, orderID);
    return paymentAddress.address;
}

// Order #1 gets: kaspa:qr62rftqag4hcxvv34xwu9t22lrkk83xy07w0j9x3myzyyytxhslzmvgywwfp
// Order #2 gets: kaspa:qp2mjn50fvjn4qp05rvy5mfzkk4hmla0cp2q638yxr3tn8mcas63ucl7xn4r6
// Order #3 gets: kaspa:qpkxz2fpy07558sr0mlwtf6hecztuw4kavtn4t6w2esqh5uxk8s5z4nxge9t0
```

## 📚 API Reference

### `kaspaWallet.generate()`
Generates a new Kaspa wallet with mnemonic, address, and private key.

**Returns:**
```javascript
{
    mnemonic: "24-word mnemonic phrase...",
    address: "kaspa:qr62rftqag4hcxvv34xwu9t22lrkk83xy07w0j9x3myzyyytxhslzmvgywwfp",
    privateKey: "hex-encoded-private-key"
}
```

### `kaspaWallet.generateKPUB(mnemonic)`
Generates extended public key (KPUB) from mnemonic for HD wallet operations.

**Parameters:**
- `mnemonic` (string): 24-word mnemonic phrase

**Returns:**
```javascript
{
    kpub: "xpub6CxvMQUdDTSF2Haf...",
    publicKey: "hex-encoded-public-key",
    chainCode: "hex-encoded-chain-code",
    path: "m/44'/111111'/0'"
}
```

### `kaspaWallet.deriveAddress(kpub, index)`
Derives a specific address from KPUB at given index.

**Parameters:**
- `kpub` (string): Extended public key
- `index` (number): Address index (0, 1, 2, ...)

**Returns:**
```javascript
{
    address: "kaspa:qr62rftqag4hcxvv34xwu9t22lrkk83xy07w0j9x3myzyyytxhslzmvgywwfp",
    publicKey: "hex-encoded-public-key",
    index: 0,
    path: "m/0/0",
    isWatchOnly: true
}
```

### `kaspaWallet.generateAddresses(kpub, startIndex, count)`
Generates multiple addresses from KPUB.

**Parameters:**
- `kpub` (string): Extended public key
- `startIndex` (number): Starting index (default: 0)
- `count` (number): Number of addresses to generate (default: 5)

**Returns:** Array of address objects

## 🔒 Security Best Practices

1. **Never store mnemonics on servers** - Only store KPUBs for address generation
2. **User controls mnemonic** - Let users backup their own recovery phrases
3. **Use HTTPS** - Always serve over secure connections
4. **Validate addresses** - Check generated addresses before using
5. **Test thoroughly** - Verify on testnet before mainnet

## 💡 Why Choose This Library?

**vs. Official Kaspa Libraries:**
- ✅ **No complex setup** - Works immediately, no framework initialization
- ✅ **Stable API** - Not marked "under heavy development"
- ✅ **Simple integration** - One function call vs. multiple steps
- ✅ **Production proven** - Used in real WordPress stores

**vs. Building Your Own:**
- ✅ **Tested integration** - All crypto libraries work together correctly
- ✅ **Proper security** - Follows HD wallet standards
- ✅ **Browser compatibility** - Handles all the browser quirks
- ✅ **Maintained** - Regular updates and bug fixes

## 🛠 Development

This library bundles together several crypto libraries:
- `bip39` for mnemonic generation
- `@scure/bip32` for HD key derivation  
- `@okxweb3/coin-kaspa` for Kaspa address generation

The bundle is pre-built and ready to use. No compilation required.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/jacoborbach/kaspa-simple-wallet/issues)
- **Discussions:** [GitHub Discussions](https://github.com/jacoborbach/kaspa-simple-wallet/discussions)

## ⭐ Show Your Support

If this library helped you build Kaspa payments, please give it a star! ⭐

---

**Made with ❤️ for the Kaspa community**