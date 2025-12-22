import { useState, useEffect, useCallback } from 'react';
import { 
  FlaskConical, 
  X, 
  Minimize2, 
  ChevronDown, 
  ChevronRight,
  Phone,
  MessageSquare,
  Mail,
  RotateCcw,
  Zap,
  Users,
  Clock,
  Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useDemo } from '@/contexts/DemoContext';
import { useWebex } from '@/contexts/WebexContext';
import { demoScenarios } from '@/lib/demoScenarios';
import type { ChannelType } from '@/types/webex';

export function DemoControlPanel() {
  const { settings, updateSettings, toggleFeature, applyScenario, currentScenario, resetSettings } = useDemo();
  const { 
    triggerIncomingTask, 
    applyCustomerScenario, 
    triggerRONA, 
    setAgentState, 
    clearAllTasks,
    agentState,
    demoAutoIncomingEnabled,
    setDemoAutoIncomingEnabled
  } = useWebex();
  
  const [minimized, setMinimized] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('voice');
  const [selectedScenario, setSelectedScenario] = useState<string>(currentScenario || '');
  
  const [masterOpen, setMasterOpen] = useState(true);
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const [incomingOpen, setIncomingOpen] = useState(true);
  const [scenariosOpen, setScenariosOpen] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  
  // Sync autoIncomingCalls setting with WebexContext
  useEffect(() => {
    setDemoAutoIncomingEnabled(settings.autoIncomingCalls);
  }, [settings.autoIncomingCalls, setDemoAutoIncomingEnabled]);

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        updateSettings({ showPanel: !settings.showPanel });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.showPanel, updateSettings]);

  const handleTriggerIncoming = useCallback(() => {
    triggerIncomingTask?.(selectedChannel);
  }, [triggerIncomingTask, selectedChannel]);

  const handleApplyScenario = useCallback(() => {
    if (selectedScenario) {
      applyScenario(selectedScenario);
      applyCustomerScenario?.(selectedScenario);
    }
  }, [selectedScenario, applyScenario, applyCustomerScenario]);

  const handleRONA = useCallback(() => {
    triggerRONA?.();
  }, [triggerRONA]);

  const handleClearTasks = useCallback(() => {
    clearAllTasks?.();
  }, [clearAllTasks]);

  const handleResetAll = useCallback(() => {
    resetSettings();
    clearAllTasks?.();
    setAgentState?.('Available');
  }, [resetSettings, clearAllTasks, setAgentState]);

  if (!settings.showPanel) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-card border-primary/50 shadow-lg hover:bg-primary/10"
        onClick={() => updateSettings({ showPanel: true })}
        title="Open Demo Panel (Ctrl+Shift+D)"
      >
        <FlaskConical className="h-5 w-5 text-primary" />
      </Button>
    );
  }

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-card border rounded-lg shadow-xl p-2 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium">Demo Mode</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(false)}>
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateSettings({ showPanel: false })}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-card border rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Demo Control Panel</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {agentState?.state || 'Offline'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(true)}>
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateSettings({ showPanel: false })}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="p-3 space-y-3">
          {/* Master Controls */}
          <Collapsible open={masterOpen} onOpenChange={setMasterOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
              <span>Master Controls</span>
              {masterOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="demo-enabled" className="text-xs">Enable Demo Mode</Label>
                <Switch
                  id="demo-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Feature Toggles */}
          <Collapsible open={featuresOpen} onOpenChange={setFeaturesOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
              <span>Feature Toggles</span>
              {featuresOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-incoming" className="text-xs flex items-center gap-1.5">
                  <Radio className="h-3 w-3" />
                  Auto-Incoming Calls
                </Label>
                <Switch
                  id="auto-incoming"
                  checked={settings.autoIncomingCalls}
                  onCheckedChange={() => toggleFeature('autoIncomingCalls')}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="customer-scenarios" className="text-xs flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  Customer Scenarios
                </Label>
                <Switch
                  id="customer-scenarios"
                  checked={settings.customerScenarios}
                  onCheckedChange={() => toggleFeature('customerScenarios')}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="random-events" className="text-xs flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  Random Events
                </Label>
                <Switch
                  id="random-events"
                  checked={settings.randomEvents}
                  onCheckedChange={() => toggleFeature('randomEvents')}
                  disabled={!settings.enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="simulated-latency" className="text-xs flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Simulated Latency
                </Label>
                <Switch
                  id="simulated-latency"
                  checked={settings.simulatedLatency}
                  onCheckedChange={() => toggleFeature('simulatedLatency')}
                  disabled={!settings.enabled}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Simulate Incoming Task */}
          <Collapsible open={incomingOpen} onOpenChange={setIncomingOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
              <span>Simulate Incoming Task</span>
              {incomingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3">
              <div className="flex gap-1">
                <Button
                  variant={selectedChannel === 'voice' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setSelectedChannel('voice')}
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Voice
                </Button>
                <Button
                  variant={selectedChannel === 'chat' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setSelectedChannel('chat')}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Chat
                </Button>
                <Button
                  variant={selectedChannel === 'email' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => setSelectedChannel('email')}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
              </div>
              <Button 
                className="w-full h-8 text-xs" 
                onClick={handleTriggerIncoming}
                disabled={!settings.enabled}
              >
                <Phone className="h-3 w-3 mr-1.5" />
                Trigger Incoming {selectedChannel.charAt(0).toUpperCase() + selectedChannel.slice(1)}
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Customer Scenarios */}
          <Collapsible open={scenariosOpen} onOpenChange={setScenariosOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
              <span>Customer Scenarios</span>
              {scenariosOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <RadioGroup 
                value={selectedScenario} 
                onValueChange={setSelectedScenario}
                className="space-y-1"
              >
                {demoScenarios.map(scenario => (
                  <div key={scenario.id} className="flex items-start space-x-2 p-1.5 rounded hover:bg-muted/50">
                    <RadioGroupItem value={scenario.id} id={scenario.id} className="mt-0.5" />
                    <Label htmlFor={scenario.id} className="flex-1 cursor-pointer">
                      <div className="text-xs font-medium">{scenario.name}</div>
                      <div className="text-[10px] text-muted-foreground">{scenario.description}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <Button 
                className="w-full h-8 text-xs mt-2" 
                onClick={handleApplyScenario}
                disabled={!selectedScenario || !settings.enabled || !settings.customerScenarios}
              >
                Apply Scenario
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Quick Actions */}
          <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
              <span>Quick Actions</span>
              {actionsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={handleRONA}
                  disabled={!settings.enabled}
                >
                  RONA Event
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={() => setAgentState?.('Available')}
                  disabled={!settings.enabled}
                >
                  Set Available
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={handleClearTasks}
                  disabled={!settings.enabled}
                >
                  Clear Tasks
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={handleResetAll}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset All
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t bg-muted/30 text-center">
        <span className="text-[10px] text-muted-foreground">
          Press Ctrl+Shift+D to toggle panel
        </span>
      </div>
    </div>
  );
}
