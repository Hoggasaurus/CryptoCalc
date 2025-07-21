import React from 'react';

interface SegmentedControlProps<T extends string | number> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

const SegmentedControl = <T extends string | number>({ options, value, onChange, label }: SegmentedControlProps<T>) => {
  return (
    <div>
        {label && <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>}
        <div className="flex p-1 rounded-lg bg-slate-700/50 w-full">
            {options.map((option) => (
                <button
                    key={String(option.value)}
                    onClick={() => onChange(option.value)}
                    className={`w-full py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                        ${value === option.value
                            ? 'bg-slate-600 text-white shadow-inner'
                            : 'text-slate-300 hover:bg-slate-600/50'
                        }`
                    }
                >
                    {option.label}
                </button>
            ))}
        </div>
    </div>
  );
};

export default SegmentedControl;
