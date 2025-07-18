import React, { useState, useCallback } from 'react';
import Card from './Card';
import Button from './Button';
import { Icon } from './Icon';

// Declare CryptoJS for TypeScript since it's loaded from a script tag
declare var CryptoJS: any;

// This component provides a text area for displaying output and a button to copy it.
const OutputDisplay: React.FC<{ label: string, value: string }> = ({ label, value }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = useCallback(() => {
        if (value) {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [value]);

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">{label}</label>
                <Button onClick={handleCopy} disabled={!value} className="!px-3 !py-1 !text-xs !font-semibold">
                    <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4 mr-1.5" />
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>
            <textarea
                readOnly
                value={value}
                rows={6}
                className="w-full p-3 bg-slate-900/70 rounded-md border border-slate-600 font-mono text-sm text-slate-300 focus:outline-none"
                placeholder="Result will appear here..."
            />
        </div>
    );
};

const FormatConverter: React.FC = () => {
    // State for Text to Hex conversion
    const [textInput, setTextInput] = useState('');
    const [hexOutput, setHexOutput] = useState('');
    const [textToHexError, setTextToHexError] = useState('');

    // State for Hex to Text conversion
    const [hexInput, setHexInput] = useState('');
    const [textOutput, setTextOutput] = useState('');
    const [hexToTextError, setHexToTextError] = useState('');
    
    const handleTextToHex = useCallback(() => {
        setTextToHexError('');
        if (!textInput) {
            setHexOutput('');
            return;
        }
        try {
            const result = CryptoJS.enc.Utf8.parse(textInput).toString(CryptoJS.enc.Hex).toUpperCase();
            setHexOutput(result);
        } catch (e) {
            setTextToHexError('Conversion failed. Invalid input text.');
        }
    }, [textInput]);

    const handleHexToText = useCallback(() => {
        setHexToTextError('');
        if (!hexInput) {
            setTextOutput('');
            return;
        }
        try {
            const cleanedInput = hexInput.replace(/\s/g, ''); // Remove all whitespace
            if (/[^0-9a-fA-F]/.test(cleanedInput)) {
                throw new Error('Input contains invalid non-hex characters.');
            }
            if (cleanedInput.length % 2 !== 0) {
                throw new Error('Hex string must have an even number of characters.');
            }
            const result = CryptoJS.enc.Hex.parse(cleanedInput).toString(CryptoJS.enc.Utf8);
            if (!result && cleanedInput.length > 0) {
                throw new Error('Decoded to an empty or non-printable string. Please verify your hex input.');
            }
            setTextOutput(result);
        } catch (e: any) {
            setHexToTextError(e.message || 'Conversion failed. Please check your input.');
        }
    }, [hexInput]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="Text to Hex Converter">
                <div className="p-6 space-y-4 flex flex-col h-full">
                    <div className="flex-grow space-y-4">
                        <div>
                            <label htmlFor="text-input" className="block text-sm font-medium text-slate-300 mb-1">ASCII / UTF-8 Text</label>
                            <textarea
                                id="text-input"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                rows={6}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                placeholder="Enter text here..."
                            />
                        </div>
                        <Button onClick={handleTextToHex} className="w-full">
                            <Icon name="arrows-right-left" className="w-5 h-5" /> Convert to Hex
                        </Button>
                        {textToHexError && <p className="text-sm text-red-400">{textToHexError}</p>}
                    </div>
                    <div className="pt-4 border-t border-slate-700">
                        <OutputDisplay label="Hexadecimal Output" value={hexOutput} />
                    </div>
                </div>
            </Card>

            <Card title="Hex to Text Converter">
                <div className="p-6 space-y-4 flex flex-col h-full">
                    <div className="flex-grow space-y-4">
                        <div>
                            <label htmlFor="hex-input" className="block text-sm font-medium text-slate-300 mb-1">Hexadecimal</label>
                            <textarea
                                id="hex-input"
                                value={hexInput}
                                onChange={(e) => setHexInput(e.target.value)}
                                rows={6}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                placeholder="Enter hex string here... e.g., 48656C6C6F"
                            />
                        </div>
                        <Button onClick={handleHexToText} className="w-full">
                            <Icon name="arrows-right-left" className="w-5 h-5" /> Convert to Text
                        </Button>
                        {hexToTextError && <p className="text-sm text-red-400">{hexToTextError}</p>}
                    </div>
                    <div className="pt-4 border-t border-slate-700">
                         <OutputDisplay label="ASCII / UTF-8 Output" value={textOutput} />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default FormatConverter;