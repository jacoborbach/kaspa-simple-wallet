// Enhanced Kaspa Wallet SDK with Kaspium KPUB Support
// Supports both standard xpub and Kaspium kpub formats
// Build-time flags (set via esbuild --define)
// eslint-disable-next-line no-undef
const EXPOSE_SENSITIVE = typeof KASPA_EXPOSE_SENSITIVE !== 'undefined' ? KASPA_EXPOSE_SENSITIVE : false;
// eslint-disable-next-line no-undef
const DEBUG = typeof KASPA_DEBUG !== 'undefined' ? KASPA_DEBUG : false;

import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
}

import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';
import { base58check } from '@scure/base';
import { sha256 } from '@noble/hashes/sha2.js';
import { KaspaWallet } from '@okxweb3/coin-kaspa';

// Kaspa derivation paths for different wallets
const KASPA_SINGLE_PATH = "m/44'/111111'/0'/0/0";
const KASPA_ACCOUNT_PATH = "m/44'/111111'/0'"; // Standard Kaspium path (24-word seeds)
const KASPA_LEGACY_PATH = "m/44'/972/0'"; // Legacy path for 12-word seeds (KDX/Kaspanet Web Wallets)
const KASPA_KASWARE_12_PATH = "m/44'/972/0'"; // Kasware 12-word path
const KASPA_KASWARE_24_PATH = "m/44'/111111'/0'"; // Kasware 24-word path

// Kaspa extended key version bytes for different wallet formats
const KASPA_MAINNET_PUBLIC_BYTES = [0x03, 0x8f, 0x33, 0x2e]; // "kpub" (Kaspium format)
const KASPA_MAINNET_PRIVATE_BYTES = [0x03, 0x8f, 0x2e, 0xf4]; // "xprv" but Kaspa-specific
const BITCOIN_MAINNET_PUBLIC_BYTES = [0x04, 0x88, 0xb2, 0x1e]; // "xpub" (standard format)
const BITCOIN_MAINNET_PRIVATE_BYTES = [0x04, 0x88, 0xad, 0xe4]; // "xprv"
const BITCOIN_TESTNET_PUBLIC_BYTES = [0x04, 0x35, 0x87, 0xcf]; // "tpub" (testnet format)

// ===== KPUB FORMAT DETECTION & CONVERSION =====

function detectKPUBFormat(extendedKey) {
    if (typeof extendedKey !== 'string') {
        throw new Error('Extended key must be a string');
    }

    // Check for Kaspium KPUB format
    if (extendedKey.startsWith('kpub')) {
        return 'kaspium';
    }

    // Check for standard Bitcoin-compatible formats
    if (extendedKey.startsWith('xpub')) {
        return 'standard';
    }

    if (extendedKey.startsWith('tpub')) {
        return 'testnet';
    }

    throw new Error('Unsupported extended key format');
}

function detectWalletType(extendedKey, mnemonic = null) {
    const format = detectKPUBFormat(extendedKey);

    // If we have a mnemonic, we can determine the wallet type more accurately
    if (mnemonic) {
        const words = mnemonic.split(' ');
        const is24Word = words.length === 24;
        const is12Word = words.length === 12;

        if (format === 'kaspium') {
            return {
                wallet: 'kaspium',
                format: 'kpub',
                derivationPath: KASPA_ACCOUNT_PATH,
                seedLength: is24Word ? 24 : 12
            };
        }

        if (format === 'standard') {
            // Standard xpub could be from different wallets
            if (is24Word) {
                return {
                    wallet: 'kasware_24', // or kaspium in standard format
                    format: 'xpub',
                    derivationPath: KASPA_KASWARE_24_PATH,
                    seedLength: 24
                };
            } else if (is12Word) {
                return {
                    wallet: 'kasware_12', // or legacy KDX
                    format: 'xpub',
                    derivationPath: KASPA_KASWARE_12_PATH,
                    seedLength: 12
                };
            }
        }
    }

    // Fallback based on format only
    return {
        wallet: format === 'kaspium' ? 'kaspium' : 'unknown',
        // Normalize Kaspium format to 'kpub' so downstream logic converts it
        format: format === 'kaspium' ? 'kpub' : format,
        derivationPath: format === 'kaspium' ? KASPA_ACCOUNT_PATH : KASPA_LEGACY_PATH,
        seedLength: null
    };
}

const b58c = base58check(sha256);

function base58checkDecode(str) {
    return b58c.decode(str);
}

function base58checkEncode(buffer) {
    return b58c.encode(buffer);
}

function convertKaspiumKPUBToStandard(kpub) {
    try {
        // Decode the Kaspium KPUB (Base58Check)
        const decoded = base58checkDecode(kpub);

        // Verify it's the right length (78 bytes for extended keys)
        if (decoded.length !== 78) {
            throw new Error(`Invalid KPUB length: ${decoded.length}, expected 78`);
        }

        // Extract components
        const versionBytes = decoded.slice(0, 4);
        const depth = decoded[4];
        const fingerprint = decoded.slice(5, 9);
        const childNumber = decoded.slice(9, 13);
        const chainCode = decoded.slice(13, 45);
        const publicKey = decoded.slice(45, 78);

        // Verify it's a Kaspium KPUB
        const expectedVersion = KASPA_MAINNET_PUBLIC_BYTES;
        if (!versionBytes.every((byte, i) => byte === expectedVersion[i])) {
            throw new Error(`Not a valid Kaspium KPUB. Version bytes: ${Array.from(versionBytes).map(b => '0x' + b.toString(16)).join(', ')}`);
        }

        // Verify public key is in compressed format (33 bytes, starting with 0x02 or 0x03)
        if (publicKey.length !== 33) {
            throw new Error(`Invalid public key length: ${publicKey.length}, expected 33`);
        }
        if (publicKey[0] !== 0x02 && publicKey[0] !== 0x03) {
            // If it's not compressed, this is unusual for an extended public key
            // But we'll still try to convert it
            if (DEBUG) console.warn('Public key in KPUB is not in standard compressed format');
        }

        // Convert to standard xpub format (always use xpub version for public keys)
        const standardVersion = BITCOIN_MAINNET_PUBLIC_BYTES;
        const standardExtendedKey = new Uint8Array(78);

        standardExtendedKey.set(standardVersion, 0);
        standardExtendedKey.set([depth], 4);
        standardExtendedKey.set(fingerprint, 5);
        standardExtendedKey.set(childNumber, 9);
        standardExtendedKey.set(chainCode, 13);
        standardExtendedKey.set(publicKey, 45);

        const convertedXpub = base58checkEncode(standardExtendedKey);

        // Validate the converted XPUB can be parsed by HDKey
        try {
            const testKey = HDKey.fromExtendedKey(convertedXpub);
            if (!testKey.publicKey) {
                throw new Error('Converted XPUB has no public key');
            }
        } catch (validationError) {
            if (DEBUG) console.error('Converted XPUB validation failed:', validationError);
            throw new Error(`Converted XPUB is invalid: ${validationError.message}`);
        }

        return convertedXpub;
    } catch (error) {
        if (DEBUG) console.error('KPUB conversion error:', error);
        throw new Error(`Failed to convert Kaspium KPUB to standard format: ${error.message}`);
    }
}

// ===== ENHANCED KPUB GENERATION =====

async function generateKPUBForWallet(mnemonic, walletType = 'auto') {
    try {
        const words = mnemonic.split(' ');
        const is24Word = words.length === 24;
        const is12Word = words.length === 12;

        if (!is24Word && !is12Word) {
            throw new Error('Mnemonic must be 12 or 24 words');
        }

        // Auto-detect wallet type based on seed length
        if (walletType === 'auto') {
            if (is24Word) {
                walletType = 'kaspium'; // Default to Kaspium for 24-word
            } else {
                walletType = 'kasware_12'; // Default to Kasware for 12-word
            }
        }

        const seed = await bip39.mnemonicToSeed(mnemonic);
        const masterKey = HDKey.fromMasterSeed(seed);

        let derivationPath;
        let versionBytes;
        let format;

        switch (walletType) {
            case 'kaspium':
                derivationPath = KASPA_ACCOUNT_PATH;
                versionBytes = KASPA_MAINNET_PUBLIC_BYTES;
                format = 'kpub';
                break;
            case 'kasware_24':
                derivationPath = KASPA_KASWARE_24_PATH;
                versionBytes = BITCOIN_MAINNET_PUBLIC_BYTES;
                format = 'xpub';
                break;
            case 'kasware_12':
                derivationPath = KASPA_KASWARE_12_PATH;
                versionBytes = BITCOIN_MAINNET_PUBLIC_BYTES;
                format = 'xpub';
                break;
            case 'legacy':
                derivationPath = KASPA_LEGACY_PATH;
                versionBytes = BITCOIN_MAINNET_PUBLIC_BYTES;
                format = 'xpub';
                break;
            default:
                throw new Error(`Unsupported wallet type: ${walletType}`);
        }

        const accountKey = masterKey.derive(derivationPath);

        if (!accountKey.publicKey || !accountKey.chainCode) {
            throw new Error('Failed to derive account key');
        }

        // For standard formats, use library-provided XPUB directly
        if (format === 'xpub') {
            return {
                extendedKey: accountKey.publicExtendedKey,
                standardXpub: accountKey.publicExtendedKey,
                chainCode: Buffer.from(accountKey.chainCode).toString('hex'),
                publicKey: Buffer.from(accountKey.publicKey).toString('hex'),
                path: derivationPath,
                walletType: walletType,
                format: format,
                seedLength: words.length
            };
        }

        // Create the extended key in Kaspium KPUB format
        const extendedKey = new Uint8Array(78);
        extendedKey.set(versionBytes, 0);           // Version bytes
        extendedKey[4] = 3;                         // Depth
        extendedKey.set([0x00, 0x00, 0x00, 0x00], 5); // Parent fingerprint (unknown)
        extendedKey.set([0x80, 0x00, 0x00, 0x00], 9); // Child number (hardened 0)
        extendedKey.set(accountKey.chainCode, 13);  // Chain code
        extendedKey.set(accountKey.publicKey, 45);  // Public key

        const extendedKeyString = base58checkEncode(extendedKey);
        const standardXpub = accountKey.publicExtendedKey;

        return {
            extendedKey: extendedKeyString,
            standardXpub: standardXpub,
            chainCode: Buffer.from(accountKey.chainCode).toString('hex'),
            publicKey: Buffer.from(accountKey.publicKey).toString('hex'),
            path: derivationPath,
            walletType: walletType,
            format: format,
            seedLength: words.length
        };
    } catch (error) {
        console.error('KPUB generation error:', error);
        throw error;
    }
}

async function generateKaspiumCompatibleKPUB(mnemonic) {
    try {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const masterKey = HDKey.fromMasterSeed(seed);
        const accountKey = masterKey.derive(KASPA_ACCOUNT_PATH);

        if (!accountKey.publicKey || !accountKey.chainCode) {
            throw new Error('Failed to derive account key');
        }

        // Create the Kaspium KPUB format with Base58Check
        const extendedKey = new Uint8Array(78);
        extendedKey.set(KASPA_MAINNET_PUBLIC_BYTES, 0);
        extendedKey[4] = 3;                           // Depth
        extendedKey.set([0x00, 0x00, 0x00, 0x00], 5);  // Parent fingerprint (unknown)
        extendedKey.set([0x80, 0x00, 0x00, 0x00], 9);  // Child number (hardened 0)
        extendedKey.set(accountKey.chainCode, 13);     // Chain code
        extendedKey.set(accountKey.publicKey, 45);     // Public key

        const kpub = base58checkEncode(extendedKey);
        const standardXpub = accountKey.publicExtendedKey;

        return {
            kpub: kpub,                    // Kaspium format
            xpub: standardXpub,            // Standard format (for compatibility)
            chainCode: Buffer.from(accountKey.chainCode).toString('hex'),
            publicKey: Buffer.from(accountKey.publicKey).toString('hex'),
            path: KASPA_ACCOUNT_PATH,
            format: 'both'
        };
    } catch (error) {
        console.error('Enhanced KPUB generation error:', error);
        throw error;
    }
}

// ===== ENHANCED ADDRESS DERIVATION =====

async function generateAddressesFromAnyKPUB(extendedKey, startIndex = 0, count = 5, mnemonic = null) {
    try {
        const walletInfo = detectWalletType(extendedKey, mnemonic);
        let workingXpub = extendedKey;

        // Convert Kaspium KPUB to standard format if needed
        if (walletInfo.format === 'kpub') {
            if (DEBUG) console.log('Detected Kaspium KPUB, converting to standard format...');
            workingXpub = convertKaspiumKPUBToStandard(extendedKey);
        }

        if (DEBUG) {
            console.log('[kaspa-wallet] format:', walletInfo.format, 'wallet:', walletInfo.wallet);
            if (walletInfo.format === 'kpub') {
                console.log('[kaspa-wallet] converted to XPUB:', workingXpub);
            }
        }

        // Now use standard HDKey derivation
        const hdKey = HDKey.fromExtendedKey(workingXpub);
        const addresses = [];

        // Determine network prefix for address encoding
        const isTestnet = walletInfo.format === 'testnet';
        const addressPrefix = isTestnet ? 'kaspatest' : 'kaspa';

        for (let i = startIndex; i < startIndex + count; i++) {
            const externalChain = hdKey.deriveChild(0); // External chain
            const addressKey = externalChain.deriveChild(i);

            if (!addressKey.publicKey) {
                throw new Error(`Failed to derive public key at index ${i}`);
            }

            const publicKeyHex = Buffer.from(addressKey.publicKey).toString('hex');
            const address = kaspaEncodePubKeyAddress(addressKey.publicKey, addressPrefix);

            addresses.push({
                index: i,
                address: address,
                publicKey: publicKeyHex,
                path: `m/0/${i}`,
                walletType: walletInfo.wallet,
                derivationPath: walletInfo.derivationPath,
                sourceFormat: walletInfo.format,
                isWatchOnly: true
            });
        }

        return {
            addresses,
            walletInfo: walletInfo,
            totalGenerated: count
        };
    } catch (error) {
        if (DEBUG) console.error('Enhanced address generation error:', error);
        throw error;
    }
}

async function generateAddressesForWallet(mnemonic, walletType = 'auto', startIndex = 0, count = 5) {
    try {
        const kpubResult = await generateKPUBForWallet(mnemonic, walletType);
        const addresses = await generateAddressesFromAnyKPUB(
            kpubResult.extendedKey,
            startIndex,
            count,
            mnemonic
        );

        return {
            ...addresses,
            kpubInfo: kpubResult
        };
    } catch (error) {
        if (DEBUG) console.error('Wallet address generation error:', error);
        throw error;
    }
}

// ===== KASPA ADDRESS ENCODING (keeping your existing implementation) =====

function prefixToArray(prefix) {
    const result = [];
    for (let i = 0; i < prefix.length; i++) {
        result.push(prefix.charCodeAt(i) & 31);
    }
    return result;
}

function checksumToArray(checksum) {
    const result = [];
    for (let i = 0; i < 8; ++i) {
        result.push(checksum & 31);
        checksum /= 32;
    }
    return result.reverse();
}

const GENERATOR1 = [0x98, 0x79, 0xf3, 0xae, 0x1e];
const GENERATOR2 = [0xf2bc8e61, 0xb76d99e2, 0x3e5fb3c4, 0x2eabe2a8, 0x4f43e470];

function polymod(data) {
    var c0 = 0, c1 = 1, C = 0;
    for (var j = 0; j < data.length; j++) {
        C = c0 >>> 3;
        c0 &= 0x07;
        c0 <<= 5;
        c0 |= c1 >>> 27;
        c1 &= 0x07ffffff;
        c1 <<= 5;
        c1 ^= data[j];
        for (var i = 0; i < GENERATOR1.length; ++i) {
            if (C & (1 << i)) {
                c0 ^= GENERATOR1[i];
                c1 ^= GENERATOR2[i];
            }
        }
    }
    c1 ^= 1;
    if (c1 < 0) {
        c1 ^= 1 << 31;
        c1 += (1 << 30) * 2;
    }
    return c0 * (1 << 30) * 4 + c1;
}

function convertBits(data, fromBits, toBits, pad) {
    let acc = 0;
    let bits = 0;
    const ret = [];
    const maxv = (1 << toBits) - 1;
    const maxAcc = (1 << (fromBits + toBits - 1)) - 1;

    for (let p = 0; p < data.length; ++p) {
        const value = data[p];
        if (value < 0 || (value >> fromBits) !== 0) {
            return null;
        }
        acc = ((acc << fromBits) | value) & maxAcc;
        bits += fromBits;
        while (bits >= toBits) {
            bits -= toBits;
            ret.push((acc >> bits) & maxv);
        }
    }

    if (pad) {
        if (bits > 0) {
            ret.push((acc << (toBits - bits)) & maxv);
        }
    } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
        return null;
    }

    return new Uint8Array(ret);
}

function base32Encode(data) {
    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    let result = '';
    for (let i = 0; i < data.length; i++) {
        result += CHARSET[data[i]];
    }
    return result;
}

function kaspaEncodePubKeyAddress(pubKey, prefix = 'kaspa') {
    const pubKeyHex = Buffer.from(pubKey).toString('hex');
    const cleanPubKey = pubKeyHex.startsWith('02') || pubKeyHex.startsWith('03') ?
        pubKeyHex.slice(2) : pubKeyHex;

    const eight0 = [0, 0, 0, 0, 0, 0, 0, 0];
    const prefixData = prefixToArray(prefix).concat([0]);
    const versionByte = 0;
    const pubKeyArray = Array.from(Buffer.from(cleanPubKey, 'hex'));

    const payloadData = convertBits(new Uint8Array([versionByte].concat(pubKeyArray)), 8, 5, true);
    if (!payloadData) {
        throw new Error('❌ convertBits failed');
    }

    const checksumData = new Uint8Array(prefixData.length + payloadData.length + eight0.length);
    checksumData.set(prefixData);
    checksumData.set(payloadData, prefixData.length);
    checksumData.set(eight0, prefixData.length + payloadData.length);

    const polymodData = checksumToArray(polymod(checksumData));
    const payload = new Uint8Array(payloadData.length + polymodData.length);
    payload.set(payloadData);
    payload.set(polymodData, payloadData.length);

    return 'kaspa:' + base32Encode(payload);
}

// ===== ORIGINAL FUNCTIONS (keeping for backward compatibility) =====

async function generateKaspaWallet() {
    try {
        const mnemonic = bip39.generateMnemonic(256);
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const masterKey = HDKey.fromMasterSeed(seed);
        const childKey = masterKey.derive(KASPA_SINGLE_PATH);

        if (!childKey.privateKey) {
            throw new Error("Failed to derive private key");
        }

        const wallet = new KaspaWallet();
        const privateKeyHex = Buffer.from(childKey.privateKey).toString('hex');
        const address = await wallet.getNewAddress({ privateKey: privateKeyHex });

        return {
            mnemonic,
            address,
            privateKey: privateKeyHex
        };
    } catch (error) {
        if (DEBUG) console.error('❌ Wallet generation error:', error);
        throw error;
    }
}

async function generateKPUBFromMnemonic(mnemonic) {
    try {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const masterKey = HDKey.fromMasterSeed(seed);
        const accountKey = masterKey.derive(KASPA_ACCOUNT_PATH);

        if (!accountKey.publicKey) {
            throw new Error('Failed to derive public key');
        }

        return {
            kpub: accountKey.publicExtendedKey,
            chainCode: accountKey.chainCode ? Buffer.from(accountKey.chainCode).toString('hex') : null,
            publicKey: Buffer.from(accountKey.publicKey).toString('hex'),
            path: KASPA_ACCOUNT_PATH
        };
    } catch (error) {
        if (DEBUG) console.error('❌ KPUB generation error:', error);
        throw error;
    }
}

// ===== PUBLIC API =====

if (typeof window !== 'undefined') {
    const publicApi = {
        generateAddressesUniversal: generateAddressesFromAnyKPUB,
        detectKPUBFormat: detectKPUBFormat,
        detectWalletType: detectWalletType,
        convertKaspiumKPUB: convertKaspiumKPUBToStandard,
        encodeAddress: kaspaEncodePubKeyAddress
    };

    if (EXPOSE_SENSITIVE) {
        Object.assign(publicApi, {
            generate: generateKaspaWallet,
            generateKPUB: generateKPUBFromMnemonic,
            generateKaspiumKPUB: generateKaspiumCompatibleKPUB,
            generateKPUBForWallet: generateKPUBForWallet,
            generateAddressesForWallet: generateAddressesForWallet,
            test: async function (kpubInput) {
                if (DEBUG) console.log('🧪 Testing KPUB:', kpubInput);
                const format = detectKPUBFormat(kpubInput);
                if (DEBUG) console.log('📋 Detected format:', format);
                if (format === 'kaspium') {
                    const converted = convertKaspiumKPUBToStandard(kpubInput);
                    if (DEBUG) console.log('🔄 Converted to standard:', converted);
                }
                const addresses = await generateAddressesFromAnyKPUB(kpubInput, 0, 3);
                if (DEBUG) console.log('🏠 Generated addresses:', addresses);
                return addresses;
            },
            testWalletCompatibility: async function (mnemonic) {
                if (DEBUG) console.log('🔍 Testing wallet compatibility for mnemonic...');
                const results = {};
                try {
                    const kaspiumResult = await generateKPUBForWallet(mnemonic, 'kaspium');
                    results.kaspium = {
                        success: true,
                        kpub: kaspiumResult.extendedKey,
                        xpub: kaspiumResult.standardXpub,
                        path: kaspiumResult.path,
                        addresses: await generateAddressesFromAnyKPUB(kaspiumResult.extendedKey, 0, 3, mnemonic)
                    };
                } catch (error) {
                    results.kaspium = { success: false, error: error.message };
                }
                try {
                    const kasware24Result = await generateKPUBForWallet(mnemonic, 'kasware_24');
                    results.kasware_24 = {
                        success: true,
                        xpub: kasware24Result.extendedKey,
                        path: kasware24Result.path,
                        addresses: await generateAddressesFromAnyKPUB(kasware24Result.extendedKey, 0, 3, mnemonic)
                    };
                } catch (error) {
                    results.kasware_24 = { success: false, error: error.message };
                }
                try {
                    const kasware12Result = await generateKPUBForWallet(mnemonic, 'kasware_12');
                    results.kasware_12 = {
                        success: true,
                        xpub: kasware12Result.extendedKey,
                        path: kasware12Result.path,
                        addresses: await generateAddressesFromAnyKPUB(kasware12Result.extendedKey, 0, 3, mnemonic)
                    };
                } catch (error) {
                    results.kasware_12 = { success: false, error: error.message };
                }
                if (DEBUG) console.log('📊 Compatibility test results:', results);
                return results;
            },
            testRealWorldScenario: async function () {
                if (DEBUG) console.log('🌍 Testing real-world wallet scenarios...');
                const testMnemonic = bip39.generateMnemonic(256);
                if (DEBUG) console.log('📝 Test mnemonic (24-word):', testMnemonic);
                const results = {};
                try {
                    const kaspiumResult = await generateKPUBForWallet(testMnemonic, 'kaspium');
                    results.kaspium_export = {
                        kpub: kaspiumResult.extendedKey,
                        xpub: kaspiumResult.standardXpub,
                        firstAddress: (await generateAddressesFromAnyKPUB(kaspiumResult.extendedKey, 0, 1, testMnemonic)).addresses[0]
                    };
                } catch (error) {
                    results.kaspium_export = { error: error.message };
                }
                try {
                    const kaswareResult = await generateKPUBForWallet(testMnemonic, 'kasware_24');
                    results.kasware_export = {
                        xpub: kaswareResult.extendedKey,
                        firstAddress: (await generateAddressesFromAnyKPUB(kaswareResult.extendedKey, 0, 1, testMnemonic)).addresses[0]
                    };
                } catch (error) {
                    results.kasware_export = { error: error.message };
                }
                try {
                    const kaspiumKpub = results.kaspium_export?.kpub;
                    const kaswareXpub = results.kasware_export?.xpub;
                    const fromKaspiumKpub = kaspiumKpub ? await generateAddressesFromAnyKPUB(kaspiumKpub, 0, 1) : null;
                    const fromKaswareXpub = kaswareXpub ? await generateAddressesFromAnyKPUB(kaswareXpub, 0, 1) : null;
                    results.cross_compatibility = {
                        kaspium_to_standard: fromKaspiumKpub?.addresses?.[0]?.address,
                        kasware_direct: fromKaswareXpub?.addresses?.[0]?.address,
                        addresses_match: !!(fromKaspiumKpub && fromKaswareXpub && fromKaspiumKpub.addresses[0].address === fromKaswareXpub.addresses[0].address)
                    };
                } catch (error) {
                    results.cross_compatibility = { error: error.message };
                }
                return { mnemonic: testMnemonic, results };
            }
        });
    }

    window.kaspaWallet = publicApi;
    if (DEBUG) {
        console.log('✅ Enhanced Kaspa Wallet SDK loaded with multi-wallet support!');
        console.log('🔧 Supported wallets: Kaspium, Kasware (12/24-word), Legacy KDX');
        console.log('🔧 Available methods:', Object.keys(window.kaspaWallet));
    }

    // Add version info (safe to expose)
    if (typeof publicApi.generateAddressesUniversal !== 'undefined') {
        publicApi.version = '1.0.1';
        publicApi.mode = EXPOSE_SENSITIVE ? 'development' : 'production';
    }
}

export {
    generateKaspaWallet,
    generateKPUBFromMnemonic,
    generateKaspiumCompatibleKPUB,
    generateKPUBForWallet,
    generateAddressesFromAnyKPUB,
    generateAddressesForWallet,
    detectKPUBFormat,
    detectWalletType,
    convertKaspiumKPUBToStandard,
    kaspaEncodePubKeyAddress
};