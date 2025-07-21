import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { generateRsaKeyPair, processRsaData } from '../services/cryptoService';
import { RsaKeySize, RsaKeyFormat, RsaKeyPairResult, DataFormat } from '../types';
import Card from './Card';
import Button from './Button';
import { Icon } from './Icon';
import { debugLogger } from '../services/debugLogger';

const keySizes: RsaKeySize[] = [1024, 2048, 3072, 4096];
const keyFormats: { value: RsaKeyFormat; label: string; description: string }[] = [
    { value: 'pem', label: 'PEM (PKCS#8 & SPKI)', description: 'Base64 encoded DER format with ASCII headers. Standard for files and copy/paste.' },
    { value: 'jwk', label: 'JWK (JSON Web Key)', description: 'JSON object representing key components (n, e, d, etc.). Used in web APIs.' },
    { value: 'der', label: 'DER / BER (Hex)', description: 'Hex-encoded binary ASN.1 data. DER is the standard, non-ambiguous subset of BER.' }
];

const RsaGenerator: React.FC = () => {
    // --- State for Key Generation ---
    const [keySize, setKeySize] = useState<RsaKeySize>(2048);
    const [keyFormat, setKeyFormat] = useState<RsaKeyFormat>('pem');
    const [keys, setKeys] = useState<RsaKeyPairResult | null>(null);
    const [genLoading, setGenLoading] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);
    
    // --- State for Encryption/Decryption ---
    const [rsaAction, setRsaAction] = useState<'encrypt' | 'decrypt'>('encrypt');
    const [keyPem, setKeyPem] = useState('');
    const [inputData, setInputData] = useState('');
    const [inputFormat, setInputFormat] = useState<DataFormat>('Text');
    const [outputFormat, setOutputFormat] = useState<DataFormat>('Text');
    const [outputData, setOutputData] = useState('');
    const [processLoading, setProcessLoading] = useState(false);
    const [processError, setProcessError] = useState<string | null>(null);

    // --- Handlers for Key Generation ---
    const handleGenerate = useCallback(async () => {
        const source = 'RsaGenerator';
        debugLogger.log(source, `--- Starting RSA Key Pair Generation ---`);
        debugLogger.log(source, `Requested Size: ${keySize}-bit, Format: ${keyFormat.toUpperCase()}`);
        setGenLoading(true);
        setGenError(null);
        setKeys(null);
        try {
            const result = await generateRsaKeyPair(keySize, keyFormat);
            setKeys(result);
            debugLogger.log(source, `SUCCESS: Key pair generated successfully.`);
        } catch (e: any) {
            const err = e.message || 'Failed to generate key pair. Your browser might not support the Web Crypto API.';
            setGenError(err);
            debugLogger.log(source, `ERROR: ${err}`);
            console.error(e);
        } finally {
            setGenLoading(false);
        }
    }, [keySize, keyFormat]);
    
    // --- Handlers for Encryption/Decryption ---
    useEffect(() => {
        setOutputData('');
        setProcessError(null);
        // Sensible defaults when switching modes
        if (rsaAction === 'encrypt') {
            setInputFormat('Text');
            setOutputFormat('Text'); // Base64
        } else {
            setInputFormat('Text'); // Base64
            setOutputFormat('Text'); // UTF-8
        }
    }, [rsaAction]);

    const handleUseKey = (keyType: 'public' | 'private') => {
        if (keys?.format === 'pem') {
            const keyToUse = keyType === 'public' ? keys.publicKey : keys.privateKey;
            setKeyPem(keyToUse);
            setRsaAction(keyType === 'public' ? 'encrypt' : 'decrypt');
            debugLogger.log('RsaToolkit', `Using generated ${keyType} key for ${keyType === 'public' ? 'encryption' : 'decryption'}.`);
        }
    };
    
    const handleProcess = useCallback(async () => {
        const source = 'RsaEncryptDecrypt';
        debugLogger.log(source, `--- Starting RSA ${rsaAction} ---`);
        setProcessLoading(true);
        setProcessError(null);
        setOutputData('');
        
        try {
            if(!inputData) throw new Error("Input data cannot be empty.");
            if(!keyPem) throw new Error("RSA Key (PEM format) cannot be empty.");

            const result = await processRsaData({
                action: rsaAction,
                keyPem,
                data: inputData,
                inputFormat,
                outputFormat
            });
            setOutputData(result);
            debugLogger.log(source, 'SUCCESS: Process completed.');
        } catch (e: any) {
            setProcessError(e.message);
            debugLogger.log(source, `ERROR: ${e.message}`);
        } finally {
            setProcessLoading(false);
        }

    }, [rsaAction, keyPem, inputData, inputFormat, outputFormat]);

    const formatHelperText = useMemo(() => {
        if (rsaAction === 'encrypt') {
            const inputContext = inputFormat === 'Text' ? 'a UTF-8 string' : 'a Hex string';
            const outputContext = outputFormat === 'Text' ? 'a Base64 encoded string' : 'a Hex string';
            return `Input is treated as ${inputContext}. Encrypted output will be ${outputContext}.`;
        } else { // decrypt
            const inputContext = inputFormat === 'Text' ? 'a Base64 encoded ciphertext' : 'a Hex-encoded ciphertext';
            const outputContext = outputFormat === 'Text' ? 'a UTF-8 string' : 'a Hex string';
            return `Input is treated as ${inputContext}. Decrypted output will be ${outputContext}.`;
        }
    }, [inputFormat, outputFormat, rsaAction]);
    
    // --- Render Functions ---
    const renderKeys = () => {
        if (!keys) return null;
        
        let publicKeyStr = '';
        let privateKeyStr = '';

        if (keys.format === 'pem' || keys.format === 'der') {
            publicKeyStr = keys.publicKey;
            privateKeyStr = keys.privateKey;
        } else if (keys.format === 'jwk') {
            publicKeyStr = JSON.stringify(keys.publicKey, null, 2);
            privateKeyStr = JSON.stringify(keys.privateKey, null, 2);
        }

        return (
            <div className="pt-6 border-t border-slate-700 space-y-6 animate-fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <KeyDisplay label={`Public Key (${keys.format.toUpperCase()})`} value={publicKeyStr} onUse={keys.format === 'pem' ? () => handleUseKey('public') : undefined} />
                    <KeyDisplay label={`Private Key (${keys.format.toUpperCase()})`} value={privateKeyStr} onUse={keys.format === 'pem' ? () => handleUseKey('private') : undefined} />
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1: Key Generator */}
            <Card title="1. RSA Key Pair Generator">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <SelectControl label="Key Size (bits)" value={keySize} onChange={(e) => setKeySize(parseInt(e.target.value, 10) as RsaKeySize)} disabled={genLoading} options={keySizes.map(s => ({value: s, label: String(s)}))} />
                         <SelectControl label="Key Format" value={keyFormat} onChange={(e) => setKeyFormat(e.target.value as RsaKeyFormat)} disabled={genLoading} options={keyFormats.map(f => ({value: f.value, label: f.label}))} />
                    </div>
                   
                    <p className="text-xs text-slate-400">
                        {keyFormats.find(f => f.value === keyFormat)?.description}
                        <br />
                        Keys are generated using the RSA-OAEP scheme with SHA-256 via the browser's Web Crypto API.
                    </p>

                    {genError && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 p-3 rounded-md">{genError}</p>}

                    <Button onClick={handleGenerate} className="w-full !mt-8" disabled={genLoading}>
                        {genLoading ? <Spinner text={`Generating (${keySize}-bit)...`} /> : <><Icon name="lock-closed"/> Generate Key Pair</>}
                    </Button>
                </div>
                {renderKeys()}
            </Card>

            {/* Column 2: Encryption / Decryption */}
            <Card title="2. RSA Encryption / Decryption">
                <div className="p-6 space-y-6">
                     <div className="flex justify-center p-1 rounded-lg bg-slate-700/50">
                        <button onClick={() => setRsaAction('encrypt')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${rsaAction === 'encrypt' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-600/50'}`}>Encrypt</button>
                        <button onClick={() => setRsaAction('decrypt')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${rsaAction === 'decrypt' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-600/50'}`}>Decrypt</button>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{rsaAction === 'encrypt' ? 'Public Key (PEM Format)' : 'Private Key (PEM Format)'}</label>
                        <textarea value={keyPem} onChange={e => setKeyPem(e.target.value)} rows={7} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 text-xs" placeholder={`-----BEGIN ${rsaAction === 'encrypt' ? 'PUBLIC' : 'PRIVATE'} KEY-----\n...`} />
                    </div>

                     <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                        <FormatSelector label="Input Format" value={inputFormat} onChange={setInputFormat} />
                        <FormatSelector label="Output Format" value={outputFormat} onChange={setOutputFormat} />
                    </div>
                    <p className="text-xs text-slate-400 -mt-2">{formatHelperText}</p>

                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Input Data</label>
                        <textarea value={inputData} onChange={e => setInputData(e.target.value)} rows={5} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500" placeholder={rsaAction === 'encrypt' ? 'Enter plaintext to encrypt...' : 'Enter ciphertext to decrypt...'} />
                    </div>

                    {processError && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 p-3 rounded-md">{processError}</p>}

                    <Button onClick={handleProcess} disabled={processLoading} className={`w-full !mt-8 ${rsaAction === 'decrypt' && '!bg-indigo-600 hover:!bg-indigo-700 focus:!ring-indigo-500'}`}>
                        {processLoading ? <Spinner text="Processing..." /> : <><Icon name={rsaAction === 'encrypt' ? 'lock-closed' : 'lock-open'} /> {rsaAction === 'encrypt' ? 'Encrypt Data' : 'Decrypt Data'}</>}
                    </Button>
                </div>
                {outputData && (
                     <div className="p-6 border-t border-slate-700 space-y-2 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-emerald-400">Output</h3>
                             <Button onClick={() => navigator.clipboard.writeText(outputData)} className="!px-3 !py-1 !text-xs"><Icon name="copy" className="w-4 h-4 mr-1" /> Copy</Button>
                        </div>
                        <textarea readOnly value={outputData} rows={5} className="w-full p-3 bg-slate-900/70 rounded-md border border-slate-600 font-mono text-xs text-slate-300" />
                    </div>
                )}
            </Card>
        </div>
    );
};

// --- Child Components & Helpers ---

const KeyDisplay: React.FC<{ label: string; value: string; onUse?: () => void }> = ({ label, value, onUse }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  return (
    <div>
      <div className="flex justify-between items-center mb-2 gap-2">
        <h4 className="text-base font-medium text-slate-200">{label}</h4>
        <div className="flex gap-2">
            {onUse && <Button onClick={onUse} className="!px-3 !py-1 !text-xs !bg-sky-600 hover:!bg-sky-700">Use Key</Button>}
            <Button onClick={handleCopy} className="!px-3 !py-1 !text-xs"><Icon name={copied ? 'check' : 'copy'} className="w-4 h-4 mr-1" />{copied ? 'Copied' : 'Copy'}</Button>
        </div>
      </div>
      <textarea
        readOnly
        value={value}
        className="w-full h-64 p-3 bg-slate-900/70 rounded-md border border-slate-600 font-mono text-xs text-slate-300 focus:outline-none"
        aria-label={label}
        rows={10}
      />
    </div>
  );
};

const SelectControl: React.FC<{label: string, value: any, onChange: React.ChangeEventHandler<HTMLSelectElement>, disabled: boolean, options: {value: any, label: string}[]}> = ({label, value, onChange, disabled, options}) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="relative mt-1">
            <select value={value} onChange={onChange} disabled={disabled} className="w-full appearance-none bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50">
                {options.map(opt => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400"><Icon name="chevron-down" /></div>
        </div>
    </div>
);

const Spinner: React.FC<{ text: string }> = ({ text }) => (
    <>
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {text}
    </>
);

const FormatSelector: React.FC<{
    label: string;
    value: DataFormat;
    onChange: (format: DataFormat) => void;
}> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <div className="flex p-1 rounded-lg bg-slate-700/50">
            <button onClick={() => onChange('Text')} className={`w-1/2 py-1 text-sm font-semibold rounded-md transition-colors ${value === 'Text' ? 'bg-slate-600 text-white shadow-inner' : 'text-slate-300 hover:bg-slate-600/50'}`}>Text</button>
            <button onClick={() => onChange('Hex')} className={`w-1/2 py-1 text-sm font-semibold rounded-md transition-colors ${value === 'Hex' ? 'bg-slate-600 text-white shadow-inner' : 'text-slate-300 hover:bg-slate-600/50'}`}>Hex</button>
        </div>
    </div>
);

export default RsaGenerator;