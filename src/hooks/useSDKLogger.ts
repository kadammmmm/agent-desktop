import { useState, useCallback, useRef } from 'react';
import type { SDKLogEntry, SDKLogLevel } from '@/types/sdk-debug';

const MAX_LOGS = 500;

export function useSDKLogger() {
  const [logs, setLogs] = useState<SDKLogEntry[]>([]);
  const logIdCounter = useRef(0);

  const addLog = useCallback((
    level: SDKLogLevel,
    message: string,
    data?: unknown,
    source?: string
  ) => {
    const entry: SDKLogEntry = {
      id: `log-${Date.now()}-${logIdCounter.current++}`,
      timestamp: Date.now(),
      level,
      message,
      data,
      source,
    };

    // Also log to console for debugging
    const consoleMethod = level === 'error' ? console.error 
                        : level === 'warn' ? console.warn 
                        : level === 'debug' ? console.debug 
                        : console.log;
    consoleMethod(`[SDK ${level.toUpperCase()}] ${source ? `[${source}] ` : ''}${message}`, data ?? '');

    setLogs(prev => {
      const newLogs = [...prev, entry];
      // Keep only the last MAX_LOGS entries
      if (newLogs.length > MAX_LOGS) {
        return newLogs.slice(-MAX_LOGS);
      }
      return newLogs;
    });

    return entry;
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const exportLogs = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      logs: logs.map(log => ({
        ...log,
        timestampISO: new Date(log.timestamp).toISOString(),
      })),
    };
    return JSON.stringify(exportData, null, 2);
  }, [logs]);

  return {
    logs,
    addLog,
    clearLogs,
    exportLogs,
  };
}

// Create a singleton logger for use outside of React components
let globalLogCallback: ((level: SDKLogLevel, message: string, data?: unknown, source?: string) => void) | null = null;

export function setGlobalLogCallback(
  callback: ((level: SDKLogLevel, message: string, data?: unknown, source?: string) => void) | null
) {
  globalLogCallback = callback;
}

export function sdkLog(level: SDKLogLevel, message: string, data?: unknown, source?: string) {
  if (globalLogCallback) {
    globalLogCallback(level, message, data, source);
  } else {
    // Fallback to console
    const consoleMethod = level === 'error' ? console.error 
                        : level === 'warn' ? console.warn 
                        : level === 'debug' ? console.debug 
                        : console.log;
    consoleMethod(`[SDK ${level.toUpperCase()}] ${source ? `[${source}] ` : ''}${message}`, data ?? '');
  }
}
