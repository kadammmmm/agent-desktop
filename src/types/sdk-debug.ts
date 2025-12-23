// SDK Debug Types

export type SDKLogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SDKLogEntry {
  id: string;
  timestamp: number;
  level: SDKLogLevel;
  message: string;
  data?: unknown;
  source?: string;
}

export interface EnvironmentDiagnostics {
  isIframe: boolean;
  parentOrigin: string | null;
  documentReferrer: string;
  currentUrl: string;
  hostname: string;
  hasDesktopSDK: boolean;
  hasWxccGlobal: boolean;
  detectedRegion: string;
  isDemoMode: boolean;
  isRunningInAgentDesktop: boolean;
  userAgent: string;
  timestamp: number;
}
