import { useState } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, PhoneOutgoing, Delete, Clock, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const dialpadKeys = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

// Hardcoded fallback entry point ID
const FALLBACK_ENTRY_POINT_ID = '84f80945-2f92-4086-aead-6a4afbb79dd9';

export function DialpadPopover() {
  const { entryPoints, recentOutboundCalls, outdial, agentState } = useWebex();
  const [isOpen, setIsOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [selectedEntryPoint, setSelectedEntryPoint] = useState('');

  const canMakeCall = agentState?.state === 'Available' || agentState?.state === 'Idle';
  const effectiveEntryPoint = selectedEntryPoint || entryPoints[0]?.id || FALLBACK_ENTRY_POINT_ID;
  const isUsingFallback = entryPoints.length === 0 || effectiveEntryPoint === FALLBACK_ENTRY_POINT_ID;

  const handleKeyPress = (digit: string) => {
    if (digit === '0' && dialNumber === '') {
      setDialNumber('+');
    } else {
      setDialNumber(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setDialNumber(prev => prev.slice(0, -1));
  };

  const handleDial = async () => {
    if (!dialNumber || !effectiveEntryPoint) return;
    
    await outdial(dialNumber, effectiveEntryPoint);
    setDialNumber('');
    setIsOpen(false);
  };

  const handleQuickDial = (number: string) => {
    setDialNumber(number);
  };

  const formatNumber = (num: string) => {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return num;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 relative",
                isOpen && "bg-primary/10 text-primary"
              )}
            >
              <PhoneOutgoing className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Dialpad</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <h4 className="font-medium text-sm">Make a Call</h4>
        </div>

        {/* Entry Point Selection */}
        <div className="p-3 border-b border-border">
          <label className="text-xs text-muted-foreground mb-1.5 block">Entry Point</label>
          <Select 
            value={effectiveEntryPoint} 
            onValueChange={setSelectedEntryPoint}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select entry point" />
            </SelectTrigger>
            <SelectContent>
              {entryPoints.length === 0 ? (
                <SelectItem value={FALLBACK_ENTRY_POINT_ID}>
                  Default Outdial
                </SelectItem>
              ) : (
                entryPoints.map(ep => (
                  <SelectItem key={ep.id} value={ep.id}>
                    {ep.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {isUsingFallback && (
            <p className="text-xs text-muted-foreground mt-1">Using default entry point</p>
          )}
        </div>

        {/* Number Display */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Input
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              placeholder="Enter number"
              className="h-12 text-xl font-mono text-center pr-10"
            />
            {dialNumber && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-md transition-colors"
                onClick={() => setDialNumber('')}
              >
                <Delete className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Dialpad */}
        <div className="p-3 border-b border-border">
          <div className="grid grid-cols-3 gap-1.5">
            {dialpadKeys.map(key => (
              <button
                key={key.digit}
                className={cn(
                  "h-12 rounded-lg bg-muted/50 hover:bg-muted transition-colors",
                  "flex flex-col items-center justify-center",
                  "active:scale-95 active:bg-primary/10"
                )}
                onClick={() => handleKeyPress(key.digit)}
              >
                <span className="text-lg font-semibold">{key.digit}</span>
                {key.letters && (
                  <span className="text-[9px] text-muted-foreground tracking-wider">{key.letters}</span>
                )}
              </button>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleBackspace}
              disabled={!dialNumber}
            >
              <Delete className="w-5 h-5" />
            </Button>

            <Button
              size="lg"
              className={cn(
                "h-12 w-12 rounded-full",
                canMakeCall && "bg-state-available hover:bg-state-available/90"
              )}
              onClick={handleDial}
              disabled={!dialNumber || !canMakeCall}
            >
              <Phone className="w-5 h-5" />
            </Button>

            <div className="w-10" />
          </div>

          {!canMakeCall && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Cannot make calls while {agentState?.state || 'Offline'}
            </p>
          )}
        </div>

        {/* Recent Calls */}
        <div className="max-h-40">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Recent
            </p>
          </div>
          <ScrollArea className="h-32">
            <div className="p-1">
              {recentOutboundCalls.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">
                  No recent calls
                </p>
              ) : (
                recentOutboundCalls.slice(0, 5).map((call, index) => (
                  <button
                    key={`${call.number}-${index}`}
                    className="w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    onClick={() => handleQuickDial(call.number)}
                  >
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{formatNumber(call.number)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(call.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
