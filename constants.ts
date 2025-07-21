
import { Algorithm, AlgorithmConfig } from './types';

export const KEY_ALGORITHMS: Record<Algorithm, AlgorithmConfig> = {
    // --- AES ---
    [Algorithm.AES_128_1_PART]: {
        name: 'AES-128 (Single Component)',
        keyLengthBytes: 16, componentCount: 1, componentLengthBytes: 16, kcvType: 'AES'
    },
    [Algorithm.AES_128_2_PART]: {
        name: 'AES-128 (2 Parts, XORed)',
        keyLengthBytes: 16, componentCount: 2, componentLengthBytes: 16, kcvType: 'AES'
    },
    [Algorithm.AES_128_3_PART]: {
        name: 'AES-128 (3 Parts, XORed)',
        keyLengthBytes: 16, componentCount: 3, componentLengthBytes: 16, kcvType: 'AES'
    },
    [Algorithm.AES_192_1_PART]: {
        name: 'AES-192 (Single Component)',
        keyLengthBytes: 24, componentCount: 1, componentLengthBytes: 24, kcvType: 'AES'
    },
    [Algorithm.AES_192_2_PART]: {
        name: 'AES-192 (2 Parts, XORed)',
        keyLengthBytes: 24, componentCount: 2, componentLengthBytes: 24, kcvType: 'AES'
    },
    [Algorithm.AES_192_3_PART]: {
        name: 'AES-192 (3 Parts, XORed)',
        keyLengthBytes: 24, componentCount: 3, componentLengthBytes: 24, kcvType: 'AES'
    },
    [Algorithm.AES_256_1_PART]: {
        name: 'AES-256 (Single Component)',
        keyLengthBytes: 32, componentCount: 1, componentLengthBytes: 32, kcvType: 'AES'
    },
    [Algorithm.AES_256_2_PART]: {
        name: 'AES-256 (2 Parts, XORed)',
        keyLengthBytes: 32, componentCount: 2, componentLengthBytes: 32, kcvType: 'AES'
    },
    [Algorithm.AES_256_3_PART]: {
        name: 'AES-256 (3 Parts, XORed)',
        keyLengthBytes: 32, componentCount: 3, componentLengthBytes: 32, kcvType: 'AES'
    },

    // --- 3DES ---
    [Algorithm.TDES_2KEY_1_PART]: {
        name: '3DES Double Length (Single Component)',
        keyLengthBytes: 16, componentCount: 1, componentLengthBytes: 16, kcvType: '3DES'
    },
    [Algorithm.TDES_2KEY_2_PART]: {
        name: '3DES Double Length (2 Parts, XORed)',
        keyLengthBytes: 16, componentCount: 2, componentLengthBytes: 16, kcvType: '3DES'
    },
    [Algorithm.TDES_2KEY_3_PART]: {
        name: '3DES Double Length (3 Parts, XORed)',
        keyLengthBytes: 16, componentCount: 3, componentLengthBytes: 16, kcvType: '3DES'
    },
    [Algorithm.TDES_3KEY_1_PART]: {
        name: '3DES Triple Length (Single Component)',
        keyLengthBytes: 24, componentCount: 1, componentLengthBytes: 24, kcvType: '3DES'
    },
    [Algorithm.TDES_3KEY_2_PART]: {
        name: '3DES Triple Length (2 Parts, XORed)',
        keyLengthBytes: 24, componentCount: 2, componentLengthBytes: 24, kcvType: '3DES'
    },
    [Algorithm.TDES_3KEY_3_PART]: {
        name: '3DES Triple Length (3 Parts, XORed)',
        keyLengthBytes: 24, componentCount: 3, componentLengthBytes: 24, kcvType: '3DES'
    },
};


// --- TR-31 Constants ---
export const TR31_HEADER_LENGTH = 32; // 16 bytes * 2 hex chars

export const TR31_VERSIONS: Record<string, string> = {
    'A': 'A - Original version',
    'B': 'B - Key Block authentication is a MAC of the cleartext key',
    'C': 'C - Key Block authentication using CMAC',
    'D': 'D - Key Block authentication using HMAC-SHA-256',
};

export const TR31_KEY_USAGES: Record<string, string> = {
    // B - Binding/Block Keys
    'B0': 'Key block protection key (KEK)',
    'B1': 'Key block protection key for key variant binding',
    'B2': 'TR-34 Asymmetric Key',
    // C - Card Keys
    'C0': 'Card security value (CVV, CVC, etc.)',
    'C1': 'Card PIN-based security value (CVC3)',
    'C2': 'dCVV for EMV',
    // D - Data Keys
    'D0': 'Data encryption (general)',
    'D1': 'Data encryption, financial transaction (ISO 11568-2)',
    'D2': 'Data encryption, EMV/chip card related',
    // E - EMV Keys
    'E0': 'EMV/chip card key: Master Key for ICC',
    'E1': 'EMV/chip card key: Master Key derivation for ICC',
    'E2': 'EMV/chip card key: key derivation for ICC',
    'E3': 'EMV/chip card key: for dynamic number generation',
    'E4': 'EMV/chip card key: for transaction data encryption',
    'E5': 'EMV/chip card key: for card personalization',
    'E6': 'EMV/chip card key: other',
    // I - Initialization Vector
    'I0': 'Initialization Vector (IV)',
    // K - Key Encryption Keys
    'K0': 'Key encryption key (KEK), general',
    'K1': 'Key encryption key, for another KEK',
    'K2': 'Key encryption key, for TR-31 key block',
    'K3': 'Asymmetric key for key agreement/wrapping',
    'K4': 'Key encryption for RSA keys',
    // L - Key Loader Keys
    'L0': 'Key loader key',
    // M - MAC Keys
    'M0': 'MAC generation, general',
    'M1': 'MAC verification, general',
    'M2': 'MAC generation, financial transaction (ISO 9797-1)',
    'M3': 'MAC generation, financial transaction (ANSI X9.9)',
    'M4': 'MAC generation, ANSI X9.19',
    'M5': 'MAC verification, ANSI X9.19',
    'M6': 'MAC generation, ISO 9797-1, Alg 3',
    'M7': 'MAC verification, ISO 9797-1, Alg 3',
    'M8': 'MAC for CVV, CVC, etc.',
    // P - PIN Keys
    'P0': 'PIN encryption (ANSI X9.8, ISO 9564-1)',
    'P1': 'PIN verification, remote (ISO 9564-1, -3)',
    'P2': 'PIN generation/verification (using offset)',
    // S - Signature Keys
    'S0': 'Asymmetric key for digital signature',
    'S1': 'Asymmetric key for certificate authority',
    'S2': 'Asymmetric key for other use',
    // V - PIN Verification Keys
    'V0': 'PIN verification, local (IBM 3624)',
    'V1': 'PIN verification, local (VISA PVV)',
    'V2': 'PIN verification, local (user defined)',
    'V3': 'PIN verification, local (e.g., Italian BNL)',
    'V4': 'PIN verification, local (e.g., AS2805.3)',
};

export const TR31_ALGORITHMS: Record<string, string> = {
    'A': 'AES',
    'D': 'DES',
    'E': 'TDEA (2-key 3DES)',
    'T': 'TDEA (3-key 3DES)',
    'R': 'RSA',
    'S': 'DSA',
    'G': 'ECC',
};

export const TR31_MODES_OF_USE: Record<string, string> = {
    'E': 'Encrypt/Wrap',
    'D': 'Decrypt/Unwrap',
    'B': 'Both (Encrypt/Wrap and Decrypt/Unwrap)',
    'G': 'Generate',
    'V': 'Verify',
    'C': 'MAC Calculate/Generate',
    'N': 'No restrictions',
    'S': 'Sign',
    'U': 'Signature verification',
    'X': 'XOR/Derive key',
};

export const TR31_EXPORTABILITY: Record<string, string> = {
    'E': 'Exportable under a KEK',
    'N': 'Non-exportable',
    'S': 'Sensitive, exportable under a KEK that is explicitly trusted',
};

export const TR31_OPTIONAL_BLOCKS: Record<string, string> = {
    'PB': 'Padding Block',
    'CV': 'Key Check Value',
    'ID': 'Key Block ID',
    'KV': 'Key Version Number (if different from header)',
    'AG': 'Authorization Generating Information (AGI)',
    'AT': 'Authorization Token (AT)',
    'KA': 'Key Attributes',
    'KN': 'Key Name',
    'DS': 'Digital Signature',
    'SC': 'CMAC value over key block',
    'PC': 'Proprietary Control field',
    'TS': 'Timestamp',
    'TP': 'Key Transport Parameters',
    'CI': 'Certificate Info',
    '00': 'Proprietary Data Block (00)',
    '01': 'Proprietary Data Block (01)',
    '02': 'Proprietary Data Block (02)',
};
