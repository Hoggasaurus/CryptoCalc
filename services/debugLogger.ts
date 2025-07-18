import { LogEntry } from '../types';

type LogFunction = (entry: LogEntry) => void;

class DebugLogger {
    private callback: LogFunction | null = null;

    public setLogCallback(callback: LogFunction | null): void {
        this.callback = callback;
    }

    public log(source: string, message: string): void {
        if (this.callback) {
            this.callback({
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                source,
                message,
            });
        }
    }
}

export const debugLogger = new DebugLogger();
