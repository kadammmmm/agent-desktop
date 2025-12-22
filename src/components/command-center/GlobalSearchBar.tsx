import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn(
      "relative flex items-center transition-all duration-200",
      isFocused ? "w-80" : "w-64"
    )}>
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="Search people, queues, locations..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="pl-10 pr-8 bg-muted/50 border-transparent focus:bg-background focus:border-border"
      />
      {query && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-0 h-full w-8"
          onClick={() => setQuery('')}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
