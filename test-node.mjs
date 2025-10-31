// Test ESM bundle import
import('./build/kaspa-wallet.esm.js').then(async (module) => {
    const kaspaWallet = module.default || module;

    // Test KPUB
    const kpub = "kpub2HhT43oHcjLUWbVdiqfspNUHKD4n2qaUTvVZ23FDtWAYp3JcB7ahsWMKTMqocvhmift3debvEnhWwA2TgY4icXdQCPRCW38b3gxUUbTT6DB";

    console.log('🧪 Testing Kaspa Wallet Package...\n');

    try {
        // Test 1: Detect format
        console.log('1. Testing format detection...');
        const format = kaspaWallet.detectKPUBFormat(kpub);
        console.log(`   ✅ Format: ${format}\n`);

        // Test 2: Detect wallet type
        console.log('2. Testing wallet type detection...');
        const walletInfo = kaspaWallet.detectWalletType(kpub);
        console.log(`   ✅ Wallet: ${walletInfo.wallet}, Format: ${walletInfo.format}\n`);

        // Test 3: Generate 20 addresses
        console.log('3. Generating 20 addresses...');
        const result = await kaspaWallet.generateAddressesUniversal(kpub, 0, 20);
        console.log(`   ✅ Generated ${result.addresses.length} addresses:\n`);

        result.addresses.forEach(addr => {
            console.log(`   [${addr.index}] ${addr.address}`);
            console.log(`       Path: ${addr.path}\n`);
        });

        // Test 4: Convert KPUB to XPUB (if Kaspium)
        if (format === 'kaspium') {
            console.log('4. Testing KPUB to XPUB conversion...');
            const xpub = kaspaWallet.convertKaspiumKPUBToStandard(kpub);
            console.log(`   ✅ XPUB: ${xpub.substring(0, 60)}...\n`);
        }

        console.log('✅ All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}).catch(err => {
    console.error('❌ Failed to load module:', err);
    process.exit(1);
});
