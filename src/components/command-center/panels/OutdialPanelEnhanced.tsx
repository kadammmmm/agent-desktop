import { useState } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Delete, Clock, PhoneCall } from 'lucide-react';
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

export function OutdialPanelEnhanced() {
  const { entryPoints, recentOutboundCalls, outdial, agentState } = useWebex();
  const [dialNumber, setDialNumber] = useState('');
  const [selectedEntryPoint, setSelectedEntryPoint] = useState(entryPoints[0]?.id || '');

  const isAvailable = agentState?.state === 'Available';

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

  const handleClear = () => {
    setDialNumber('');
  };

  const handleDial = () => {
    if (dialNumber && selectedEntryPoint) {
      outdial(dialNumber, selectedEntryPoint);
      setDialNumber('');
    }
  };

  const handleQuickDial = (number: string) => {
    setDialNumber(number);
  };

  const formatNumber = (num: string) => {
    // Simple US phone number formatting
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return num;
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Entry Point Selection */}
      <div className="p-4 border-b border-border">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Entry Point</label>
        <Select value={selectedEntryPoint} onValueChange={setSelectedEntryPoint}>
          <SelectTrigger>
            <SelectValue placeholder="Select entry point" />
          </SelectTrigger>
          <SelectContent>
            {entryPoints.map(ep => (
              <SelectItem key={ep.id} value={ep.id}>
                <div>
                  <p className="font-medium">{ep.name}</p>
                  {ep.description && (
                    <p className="text-xs text-muted-foreground">{ep.description}</p>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Number Display */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <div className="h-14 flex items-center justify-center bg-muted/50 rounded-lg px-4">
            <span className="text-2xl font-mono tracking-wider">
              {dialNumber || <span className="text-muted-foreground">Enter number</span>}
            </span>
          </div>
          {dialNumber && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-md transition-colors"
              onClick={handleClear}
            >
              <Delete className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Dialpad */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
          {dialpadKeys.map(key => (
            <button
              key={key.digit}
              className={cn(
                "h-14 rounded-xl bg-muted/50 hover:bg-muted transition-colors",
                "flex flex-col items-center justify-center",
                "active:scale-95 active:bg-primary/10"
              )}
              onClick={() => handleKeyPress(key.digit)}
            >
              <span className="text-xl font-semibold">{key.digit}</span>
              {key.letters && (
                <span className="text-[10px] text-muted-foreground tracking-wider">{key.letters}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 mt-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={handleBackspace}
            disabled={!dialNumber}
          >
            <Delete className="w-5 h-5" />
          </Button>

          <Button
            size="lg"
            className={cn(
              "h-14 w-14 rounded-full",
              isAvailable ? "bg-state-available hover:bg-state-available/90" : ""
            )}
            onClick={handleDial}
            disabled={!dialNumber || !selectedEntryPoint || !isAvailable}
          >
            <Phone className="w-6 h-6" />
          </Button>

          <div className="w-12" /> {/* Spacer for symmetry */}
        </div>

        {!isAvailable && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Set status to Available to make calls
          </p>
        )}
      </div>

      {/* Recent Calls */}
      <div className="flex-1 overflow-hidden">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Recent Calls
          </p>
        </div>
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {recentOutboundCalls.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No recent calls
              </p>
            ) : (
              recentOutboundCalls.map((call, index) => (
                <button
                  key={`${call.number}-${index}`}
                  className="w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  onClick={() => handleQuickDial(call.number)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <PhoneCall className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{formatNumber(call.number)}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{call.entryPointName}</span>
                        <span>•</span>
                        <span>{formatDuration(call.duration)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(call.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}