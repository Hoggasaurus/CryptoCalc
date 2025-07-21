import React, { useState, useMemo } from 'react';
import { calculateLuhnCheckDigit } from '../services/cryptoService';
import { debugLogger } from '../services/debugLogger';

const LuhnCalculator: React.FC = () => {
    const [numberInput, setNumberInput] = useState('');

    const { checkDigit, fullNumber, error } = useMemo(() => {
        if (!numberInput) {
            return { checkDigit: '', fullNumber: '', error: null };
        }
        try {
            const digit = calculateLuhnCheckDigit(numberInput);
            return {
                checkDigit: String(digit),
                fullNumber: numberInput + digit,
                error: null,
            };
        } catch (e: any) {
            debugLogger.log('LuhnCalculator', `ERROR: ${e.message}`);
            return { checkDigit: 'ERR', fullNumber: 'ERR', error: e.message };
        }
    }, [numberInput]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNumberInput(e.target.value.replace(/[^0-9]/g, ''));
    };

    return (
        <div className="p-6 border-t border-slate-700 animate-fade-in">
            <h3 className="text-lg font-semibold text-emerald-400 mb-2">Luhn Calculator</h3>
            <p className="text-sm text-slate-400 mb-4">
                The PAN used in ISO-4 PIN blocks should conform to the Luhn algorithm.
                Enter a base number below to automatically calculate its check digit.
            </p>
            <div className="space-y-4">
                <div>
                    <label htmlFor="luhn-input" className="block text-sm font-medium text-slate-300">
                        Base Number
                    </label>
                    <input
                        id="luhn-input"
                        type="text"
                        value={numberInput}
                        onChange={handleInputChange}
                        className="mt-1 flex-grow w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                        placeholder="Enter base number string..."
                        aria-label="Base number for Luhn calculation"
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="luhn-check-digit" className="block text-sm font-medium text-slate-300">
                            Calculated Check Digit
                        </label>
                        <input
                            id="luhn-check-digit"
                            type="text"
                            readOnly
                            value={checkDigit}
                            className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:outline-none sm:text-sm"
                            aria-label="Calculated Luhn check digit"
                        />
                    </div>
                    <div>
                        <label htmlFor="luhn-full-number" className="block text-sm font-medium text-slate-300">
                            Full Number with Check Digit
                        </label>
                        <input
                            id="luhn-full-number"
                            type="text"
                            readOnly
                            value={fullNumber}
                            className="mt-1 w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white font-mono focus:outline-none sm:text-sm"
                            aria-label="Full number including check digit"
                        />
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 rounded-md text-sm font-medium bg-red-900/50 text-red-300 border border-red-500/30">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LuhnCalculator;
