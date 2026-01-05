import { WebexProvider } from '@/contexts/WebexContext';
import { CommandCenterLayout } from './CommandCenterLayout';

export function CommandCenter() {
  return (
    <WebexProvider>
      <CommandCenterLayout />
    </WebexProvider>
  );
}
