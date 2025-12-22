import { useWebex } from '@/contexts/WebexContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3, Clock, Phone, TrendingUp, TrendingDown,
  CheckCircle, Users, Timer, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = {
  available: 'hsl(var(--state-available))',
  engaged: 'hsl(var(--state-engaged))',
  idle: 'hsl(var(--state-idle))',
  wrapup: 'hsl(var(--state-wrapup))',
};

export function AgentMetricsDashboard() {
  const { agentMetrics, extendedMetrics } = useWebex();

  if (!agentMetrics || !extendedMetrics) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Login to view analytics</p>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const callsTrend = extendedMetrics.callsTrend;
  const callsDiff = extendedMetrics.callsYesterday
    ? agentMetrics.callsHandled - extendedMetrics.callsYesterday
    : 0;

  // Prepare chart data
  const handleTimeData = extendedMetrics.handleTimeHistory.map((value, index) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
    time: Math.round(value / 60),
  }));

  const callsByHourData = extendedMetrics.callsByHour.map((value, index) => ({
    hour: `${9 + index}:00`,
    calls: value,
  }));

  const stateBreakdownData = [
    { name: 'Available', value: extendedMetrics.stateBreakdown.available, color: COLORS.available },
    { name: 'Engaged', value: extendedMetrics.stateBreakdown.engaged, color: COLORS.engaged },
    { name: 'Idle', value: extendedMetrics.stateBreakdown.idle, color: COLORS.idle },
    { name: 'Wrap-up', value: extendedMetrics.stateBreakdown.wrapup, color: COLORS.wrapup },
  ];

  return (
    <div className="h-full overflow-auto p-4 space-y-4 animate-fade-in">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Calls Handled */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              {callsTrend && (
                <div className={cn(
                  "flex items-center gap-1 text-xs",
                  callsTrend === 'up' ? "text-state-available" : callsTrend === 'down' ? "text-destructive" : "text-muted-foreground"
                )}>
                  {callsTrend === 'up' ? <TrendingUp className="w-3 h-3" /> : callsTrend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                  {callsDiff > 0 ? '+' : ''}{callsDiff}
                </div>
              )}
            </div>
            <p className="text-2xl font-bold mt-3">{agentMetrics.callsHandled}</p>
            <p className="text-xs text-muted-foreground">Calls Handled</p>
          </CardContent>
        </Card>

        {/* Average Handle Time */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{formatTime(agentMetrics.avgHandleTime)}</p>
            <p className="text-xs text-muted-foreground">Avg Handle Time</p>
          </CardContent>
        </Card>

        {/* Occupancy */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Timer className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{agentMetrics.occupancy}%</p>
            <p className="text-xs text-muted-foreground">Occupancy</p>
            <Progress value={agentMetrics.occupancy} className="h-1 mt-2" />
          </CardContent>
        </Card>

        {/* Adherence */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="w-5 h-5 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{agentMetrics.adherence}%</p>
            <p className="text-xs text-muted-foreground">Adherence</p>
            <Progress value={agentMetrics.adherence} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      {(extendedMetrics.fcr || extendedMetrics.csat) && (
        <div className="grid grid-cols-2 gap-3">
          {extendedMetrics.fcr && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <CheckCircle className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{extendedMetrics.fcr}%</p>
                    <p className="text-xs text-muted-foreground">First Call Resolution</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {extendedMetrics.csat && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10">
                    <Users className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{extendedMetrics.csat}/5.0</p>
                    <p className="text-xs text-muted-foreground">CSAT Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Handle Time Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Handle Time Trend (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={handleTimeData}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value}m`, 'Avg Time']}
                  />
                  <Line
                    type="monotone"
                    dataKey="time"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Calls by Hour */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Calls by Hour (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callsByHourData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [value, 'Calls']}
                  />
                  <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* State Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Time by State (Today)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="w-[120px] h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stateBreakdownData}
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stateBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {stateBreakdownData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">{item.value}%</p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}