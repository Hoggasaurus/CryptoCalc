
import React, { useState, useCallback } from 'react';
import { Icon } from './Icon';

interface ResultDisplayProps {
  label: string;
  value: string;
  size?: 'sm' | 'md';
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ label, value, size = 'md' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const valueTextSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div>
      <label className={`block ${textSize} font-medium text-slate-400`}>{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <div className={`flex-grow p-2 bg-slate-900/70 rounded-md border border-slate-600 font-mono ${valueTextSize}`}>
          {value || <span className="text-slate-500">N/A</span>}
        </div>
        <button
          onClick={handleCopy}
          disabled={!value}
          className="p-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-all text-slate-300 hover:text-white"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Icon name="check" className="w-5 h-5 text-emerald-400" /> : <Icon name="copy" className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default ResultDisplay;
