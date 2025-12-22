import { useState } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Users, Layers, Phone, Star, Search,
  ArrowRight, PhoneForwarded, UserPlus, Clock, X, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TransferConsultPanel() {
  const {
    queues,
    teamAgents,
    activeTasks,
    selectedTaskId,
    consultState,
    transferToQueue,
    transferToAgent,
    transferToDN,
    consultAgent,
    consultQueue,
    consultDN,
    completeTransfer,
    cancelConsult,
    conferenceCall,
    toggleFavoriteAgent,
  } = useWebex();

  const [searchQuery, setSearchQuery] = useState('');
  const [dialNumber, setDialNumber] = useState('');
  const [transferType, setTransferType] = useState<'blind' | 'consult'>('blind');

  const task = activeTasks.find(t => t.taskId === selectedTaskId);
  const favoriteAgents = teamAgents.filter(a => a.isFavorite);
  const filteredAgents = teamAgents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.teamName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Available': return 'bg-state-available';
      case 'Engaged': return 'bg-state-engaged';
      case 'Idle': return 'bg-state-idle';
      case 'WrapUp': return 'bg-state-wrapup';
      default: return 'bg-state-offline';
    }
  };

  const handleAgentAction = (agentId: string) => {
    if (!task) return;
    if (transferType === 'blind') {
      transferToAgent(task.taskId, agentId);
    } else {
      consultAgent(task.taskId, agentId);
    }
  };

  const handleQueueAction = (queueId: string) => {
    if (!task) return;
    if (transferType === 'blind') {
      transferToQueue(task.taskId, queueId);
    } else {
      consultQueue(task.taskId, queueId);
    }
  };

  const handleDNAction = () => {
    if (!task || !dialNumber) return;
    if (transferType === 'blind') {
      transferToDN(task.taskId, dialNumber);
    } else {
      consultDN(task.taskId, dialNumber);
    }
    setDialNumber('');
  };

  // Consult in progress view
  if (consultState.isConsulting && task) {
    const consultDuration = consultState.consultStartTime
      ? Math.floor((Date.now() - consultState.consultStartTime) / 1000)
      : 0;
    const minutes = Math.floor(consultDuration / 60);
    const seconds = consultDuration % 60;

    return (
      <div className="h-full flex flex-col p-4 animate-fade-in">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
            <PhoneForwarded className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Consulting</h3>
          <p className="text-2xl font-bold text-primary mb-1">
            {consultState.consultTarget?.name}
          </p>
          <p className="text-sm text-muted-foreground capitalize mb-4">
            {consultState.consultTarget?.type}
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => completeTransfer(task.taskId)}
          >
            <Check className="w-4 h-4 mr-2" />
            Complete Transfer
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => conferenceCall(task.taskId)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Conference
          </Button>
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => cancelConsult(task.taskId)}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-4 text-center">
        <div>
          <PhoneForwarded className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No active interaction to transfer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Transfer Type Toggle */}
      <div className="p-3 border-b border-border">
        <div className="flex rounded-lg bg-muted p-1">
          <button
            className={cn(
              "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
              transferType === 'blind'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTransferType('blind')}
          >
            <ArrowRight className="w-4 h-4 inline mr-2" />
            Blind Transfer
          </button>
          <button
            className={cn(
              "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
              transferType === 'consult'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTransferType('consult')}
          >
            <PhoneForwarded className="w-4 h-4 inline mr-2" />
            Consult
          </button>
        </div>
      </div>

      {/* Favorites Section */}
      {favoriteAgents.length > 0 && (
        <div className="p-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Star className="w-3 h-3" /> Favorites
          </p>
          <div className="flex gap-2 flex-wrap">
            {favoriteAgents.map(agent => (
              <button
                key={agent.agentId}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors",
                  agent.state === 'Available'
                    ? "border-state-available/30 bg-state-available/5 hover:bg-state-available/10"
                    : "border-border bg-muted/50 opacity-60"
                )}
                onClick={() => handleAgentAction(agent.agentId)}
                disabled={agent.state !== 'Available'}
              >
                <span className={cn("w-2 h-2 rounded-full", getStateColor(agent.state))} />
                {agent.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="agents" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start px-3 pt-3 bg-transparent h-auto gap-1">
          <TabsTrigger value="agents" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="queues" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            Queues
          </TabsTrigger>
          <TabsTrigger value="number" className="text-xs">
            <Phone className="w-3 h-3 mr-1" />
            Number
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="flex-1 overflow-hidden mt-0">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-2 pb-3">
              {filteredAgents.map(agent => (
                <div
                  key={agent.agentId}
                  className={cn(
                    "p-3 rounded-lg border transition-all cursor-pointer group",
                    agent.state === 'Available'
                      ? "border-border hover:border-primary/50 hover:bg-primary/5"
                      : "border-border/50 bg-muted/30 opacity-60 cursor-not-allowed"
                  )}
                  onClick={() => agent.state === 'Available' && handleAgentAction(agent.agentId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background",
                        getStateColor(agent.state)
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{agent.name}</p>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteAgent(agent.agentId);
                          }}
                        >
                          <Star className={cn(
                            "w-4 h-4",
                            agent.isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                          )} />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">{agent.teamName}</p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {agent.state}
                    </Badge>
                  </div>
                  {agent.skills && agent.skills.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {agent.skills.map(skill => (
                        <span key={skill} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Queues Tab */}
        <TabsContent value="queues" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full p-3">
            <div className="space-y-2">
              {queues.map(queue => (
                <div
                  key={queue.id}
                  className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                  onClick={() => handleQueueAction(queue.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{queue.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {queue.waitingTasks} waiting
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Avg wait: {Math.floor(queue.avgWaitTime / 60)}m {queue.avgWaitTime % 60}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Number Tab */}
        <TabsContent value="number" className="flex-1 mt-0 p-3">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Phone Number</label>
              <Input
                placeholder="+1 (555) 123-4567"
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                className="text-lg"
              />
            </div>
            <Button
              className="w-full"
              disabled={!dialNumber}
              onClick={handleDNAction}
            >
              {transferType === 'blind' ? (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Transfer to Number
                </>
              ) : (
                <>
                  <PhoneForwarded className="w-4 h-4 mr-2" />
                  Consult Number
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}