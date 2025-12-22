import { useState } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, User, MapPin, Phone, Mail, Tag, CheckCircle2, 
  Clock, MessageSquare, Sparkles, ChevronDown, ChevronUp,
  Building, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextualPanelTabsProps {
  onClose: () => void;
}

function CustomerInfoTab() {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);
  const [expandedSections, setExpandedSections] = useState<string[]>(['details', 'tags']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section) 
        : [...prev, section]
    );
  };

  // Mock customer data
  const customerTags = [
    { label: 'Premium', color: 'bg-amber-500/10 text-amber-600' },
    { label: 'Insurance', color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Home Policy', color: 'bg-green-500/10 text-green-600' },
  ];

  if (!task) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No active interaction</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Customer Header */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{task.customerName || 'Unknown Customer'}</h3>
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-xs text-success font-medium">Verified</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">{task.ani}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {customerTags.map((tag, i) => (
            <span 
              key={i} 
              className={cn("px-2 py-1 rounded-full text-xs font-medium", tag.color)}
            >
              {tag.label}
            </span>
          ))}
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-2">
          {/* Contact Details */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button 
              className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50"
              onClick={() => toggleSection('details')}
            >
              <span className="font-medium text-sm">Contact Details</span>
              {expandedSections.includes('details') 
                ? <ChevronUp className="w-4 h-4" /> 
                : <ChevronDown className="w-4 h-4" />
              }
            </button>
            {expandedSections.includes('details') && (
              <div className="px-3 pb-3 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{task.ani}</span>
                </div>
                {task.customerEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{task.customerEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>San Francisco, CA</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span>Acme Corporation</span>
                </div>
              </div>
            )}
          </div>

          {/* CAD Variables */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button 
              className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50"
              onClick={() => toggleSection('cad')}
            >
              <span className="font-medium text-sm">Call Data</span>
              {expandedSections.includes('cad') 
                ? <ChevronUp className="w-4 h-4" /> 
                : <ChevronDown className="w-4 h-4" />
              }
            </button>
            {expandedSections.includes('cad') && (
              <div className="px-3 pb-3 space-y-2">
                {Object.entries(task.cadVariables).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

function CustomerJourneyTab() {
  const { activeTasks, selectedTaskId } = useWebex();
  const task = activeTasks.find(t => t.taskId === selectedTaskId);

  // Mock journey data
  const journeyItems = [
    { stage: 'Onboarding', status: 'Completed', icon: CheckCircle2, date: 'Dec 1, 2024' },
    { stage: 'First Purchase', status: 'Completed', icon: CheckCircle2, date: 'Dec 5, 2024' },
    { stage: 'Support Request', status: 'In Progress', icon: Clock, date: 'Dec 22, 2024' },
    { stage: 'Renewal', status: 'Upcoming', icon: Calendar, date: 'Jan 15, 2025' },
  ];

  const recentInteractions = [
    { type: 'Call', summary: 'Billing inquiry', date: 'Dec 20', duration: '5:32' },
    { type: 'Email', summary: 'Account verification', date: 'Dec 18', duration: '-' },
    { type: 'Chat', summary: 'Product question', date: 'Dec 15', duration: '8:45' },
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
        {/* Lifecycle Stages */}
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

        {/* Recent Interactions */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Recent Interactions</h4>
          <div className="space-y-2">
            {recentInteractions.map((interaction, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{interaction.summary}</p>
                  <p className="text-xs text-muted-foreground">{interaction.type} • {interaction.date}</p>
                </div>
                {interaction.duration !== '-' && (
                  <span className="text-xs text-muted-foreground">{interaction.duration}</span>
                )}
              </div>
            ))}
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
        {/* Tab Header */}
        <div className="border-b border-border px-2 flex items-center justify-between">
          <TabsList className="bg-transparent h-12">
            <TabsTrigger value="customer" className="data-[state=active]:bg-muted">
              <User className="w-4 h-4 mr-2" />
              Customer
            </TabsTrigger>
            <TabsTrigger value="journey" className="data-[state=active]:bg-muted">
              <Clock className="w-4 h-4 mr-2" />
              Journey
            </TabsTrigger>
            <TabsTrigger value="assist" className="data-[state=active]:bg-muted">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Assist
            </TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab Content */}
        <TabsContent value="customer" className="flex-1 mt-0 overflow-hidden">
          <CustomerInfoTab />
        </TabsContent>
        <TabsContent value="journey" className="flex-1 mt-0 overflow-hidden">
          <CustomerJourneyTab />
        </TabsContent>
        <TabsContent value="assist" className="flex-1 mt-0 overflow-hidden">
          <AgentAssistTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
