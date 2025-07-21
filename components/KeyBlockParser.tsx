

import React, { useState, useCallback } from 'react';
import Card from './Card';
import Button from './Button';
import { Icon } from './Icon';
import { debugLogger } from '../services/debugLogger';
import { parseTr31Block } from '../services/cryptoService';
import { Tr31ParsedBlock } from '../types';
import {
    TR31_VERSIONS,
    TR31_KEY_USAGES,
    TR31_ALGORITHMS,
    TR31_MODES_OF_USE,
    TR31_EXPORTABILITY,
    TR31_OPTIONAL_BLOCKS
} from '../constants';
import ResultDisplay from './ResultDisplay';

const FieldDisplay: React.FC<{ label: string, value: string, description?: string, fullWidth?: boolean }> = ({ label, value, description, fullWidth = false }) => (
    <div className={`p-3 rounded-md bg-slate-800/50 border border-slate-700 ${fullWidth ? 'col-span-2' : ''}`}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
                <p className="text-base font-mono text-emerald-300">{value}</p>
            </div>
            {description && (
                <p className="text-right text-sm text-slate-300 pl-4">{description}</p>
            )}
        </div>
    </div>
);


const KeyBlockParser: React.FC = () => {
    const [keyBlockInput, setKeyBlockInput] = useState('');
    const [parsedData, setParsedData] = useState<Tr31ParsedBlock | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleParse = useCallback(() => {
        const source = 'KeyBlockParser';
        debugLogger.log(source, 'Attempting to parse TR-31 key block.');
        setError(null);
        setParsedData(null);
        if (!keyBlockInput) {
            setError("Input cannot be empty.");
            return;
        }

        try {
            // If the key begins with 'R', it should be ignored as per user request.
            let processedInput = keyBlockInput;
            if (processedInput.startsWith('R') || processedInput.startsWith('r')) {
                processedInput = processedInput.substring(1);
                debugLogger.log(source, "Input starts with 'R', ignoring it for parsing.");
            }
            
            const result = parseTr31Block(processedInput);
            setParsedData(result);
            debugLogger.log(source, 'SUCCESS: Key block parsed successfully.');
        } catch (e: any) {
            const err = e.message || 'An unexpected error occurred during parsing.';
            setError(err);
            debugLogger.log(source, `ERROR: ${err}`);
        }
    }, [keyBlockInput]);
    
    const handleClear = () => {
        setKeyBlockInput('');
        setParsedData(null);
        setError(null);
        debugLogger.log('KeyBlockParser', 'Cleared input and results.');
    };
    
    const headerFields = parsedData ? [
        { offset: '0', field: 'Version ID', value: parsedData.header.versionId, meaning: TR31_VERSIONS[parsedData.header.versionId] || 'Unknown' },
        { offset: '1-4', field: 'Key Block length', value: parsedData.header.keyBlockLength, meaning: `Total length: ${parseInt(parsedData.header.keyBlockLength, 10)} characters` },
        { offset: '5-6', field: 'Key usage', value: parsedData.header.keyUsage, meaning: TR31_KEY_USAGES[parsedData.header.keyUsage] || 'Unknown' },
        { offset: '7', field: 'Algorithm', value: parsedData.header.algorithm, meaning: TR31_ALGORITHMS[parsedData.header.algorithm] || 'Unknown' },
        { offset: '8', field: 'Mode of use', value: parsedData.header.modeOfUse, meaning: TR31_MODES_OF_USE[parsedData.header.modeOfUse] || 'Unknown' },
        { offset: '9-10', field: 'Key Version Number', value: parsedData.header.keyVersionNumber, meaning: 'Key versioning identifier' },
        { offset: '11', field: 'Exportability', value: parsedData.header.exportability, meaning: TR31_EXPORTABILITY[parsedData.header.exportability] || 'Unknown' },
        { offset: '12-13', field: 'Number of optional blocks', value: String(parsedData.header.numberOfOptionalBlocks), meaning: 'Count of optional blocks that follow' },
        { offset: '14-15', field: 'Reserved for future use', value: parsedData.header.reserved, meaning: '' },
    ] : [];

    return (
        <div className="max-w-4xl mx-auto">
            <Card title="TR-31 Key Block Parser">
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="key-block-input" className="block text-sm font-medium text-slate-300 mb-1">
                            Key Block (ASCII String)
                        </label>
                        <textarea
                            id="key-block-input"
                            value={keyBlockInput}
                            onChange={(e) => setKeyBlockInput(e.target.value)}
                            rows={4}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                            placeholder="Paste your ASCII TR-31 key block here..."
                        />
                    </div>
                    <div className="flex gap-4">
                        <Button onClick={handleParse} className="w-full">
                            <Icon name="key-block" /> Parse Key Block
                        </Button>
                         <Button onClick={handleClear} className="w-full !bg-slate-600 hover:!bg-slate-500">
                            Clear
                        </Button>
                    </div>
                    {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 p-3 rounded-md">{error}</p>}
                </div>
                
                {parsedData && (
                    <div className="p-6 border-t border-slate-700 space-y-6 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Header Breakdown</h3>
                            <ResultDisplay label="Raw Header" value={parsedData.raw.header} />

                            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
                                <table className="w-full text-sm text-left text-slate-300">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-800/60">
                                        <tr>
                                            <th scope="col" className="px-4 py-3 font-medium">Offset</th>
                                            <th scope="col" className="px-4 py-3 font-medium">Field</th>
                                            <th scope="col" className="px-4 py-3 font-medium">Value</th>
                                            <th scope="col" className="px-4 py-3 font-medium">Meaning</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                       {headerFields.map(field => (
                                         <tr key={field.field} className="hover:bg-slate-800/40">
                                            <td className="px-4 py-3 font-mono text-slate-400">{field.offset}</td>
                                            <td className="px-4 py-3 font-semibold">{field.field}</td>
                                            <td className="px-4 py-3 font-mono text-emerald-300">{field.value}</td>
                                            <td className="px-4 py-3">{field.meaning}</td>
                                         </tr>
                                       ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {parsedData.optionalBlocks.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold text-emerald-400 mb-4">Optional Blocks</h3>
                                <div className="space-y-4">
                                {parsedData.optionalBlocks.map((block, i) => (
                                    <div key={i} className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FieldDisplay
                                                label="Block ID"
                                                value={block.blockId}
                                                description={TR31_OPTIONAL_BLOCKS[block.blockId] || 'Unknown/Proprietary'}
                                            />
                                            <FieldDisplay label="Length (Bytes)" value={String(block.length)} />
                                            <div className="col-span-1 sm:col-span-3">
                                                <ResultDisplay label="Value" value={block.value} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Key Data</h3>
                             <div className="space-y-4">
                                <ResultDisplay label={`Encrypted Key (${parsedData.encryptedKey.length / 2} Bytes)`} value={parsedData.encryptedKey} />
                                <ResultDisplay label={`Authenticator / MAC (${parsedData.authenticator.length / 2} Bytes)`} value={parsedData.authenticator} />
                            </div>
                        </div>

                    </div>
                )}
            </Card>
        </div>
    );
};

export default KeyBlockParser;