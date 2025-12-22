import { useState } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, User, Phone, Clock, MessageSquare, Sparkles, ChevronDown, ChevronUp,
  Building, Calendar, CheckCircle2, MapPin, Mail, BarChart3, ArrowRightLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Customer360Enhanced } from './enhanced-panels/Customer360Enhanced';
import { TransferConsultPanel } from './panels/TransferConsultPanel';
import { AgentMetricsDashboard } from './panels/AgentMetricsDashboard';

interface ContextualPanelTabsProps {
  onClose: () => void;
}

function CustomerInfoTab() {
  return <Customer360Enhanced />;
}

function CustomerJourneyTab() {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  const journeyItems = [
    { stage: 'Onboarding', status: 'Completed', icon: CheckCircle2, date: 'Dec 1, 2024' },
    { stage: 'First Purchase', status: 'Completed', icon: CheckCircle2, date: 'Dec 5, 2024' },
    { stage: 'Support Request', status: 'In Progress', icon: Clock, date: 'Dec 22, 2024' },
    { stage: 'Renewal', status: 'Upcoming', icon: Calendar, date: 'Jan 15, 2025' },
  ];

  if (!task) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No active interaction</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-3">Customer Lifecycle</h4>
          <div className="space-y-3">
            {journeyItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    item.status === 'Completed' && "bg-success/10",
                    item.status === 'In Progress' && "bg-primary/10",
                    item.status === 'Upcoming' && "bg-muted"
                  )}>
                    <Icon className={cn(
                      "w-4 h-4",
                      item.status === 'Completed' && "text-success",
                      item.status === 'In Progress' && "text-primary",
                      item.status === 'Upcoming' && "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.stage}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    item.status === 'Completed' && "bg-success/10 text-success",
                    item.status === 'In Progress' && "bg-primary/10 text-primary",
                    item.status === 'Upcoming' && "bg-muted text-muted-foreground"
                  )}>
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

function AgentAssistTab() {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  const suggestions = [
    { 
      title: 'Billing FAQ', 
      content: 'Customer may be asking about recent charges. Consider offering to explain the billing breakdown.',
      confidence: 92
    },
    { 
      title: 'Account Verification', 
      content: 'Verify customer identity before discussing billing details.',
      confidence: 88
    },
    { 
      title: 'Upsell Opportunity', 
      content: 'Customer is eligible for premium plan upgrade with 20% discount.',
      confidence: 75
    },
  ];

  if (!task) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No active interaction</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h4 className="font-semibold">AI Suggestions</h4>
        </div>

        <div className="space-y-3">
          {suggestions.map((suggestion, i) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-sm">{suggestion.title}</h5>
                <span className="text-xs text-muted-foreground">{suggestion.confidence}%</span>
              </div>
              <p className="text-sm text-muted-foreground">{suggestion.content}</p>
              <Button variant="link" size="sm" className="px-0 mt-2 h-auto">
                Use suggestion
              </Button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold text-sm mb-3">Quick Responses</h4>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start text-left">
              "Thank you for contacting us today..."
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-left">
              "I understand your concern..."
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-left">
              "Let me look into that for you..."
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export function ContextualPanelTabs({ onClose }: ContextualPanelTabsProps) {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="customer" className="flex-1 flex flex-col">
        <div className="border-b border-border px-2 flex items-center justify-between">
          <TabsList className="bg-transparent h-12">
            <TabsTrigger value="customer" className="data-[state=active]:bg-muted text-xs">
              <User className="w-4 h-4 mr-1" />
              Customer
            </TabsTrigger>
            <TabsTrigger value="transfer" className="data-[state=active]:bg-muted text-xs">
              <ArrowRightLeft className="w-4 h-4 mr-1" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-muted text-xs">
              <BarChart3 className="w-4 h-4 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="assist" className="data-[state=active]:bg-muted text-xs">
              <Sparkles className="w-4 h-4 mr-1" />
              AI
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <TabsContent value="customer" className="flex-1 mt-0 overflow-hidden">
          <CustomerInfoTab />
        </TabsContent>
        <TabsContent value="transfer" className="flex-1 mt-0 overflow-hidden">
          <TransferConsultPanel />
        </TabsContent>
        <TabsContent value="analytics" className="flex-1 mt-0 overflow-hidden">
          <AgentMetricsDashboard />
        </TabsContent>
        <TabsContent value="assist" className="flex-1 mt-0 overflow-hidden">
          <AgentAssistTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
