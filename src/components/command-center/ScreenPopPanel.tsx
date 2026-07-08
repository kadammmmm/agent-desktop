import { useEffect } from 'react';
import { ExternalLink, X, MonitorUp } from 'lucide-react';
import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Floating banner that surfaces the latest SDK screen pop
 * (Desktop.screenpop -> eScreenPop). Auto-opens external URLs and shows
 * any CAD-style payload for CRM-record pops.
 */
export function ScreenPopPanel() {
  const { screenPop, dismissScreenPop } = useWebex();

  useEffect(() => {
    if (!screenPop) return;
    // Auto-open URL pops in a new tab
    if (screenPop.url && screenPop.autoOpen !== false) {
      try {
        window.open(screenPop.url, '_blank', 'noopener,noreferrer');
      } catch {
        /* ignore popup blocker */
      }
    }
  }, [screenPop]);

  if (!screenPop) return null;

  const entries = screenPop.data
    ? Object.entries(screenPop.data).slice(0, 8)
    : [];

  return (
    <div className="fixed bottom-4 right-4 z-40 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="shadow-xl border-primary/40">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2 min-w-0">
            <MonitorUp className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">
              Screen Pop{screenPop.interactionId ? ` · ${screenPop.interactionId.slice(0, 8)}` : ''}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={dismissScreenPop}
            aria-label="Dismiss screen pop"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3 space-y-2">
          {screenPop.url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => window.open(screenPop.url!, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              <span className="truncate">{screenPop.url}</span>
            </Button>
          )}

          {entries.length > 0 && (
            <ScrollArea className="max-h-40">
              <dl className="text-xs space-y-1">
                {entries.map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-muted-foreground shrink-0">{k}</dt>
                    <dd className="font-mono truncate">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </ScrollArea>
          )}

          {!screenPop.url && entries.length === 0 && (
            <p className="text-xs text-muted-foreground">Screen pop received (no payload).</p>
          )}
        </div>
      </Card>
    </div>
  );
}
