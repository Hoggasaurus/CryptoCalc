

import { PinBlockFormat, RsaKeyFormat, RsaKeyPairResult, RsaKeySize, DataEncryptionAlgorithm, EncryptionMode, Padding, EncryptionAction, DataFormat, Tr31ParsedBlock, Tr31OptionalBlock, Tr31Header, RsaProcessParams, DukptKeys } from '../types';
import { debugLogger } from './debugLogger';

// This tells TypeScript that CryptoJS is a global variable from the imported script
declare var CryptoJS: any;

/**
 * Generates a cryptographically secure random hex string.
 * @param bytes - The number of bytes of randomness to generate.
 * @returns A hex-encoded string.
 */
export const generateRandomHex = (bytes: number): string => {
  const source = 'generateRandomHex';
  debugLogger.log(source, `Requesting ${bytes} random bytes.`);
  const buffer = new Uint8Array(bytes);
  window.crypto.getRandomValues(buffer);
  const hex = Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
  debugLogger.log(source, `Generated ${bytes} bytes as hex: ${hex.toUpperCase()}`);
  return hex;
};

/**
 * Performs a bitwise XOR operation on an array of hex strings.
 * @param hexStrings - An array of hex strings of the same length.
 * @returns The XORed result as a hex string.
 */
export const xorHexStrings = (hexStrings: string[]): string => {
    const source = 'xorHexStrings';
    debugLogger.log(source, `Performing XOR on ${hexStrings.length} components.`);
    if (!hexStrings || hexStrings.length === 0) {
        debugLogger.log(source, 'Input array is empty, returning empty string.');
        return '';
    }
    hexStrings.forEach((s, i) => debugLogger.log(source, `Input ${i + 1}: ${s}`));

    if (hexStrings.length === 1) {
        debugLogger.log(source, 'Only one component, returning it directly.');
        return hexStrings[0];
    }

    try {
        const C = CryptoJS.enc.Hex.parse;
        let result = C(hexStrings[0]);

        for (let i = 1; i < hexStrings.length; i++) {
            const next = C(hexStrings[i]);
            // Ensure word arrays have the same length for XOR
            if (result.words.length !== next.words.length) {
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
        const resultHex = result.toString(CryptoJS.enc.Hex);
        debugLogger.log(source, `XOR result: ${resultHex.toUpperCase()}`);
        return resultHex;
    } catch (error) {
        debugLogger.log(source, `ERROR: XOR operation failed. ${error}`);
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
    const source = 'calculateKcv';
    debugLogger.log(source, `Calculating ${algorithm} KCV for key: ${keyHex.toUpperCase()}`);
    if (!keyHex) {
        debugLogger.log(source, 'Key is empty, returning empty string.');
        return '';
    }

    try {
        let keyForKcv = keyHex;
        if (algorithm === '3DES' && keyHex.length === 16) { 
            keyForKcv = keyHex + keyHex;
            debugLogger.log(source, `Detected 8-byte 3DES component. Duplicating to 16-byte key for KCV: ${keyForKcv.toUpperCase()}`);
        }
        
        const key = CryptoJS.enc.Hex.parse(keyForKcv);
        let zeroBlock;
        let encryptor;

        if (algorithm === '3DES') {
            zeroBlock = CryptoJS.enc.Hex.parse('0000000000000000');
            encryptor = CryptoJS.TripleDES;
            debugLogger.log(source, 'Using 3DES with an 8-byte zero block for encryption.');
        } else { // AES
            zeroBlock = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
            encryptor = CryptoJS.AES;
            debugLogger.log(source, 'Using AES with a 16-byte zero block for encryption.');
        }

        const encrypted = encryptor.encrypt(zeroBlock, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });
        debugLogger.log(source, `Encrypted zero block using ECB mode, NoPadding.`);

        const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
        debugLogger.log(source, `Full encryption result (ciphertext): ${ciphertextHex.toUpperCase()}`);
        const kcv = ciphertextHex.substring(0, 6).toUpperCase();
        debugLogger.log(source, `Extracted first 3 bytes for KCV: ${kcv}`);
        return kcv;
    } catch (error: any) {
        debugLogger.log(source, `ERROR: KCV calculation failed. ${error.message}`);
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
    const source = 'generateClearPinBlock';
    debugLogger.log(source, `Generating clear PIN block for format ${format}.`);
    if (format === PinBlockFormat.ISO_4) {
        const err = "ISO Format 4 generation requires a PEK and does not produce a simple clear block. Use generatePinBlock.";
        debugLogger.log(source, `ERROR: ${err}`);
        throw new Error(err);
    }
    
    let pinPart: string;

    const pinLen = pin.length;
    const pinLenHex = pinLen.toString(16);
    debugLogger.log(source, `PIN: ${pin}, Length: ${pinLen} (0x${pinLenHex})`);

    if (format === PinBlockFormat.ISO_0) {
        pinPart = '0' + pinLenHex + pin + 'F'.repeat(14 - pinLen);
        debugLogger.log(source, `Formatted PIN Block (ISO 0): ${pinPart}`);
    } else { // ISO_3
        const randomPadding = generateRandomHex(Math.ceil((14 - pinLen) / 2)).substring(0, 14 - pinLen);
        pinPart = '3' + pinLenHex + pin + randomPadding;
        debugLogger.log(source, `Formatted PIN Block (ISO 3) with random padding '${randomPadding}': ${pinPart}`);
    }
    
    const panDigits = pan.substring(pan.length - 13, pan.length - 1);
    const panPart = '0000' + panDigits;
    debugLogger.log(source, `PAN: ${pan}, Formatted PAN Block: ${panPart}`);
    
    const clearPinBlock = xorHexStrings([pinPart, panPart]);
    if (clearPinBlock === 'Error') {
        const err = 'Failed to XOR PIN and PAN blocks.';
        debugLogger.log(source, `ERROR: ${err}`);
        throw new Error(err);
    }
    
    debugLogger.log(source, `Final Clear PIN Block: ${clearPinBlock.toUpperCase()}`);
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
    const source = 'generatePinBlock';
    debugLogger.log(source, `Starting encrypted PIN Block generation for format ${format}.`);
    debugLogger.log(source, `PEK provided: ${'*'.repeat(pek.length)}`);
    
    if (format === PinBlockFormat.ISO_4) {
        debugLogger.log(source, 'Using ISO 4 (Encrypt-XOR-Encrypt) scheme with AES.');
        const pinPrefix = '4' + pin.length.toString(16);
        const pinAndFill = pin.padEnd(14, 'A');
        const randomPart = generateRandomHex(8);
        const pinField = (pinPrefix + pinAndFill + randomPart).toUpperCase();
        debugLogger.log(source, `1. Constructed Plaintext PIN Field (Block A): ${pinField}`);

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
        debugLogger.log(source, `2. Constructed Plaintext PAN Field (Block B): ${panField}`);

        const key = CryptoJS.enc.Hex.parse(pek);
        const pinFieldWords = CryptoJS.enc.Hex.parse(pinField);

        debugLogger.log(source, '3. Encrypting PIN Field with PEK...');
        const encryptedPinFieldResult = CryptoJS.AES.encrypt(pinFieldWords, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });
        const encryptedPinFieldHex = encryptedPinFieldResult.ciphertext.toString(CryptoJS.enc.Hex);
        debugLogger.log(source, `   - Result: ${encryptedPinFieldHex.toUpperCase()}`);
        
        debugLogger.log(source, '4. XORing PAN Field with encrypted PIN field...');
        const xorResultHex = xorHexStrings([panField, encryptedPinFieldHex]);
        if (xorResultHex === 'Error') { throw new Error('Failed to XOR PAN field and encrypted PIN field.'); }
        const xorResultWords = CryptoJS.enc.Hex.parse(xorResultHex);

        debugLogger.log(source, '5. Encrypting result of step 4 with PEK...');
        const finalEncryptedResult = CryptoJS.AES.encrypt(xorResultWords, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.NoPadding
        });
        const finalEncryptedPinBlock = finalEncryptedResult.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
        debugLogger.log(source, `   - Final Encrypted PIN Block: ${finalEncryptedPinBlock}`);

        return {
            clearPinBlock: pinField,
            encryptedPinBlock: finalEncryptedPinBlock
        };
    }

    // --- Logic for ISO Format 0 and 3 ---
    debugLogger.log(source, `Using ISO 0/3 scheme with 3DES.`);
    const clearPinBlock = generateClearPinBlock({ pin, pan, format });
    debugLogger.log(source, `Encrypting clear block with PEK...`);

    const key = CryptoJS.enc.Hex.parse(pek);
    const data = CryptoJS.enc.Hex.parse(clearPinBlock);
    
    const encrypted = CryptoJS.TripleDES.encrypt(data, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.NoPadding
    });

    const encryptedPinBlock = encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
    debugLogger.log(source, `Final Encrypted PIN Block: ${encryptedPinBlock}`);
    
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
 * @param format The desired output format ('pem', 'jwk', 'der').
 * @returns A promise that resolves to an object containing the keys in the specified format.
 */
export const generateRsaKeyPair = async (keySize: RsaKeySize, format: RsaKeyFormat): Promise<RsaKeyPairResult> => {
    const source = 'generateRsaKeyPair';
    debugLogger.log(source, `Generating ${keySize}-bit RSA key pair in ${format.toUpperCase()} format.`);
    debugLogger.log(source, `Using Web Crypto API with RSA-OAEP and SHA-256.`);
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
    debugLogger.log(source, 'Successfully generated CryptoKeyPair.');

    if (format === 'jwk') {
        debugLogger.log(source, 'Exporting keys to JWK format.');
        const [publicKey, privateKey] = await Promise.all([
            window.crypto.subtle.exportKey('jwk', keyPair.publicKey),
            window.crypto.subtle.exportKey('jwk', keyPair.privateKey)
        ]);
        debugLogger.log(source, 'Export successful.');
        return { format: 'jwk', publicKey, privateKey };
    }

    debugLogger.log(source, 'Exporting keys to DER format (SPKI for public, PKCS#8 for private).');
    const [publicKeyDer, privateKeyDer] = await Promise.all([
        window.crypto.subtle.exportKey('spki', keyPair.publicKey),
        window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
    ]);

    if (format === 'der') {
        debugLogger.log(source, 'Converting DER ArrayBuffers to Hex strings.');
        const publicKeyHex = arrayBufferToHex(publicKeyDer);
        const privateKeyHex = arrayBufferToHex(privateKeyDer);
        debugLogger.log(source, 'Hex conversion successful.');
        return { format: 'der', publicKey: publicKeyHex, privateKey: privateKeyHex };
    }

    debugLogger.log(source, 'Converting DER ArrayBuffers to Base64, then formatting as PEM.');
    const publicKeyBase64 = arrayBufferToBase64(publicKeyDer);
    const privateKeyBase64 = arrayBufferToBase64(privateKeyDer);

    const publicKeyPem = formatAsPem(publicKeyBase64, 'PUBLIC');
    const privateKeyPem = formatAsPem(privateKeyBase64, 'PRIVATE');
    debugLogger.log(source, 'PEM formatting successful.');
    
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
    const source = 'processData';
    debugLogger.log(source, `Starting ${action} process.`);
    debugLogger.log(source, `Params: Algorithm=${algorithm}, Mode=${mode}, Padding=${padding}, Input=${inputFormat}, Output=${outputFormat}`);
    debugLogger.log(source, `Key: ${'*'.repeat(keyHex.length)}`);
    if(ivHex) debugLogger.log(source, `IV: ${'*'.repeat(ivHex.length)}`);
    
    try {
        const key = CryptoJS.enc.Hex.parse(keyHex);
        const iv = ivHex ? CryptoJS.enc.Hex.parse(ivHex) : undefined;

        const modeMap = { 'ECB': CryptoJS.mode.ECB, 'CBC': CryptoJS.mode.CBC };
        const paddingMap = {
            'Pkcs7': CryptoJS.pad.Pkcs7, 'NoPadding': CryptoJS.pad.NoPadding,
            'AnsiX923': CryptoJS.pad.AnsiX923, 'Iso10126': CryptoJS.pad.Iso10126,
            'ZeroPadding': CryptoJS.pad.ZeroPadding,
        };

        const cipher = algorithm === 'AES' ? CryptoJS.AES : CryptoJS.TripleDES;
        const config = { iv: iv, mode: modeMap[mode], padding: paddingMap[padding] };
        debugLogger.log(source, `CryptoJS config prepared.`);

        if (action === 'encrypt') {
            const dataToEncrypt = (inputFormat === 'Hex')
                ? CryptoJS.enc.Hex.parse(data)
                : data;
            debugLogger.log(source, `Encrypting ${inputFormat} data...`);

            const encrypted = cipher.encrypt(dataToEncrypt, key, config);
            
            let result: string;
            if (outputFormat === 'Hex') {
                result = encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
                debugLogger.log(source, `Encryption successful. Hex output: ${result}`);
            } else { // 'Text' output for encryption will be Base64
                result = encrypted.toString(); // Default is Base64
                debugLogger.log(source, `Encryption successful. Base64 (ASCII) output: ${result}`);
            }
            return result;

        } else { // decrypt
            debugLogger.log(source, `Decrypting ${inputFormat} data...`);
            
            const decrypted = (inputFormat === 'Hex')
                ? cipher.decrypt({ ciphertext: CryptoJS.enc.Hex.parse(data) }, key, config)
                : cipher.decrypt(data, key, config); // Assumes Base64 for 'Text' input
            
            const outputEncoder = (outputFormat === 'Text') ? CryptoJS.enc.Utf8 : CryptoJS.enc.Hex;
            const decryptedText = decrypted.toString(outputEncoder);

            if (decrypted.sigBytes === 0 && data.length > 0) {
                 throw new Error("Decryption failed. This is often due to an incorrect key, IV, padding scheme, or data format.");
            }
            if (decrypted.sigBytes > 0 && !decryptedText && outputFormat === 'Text') {
                throw new Error("Decryption resulted in non-printable UTF-8 data. Try decrypting to Hex format instead.");
            }
            
            if (outputFormat === 'Text' && decryptedText) {
                // eslint-disable-next-line no-control-regex
                if (/[^\u0000-\u007F]/.test(decryptedText)) {
                    throw new Error("Decryption resulted in non-ASCII characters. The original data may not have been plain ASCII text. Try decrypting to Hex format to view the raw bytes.");
                }
            }
            const result = (outputFormat === 'Hex') ? decryptedText.toUpperCase() : decryptedText;
            debugLogger.log(source, `Decryption successful. ${outputFormat} output: ${result}`);
            return result;
        }
    } catch (e: any) {
        debugLogger.log(source, `ERROR: Data processing failed. ${e.message}`);
        console.error('Data processing error:', e);
        if (e.message) {
            throw e;
        }
        throw new Error('An unexpected error occurred during data processing.');
    }
};

/**
 * Counts the number of set bits (1s) in a number.
 * @param n The number to check.
 * @returns The count of set bits.
 */
const countSetBits = (n: number): number => {
    let count = 0;
    while (n > 0) {
        n &= (n - 1);
        count++;
    }
    return count;
};

/**
 * Adjusts the parity of a DES/3DES key. Each byte is modified to have odd parity.
 * This is a requirement for some hardware and legacy systems.
 * @param keyHex The key as a hex string (16 or 24 bytes).
 * @returns The parity-adjusted key as a hex string.
 */
export const adjustDesKeyParity = (keyHex: string): string => {
    const source = 'adjustDesKeyParity';
    debugLogger.log(source, `Request to adjust parity for key: ${keyHex.toUpperCase()}`);
    if (!keyHex || (keyHex.length !== 32 && keyHex.length !== 48)) {
        debugLogger.log(source, `Invalid key length (${keyHex.length} chars) for parity adjustment. Returning original key.`);
        return keyHex;
    }

    const bytes = [];
    for (let i = 0; i < keyHex.length; i += 2) {
        bytes.push(parseInt(keyHex.substr(i, 2), 16));
    }

    const adjustedBytes = bytes.map((byte, index) => {
        // Standard DES uses odd parity. If the number of set bits in the byte is even,
        // we flip the least significant bit (LSB) to make the total number of set bits odd.
        if (countSetBits(byte) % 2 === 0) {
            const adjustedByte = byte ^ 0x01; // XOR with 1 flips the LSB
            debugLogger.log(source, `Byte ${index} (${byte.toString(16).padStart(2,'0')}) has even parity. Adjusting to ${adjustedByte.toString(16).padStart(2,'0')}.`);
            return adjustedByte;
        }
        return byte;
    });

    const adjustedKeyHex = adjustedBytes.map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    debugLogger.log(source, `Final parity-adjusted key: ${adjustedKeyHex}`);
    return adjustedKeyHex;
};

/**
 * Validates a number string using the Luhn algorithm.
 * @param pan The number string to validate.
 * @returns true if the number is valid, false otherwise.
 */
export const validateLuhn = (pan: string): boolean => {
    const source = 'validateLuhn';
    if (!/^\d+$/.test(pan)) {
        debugLogger.log(source, `Invalid input: contains non-digit characters.`);
        return false;
    }
    
    let sum = 0;
    let shouldDouble = false;
    // Iterate from right to left
    for (let i = pan.length - 1; i >= 0; i--) {
        let digit = parseInt(pan.charAt(i), 10);

        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }
    
    const isValid = sum % 10 === 0;
    debugLogger.log(source, `Validating '${pan}'. Sum: ${sum}. Is valid: ${isValid}`);
    return isValid;
};

/**
 * Calculates the Luhn check digit for a base number string.
 * @param basePan The base number string (without a check digit).
 * @returns The calculated check digit (0-9).
 */
export const calculateLuhnCheckDigit = (basePan: string): number => {
    const source = 'calculateLuhnCheckDigit';
    if (!/^\d*$/.test(basePan)) { // Allow empty string
        debugLogger.log(source, `Invalid input: contains non-digit characters.`);
        throw new Error('Input must be a string of digits.');
    }
    if (basePan.length === 0) {
      return 0; // Or handle as an error, returning 0 is safe.
    }

    let sum = 0;
    // The Luhn algorithm for calculating a check digit requires doubling every second digit
    // from the right of the base number.
    let shouldDouble = true; 
    
    for (let i = basePan.length - 1; i >= 0; i--) {
        let digit = parseInt(basePan.charAt(i), 10);

        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9; // This is equivalent to summing the digits of the product (e.g., 16 -> 1+6=7; 16-9=7)
            }
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    debugLogger.log(source, `Calculating for '${basePan}'. Sum: ${sum}. Check digit: ${checkDigit}`);
    return checkDigit;
};

// --- TR-31 Parsing ---
function hexToAscii(hex: string): string {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

/**
 * Parses a TR-31 key block from an ASCII string.
 * @param keyBlockAscii The TR-31 key block as an ASCII string.
 * @returns A structured object representing the parsed block.
 */
export const parseTr31Block = (keyBlockAscii: string): Tr31ParsedBlock => {
    const source = 'parseTr31Block';
    debugLogger.log(source, 'Starting TR-31 block parsing.');
    const cleanedAscii = keyBlockAscii.replace(/\s/g, '').toUpperCase();
    
    const headerLength = 16; // Standard TR-31 header is 16 ASCII characters
    if (cleanedAscii.length < headerLength) {
        throw new Error(`Invalid TR-31 block. Length must be at least ${headerLength} characters for the header.`);
    }

    const rawHeader = cleanedAscii.substring(0, headerLength);
    debugLogger.log(source, `Raw Header: ${rawHeader}`);

    const keyBlockLengthStr = rawHeader.substring(1, 5);
    const keyBlockLength = parseInt(keyBlockLengthStr, 10);

    if (isNaN(keyBlockLength) || String(keyBlockLength).padStart(4, '0') !== keyBlockLengthStr) {
        throw new Error(`Invalid key block length in header: ${keyBlockLengthStr}`);
    }
    
    // The length in the header is the length of the entire ASCII string block.
    if (cleanedAscii.length !== keyBlockLength) {
        throw new Error(`Key block length mismatch. Header says ${keyBlockLength}, actual length is ${cleanedAscii.length}.`);
    }

    const header: Tr31Header = {
        versionId: rawHeader.substring(0, 1),
        keyBlockLength: keyBlockLengthStr,
        keyUsage: rawHeader.substring(5, 7),
        algorithm: rawHeader.substring(7, 8),
        modeOfUse: rawHeader.substring(8, 9),
        keyVersionNumber: rawHeader.substring(9, 11),
        exportability: rawHeader.substring(11, 12),
        numberOfOptionalBlocks: parseInt(rawHeader.substring(12, 14), 10),
        reserved: rawHeader.substring(14, 16)
    };
    
    if (isNaN(header.numberOfOptionalBlocks)) {
        throw new Error(`Invalid number of optional blocks in header: ${rawHeader.substring(12, 14)}`);
    }
    
    debugLogger.log(source, `Parsed header fields: ${JSON.stringify(header)}`);
    
    let currentOffset = headerLength;
    const optionalBlocks: Tr31OptionalBlock[] = [];
    let rawOptionalBlocksStr = '';

    for (let i = 0; i < header.numberOfOptionalBlocks; i++) {
        if (currentOffset + 4 > cleanedAscii.length) { // Need at least 2 chars for ID and 2 for length
            debugLogger.log(source, `Stopping optional block parsing: not enough data for block #${i + 1} header.`);
            break;
        }
        const blockId = cleanedAscii.substring(currentOffset, currentOffset + 2);
        const blockLengthStr = cleanedAscii.substring(currentOffset + 2, currentOffset + 4);
        
        // A valid Block ID is two ASCII uppercase letters or digits.
        // A valid length is two ASCII digits.
        if (!/^[A-Z0-9]{2}$/.test(blockId) || !/^\d{2}$/.test(blockLengthStr)) {
            debugLogger.log(source, `Stopping optional block parsing: found invalid block header (ID: ${blockId}, Len: ${blockLengthStr}). Assuming start of encrypted key data.`);
            break;
        }

        const blockLengthBytes = parseInt(blockLengthStr, 10);
        const blockLengthChars = blockLengthBytes * 2; // Data is hex, so 2 chars per byte

        debugLogger.log(source, `Parsing optional block #${i + 1}: ID=${blockId}, Length=${blockLengthBytes} bytes (${blockLengthChars} chars)`);

        if (currentOffset + 4 + blockLengthChars > cleanedAscii.length) {
            throw new Error(`Incomplete optional block data for ID ${blockId}. Declared length ${blockLengthBytes} bytes goes past end of key block.`);
        }
        const blockValue = cleanedAscii.substring(currentOffset + 4, currentOffset + 4 + blockLengthChars);
        
        const optionalBlock: Tr31OptionalBlock = {
            blockId,
            length: blockLengthBytes,
            value: blockValue
        };
        optionalBlocks.push(optionalBlock);
        
        const fullBlockStr = cleanedAscii.substring(currentOffset, currentOffset + 4 + blockLengthChars);
        rawOptionalBlocksStr += fullBlockStr;

        currentOffset += (4 + blockLengthChars);
    }
    
    debugLogger.log(source, `Parsed ${optionalBlocks.length} optional blocks.`);

    let authenticatorLengthChars: number;
    switch (header.versionId) {
        case 'D':
            authenticatorLengthChars = 64; // HMAC-SHA-256 (32 bytes)
            break;
        case 'C':
            authenticatorLengthChars = (header.algorithm === 'A') ? 32 : 16; // CMAC with AES (16 bytes) or TDEA (8 bytes)
            break;
        default: // Covers 'A', 'B' and any other custom/older versions
            authenticatorLengthChars = 16; // TDEA-MAC (8 bytes)
            break;
    }

    debugLogger.log(source, `Using authenticator length of ${authenticatorLengthChars} chars for version ${header.versionId} and algorithm ${header.algorithm}.`);

    const remainingLength = cleanedAscii.length - currentOffset;
    if (remainingLength < authenticatorLengthChars) {
        throw new Error('Not enough data for encrypted key and authenticator.');
    }

    const encryptedKeyAndAuthenticator = cleanedAscii.substring(currentOffset);
    const encryptedKey = encryptedKeyAndAuthenticator.substring(0, encryptedKeyAndAuthenticator.length - authenticatorLengthChars);
    const authenticator = encryptedKeyAndAuthenticator.substring(encryptedKeyAndAuthenticator.length - authenticatorLengthChars);
    
    if (encryptedKey.length === 0) {
         debugLogger.log(source, `WARNING: Encrypted key part is empty. This is valid for key blocks that only transport metadata.`);
    } else if ((encryptedKey.length % 2) !== 0) {
        throw new Error(`Invalid encrypted key length. Must be an even number of hex characters, but got ${encryptedKey.length}.`);
    }

    const result: Tr31ParsedBlock = {
        header,
        optionalBlocks,
        encryptedKey,
        authenticator,
        raw: {
            header: rawHeader,
            optionalBlocks: rawOptionalBlocksStr,
            encryptedKeyAndAuthenticator
        }
    };

    return result;
};

// --- RSA Encryption/Decryption ---

const stringToArrayBuffer = (str: string): ArrayBuffer => new TextEncoder().encode(str).buffer;
const arrayBufferToString = (buffer: ArrayBuffer): string => new TextDecoder().decode(buffer);
const hexToArrayBuffer = (hex: string): ArrayBuffer => {
    const cleanedHex = hex.replace(/\s/g, '');
    const bytes = new Uint8Array(cleanedHex.length / 2);
    for (let i = 0; i < cleanedHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanedHex.substr(i, 2), 16);
    }
    return bytes.buffer;
};
const base64ToArrayBuffer = (b64: string): ArrayBuffer => {
    const byteString = window.atob(b64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Helper to import a PEM key (PKCS#8 or SPKI)
async function importRsaKey(pem: string, isPublic: boolean): Promise<CryptoKey> {
    const source = 'importRsaKey';
    const pemHeader = isPublic ? '-----BEGIN PUBLIC KEY-----' : '-----BEGIN PRIVATE KEY-----';
    const pemFooter = isPublic ? '-----END PUBLIC KEY-----' : '-----END PRIVATE KEY-----';
    
    const trimmedPem = pem.trim();

    if (!trimmedPem.startsWith(pemHeader)) {
        throw new Error(`Invalid PEM format. Expected key to start with ${pemHeader}`);
    }
    
    if (!trimmedPem.endsWith(pemFooter)) {
        throw new Error(`Invalid PEM format. Expected key to end with ${pemFooter}`);
    }

    // Extract base64 content between header and footer
    const pemContents = trimmedPem.substring(pemHeader.length, trimmedPem.lastIndexOf(pemFooter));
    
    // Remove all whitespace (including newlines) from the base64 content
    const base64 = pemContents.replace(/\s/g, '');
    
    if (!base64) {
        throw new Error('PEM content is empty. The key appears to be missing its data.');
    }

    const binaryDer = base64ToArrayBuffer(base64);
    
    debugLogger.log(source, `Importing ${isPublic ? 'Public' : 'Private'} key using RSA-OAEP / SHA-256.`);
    return window.crypto.subtle.importKey(
        isPublic ? 'spki' : 'pkcs8',
        binaryDer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        isPublic ? ['encrypt'] : ['decrypt']
    );
}

/**
 * Encrypts or decrypts data using RSA-OAEP with the Web Crypto API.
 * @param params The parameters for the operation.
 * @returns The processed data as a string in the specified output format.
 */
export const processRsaData = async ({ action, keyPem, data, inputFormat, outputFormat }: RsaProcessParams): Promise<string> => {
    const source = 'processRsaData';
    debugLogger.log(source, `Starting RSA ${action} process.`);
    try {
        const isPublic = action === 'encrypt';
        const cryptoKey = await importRsaKey(keyPem, isPublic);

        let dataBuffer: ArrayBuffer;
        if (inputFormat === 'Text') {
            dataBuffer = (action === 'encrypt')
                ? stringToArrayBuffer(data) // Plaintext is UTF-8
                : base64ToArrayBuffer(data); // Ciphertext is Base64
            debugLogger.log(source, `Converted ${inputFormat} input to ArrayBuffer.`);
        } else { // Hex
            dataBuffer = hexToArrayBuffer(data);
            debugLogger.log(source, `Converted Hex input to ArrayBuffer.`);
        }

        if (action === 'encrypt') {
            debugLogger.log(source, 'Encrypting data with public key...');
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                { name: 'RSA-OAEP' },
                cryptoKey,
                dataBuffer
            );
            debugLogger.log(source, 'Encryption successful.');
            return outputFormat === 'Hex' ? arrayBufferToHex(encryptedBuffer) : arrayBufferToBase64(encryptedBuffer);
        } else { // decrypt
            debugLogger.log(source, 'Decrypting data with private key...');
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                cryptoKey,
                dataBuffer
            );
            debugLogger.log(source, 'Decryption successful.');
            return outputFormat === 'Hex' ? arrayBufferToHex(decryptedBuffer) : arrayBufferToString(decryptedBuffer);
        }

    } catch (e: any) {
        debugLogger.log(source, `ERROR: RSA process failed. ${e.message}`);
        console.error('RSA process error:', e);
        if(e.message.includes('decryption failed')) {
            throw new Error('Decryption failed. This is typically due to an incorrect private key or malformed ciphertext.');
        }
        if(e.message.includes('Key unusable')) {
            throw new Error('Key is unusable for this operation. Ensure you are using a public key to encrypt and a private key to decrypt.');
        }
        throw new Error(e.message || 'An unexpected error occurred during RSA processing.');
    }
};

// --- DUKPT Derivation ---

const tdesEncrypt = (keyHex: string, dataHex: string): string => {
    const key = CryptoJS.enc.Hex.parse(keyHex);
    const data = CryptoJS.enc.Hex.parse(dataHex);
    const encrypted = CryptoJS.TripleDES.encrypt(data, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.NoPadding
    });
    return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
};

const BDK_MOD_VECTOR = 'C0C0C0C000000000C0C0C0C000000000';
// ANSI X9.24-1-2009 variants for session key derivation
const PIN_VARIANT_VECTOR =         '000000000000000000000000000000F0';
const MAC_REQUEST_VARIANT_VECTOR = '0000000000000000FFFFFFFF00000000';
const MAC_RESPONSE_VARIANT_VECTOR ='000000000000000000000000FFFFFFFF';
const DATA_REQUEST_VARIANT_VECTOR ='00000000FFFFFFFF0000000000000000';
const DATA_RESPONSE_VARIANT_VECTOR='0000000000000000FFFFFFFFFFFFFFFF';

const getIpek = (bdkHex: string, ksnHex: string): string => {
    const source = 'Dukpt.getIpek';
    debugLogger.log(source, `Deriving IPEK from BDK and KSN.`);

    // Take right-most 8 bytes of KSN, with counter part cleared (which is already done when calling this)
    const ksnForIpek = ksnHex.substring(ksnHex.length - 16);
    debugLogger.log(source, `KSN portion for IPEK derivation: ${ksnForIpek}`);

    // Encrypt the KSN portion with the BDK
    const ipekLeft = tdesEncrypt(bdkHex, ksnForIpek);
    debugLogger.log(source, `IPEK Left half: ${ipekLeft}`);

    // Create the modified BDK by XORing with a constant
    const bdkMod = xorHexStrings([bdkHex, BDK_MOD_VECTOR.substring(0, bdkHex.length)]);
    
    // Encrypt the KSN portion with the modified BDK
    const ipekRight = tdesEncrypt(bdkMod, ksnForIpek);
    debugLogger.log(source, `IPEK Right half: ${ipekRight}`);

    return ipekLeft + ipekRight;
};

export const deriveDukptKeys = (bdkHex: string, ksnHex: string): DukptKeys => {
    const source = 'deriveDukptKeys';
    debugLogger.log(source, `--- Starting DUKPT Derivation ---`);
    debugLogger.log(source, `BDK: ${'*'.repeat(bdkHex.length)}, KSN: ${ksnHex}`);

    if (bdkHex.length !== 32 && bdkHex.length !== 48) {
        throw new Error('BDK must be a 16-byte (32 hex chars) or 24-byte (48 hex chars) key.');
    }
    if (ksnHex.length !== 20) {
        throw new Error('KSN must be a 10-byte (20 hex chars) value.');
    }

    const ksnBigInt = BigInt('0x' + ksnHex);
    const counterBigInt = ksnBigInt & 0x1FFFFFn;
    const counterHex = counterBigInt.toString(16).padStart(6, '0').toUpperCase();
    
    const ksnWithoutCounter = ksnBigInt & ~0x1FFFFFn;
    const ipek = getIpek(bdkHex, ksnWithoutCounter.toString(16).padStart(20, '0'));
    debugLogger.log(source, `Derived IPEK: ${ipek}`);

    let currentKey = ipek;
    let shiftRegister = ksnWithoutCounter;

    for (let i = 0; i < 21; i++) {
        if ((counterBigInt >> BigInt(i)) & 1n) {
            const bit = 1n << BigInt(i);
            shiftRegister |= bit;
            const ksnPortion = (shiftRegister & 0xFFFFFFFFFFFFFFFFFFFFn).toString(16).padStart(20, '0').substring(4, 20);
            
            // --- Future Key Derivation Step ---
            // This is one step of the non-reversible key generation process as per ANSI X9.24-1
            
            // Derive the left half of the new key
            const keyRight = currentKey.substring(16, 32);
            const msg = xorHexStrings([ksnPortion, keyRight]);
            let newKeyLeft = tdesEncrypt(currentKey.substring(0, 16), msg);
            newKeyLeft = xorHexStrings([newKeyLeft, keyRight]);
            
            // Derive the right half of the new key
            const keyMod = xorHexStrings([currentKey, BDK_MOD_VECTOR]);
            const keyLeftMod = keyMod.substring(0, 16);
            const keyRightMod = keyMod.substring(16, 32);
            
            const msg2 = xorHexStrings([ksnPortion, keyRightMod]);
            let newKeyRight = tdesEncrypt(keyLeftMod, msg2);
            newKeyRight = xorHexStrings([newKeyRight, keyRightMod]);
            
            currentKey = newKeyLeft + newKeyRight;
        }
    }
    debugLogger.log(source, `Derived Transaction Key: ${currentKey}`);
    
    const transactionKey = currentKey;
    const pinKey = xorHexStrings([transactionKey, PIN_VARIANT_VECTOR]);
    debugLogger.log(source, `Derived PIN Key: ${pinKey}`);
    
    const macRequestKey = xorHexStrings([transactionKey, MAC_REQUEST_VARIANT_VECTOR]);
    debugLogger.log(source, `Derived MAC Request Key (Generation): ${macRequestKey}`);

    const macResponseKey = xorHexStrings([transactionKey, MAC_RESPONSE_VARIANT_VECTOR]);
    debugLogger.log(source, `Derived MAC Response Key (Verification): ${macResponseKey}`);

    const dataRequestKey = xorHexStrings([transactionKey, DATA_REQUEST_VARIANT_VECTOR]);
    debugLogger.log(source, `Derived Data Request Key (Encryption): ${dataRequestKey}`);
    
    const dataResponseKey = xorHexStrings([transactionKey, DATA_RESPONSE_VARIANT_VECTOR]);
    debugLogger.log(source, `Derived Data Response Key (Decryption): ${dataResponseKey}`);

    return {
        ipek,
        transactionKey,
        pinKey,
        macRequestKey,
        macResponseKey,
        dataRequestKey,
        dataResponseKey,
        ksn: ksnHex.toUpperCase(),
        counter: counterHex
    };
};