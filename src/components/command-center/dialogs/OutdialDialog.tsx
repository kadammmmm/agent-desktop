import { useState, useEffect } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutdialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber?: string;
  customerName?: string;
}

export function OutdialDialog({ isOpen, onClose, phoneNumber = '', customerName }: OutdialDialogProps) {
  const { entryPoints, outdial, agentState } = useWebex();
  const [dialNumber, setDialNumber] = useState(phoneNumber);
  const [selectedEntryPoint, setSelectedEntryPoint] = useState('');
  const [isDialing, setIsDialing] = useState(false);

  // Hardcoded fallback entry point ID
  const FALLBACK_ENTRY_POINT_ID = '84f80945-2f92-4086-aead-6a4afbb79dd9';
  
  const isAvailable = agentState?.state === 'Available';
  const effectiveEntryPoint = selectedEntryPoint || entryPoints[0]?.id || FALLBACK_ENTRY_POINT_ID;
  const isUsingFallback = entryPoints.length === 0 || effectiveEntryPoint === FALLBACK_ENTRY_POINT_ID;

  // Reset state when dialog opens with new phone number
  useEffect(() => {
    if (isOpen) {
      setDialNumber(phoneNumber);
      setSelectedEntryPoint(entryPoints[0]?.id || FALLBACK_ENTRY_POINT_ID);
      setIsDialing(false);
    }
  }, [isOpen, phoneNumber, entryPoints]);

  const handleDial = async () => {
    if (!dialNumber || !effectiveEntryPoint) return;
    
    setIsDialing(true);
    try {
      await outdial(dialNumber, effectiveEntryPoint);
      onClose();
    } catch (error) {
      console.error('Outdial failed:', error);
    } finally {
      setIsDialing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Make Outbound Call
          </DialogTitle>
          <DialogDescription>
            {customerName ? `Call ${customerName}` : 'Enter a number to dial'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Name (if provided) */}
          {customerName && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{customerName}</p>
                <p className="text-sm text-muted-foreground">{phoneNumber}</p>
              </div>
            </div>
          )}

          {/* Phone Number Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <Input
              placeholder="Enter phone number"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              className="font-mono text-lg"
            />
          </div>

          {/* Entry Point Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Entry Point</label>
            <Select value={effectiveEntryPoint} onValueChange={setSelectedEntryPoint}>
              <SelectTrigger>
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
                      <div>
                        <p className="font-medium">{ep.name}</p>
                        {ep.description && (
                          <p className="text-xs text-muted-foreground">{ep.description}</p>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {isUsingFallback && (
              <p className="text-xs text-muted-foreground">Using default entry point</p>
            )}
          </div>

          {/* Agent State Warning */}
          {!isAvailable && (
            <p className="text-sm text-destructive flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
              Set your status to Available to make calls
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleDial}
            disabled={!dialNumber || !effectiveEntryPoint || !isAvailable || isDialing}
            className={cn(
              isAvailable && "bg-state-available hover:bg-state-available/90"
            )}
          >
            <Phone className="w-4 h-4 mr-2" />
            {isDialing ? 'Dialing...' : 'Call'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
