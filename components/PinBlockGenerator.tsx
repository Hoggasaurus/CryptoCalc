import React, { useState, useCallback } from 'react';
import { PinBlockFormat } from '../types';
import { generatePinBlock, generateClearPinBlock, generateRandomHex } from '../services/cryptoService';
import Card from './Card';
import Button from './Button';
import ResultDisplay from './ResultDisplay';
import { Icon } from './Icon';
import Tooltip from './Tooltip';
import { debugLogger } from '../services/debugLogger';

const FormatsInfo: Record<PinBlockFormat, {name: string, description: string}> = {
    [PinBlockFormat.ISO_0]: {
        name: 'ISO 9564-1 Format 0',
        description: 'The most common format. Uses 3DES encryption and a fixed padding scheme with the character "F".',
    },
    [PinBlockFormat.ISO_3]: {
        name: 'ISO 9564-1 Format 3',
        description: 'Uses 3DES encryption and random nibbles for padding instead of a fixed pattern.',
    },
    [PinBlockFormat.ISO_4]: {
        name: 'ISO 9564-1 Format 4',
        description: 'A modern format requiring an AES key. Uses a double-encryption (Encrypt-XOR-Encrypt) scheme.',
    }
}

const PinBlockGenerator: React.FC = () => {
    const [pin, setPin] = useState('');
    const [pan, setPan] = useState('');
    const [pek, setPek] = useState('');
    const [format, setFormat] = useState<PinBlockFormat>(PinBlockFormat.ISO_0);
    const [result, setResult] = useState<{ clearPinBlock: string; encryptedPinBlock: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isAES = format === PinBlockFormat.ISO_4;

    const handleGenerate = useCallback(() => {
        const source = 'PinBlockGenerator';
        debugLogger.log(source, `--- Starting PIN Block Generation ---`);
        debugLogger.log(source, `Selected Format: ${format} (${FormatsInfo[format].name})`);
        debugLogger.log(source, `PIN: ${pin}, PAN: ${pan}, PEK: ${pek ? '*'.repeat(pek.length) : 'Not Provided'}`);

        setError(null);
        setResult(null);

        if (pin.length < 4 || pin.length > 12) {
            const err = 'PIN must be between 4 and 12 digits.';
            setError(err);
            debugLogger.log(source, `Validation FAILED: ${err}`);
            return;
        }
        if (pan.length < 12 || pan.length > 19) {
            const err = 'PAN must be between 12 and 19 digits.';
            setError(err);
            debugLogger.log(source, `Validation FAILED: ${err}`);
            return;
        }
        
        if (isAES && !pek) {
            const err = 'An AES PEK is required for ISO Format 4 generation.';
            setError(err);
            debugLogger.log(source, `Validation FAILED: ${err}`);
            return;
        }

        try {
            if (pek) {
                if (isAES) {
                    if (![32, 48, 64].includes(pek.length)) {
                        const err = 'For ISO Format 4, PEK must be a 16, 24, or 32-byte AES key (32, 48, or 64 hex characters).';
                        setError(err);
                        debugLogger.log(source, `Validation FAILED: ${err}`);
                        return;
                    }
                } else {
                    if (![32, 48].includes(pek.length)) {
                        const err = 'For ISO Format 0/3, PEK must be a 16 or 24-byte 3DES key (32 or 48 hex characters).';
                        setError(err);
                        debugLogger.log(source, `Validation FAILED: ${err}`);
                        return;
                    }
                }
                debugLogger.log(source, `PEK length (${pek.length}) is valid for selected format.`);
                const generated = generatePinBlock({ pin, pan, pek, format });
                setResult(generated);
                debugLogger.log(source, `SUCCESS: Encrypted PIN block generated.`);
            } else {
                debugLogger.log(source, `PEK not provided. Generating clear PIN block only.`);
                const clearBlock = generateClearPinBlock({ pin, pan, format });
                setResult({ clearPinBlock: clearBlock, encryptedPinBlock: '' });
                debugLogger.log(source, `SUCCESS: Clear PIN block generated.`);
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred during PIN block generation.');
            debugLogger.log(source, `ERROR: ${e.message}`);
        }

    }, [pin, pan, pek, format, isAES]);

    const handleGenerateRandomPek = useCallback(() => {
        const byteLength = isAES ? 32 : 16;
        const randomPek = generateRandomHex(byteLength);
        setPek(randomPek.toUpperCase());
        debugLogger.log('PinBlockGenerator', `Generated random ${byteLength}-byte PEK.`);
    }, [isAES]);

    return (
        <div className="max-w-3xl mx-auto">
            <Card title="PIN Block Generator">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="pin-input" className="block text-sm font-medium text-slate-300">
                                PIN (4-12 digits)
                            </label>
                            <input
                                id="pin-input"
                                type="text"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                maxLength={12}
                                className="mt-1 flex-grow w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                placeholder="e.g., 1234"
                            />
                        </div>
                        <div>
                            <label htmlFor="pan-input" className="block text-sm font-medium text-slate-300">
                                PAN (12-19 digits)
                            </label>
                            <input
                                id="pan-input"
                                type="text"
                                value={pan}
                                onChange={(e) => setPan(e.target.value.replace(/[^0-9]/g, ''))}
                                maxLength={19}
                                className="mt-1 flex-grow w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                placeholder="e.g., 49...1234"
                            />
                        </div>
                    </div>
                    <div>
                         <label htmlFor="pek-input" className="block text-sm font-medium text-slate-300">
                            PIN Encryption Key ({isAES ? 'AES' : '3DES'} PEK)
                        </label>
                        <div className="mt-1 flex items-stretch gap-2">
                             <input
                                id="pek-input"
                                type="text"
                                value={pek}
                                onChange={(e) => setPek(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                                maxLength={isAES ? 64 : 48}
                                className="flex-grow w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                placeholder={isAES ? 'Required AES hex key' : 'Optional 3DES hex key'}
                            />
                            <Button
                                onClick={handleGenerateRandomPek}
                                className="!px-3 bg-slate-600 hover:bg-slate-500"
                                title={`Generate random ${isAES ? '32-byte AES' : '16-byte 3DES'} PEK`}
                            >
                                <Icon name="sparkles" className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="format-select" className="block text-sm font-medium text-slate-300">
                            PIN Block Format
                        </label>
                        <div className="relative mt-1">
                            <select
                                id="format-select"
                                value={format}
                                onChange={(e) => {
                                    const newFormat = e.target.value as PinBlockFormat;
                                    setFormat(newFormat);
                                    debugLogger.log('PinBlockGenerator', `Format changed to ${newFormat}.`);
                                }}
                                className="w-full appearance-none bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                {Object.entries(FormatsInfo).map(([key, value]) => (
                                    <option key={key} value={key}>{value.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                <Icon name="chevron-down" />
                            </div>
                        </div>
                         <p className="mt-2 text-xs text-slate-400">{FormatsInfo[format].description}</p>
                    </div>

                    {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 p-3 rounded-md">{error}</p>}
                    
                    <Button 
                        onClick={handleGenerate} 
                        className="w-full !mt-8"
                        disabled={isAES && !pek}
                    >
                        <Icon name="shield-check"/>
                        {isAES || pek ? 'Generate Encrypted PIN Block' : 'Generate Clear PIN Block'}
                    </Button>
                </div>

                {result && (
                     <div className="p-6 border-t border-slate-700 space-y-4 animate-fade-in">
                        <h3 className="text-lg font-semibold text-emerald-400">Generation Result</h3>
                        <Tooltip text={isAES ? "The formatted 16-byte PIN field, containing control info, PIN, fill, and random digits, before any encryption occurs." : "This is the block created by XORing the PIN and PAN data before encryption."}>
                             <ResultDisplay label={isAES ? "Plaintext PIN Field" : "Clear PIN Block"} value={result.clearPinBlock} />
                        </Tooltip>
                        {result.encryptedPinBlock && (
                           <ResultDisplay label="Final Encrypted PIN Block" value={result.encryptedPinBlock} />
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default PinBlockGenerator;
