import { WebexProvider } from '@/contexts/WebexContext';
import { CommandCenterLayout } from './CommandCenterLayout';

// Command Center entry point - wraps layout with WebexProvider
export function CommandCenter() {
  return (
    <WebexProvider>
      <CommandCenterLayout />
    </WebexProvider>
  );
}
