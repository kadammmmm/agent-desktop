import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { DemoSettings, DemoContextType } from '@/types/demo';

const DEFAULT_SETTINGS: DemoSettings = {
  enabled: true,
  showPanel: false,
  autoIncomingCalls: true,
  customerScenarios: true,
  randomEvents: false,
  simulatedLatency: false,
};

const STORAGE_KEY = 'webex-demo-settings';

const DemoContext = createContext<DemoContextType | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DemoSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_SETTINGS;
  });
  
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  const updateSettings = useCallback((newSettings: Partial<DemoSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const toggleFeature = useCallback((feature: keyof Omit<DemoSettings, 'enabled' | 'showPanel'>) => {
    setSettings(prev => ({ ...prev, [feature]: !prev[feature] }));
  }, []);

  const applyScenario = useCallback((scenarioId: string) => {
    setCurrentScenario(scenarioId);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setCurrentScenario(null);
  }, []);

  const value: DemoContextType = {
    settings,
    currentScenario,
    updateSettings,
    toggleFeature,
    applyScenario,
    resetSettings,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
