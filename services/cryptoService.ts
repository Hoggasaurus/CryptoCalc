import { PinBlockFormat, RsaKeyFormat, RsaKeyPairResult, RsaKeySize, DataEncryptionAlgorithm, EncryptionMode, Padding, EncryptionAction, DataFormat } from '../types';

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

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const arrayBufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

const formatAsPem = (base64String: string, type: 'PUBLIC' | 'PRIVATE'): string => {
    const header = `-----BEGIN ${type} KEY-----`;
    const footer = `-----END ${type} KEY-----`;
    const chunks = base64String.match(/.{1,64}/g) || [];
    return `${header}\n${chunks.join('\n')}\n${footer}`;
};

/**
 * Generates an RSA key pair using the Web Crypto API.
 * @param keySize The size of the key in bits.
 * @param format The desired output format ('pem', 'jwk', or 'der').
 * @returns A promise that resolves to an object containing the keys in the specified format.
 */
export const generateRsaKeyPair = async (keySize: RsaKeySize, format: RsaKeyFormat): Promise<RsaKeyPairResult> => {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: keySize,
            publicExponent: new Uint8Array([1, 0, 1]), // 65537
            hash: 'SHA-256',
        },
        true, // Can be exported
        ['encrypt', 'decrypt']
    );

    if (format === 'jwk') {
        const [publicKey, privateKey] = await Promise.all([
            window.crypto.subtle.exportKey('jwk', keyPair.publicKey),
            window.crypto.subtle.exportKey('jwk', keyPair.privateKey)
        ]);
        return { format: 'jwk', publicKey, privateKey };
    }

    // For PEM and DER, we need the raw DER-encoded data
    const [publicKeyDer, privateKeyDer] = await Promise.all([
        window.crypto.subtle.exportKey('spki', keyPair.publicKey),
        window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
    ]);

    if (format === 'der') {
        const publicKeyHex = arrayBufferToHex(publicKeyDer);
        const privateKeyHex = arrayBufferToHex(privateKeyDer);
        return { format: 'der', publicKey: publicKeyHex, privateKey: privateKeyHex };
    }

    // Default to PEM
    const publicKeyBase64 = arrayBufferToBase64(publicKeyDer);
    const privateKeyBase64 = arrayBufferToBase64(privateKeyDer);

    const publicKeyPem = formatAsPem(publicKeyBase64, 'PUBLIC');
    const privateKeyPem = formatAsPem(privateKeyBase64, 'PRIVATE');
    
    return { format: 'pem', publicKey: publicKeyPem, privateKey: privateKeyPem };
};

interface ProcessDataParams {
    data: string;
    keyHex: string;
    ivHex?: string;
    algorithm: DataEncryptionAlgorithm;
    mode: EncryptionMode;
    padding: Padding;
    action: EncryptionAction;
    inputFormat: DataFormat;
    outputFormat: DataFormat;
}

/**
 * Encrypts or decrypts data using AES or 3DES.
 * @param params The parameters for the operation.
 * @returns The processed data as a string.
 */
export const processData = ({ data, keyHex, ivHex, algorithm, mode, padding, action, inputFormat, outputFormat }: ProcessDataParams): string => {
    try {
        const key = CryptoJS.enc.Hex.parse(keyHex);
        const iv = ivHex ? CryptoJS.enc.Hex.parse(ivHex) : undefined;

        const modeMap = {
            'ECB': CryptoJS.mode.ECB,
            'CBC': CryptoJS.mode.CBC,
        };

        const paddingMap = {
            'Pkcs7': CryptoJS.pad.Pkcs7,
            'NoPadding': CryptoJS.pad.NoPadding,
            'AnsiX923': CryptoJS.pad.AnsiX923,
            'Iso10126': CryptoJS.pad.Iso10126,
            'ZeroPadding': CryptoJS.pad.ZeroPadding,
        };

        const cipher = algorithm === 'AES' ? CryptoJS.AES : CryptoJS.TripleDES;
        const config = {
            iv: iv,
            mode: modeMap[mode],
            padding: paddingMap[padding],
        };

        if (action === 'encrypt') {
            const dataToEncrypt = (inputFormat === 'Hex')
                ? CryptoJS.enc.Hex.parse(data)
                : data; // Pass string for Utf8

            const encrypted = cipher.encrypt(dataToEncrypt, key, config);
            
            // Always return Hex. Base64 output is removed.
            return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
        } else { // decrypt
             // Input for decryption is now always Hex. Base64 is no longer supported.
            if (inputFormat !== 'Hex') {
                throw new Error('Decryption input format must be Hex. Base64 is no longer supported for ciphertext.');
            }
            const ciphertext = { ciphertext: CryptoJS.enc.Hex.parse(data) };
            
            const decrypted = cipher.decrypt(ciphertext, key, config);
            
            // We still use UTF-8 for decoding as it correctly handles ASCII.
            const outputEncoder = (outputFormat === 'Text')
                ? CryptoJS.enc.Utf8
                : CryptoJS.enc.Hex;

            const decryptedText = decrypted.toString(outputEncoder);

            if (decrypted.sigBytes === 0) {
                 throw new Error("Decryption failed. This is often due to an incorrect key, IV, padding scheme, or data format.");
            }
            if (decrypted.sigBytes > 0 && !decryptedText && outputFormat === 'Text') {
                throw new Error("Decryption resulted in non-printable UTF-8 data. Try decrypting to Hex format instead.");
            }
            
            // New check: Ensure the output is valid ASCII if requested.
            if (outputFormat === 'Text' && decryptedText) {
                // eslint-disable-next-line no-control-regex
                if (/[^\u0000-\u007F]/.test(decryptedText)) {
                    throw new Error("Decryption resulted in non-ASCII characters. The original data may not have been plain ASCII text. Try decrypting to Hex format to view the raw bytes.");
                }
            }
            
            return (outputFormat === 'Hex') ? decryptedText.toUpperCase() : decryptedText;
        }
    } catch (e: any) {
        console.error('Data processing error:', e);
        if (e.message) {
            throw e;
        }
        throw new Error('An unexpected error occurred during data processing.');
    }
};