import { useState, useEffect } from 'react';
import { X, Copy, Download, Trash2, ChevronDown, ChevronRight, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getEnvironmentDiagnostics } from '@/lib/webexEnvironment';
import type { SDKLogEntry, EnvironmentDiagnostics } from '@/types/sdk-debug';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SDKDebugPanelProps {
  logs: SDKLogEntry[];
  onClearLogs: () => void;
  onExportLogs: () => string;
  onClose: () => void;
}

export function SDKDebugPanel({ logs, onClearLogs, onExportLogs, onClose }: SDKDebugPanelProps) {
  const [diagnostics, setDiagnostics] = useState<EnvironmentDiagnostics | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDiagnostics(getEnvironmentDiagnostics());
  }, []);

  const toggleLogExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const handleCopyLogs = () => {
    const logText = onExportLogs();
    navigator.clipboard.writeText(logText);
    toast.success('Logs copied to clipboard');
  };

  const handleDownloadLogs = () => {
    const logText = onExportLogs();
    const blob = new Blob([logText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sdk-debug-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs downloaded');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500 bg-red-500/10';
      case 'warn': return 'text-yellow-500 bg-yellow-500/10';
      case 'debug': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-green-500 bg-green-500/10';
    }
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const time = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${ms}`;
  };

  return (
    <div className="fixed inset-4 z-50 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">SDK Debug Panel</h2>
          <Badge variant="outline" className="text-xs">
            {logs.length} logs
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopyLogs}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadLogs}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearLogs}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="environment" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="logs">
            SDK Logs
            {logs.filter(l => l.level === 'error').length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {logs.filter(l => l.level === 'error').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Environment Tab */}
        <TabsContent value="environment" className="flex-1 overflow-hidden m-0 p-4">
          <ScrollArea className="h-full">
            {diagnostics && (
              <div className="grid gap-4 max-w-2xl">
                <DiagnosticSection title="Window Context">
                  <DiagnosticRow label="Is Iframe" value={diagnostics.isIframe ? 'Yes' : 'No'} 
                    status={diagnostics.isIframe ? 'neutral' : 'warn'} />
                  <DiagnosticRow label="Parent Origin" value={diagnostics.parentOrigin || 'N/A'} />
                  <DiagnosticRow label="Document Referrer" value={diagnostics.documentReferrer} />
                  <DiagnosticRow label="Current URL" value={diagnostics.currentUrl} />
                </DiagnosticSection>

                <DiagnosticSection title="SDK Detection">
                  <DiagnosticRow label="Has AGENTX_SERVICE" value={diagnostics.hasAgentXService ? 'Yes' : 'No'}
                    status={diagnostics.hasAgentXService ? 'success' : 'warn'} />
                  <DiagnosticRow label="Has Desktop SDK (window.Desktop)" value={diagnostics.hasDesktopSDK ? 'Yes' : 'No'}
                    status={diagnostics.hasDesktopSDK ? 'success' : 'warn'} />
                  <DiagnosticRow label="Has wxcc Global" value={diagnostics.hasWxccGlobal ? 'Yes' : 'No'}
                    status={diagnostics.hasWxccGlobal ? 'success' : 'warn'} />
                  <DiagnosticRow label="Running in Agent Desktop" value={diagnostics.isRunningInAgentDesktop ? 'Yes' : 'No'}
                    status={diagnostics.isRunningInAgentDesktop ? 'success' : 'neutral'} />
                </DiagnosticSection>

                <DiagnosticSection title="Configuration">
                  <DiagnosticRow label="Demo Mode" value={diagnostics.isDemoMode ? 'Enabled' : 'Disabled'}
                    status={diagnostics.isDemoMode ? 'neutral' : 'success'} />
                  <DiagnosticRow label="Detected Region" value={diagnostics.detectedRegion.toUpperCase()} />
                  <DiagnosticRow label="Hostname" value={diagnostics.hostname} />
                </DiagnosticSection>

                <DiagnosticSection title="Browser Info">
                  <DiagnosticRow label="User Agent" value={diagnostics.userAgent} />
                  <DiagnosticRow label="Diagnostics Timestamp" value={new Date(diagnostics.timestamp).toISOString()} />
                </DiagnosticSection>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No logs yet. SDK activity will appear here.
                </div>
              ) : (
                logs.slice().reverse().map((log) => (
                  <Collapsible key={log.id} open={expandedLogs.has(log.id)}>
                    <div className={cn(
                      "rounded border border-border/50 bg-card/30",
                      log.level === 'error' && "border-red-500/30 bg-red-500/5"
                    )}>
                      <CollapsibleTrigger 
                        className="w-full flex items-start gap-2 p-2 text-left hover:bg-muted/50"
                        onClick={() => log.data && toggleLogExpand(log.id)}
                      >
                        {log.data ? (
                          expandedLogs.has(log.id) ? (
                            <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                          )
                        ) : (
                          <div className="w-4" />
                        )}
                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <Badge className={cn("text-xs shrink-0", getLevelColor(log.level))}>
                          {log.level.toUpperCase()}
                        </Badge>
                        {log.source && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {log.source}
                          </Badge>
                        )}
                        <span className="text-sm flex-1 truncate">{log.message}</span>
                      </CollapsibleTrigger>
                      
                      {log.data && (
                        <CollapsibleContent>
                          <div className="px-8 pb-2">
                            <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </div>
                        </CollapsibleContent>
                      )}
                    </div>
                  </Collapsible>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper components
function DiagnosticSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
      <div className="px-4 py-2 bg-muted/30 border-b border-border">
        <h3 className="font-medium text-sm">{title}</h3>
      </div>
      <div className="divide-y divide-border/50">
        {children}
      </div>
    </div>
  );
}

function DiagnosticRow({ 
  label, 
  value, 
  status 
}: { 
  label: string; 
  value: string; 
  status?: 'success' | 'warn' | 'error' | 'neutral';
}) {
  const statusColors = {
    success: 'text-green-500',
    warn: 'text-yellow-500',
    error: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={cn(
        "text-sm font-mono text-right break-all",
        status ? statusColors[status] : ''
      )}>
        {value}
      </span>
    </div>
  );
}
