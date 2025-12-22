import { WebexProvider, useWebex } from '@/contexts/WebexContext';
import { CommandCenterLayout } from './CommandCenterLayout';
import { useEffect } from 'react';

function CommandCenterContent() {
  const { initialize, isInitialized } = useWebex();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  return <CommandCenterLayout />;
}

export function CommandCenter() {
  return (
    <WebexProvider>
      <CommandCenterContent />
    </WebexProvider>
  );
}
