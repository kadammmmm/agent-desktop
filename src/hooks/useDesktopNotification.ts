import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Bridge to the Cisco Agent Desktop notification bus.
 *
 * Desktop.actions.fireGeneral*Notification surfaces the toast in the parent
 * Agent Desktop shell (visible even when this widget's tab is hidden). If the
 * Desktop SDK is not available (standalone / demo mode), we fall back to an
 * in-widget sonner toast so agents still get feedback.
 */

type NotifType = 'info' | 'warn' | 'error' | 'success' | 'default';

interface DesktopNotificationOptions {
  title: string;
  data?: string;
  type?: NotifType;
  autoDismissMs?: number;
}

function getDesktop(): any {
  return (typeof window !== 'undefined' && (window as any).Desktop) || null;
}

function fireRaw(mode: 'silent' | 'autodismiss' | 'acknowledge', opts: DesktopNotificationOptions) {
  const Desktop = getDesktop();
  const payload = {
    data: {
      type: opts.type ?? 'info',
      mode,
      title: opts.title,
      data: opts.data ?? '',
    },
    options: opts.autoDismissMs
      ? { AUTO_DISMISS_TIMEOUT: opts.autoDismissMs }
      : undefined,
  };

  try {
    if (Desktop?.actions?.fireGeneralAutoDismissNotification && mode === 'autodismiss') {
      return Desktop.actions.fireGeneralAutoDismissNotification(payload);
    }
    if (Desktop?.actions?.fireGeneralSilentNotification && mode === 'silent') {
      Desktop.actions.fireGeneralSilentNotification(payload);
      return;
    }
    if (Desktop?.actions?.fireGeneralAcknowledgeNotification && mode === 'acknowledge') {
      return Desktop.actions.fireGeneralAcknowledgeNotification(payload);
    }
  } catch (err) {
    console.warn('[DesktopNotification] Fell back to in-widget toast:', err);
  }

  // Fallback to sonner
  const description = typeof opts.data === 'string' ? opts.data : undefined;
  if (opts.type === 'error') toast.error(opts.title, { description });
  else if (opts.type === 'success') toast.success(opts.title, { description });
  else if (opts.type === 'warn') toast.warning(opts.title, { description });
  else toast(opts.title, { description });
}

export function useDesktopNotification() {
  const notify = useCallback((opts: DesktopNotificationOptions) => {
    fireRaw('autodismiss', opts);
  }, []);

  const notifySilent = useCallback((opts: DesktopNotificationOptions) => {
    fireRaw('silent', opts);
  }, []);

  const notifyAcknowledge = useCallback((opts: DesktopNotificationOptions) => {
    fireRaw('acknowledge', opts);
  }, []);

  return { notify, notifySilent, notifyAcknowledge };
}

// Non-hook helpers for use inside contexts / callbacks
export const desktopNotify = (opts: DesktopNotificationOptions) => fireRaw('autodismiss', opts);
export const desktopNotifySilent = (opts: DesktopNotificationOptions) => fireRaw('silent', opts);
export const desktopNotifyAcknowledge = (opts: DesktopNotificationOptions) => fireRaw('acknowledge', opts);
