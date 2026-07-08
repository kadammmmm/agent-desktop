import { useEffect, useRef } from 'react';
import { useWebex } from '@/contexts/WebexContext';

/**
 * Global keyboard shortcuts for the agent desktop.
 *
 * Prefers Desktop.shortcutKey.register() when the Cisco shell is available so
 * shortcuts are coordinated with other widgets and honor the platform's conflict
 * resolution. Falls back to a plain window keydown listener otherwise.
 */

export interface ShortcutBinding {
  id: string;
  label: string;
  /** ctrl+shift+key (case-insensitive letter) */
  keys: string;
}

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { id: 'accept', label: 'Accept incoming task', keys: 'ctrl+shift+a' },
  { id: 'decline', label: 'Decline incoming task', keys: 'ctrl+shift+r' },
  { id: 'hold', label: 'Toggle hold', keys: 'ctrl+shift+h' },
  { id: 'mute', label: 'Toggle mute', keys: 'ctrl+shift+m' },
  { id: 'end', label: 'End task', keys: 'ctrl+shift+e' },
];

function matchesBinding(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.toLowerCase().split('+');
  const needsCtrl = parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');
  const key = parts.filter((p) => !['ctrl', 'shift', 'alt', 'meta'].includes(p))[0];
  if (!key) return false;
  return (
    e.ctrlKey === needsCtrl &&
    e.shiftKey === needsShift &&
    e.altKey === needsAlt &&
    e.key.toLowerCase() === key
  );
}

function isTypingInInput(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  );
}

export function useShortcutKeys(bindings: ShortcutBinding[] = DEFAULT_SHORTCUTS) {
  const {
    incomingTask,
    activeTasks,
    selectedTaskId,
    acceptTask,
    declineTask,
    holdTask,
    resumeTask,
    muteTask,
    unmuteTask,
    endTask,
  } = useWebex();

  // Refs so the SDK listener doesn't need to be re-registered on every render
  const ref = useRef({
    incomingTask,
    activeTasks,
    selectedTaskId,
    acceptTask,
    declineTask,
    holdTask,
    resumeTask,
    muteTask,
    unmuteTask,
    endTask,
  });
  ref.current = {
    incomingTask,
    activeTasks,
    selectedTaskId,
    acceptTask,
    declineTask,
    holdTask,
    resumeTask,
    muteTask,
    unmuteTask,
    endTask,
  };

  useEffect(() => {
    const dispatch = (id: string) => {
      const s = ref.current;
      const task = s.activeTasks.find((t) => t.taskId === s.selectedTaskId);
      switch (id) {
        case 'accept':
          if (s.incomingTask?.taskId) s.acceptTask(s.incomingTask.taskId);
          break;
        case 'decline':
          if (s.incomingTask?.taskId) s.declineTask(s.incomingTask.taskId);
          break;
        case 'hold':
          if (task) (task.isHeld ? s.resumeTask : s.holdTask)(task.taskId);
          break;
        case 'mute':
          if (task) (task.isMuted ? s.unmuteTask : s.muteTask)(task.taskId);
          break;
        case 'end':
          if (task) s.endTask(task.taskId);
          break;
      }
    };

    const Desktop: any =
      (typeof window !== 'undefined' && (window as any).Desktop) || null;

    // Try SDK-registered shortcuts first
    let usedSdk = false;
    try {
      if (Desktop?.shortcutKey?.register && Desktop?.shortcutKey?.listenKeyPress) {
        const registration = bindings.map((b) => ({
          key: b.keys.toUpperCase().replace(/CTRL/g, 'CTRL').replace(/\+/g, '+'),
          eventName: `agent-desktop-widget:${b.id}`,
          description: b.label,
        }));
        try {
          Desktop.shortcutKey.register(registration);
          usedSdk = true;
          Desktop.shortcutKey.listenKeyPress((eventName: string) => {
            const id = eventName?.split(':').pop();
            if (id) dispatch(id);
          });
          if (Desktop.shortcutKey.listenKeyConflict) {
            Desktop.shortcutKey.listenKeyConflict((conflict: unknown) => {
              console.warn('[shortcuts] SDK reported key conflict:', conflict);
            });
          }
        } catch (err) {
          console.warn('[shortcuts] Desktop.shortcutKey.register failed:', err);
        }
      }
    } catch (err) {
      console.warn('[shortcuts] SDK shortcut wiring failed:', err);
    }

    // Fallback: window keydown
    const onKey = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      for (const b of bindings) {
        if (matchesBinding(e, b.keys)) {
          e.preventDefault();
          dispatch(b.id);
          break;
        }
      }
    };

    if (!usedSdk) {
      window.addEventListener('keydown', onKey);
    }

    return () => {
      if (!usedSdk) {
        window.removeEventListener('keydown', onKey);
      } else {
        try {
          Desktop?.shortcutKey?.unregisterKeys?.(bindings.map((b) => b.keys.toUpperCase()));
        } catch {
          /* ignore */
        }
      }
    };
  }, [bindings]);
}
