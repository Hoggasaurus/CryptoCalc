
import React, { useState, useCallback } from 'react';
import { generateRsaKeyPair } from '../services/cryptoService';
import { RsaKeySize, RsaKeyFormat, RsaKeyPairResult } from '../types';
import Card from './Card';
import Button from './Button';
import { Icon } from './Icon';

const keySizes: RsaKeySize[] = [1024, 2048, 3072, 4096];
const keyFormats: { value: RsaKeyFormat; label: string; description: string }[] = [
    { value: 'pem', label: 'PEM (PKCS#8 & SPKI)', description: 'Base64 encoded DER format with ASCII headers. Standard for files and copy/paste.' },
    { value: 'jwk', label: 'JWK (JSON Web Key)', description: 'JSON object representing key components (n, e, d, etc.). Used in web APIs.' },
    { value: 'der', label: 'DER / BER (Hex)', description: 'Hex-encoded binary ASN.1 data. DER is the standard, non-ambiguous subset of BER.' }
];


const KeyDisplay: React.FC<{ label: string; value: string }> = ({ label, value }) => {
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
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-base font-medium text-slate-200">{label}</h4>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Icon name="check" className="w-4 h-4 text-emerald-400" /> : <Icon name="copy" className="w-4 h-4" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <textarea
        readOnly
        value={value}
        className="w-full h-64 p-3 bg-slate-900/70 rounded-md border border-slate-600 font-mono text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        aria-label={label}
        rows={10}
      />
    </div>
  );
};


const RsaGenerator: React.FC = () => {
    const [keySize, setKeySize] = useState<RsaKeySize>(2048);
    const [keyFormat, setKeyFormat] = useState<RsaKeyFormat>('pem');
    const [keys, setKeys] = useState<RsaKeyPairResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        setLoading(true);
        setError(null);
        setKeys(null);
        try {
            const result = await generateRsaKeyPair(keySize, keyFormat);
            setKeys(result);
        } catch (e: any) {
            setError(e.message || 'Failed to generate key pair. Your browser might not support the Web Crypto API.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [keySize, keyFormat]);
    
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
            <div className="p-6 border-t border-slate-700 space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <KeyDisplay label={`Public Key (${keys.format.toUpperCase()})`} value={publicKeyStr} />
                    <KeyDisplay label={`Private Key (${keys.format.toUpperCase()})`} value={privateKeyStr} />
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <Card title="RSA Key Pair Generator">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="keysize-select" className="block text-sm font-medium text-slate-300">
                                Key Size (bits)
                            </label>
                            <div className="relative mt-1">
                                <select
                                    id="keysize-select"
                                    value={keySize}
                                    onChange={(e) => setKeySize(parseInt(e.target.value, 10) as RsaKeySize)}
                                    disabled={loading}
                                    className="w-full appearance-none bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                                >
                                    {keySizes.map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <Icon name="chevron-down" />
                                </div>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="keyformat-select" className="block text-sm font-medium text-slate-300">
                                Key Format
                            </label>
                            <div className="relative mt-1">
                                <select
                                    id="keyformat-select"
                                    value={keyFormat}
                                    onChange={(e) => setKeyFormat(e.target.value as RsaKeyFormat)}
                                    disabled={loading}
                                    className="w-full appearance-none bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                                >
                                    {keyFormats.map(format => (
                                        <option key={format.value} value={format.value}>{format.label}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <Icon name="chevron-down" />
                                </div>
                            </div>
                        </div>
                    </div>
                   
                    <p className="text-xs text-slate-400">
                        {keyFormats.find(f => f.value === keyFormat)?.description}
                        <br />
                        Keys are generated using the RSA-OAEP scheme with SHA-256 via the browser's Web Crypto API.
                    </p>


                    {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 p-3 rounded-md">{error}</p>}

                    <Button 
                        onClick={handleGenerate} 
                        className="w-full !mt-8"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating ({keySize}-bit)...
                            </>
                        ) : (
                            <>
                                <Icon name="lock-closed"/>
                                Generate Key Pair
                            </>
                        )}
                    </Button>
                </div>
                {renderKeys()}
            </Card>
        </div>
    );
};

export default RsaGenerator;
