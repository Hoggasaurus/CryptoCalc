
export interface KeyComponent {
  id: string;
  value: string; // Hex encoded
  kcv: string;   // Hex encoded
  kcvType: '3DES' | 'AES';
}

export enum Algorithm {
    // AES
    AES_128_1_PART = 'AES_128_1_PART',
    AES_128_2_PART = 'AES_128_2_PART',
    AES_128_3_PART = 'AES_128_3_PART',

    AES_192_1_PART = 'AES_192_1_PART',
    AES_192_2_PART = 'AES_192_2_PART',
    AES_192_3_PART = 'AES_192_3_PART',

    AES_256_1_PART = 'AES_256_1_PART',
    AES_256_2_PART = 'AES_256_2_PART',
    AES_256_3_PART = 'AES_256_3_PART',

    // 3DES
    TDES_2KEY_1_PART = 'TDES_2KEY_1_PART',
    TDES_2KEY_2_PART = 'TDES_2KEY_2_PART',
    TDES_2KEY_3_PART = 'TDES_2KEY_3_PART',

    TDES_3KEY_1_PART = 'TDES_3KEY_1_PART',
    TDES_3KEY_2_PART = 'TDES_3KEY_2_PART',
    TDES_3KEY_3_PART = 'TDES_3KEY_3_PART',
}

export interface AlgorithmConfig {
    name: string;
    keyLengthBytes: number;
    componentCount: number;
    // Length of EACH component
    componentLengthBytes: number;
    kcvType: '3DES' | 'AES';
}

export enum PinBlockFormat {
    ISO_0 = 'ISO_0',
    ISO_3 = 'ISO_3',
    ISO_4 = 'ISO_4',
}

// --- RSA Types ---
export type RsaKeySize = 1024 | 2048 | 3072 | 4096;
export type RsaKeyFormat = 'pem' | 'jwk' | 'der';

export type RsaKeyPairResult = 
    | { format: 'pem', publicKey: string, privateKey: string } 
    | { format: 'jwk', publicKey: JsonWebKey, privateKey: JsonWebKey }
    | { format: 'der', publicKey: string, privateKey: string };

// --- Data Encryption Types ---
export type DataEncryptionAlgorithm = 'AES' | '3DES';
export type EncryptionMode = 'ECB' | 'CBC';
export type Padding = 'Pkcs7' | 'NoPadding' | 'AnsiX923' | 'Iso10126' | 'ZeroPadding';
export type EncryptionAction = 'encrypt' | 'decrypt';
export type DataFormat = 'Text' | 'Hex';
