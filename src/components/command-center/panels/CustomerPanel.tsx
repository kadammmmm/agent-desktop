import { useWebex } from '@/contexts/WebexContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Building } from 'lucide-react';

export function CustomerPanel() {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No active interaction selected
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{task.ani}</span>
          </div>
          {task.customerName && (
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{task.customerName}</span>
            </div>
          )}
          {task.customerEmail && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{task.customerEmail}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CAD Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(task.cadVariables).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
