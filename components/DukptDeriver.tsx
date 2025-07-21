

import React, { useState, useCallback } from 'react';
import { DukptKeys } from '../types';
import { deriveDukptKeys, generateRandomHex } from '../services/cryptoService';
import Card from './Card';
import Button from './Button';
import ResultDisplay from './ResultDisplay';
import { Icon } from './Icon';
import { debugLogger } from '../services/debugLogger';

const InputControl: React.FC<{
    label: string;
    value: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    placeholder: string;
    maxLength: number;
    onGenerate?: () => void;
}> = ({ label, value, onChange, placeholder, maxLength, onGenerate }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <div className="mt-1 flex items-stretch gap-2">
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                maxLength={maxLength}
                className="flex-grow w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            />
            {onGenerate && (
                 <Button onClick={onGenerate} className="!px-3 bg-slate-600 hover:bg-slate-500" title={`Generate random ${label}`}>
                    <Icon name="sparkles" className="w-4 h-4" />
                </Button>
            )}
        </div>
    </div>
);


const DukptDeriver: React.FC = () => {
    const [bdk, setBdk] = useState('');
    const [ksn, setKsn] = useState('');
    const [result, setResult] = useState<DukptKeys | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleDerive = useCallback(() => {
        const source = 'DukptDeriver';
        debugLogger.log(source, '--- Attempting DUKPT Derivation ---');
        setError(null);
        setResult(null);
        setLoading(true);

        try {
            if (!bdk) {
                throw new Error("BDK input cannot be empty.");
            }
            if (!ksn) {
                throw new Error("KSN input cannot be empty.");
            }

            const derivedKeys = deriveDukptKeys(bdk, ksn);
            setResult(derivedKeys);
            debugLogger.log(source, `SUCCESS: DUKPT keys derived successfully.`);
        } catch (e: any) {
            const err = e.message || 'An unexpected error occurred during key derivation.';
            setError(err);
            debugLogger.log(source, `ERROR: ${err}`);
        } finally {
            setLoading(false);
        }
    }, [bdk, ksn]);
    
    const handleClear = () => {
        setBdk('');
        setKsn('');
        setResult(null);
        setError(null);
        debugLogger.log('DukptDeriver', 'Cleared all inputs and results.');
    }

    return (
        <div className="max-w-3xl mx-auto">
            <Card title="DUKPT Key Deriver">
                <div className="p-6 space-y-6">
                    <p className="text-sm text-slate-400">
                        Derive session keys from a Base Derivation Key (BDK) and a Key Serial Number (KSN).
                    </p>

                    <div className="space-y-4">
                        <InputControl
                            label="Base Derivation Key (BDK)"
                            value={bdk}
                            onChange={e => setBdk(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                            placeholder="16 or 24-byte hex key..."
                            maxLength={48}
                            onGenerate={() => setBdk(generateRandomHex(16).toUpperCase())}
                        />
                         <InputControl
                            label="Key Serial Number (KSN)"
                            value={ksn}
                            onChange={e => setKsn(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
                            placeholder="10-byte hex value..."
                            maxLength={20}
                            onGenerate={() => setKsn(generateRandomHex(10).toUpperCase())}
                        />
                    </div>
                    
                    <div className="flex gap-4 pt-4 border-t border-slate-700/50">
                        <Button onClick={handleDerive} className="w-full" disabled={loading}>
                            {loading ? 'Deriving...' : <><Icon name="key-flow" /> Derive Keys</>}
                        </Button>
                         <Button onClick={handleClear} className="w-full !bg-slate-600 hover:!bg-slate-500">
                            Clear
                        </Button>
                    </div>

                    {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 p-3 rounded-md">{error}</p>}
                </div>

                {result && (
                    <div className="p-6 border-t border-slate-700 space-y-6 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Derivation Inputs</h3>
                             <div className="space-y-4">
                                <ResultDisplay label="KSN" value={result.ksn} />
                                <ResultDisplay label="Transaction Counter" value={result.counter} size="sm" />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Derived Base Keys</h3>
                            <div className="space-y-4">
                                <ResultDisplay label="Initial PIN Encryption Key (IPEK)" value={result.ipek} />
                                <ResultDisplay label="Transaction Key" value={result.transactionKey} />
                            </div>
                        </div>

                        <div>
                             <h3 className="text-lg font-semibold text-emerald-400 mb-4 pt-6 border-t border-slate-700">Derived Session Keys</h3>
                            <div className="space-y-4">
                                <ResultDisplay label="PIN Encryption Key" value={result.pinKey} />
                                <ResultDisplay label="MAC Generation Key (Request)" value={result.macRequestKey} />
                                <ResultDisplay label="MAC Verification Key (Response)" value={result.macResponseKey} />
                                <ResultDisplay label="Data Encryption Key (Request)" value={result.dataRequestKey} />
                                <ResultDisplay label="Data Decryption Key (Response)" value={result.dataResponseKey} />
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DukptDeriver;