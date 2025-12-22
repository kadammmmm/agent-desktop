import { WebexProvider } from '@/contexts/WebexContext';
import { CommandCenterLayout } from './CommandCenterLayout';
import { useEffect } from 'react';
import { useWebex } from '@/contexts/WebexContext';

function CommandCenterInner() {
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
      <CommandCenterInner />
    </WebexProvider>
  );
}
