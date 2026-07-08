import { useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWebex } from '@/contexts/WebexContext';
import { cn } from '@/lib/utils';

const DIGITS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

interface Props {
  taskId: string;
  className?: string;
}

/**
 * DTMF keypad for IVR navigation mid-call. Sends tones via
 * Desktop.agentContact.sendDtmf().
 */
export function DtmfKeypad({ taskId, className }: Props) {
  const { sendDtmf } = useWebex();
  const [buffer, setBuffer] = useState('');

  const press = (d: string) => {
    setBuffer((b) => (b + d).slice(-16));
    sendDtmf(taskId, d).catch((e) => console.error('[DTMF] send failed:', e));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          className={cn('h-14 w-14 rounded-full', className)}
          aria-label="Open DTMF keypad"
          title="DTMF keypad"
        >
          <Grid3x3 className="w-6 h-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="center">
        <div className="mb-2 min-h-[24px] px-2 py-1 rounded bg-muted font-mono text-sm tracking-widest text-right">
          {buffer || <span className="text-muted-foreground">Keypad</span>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DIGITS.flat().map((d) => (
            <Button
              key={d}
              variant="outline"
              className="h-12 text-lg font-semibold"
              onClick={() => press(d)}
            >
              {d}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-8 text-xs"
          onClick={() => setBuffer('')}
          disabled={!buffer}
        >
          Clear
        </Button>
      </PopoverContent>
    </Popover>
  );
}
