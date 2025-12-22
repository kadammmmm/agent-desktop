import { useWebex } from '@/contexts/WebexContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, Phone, TrendingUp } from 'lucide-react';

export function AnalyticsPanel() {
  const { agentMetrics } = useWebex();

  if (!agentMetrics) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Login to view analytics</div>;
  }

  const metrics = [
    { label: 'Calls Handled', value: agentMetrics.callsHandled, icon: Phone },
    { label: 'Avg Handle Time', value: `${Math.floor(agentMetrics.avgHandleTime / 60)}m ${agentMetrics.avgHandleTime % 60}s`, icon: Clock },
    { label: 'Occupancy', value: `${agentMetrics.occupancy}%`, icon: TrendingUp },
    { label: 'Adherence', value: `${agentMetrics.adherence}%`, icon: BarChart3 },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-4">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><m.icon className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
