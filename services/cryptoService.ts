import { PinBlockFormat } from '../types';

// This tells TypeScript that CryptoJS is a global variable from the imported script
declare var CryptoJS: any;

/**
 * Generates a cryptographically secure random hex string.
 * @param bytes - The number of bytes of randomness to generate.
 * @returns A hex-encoded string.
 */
export const generateRandomHex = (bytes: number): string => {
  const buffer = new Uint8Array(bytes);
  window.crypto.getRandomValues(buffer);
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Performs a bitwise XOR operation on an array of hex strings.
 * @param hexStrings - An array of hex strings of the same length.
 * @returns The XORed result as a hex string.
 */
export const xorHexStrings = (hexStrings: string[]): string => {
    if (!hexStrings || hexStrings.length === 0) {
        return '';
    }
    if (hexStrings.length === 1) {
        return hexStrings[0];
    }

    try {
        const C = CryptoJS.enc.Hex.parse;
        let result = C(hexStrings[0]);

        for (let i = 1; i < hexStrings.length; i++) {
            const next = C(hexStrings[i]);
            // Ensure word arrays have the same length for XOR
            if (result.words.length !== next.words.length) {
                // Pad the shorter one if necessary
                const shorter = result.words.length < next.words.length ? result : next;
                const longer = result.words.length > next.words.length ? result : next;
                while (shorter.words.length < longer.words.length) {
                    shorter.words.push(0);
                }
            }
            for (let j = 0; j < result.words.length; j++) {
                result.words[j] ^= next.words[j];
            }
        }
        return result.toString(CryptoJS.enc.Hex);
    } catch (error) {
        console.error("XOR operation failed:", error);
        return 'Error';
    }
};

interface KcvParams {
    keyHex: string;
    algorithm: '3DES' | 'AES';
}
/**
 * Calculates the Key Check Value (KCV) for a given key.
 * For 8-byte 3DES components, it calculates KCV on a temporary 16-byte key.
 * @param params - The key and algorithm type.
 * @returns The 3-byte KCV as a hex string.
 */
export const calculateKcv = ({ keyHex, algorithm }: KcvParams): string => {
    if (!keyHex) return '';

    try {
        let keyForKcv = keyHex;
        // A 3DES key component is 8 bytes (16 hex chars). To calculate a KCV,
        // it's common to form a 2-Key 3DES key by duplicating the component.
        if (algorithm === '3DES' && keyHex.length === 16) { 
            keyForKcv = keyHex + keyHex;
        }
        
        const key = CryptoJS.enc.Hex.parse(keyForKcv);
        let zeroBlock;
        let encryptor;

        if (algorithm === '3DES') {
            zeroBlock = CryptoJS.enc.Hex.parse('0000000000000000');
            encryptor = CryptoJS.TripleDES;
        } else { // AES
            zeroBlock = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
            encryptor = CryptoJS.AES;
        }

        const encrypted = encryptor.encrypt(zeroBlock, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });

        const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
        return ciphertextHex.substring(0, 6).toUpperCase();
    } catch (error) {
        console.error("KCV calculation failed:", error);
        return 'Error';
    }
};

interface ClearPinBlockParams {
    pin: string;
    pan: string;
    format: PinBlockFormat;
}
/**
 * Generates a clear PIN block for ISO 0 & 3 formats.
 * @param params - The PIN, PAN, and desired format.
 * @returns The clear PIN block as a hex string.
 */
export const generateClearPinBlock = ({ pin, pan, format }: ClearPinBlockParams): string => {
    if (format === PinBlockFormat.ISO_4) {
        throw new Error("ISO Format 4 generation requires a PEK and does not produce a simple clear block. Use generatePinBlock.");
    }
    
    let pinPart: string;

    const pinLen = pin.length;
    const pinLenHex = pinLen.toString(16);

    if (format === PinBlockFormat.ISO_0) {
        pinPart = '0' + pinLenHex + pin + 'F'.repeat(14 - pinLen);
    } else { // ISO_3
        const randomPadding = generateRandomHex(Math.ceil((14 - pinLen) / 2)).substring(0, 14 - pinLen);
        pinPart = '3' + pinLenHex + pin + randomPadding;
    }
    
    // For ISO 0/3, the PAN part is the 12 rightmost digits of the PAN (sans check digit), prefixed with 0000.
    const panDigits = pan.substring(pan.length - 13, pan.length - 1);
    const panPart = '0000' + panDigits;
    
    const clearPinBlock = xorHexStrings([pinPart, panPart]);
    if (clearPinBlock === 'Error') {
        throw new Error('Failed to XOR PIN and PAN blocks.');
    }
    
    return clearPinBlock.toUpperCase();
};

interface PinBlockParams {
    pin: string;
    pan: string;
    pek: string;
    format: PinBlockFormat;
}
/**
 * Generates an encrypted PIN block according to ISO 9564-1 formats.
 * @param params - The PIN, PAN, PEK, and desired format.
 * @returns An object containing the clear (or intermediate) and encrypted PIN blocks.
 */
export const generatePinBlock = ({ pin, pan, pek, format }: PinBlockParams): { clearPinBlock: string; encryptedPinBlock: string; } => {
    
    if (format === PinBlockFormat.ISO_4) {
        // Implements ISO 9564-1 Format 4 (also known as "Format 48") using an Encrypt-XOR-Encrypt scheme.

        // 1. Construct Plaintext PIN Field (Block A)
        const pinPrefix = '4' + pin.length.toString(16); // Control '4' + PIN length
        const pinAndFill = pin.padEnd(14, 'A'); // PIN followed by fill character 'A' to 14 nibbles
        const randomPart = generateRandomHex(8); // 16 random nibbles
        const pinField = (pinPrefix + pinAndFill + randomPart).toUpperCase();

        // 2. Construct Plaintext PAN Field (Block B)
        let panForBlock = pan;
        let panLen = panForBlock.length;
        if (panLen < 12) {
            panForBlock = panForBlock.padStart(12, '0');
            panLen = 12;
        }
        const mVal = panLen - 12;
        const mHex = mVal.toString(16);
        const panFieldData = mHex + panForBlock;
        const panField = panFieldData.padEnd(32, '0').toUpperCase();

        // Prepare for encryption
        const key = CryptoJS.enc.Hex.parse(pek);
        const pinFieldWords = CryptoJS.enc.Hex.parse(pinField);

        // 3. Encrypt the plaintext PIN field
        const encryptedPinFieldResult = CryptoJS.AES.encrypt(pinFieldWords, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });
        const encryptedPinFieldHex = encryptedPinFieldResult.ciphertext.toString(CryptoJS.enc.Hex);
        
        // 4. XOR the plaintext PAN field with the result of step 3
        const xorResultHex = xorHexStrings([panField, encryptedPinFieldHex]);
        if (xorResultHex === 'Error') {
            throw new Error('Failed to XOR PAN field and encrypted PIN field.');
        }
        const xorResultWords = CryptoJS.enc.Hex.parse(xorResultHex);

        // 5. Encrypt the result of step 4
        const finalEncryptedResult = CryptoJS.AES.encrypt(xorResultWords, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });
        const finalEncryptedPinBlock = finalEncryptedResult.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();

        return {
            clearPinBlock: pinField, // For display, show the intermediate Plaintext PIN field
            encryptedPinBlock: finalEncryptedPinBlock
        };
    }

    // --- Logic for ISO Format 0 and 3 ---
    const clearPinBlock = generateClearPinBlock({ pin, pan, format });

    const key = CryptoJS.enc.Hex.parse(pek);
    const data = CryptoJS.enc.Hex.parse(clearPinBlock);
    
    const encrypted = CryptoJS.TripleDES.encrypt(data, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.NoPadding
    });

    const encryptedPinBlock = encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
    
    return {
        clearPinBlock,
        encryptedPinBlock
    };
};