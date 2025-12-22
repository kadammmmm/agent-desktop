import type { ChannelType, CustomerProfile, CallLogEntry } from './webex';

export interface DemoSettings {
  enabled: boolean;
  showPanel: boolean;
  autoIncomingCalls: boolean;
  customerScenarios: boolean;
  randomEvents: boolean;
  simulatedLatency: boolean;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  customerProfile: Partial<CustomerProfile>;
  interactionHistory: CallLogEntry[];
  cadVariables: Record<string, string>;
}

export interface DemoContextType {
  settings: DemoSettings;
  currentScenario: string | null;
  updateSettings: (settings: Partial<DemoSettings>) => void;
  toggleFeature: (feature: keyof Omit<DemoSettings, 'enabled' | 'showPanel'>) => void;
  applyScenario: (scenarioId: string) => void;
  resetSettings: () => void;
}
