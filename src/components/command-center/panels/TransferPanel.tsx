import { useState } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ListTodo, Phone, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TransferPanel() {
  const { queues, teamAgents, activeTasks, selectedTaskId, transferToQueue, transferToAgent, transferToDN } = useWebex();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialNumber, setDialNumber] = useState('');
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  const filteredAgents = teamAgents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTransferQueue = async (queueId: string) => {
    if (task) await transferToQueue(task.taskId, queueId);
  };

  const handleTransferAgent = async (agentId: string) => {
    if (task) await transferToAgent(task.taskId, agentId);
  };

  const handleTransferDN = async () => {
    if (task && dialNumber) await transferToDN(task.taskId, dialNumber);
  };

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No active interaction to transfer
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="agents">
        <TabsList className="w-full">
          <TabsTrigger value="agents" className="flex-1"><Users className="w-4 h-4 mr-2" />Agents</TabsTrigger>
          <TabsTrigger value="queues" className="flex-1"><ListTodo className="w-4 h-4 mr-2" />Queues</TabsTrigger>
          <TabsTrigger value="number" className="flex-1"><Phone className="w-4 h-4 mr-2" />Number</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search agents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <div className="space-y-2">
            {filteredAgents.map(agent => (
              <Card key={agent.agentId} className="cursor-pointer hover:border-primary/50" onClick={() => handleTransferAgent(agent.agentId)}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.teamName}</p>
                  </div>
                  <div className={cn("state-indicator", `state-${agent.state.toLowerCase()}`)} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="queues" className="mt-4 space-y-2">
          {queues.map(queue => (
            <Card key={queue.id} className="cursor-pointer hover:border-primary/50" onClick={() => handleTransferQueue(queue.id)}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{queue.name}</p>
                  <p className="text-xs text-muted-foreground">{queue.waitingTasks} waiting</p>
                </div>
                <span className="text-sm text-muted-foreground">{Math.floor(queue.avgWaitTime / 60)}m avg</span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="number" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <Input placeholder="Enter phone number" value={dialNumber} onChange={e => setDialNumber(e.target.value)} />
              <Button onClick={handleTransferDN} disabled={!dialNumber} className="w-full">Transfer to Number</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
