import { useWebex } from '@/contexts/WebexContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, User, Mail, Phone, Clock } from 'lucide-react';

interface Customer360PanelProps {
  onClose: () => void;
}

export function Customer360Panel({ onClose }: Customer360PanelProps) {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" />Customer 360</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      {task ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-muted-foreground" />{task.customerName || 'Unknown'}</div>
          <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{task.ani}</div>
          {task.customerEmail && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{task.customerEmail}</div>}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">CAD Variables</p>
            {Object.entries(task.cadVariables).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">{k}</span><span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active interaction</p>
      )}
    </div>
  );
}
