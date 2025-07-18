
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
        name: '3DES 2-Key (Single Component)',
        keyLengthBytes: 16, componentCount: 1, componentLengthBytes: 16, kcvType: '3DES'
    },
    [Algorithm.TDES_2KEY_2_PART]: {
        name: '3DES 2-Key (2 Parts, XORed)',
        keyLengthBytes: 16, componentCount: 2, componentLengthBytes: 16, kcvType: '3DES'
    },
    [Algorithm.TDES_2KEY_3_PART]: {
        name: '3DES 2-Key (3 Parts, XORed)',
        keyLengthBytes: 16, componentCount: 3, componentLengthBytes: 16, kcvType: '3DES'
    },
    [Algorithm.TDES_3KEY_1_PART]: {
        name: '3DES 3-Key (Single Component)',
        keyLengthBytes: 24, componentCount: 1, componentLengthBytes: 24, kcvType: '3DES'
    },
    [Algorithm.TDES_3KEY_2_PART]: {
        name: '3DES 3-Key (2 Parts, XORed)',
        keyLengthBytes: 24, componentCount: 2, componentLengthBytes: 24, kcvType: '3DES'
    },
    [Algorithm.TDES_3KEY_3_PART]: {
        name: '3DES 3-Key (3 Parts, XORed)',
        keyLengthBytes: 24, componentCount: 3, componentLengthBytes: 24, kcvType: '3DES'
    },
};
