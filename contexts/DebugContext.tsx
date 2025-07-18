import React, { createContext, useState, useCallback, useMemo, useContext, useEffect } from 'react';
import { debugLogger } from '../services/debugLogger';
import { LogEntry } from '../types';

interface DebugContextType {
    isDebugMode: boolean;
    setDebugMode: (enabled: boolean) => void;
    logEntries: LogEntry[];
    clearLogs: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDebugMode, setDebugMode] = useState(false);
    const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

    const clearLogs = useCallback(() => {
        setLogEntries([]);
    }, []);
    
    const log = useCallback((entry: LogEntry) => {
        // Add new logs to the top, and limit the total number of logs to prevent performance issues.
        setLogEntries(prev => [entry, ...prev].slice(0, 200));
    }, []);

    useEffect(() => {
        if (isDebugMode) {
            debugLogger.setLogCallback(log);
        } else {
            debugLogger.setLogCallback(null);
            clearLogs();
        }
        
        return () => {
            debugLogger.setLogCallback(null); // Clean up on unmount
        };
    }, [isDebugMode, log, clearLogs]);

    const value = useMemo(() => ({
        isDebugMode,
        setDebugMode,
        logEntries,
        clearLogs
    }), [isDebugMode, logEntries, clearLogs]);

    return (
        <DebugContext.Provider value={value}>
            {children}
        </DebugContext.Provider>
    );
};

export const useDebug = (): DebugContextType => {
    const context = useContext(DebugContext);
    if (!context) {
        throw new Error('useDebug must be used within a DebugProvider');
    }
    return context;
};
