import { useState } from 'react';
import { useWebex } from '@/contexts/WebexContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone } from 'lucide-react';

export function OutdialPanel() {
  const { outdial, agentState } = useWebex();
  const [dialNumber, setDialNumber] = useState('');

  const handleOutdial = () => {
    if (dialNumber) {
      outdial(dialNumber, 'ep-001');
      setDialNumber('');
    }
  };

  const handleKeyPress = (key: string) => {
    setDialNumber(prev => prev + key);
  };

  const isAvailable = agentState?.state === 'Available';

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5" />Outdial</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Enter number to dial" value={dialNumber} onChange={e => setDialNumber(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
            <Button key={key} variant="outline" onClick={() => handleKeyPress(key)}>{key}</Button>
          ))}
        </div>
        <Button onClick={handleOutdial} disabled={!dialNumber || !isAvailable} className="w-full">
          <Phone className="w-4 h-4 mr-2" />Call
        </Button>
      </CardContent>
    </Card>
  );
}
