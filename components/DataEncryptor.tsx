import React, { useState, useCallback, useMemo } from 'react';
import { DataEncryptionAlgorithm, EncryptionMode, Padding, EncryptionAction, DataFormat } from '../types';
import { processData, generateRandomHex } from '../services/cryptoService';
import Card from './Card';
import Button from './Button';
import { Icon } from './Icon';
import { debugLogger } from '../services/debugLogger';

const algorithmOptions: { value: DataEncryptionAlgorithm, label: string }[] = [
    { value: 'AES', label: 'AES (Advanced Encryption Standard)' },
    { value: '3DES', label: '3DES (Triple DES)' },
];

const modeOptions: { value: EncryptionMode, label: string, description: string }[] = [
    { value: 'CBC', label: 'CBC (Cipher Block Chaining)', description: 'Each block of plaintext is XORed with the previous ciphertext block before being encrypted. Requires an IV.' },
    { value: 'ECB', label: 'ECB (Electronic Codebook)', description: 'Each block is encrypted independently. Not recommended for most uses as it lacks diffusion.' },
];

const paddingOptions: { value: Padding, label: string }[] = [
    { value: 'Pkcs7', label: 'PKCS#7' },
    { value: 'AnsiX923', label: 'ANSI X.923' },
    { value: 'Iso10126', label: 'ISO 10126' },
    { value: 'ZeroPadding', label: 'Zero Padding' },
    { value: 'NoPadding', label: 'No Padding' },
];

const FormatSelector: React.FC<{
    label: string;
    value: DataFormat;
    onChange: (format: DataFormat) => void;
    disabled?: boolean;
}> = ({ label, value, onChange, disabled = false }) => (
    <div>
        <label className={`block text-sm font-medium mb-1 ${disabled ? 'text-slate-500' : 'text-slate-300'}`}>{label}</label>
        <div className={`flex p-1 rounded-lg bg-slate-700/50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <button onClick={() => { if (!disabled) onChange('Text')}} disabled={disabled} className={`w-1/2 py-1 text-sm font-semibold rounded-md transition-colors ${value === 'Text' ? 'bg-slate-600 text-white shadow-inner' : 'text-slate-300 hover:bg-slate-600/50'}`}>Text</button>
            <button onClick={() => { if (!disabled) onChange('Hex')}} disabled={disabled} className={`w-1/2 py-1 text-sm font-semibold rounded-md transition-colors ${value === 'Hex' ? 'bg-slate-600 text-white shadow-inner' : 'text-slate-300 hover:bg-slate-600/50'}`}>Hex</button>
        </div>
    </div>
);


const DataEncryptor: React.FC = () => {
    const [action, setAction] = useState<EncryptionAction>('encrypt');
    const [algorithm, setAlgorithm] = useState<DataEncryptionAlgorithm>('AES');
    const [mode, setMode] = useState<EncryptionMode>('CBC');
    const [padding, setPadding] = useState<Padding>('Pkcs7');
    const [keyHex, setKeyHex] = useState('');
    const [ivHex, setIvHex] = useState('');
    const [inputText, setInputText] = useState('');
    const [inputFormat, setInputFormat] = useState<DataFormat>('Text');
    const [outputFormat, setOutputFormat] = useState<DataFormat>('Hex');
    const [outputText, setOutputText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const needsIV = mode === 'CBC';

    React.useEffect(() => {
        const source = 'DataEncryptor';
        debugLogger.log(source, `Switched to ${action} mode.`);
        if (action === 'encrypt') {
            setInputFormat('Text');
            setOutputFormat('Hex');
            debugLogger.log(source, `Set default formats: Input=Text, Output=Hex.`);
        } else {
            setInputFormat('Hex');
            setOutputFormat('Text');
            debugLogger.log(source, `Set default formats: Input=Hex, Output=Text.`);
        }
        setInputText('');
        setOutputText('');
        setError(null);
    }, [action]);

    const keyConfig = useMemo(() => {
        if (algorithm === 'AES') return { lengths: [16, 24, 32], ivLength: 16 };
        if (algorithm === '3DES') return { lengths: [16, 24], ivLength: 8 };
        return { lengths: [], ivLength: 0 };
    }, [algorithm]);

    const handleGenerateRandom = (type: 'key' | 'iv') => {
        const source = 'DataEncryptor';
        if (type === 'key') {
            const keyLength = keyConfig.lengths[0] || 16;
            const newKey = generateRandomHex(keyLength).toUpperCase();
            setKeyHex(newKey);
            debugLogger.log(source, `Generated random key (${keyLength} bytes): ${newKey}`);
        } else {
            const newIv = generateRandomHex(keyConfig.ivLength).toUpperCase();
            setIvHex(newIv);
            debugLogger.log(source, `Generated random IV (${keyConfig.ivLength} bytes): ${newIv}`);
        }
    };

    const handleProcess = useCallback(() => {
        const source = 'DataEncryptor';
        debugLogger.log(source, `--- Starting data ${action} process ---`);
        setError(null);
        setOutputText('');
        setLoading(true);

        try {
            const keyByteLength = keyHex.length / 2;
            if (!keyConfig.lengths.includes(keyByteLength)) {
                throw new Error(`Invalid key length. For ${algorithm}, key must be ${keyConfig.lengths.join(', ')} bytes long (${keyConfig.lengths.map(b=>b*2).join('/')} hex chars).`);
            }
            if (needsIV) {
                const ivByteLength = ivHex.length / 2;
                if (ivByteLength !== keyConfig.ivLength) {
                    throw new Error(`Invalid IV length. For ${algorithm} in CBC mode, IV must be ${keyConfig.ivLength} bytes long (${keyConfig.ivLength * 2} hex chars).`);
                }
            }
            if (!inputText) {
                 throw new Error(`Input data cannot be empty.`);
            }
            debugLogger.log(source, `Validation passed.`);

            const result = processData({
                data: inputText,
                keyHex,
                ivHex: needsIV ? ivHex : undefined,
                algorithm,
                mode,
                padding,
                action,
                inputFormat,
                outputFormat
            });
            setOutputText(result);
            debugLogger.log(source, `SUCCESS: Process completed.`);
        } catch (e: any) {
            const err = e.message || 'An unexpected error occurred.';
            setError(err);
            debugLogger.log(source, `ERROR: ${err}`);
        } finally {
            setLoading(false);
        }
    }, [action, algorithm, mode, padding, keyHex, ivHex, inputText, keyConfig, needsIV, inputFormat, outputFormat]);

    const formatHelperText = useMemo(() => {
        if (action === 'encrypt') {
            const inputContext = inputFormat === 'Text' ? 'a UTF-8 string' : 'a Hex string';
            return `Input is treated as ${inputContext}. Encrypted output will be Hex encoded.`;
        } else {
            const outputContext = outputFormat === 'Text' ? 'an ASCII string' : 'a Hex string';
            return `Input must be a Hex-encoded ciphertext. Decrypted output will be ${outputContext}.`;
        }
    }, [inputFormat, outputFormat, action]);

    return (
        <div className="max-w-4xl mx-auto">
            <Card title="Symmetric Data Encryption & Decryption">
                <div className="p-6 space-y-6">
                    <div className="flex justify-center p-1 rounded-lg bg-slate-700/50">
                        <button onClick={() => setAction('encrypt')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${action === 'encrypt' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-600/50'}`}>Encrypt</button>
                        <button onClick={() => setAction('decrypt')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${action === 'decrypt' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-600/50'}`}>Decrypt</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SelectControl label="Algorithm" value={algorithm} onChange={e => {
                            const newAlgo = e.target.value as DataEncryptionAlgorithm;
                            setAlgorithm(newAlgo);
                            debugLogger.log('DataEncryptor', `Algorithm changed to ${newAlgo}`);
                        }} options={algorithmOptions.map(o => ({...o, key: o.value}))} />
                        <SelectControl label="Mode of Operation" value={mode} onChange={e => {
                             const newMode = e.target.value as EncryptionMode;
                             setMode(newMode);
                             debugLogger.log('DataEncryptor', `Mode changed to ${newMode}`);
                        }} options={modeOptions.map(o => ({...o, key: o.value}))} />
                        <SelectControl label="Padding" value={padding} onChange={e => {
                            const newPadding = e.target.value as Padding;
                            setPadding(newPadding);
                            debugLogger.log('DataEncryptor', `Padding changed to ${newPadding}`);
                        }} options={paddingOptions.map(o => ({...o, key: o.value}))} />
                    </div>
                     <p className="text-xs text-slate-400 -mt-2">
                        {modeOptions.find(m => m.value === mode)?.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputControl label="Key (Hex)" value={keyHex} onChange={e => setKeyHex(e.target.value.replace(/[^0-9a-fA-F]/g, ''))} placeholder={`${keyConfig.lengths.map(b=>b*2).join('/')}-char hex`} onGenerate={() => handleGenerateRandom('key')} />
                        {needsIV && <InputControl label="IV (Hex)" value={ivHex} onChange={e => setIvHex(e.target.value.replace(/[^0-9a-fA-F]/g, ''))} placeholder={`${keyConfig.ivLength*2}-char hex`} onGenerate={() => handleGenerateRandom('iv')} />}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
                        <FormatSelector label="Input Format" value={inputFormat} onChange={(f) => {
                            setInputFormat(f);
                            debugLogger.log('DataEncryptor', `Input format changed to ${f}`);
                        }} disabled={action === 'decrypt'} />
                        <FormatSelector label="Output Format" value={outputFormat} onChange={(f) => {
                             setOutputFormat(f);
                             debugLogger.log('DataEncryptor', `Output format changed to ${f}`);
                        }} disabled={action === 'encrypt'} />
                    </div>
                     <p className="text-xs text-slate-400 -mt-2">{formatHelperText}</p>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Input Data</label>
                        <textarea value={inputText} onChange={e => setInputText(e.target.value)} rows={5} className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" placeholder={action === 'encrypt' ? 'Enter text to encrypt...' : 'Enter ciphertext to decrypt...'} />
                    </div>

                    {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 p-3 rounded-md">{error}</p>}

                    <Button onClick={handleProcess} disabled={loading} className={`w-full !mt-8 ${action === 'decrypt' && '!bg-indigo-600 hover:!bg-indigo-700 focus:!ring-indigo-500'}`}>
                        {loading ? 'Processing...' : <><Icon name={action === 'encrypt' ? 'lock-closed' : 'lock-open'} /> {action === 'encrypt' ? 'Encrypt Data' : 'Decrypt Data'}</>}
                    </Button>
                </div>
                
                {outputText && (
                    <div className="p-6 border-t border-slate-700 space-y-2 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-emerald-400">Output Data</h3>
                             <Button onClick={() => {
                                 navigator.clipboard.writeText(outputText);
                                 debugLogger.log('DataEncryptor', 'Copied output to clipboard.');
                             }} className="!px-3 !py-1 !text-xs">
                                <Icon name="copy" className="w-4 h-4 mr-1" /> Copy
                            </Button>
                        </div>
                        <textarea readOnly value={outputText} rows={5} className="w-full p-3 bg-slate-900/70 rounded-md border border-slate-600 font-mono text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                )}
            </Card>
        </div>
    );
};

const SelectControl: React.FC<{label: string, value: string, onChange: React.ChangeEventHandler<HTMLSelectElement>, options: {key: string, value: string, label: string}[]}> = ({label, value, onChange, options}) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="relative mt-1">
            <select value={value} onChange={onChange} className="w-full appearance-none bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                {options.map(opt => <option key={opt.key} value={opt.value}>{opt.label}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400"><Icon name="chevron-down" /></div>
        </div>
    </div>
);

const InputControl: React.FC<{label: string, value: string, placeholder: string, onChange: React.ChangeEventHandler<HTMLInputElement>, onGenerate: () => void}> = ({label, value, placeholder, onChange, onGenerate}) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="mt-1 flex items-stretch gap-2">
            <input type="text" value={value} onChange={onChange} className="flex-grow w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" placeholder={placeholder} />
            <Button onClick={onGenerate} className="!px-3 bg-slate-600 hover:bg-slate-500" title={`Generate random ${label}`}><Icon name="sparkles" className="w-4 h-4" /></Button>
        </div>
    </div>
);


export default DataEncryptor;
