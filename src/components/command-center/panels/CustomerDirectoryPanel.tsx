import { useState, useMemo } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { demoScenarios } from '@/lib/demoScenarios';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OutdialDialog } from '../dialogs/OutdialDialog';
import {
  Search, Phone, User, Building, Mail,
  ChevronRight, Clock, PhoneCall, MessageSquare, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import type { CallLogEntry, CustomerTag } from '@/types/webex';

// Simplified customer entry for the directory - doesn't need full CustomerProfile
interface CustomerEntry {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  isVerified?: boolean;
  tags?: CustomerTag[];
  lastInteraction?: CallLogEntry;
  interactionCount: number;
  source: 'scenario' | 'history' | 'outbound';
}

export function CustomerDirectoryPanel() {
  const { recentOutboundCalls, interactionHistory, isDemoMode } = useWebex();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerEntry | null>(null);
  const [dialDialogOpen, setDialDialogOpen] = useState(false);
  const [dialTarget, setDialTarget] = useState<{ phone: string; name: string } | null>(null);

  // Build customer list from various sources
  const customers = useMemo((): CustomerEntry[] => {
    const entries: CustomerEntry[] = [];

    // In demo mode, add demo scenarios as customers
    if (isDemoMode) {
      demoScenarios.forEach(scenario => {
        const profile = scenario.customerProfile;
        entries.push({
          id: profile.id || `scenario-${scenario.id}`,
          name: profile.name || 'Unknown',
          phone: profile.phone,
          email: profile.email,
          company: profile.company,
          isVerified: profile.isVerified,
          tags: profile.tags,
          lastInteraction: scenario.interactionHistory[0],
          interactionCount: scenario.interactionHistory.length,
          source: 'scenario',
        });
      });
    }

    // Add customers from recent outbound calls
    recentOutboundCalls.forEach(call => {
      const existing = entries.find(e => e.phone === call.number);
      if (!existing) {
        entries.push({
          id: `outbound-${call.number}`,
          name: call.number, // Use number as name if unknown
          phone: call.number,
          isVerified: false,
          tags: [],
          lastInteraction: {
            taskId: `outbound-${call.timestamp}`,
            mediaType: 'voice',
            ani: call.number,
            direction: 'outbound',
            duration: call.duration,
            timestamp: call.timestamp,
          },
          interactionCount: 1,
          source: 'outbound',
        });
      }
    });

    return entries;
  }, [isDemoMode, recentOutboundCalls, interactionHistory]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.company?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleCallCustomer = (customer: CustomerEntry) => {
    if (!customer.phone) return;
    setDialTarget({
      phone: customer.phone,
      name: customer.name,
    });
    setDialDialogOpen(true);
  };

  const getMediaIcon = (mediaType?: string) => {
    switch (mediaType) {
      case 'voice': return <PhoneCall className="w-3 h-3" />;
      case 'chat': return <MessageSquare className="w-3 h-3" />;
      case 'email': return <FileText className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Customer Directory</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Customer List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">No customers found</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try a different search term</p>
              )}
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className={cn(
                  "p-3 rounded-lg border border-transparent transition-all cursor-pointer",
                  "hover:bg-muted/50 hover:border-border",
                  selectedCustomer?.id === customer.id && "bg-muted/50 border-border"
                )}
                onClick={() => setSelectedCustomer(
                  selectedCustomer?.id === customer.id ? null : customer
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{customer.name}</p>
                      {customer.isVerified && (
                        <Badge variant="outline" className="text-[10px] shrink-0">Verified</Badge>
                      )}
                    </div>
                    
                    {customer.company && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3" />
                        {customer.company}
                      </p>
                    )}

                    {/* Tags */}
                    {customer.tags && customer.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {customer.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", tag.color)}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Last Interaction */}
                    {customer.lastInteraction && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                        {getMediaIcon(customer.lastInteraction.mediaType)}
                        <span className="capitalize">{customer.lastInteraction.direction}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(customer.lastInteraction.timestamp, { addSuffix: true })}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {customer.phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-state-available hover:bg-state-available/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCallCustomer(customer);
                        }}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                    <ChevronRight className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      selectedCustomer?.id === customer.id && "rotate-90"
                    )} />
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedCustomer?.id === customer.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2 animate-fade-in">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.interactionCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {customer.interactionCount} previous interaction{customer.interactionCount !== 1 ? 's' : ''}
                      </p>
                    )}
                    
                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCallCustomer(customer);
                        }}
                        disabled={!customer.phone}
                        className="bg-state-available hover:bg-state-available/90"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Outdial Dialog */}
      <OutdialDialog
        isOpen={dialDialogOpen}
        onClose={() => {
          setDialDialogOpen(false);
          setDialTarget(null);
        }}
        phoneNumber={dialTarget?.phone}
        customerName={dialTarget?.name}
      />
    </div>
  );
}
