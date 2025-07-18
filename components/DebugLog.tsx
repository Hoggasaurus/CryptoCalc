import React from 'react';
import { useDebug } from '../contexts/DebugContext';
import Button from './Button';
import Card from './Card';

const DebugLog: React.FC = () => {
    const { isDebugMode, logEntries, clearLogs } = useDebug();

    if (!isDebugMode) {
        return null;
    }

    return (
        <div className="mt-8 animate-fade-in">
            <Card title="Debug Log">
                <div className="p-4 flex justify-end items-center border-b border-slate-700 bg-slate-800/50">
                     <Button onClick={clearLogs} className="!px-3 !py-1 !text-xs !bg-slate-600 hover:!bg-slate-500">
                        Clear Log
                    </Button>
                </div>
                <div className="p-4 bg-slate-900/50 max-h-[50vh] overflow-y-auto">
                    {logEntries.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">Log is empty. Perform an action to see debug output.</p>
                    ) : (
                        <div className="text-xs text-slate-300">
                            {logEntries.map((entry, index) => (
                                <div key={logEntries.length - index} className={`flex gap-3 items-start p-2.5 ${index > 0 ? 'border-t border-slate-700/50' : ''}`}>
                                    <span className="font-mono text-slate-500 flex-shrink-0">{entry.timestamp}</span>
                                    <span className="font-bold text-emerald-400 w-40 flex-shrink-0 truncate" title={entry.source}>[{entry.source}]</span>
                                    <pre className="flex-grow whitespace-pre-wrap break-words font-sans">{entry.message}</pre>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default DebugLog;
