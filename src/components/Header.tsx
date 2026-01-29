import { Platform } from '@/types/release';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Train, Smartphone, TabletSmartphone, RotateCcw, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  version: string;
  platform: Platform;
  progress: { completed: number; total: number };
  isViewingPast: boolean;
  versions: string[];
  onVersionChange: (version: string) => void;
  onPlatformChange: (platform: Platform) => void;
  onResetDemo: () => void;
}

export function Header({
  version,
  platform,
  progress,
  isViewingPast,
  versions,
  onVersionChange,
  onPlatformChange,
  onResetDemo,
}: HeaderProps) {
  const progressPercent = (progress.completed / progress.total) * 100;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <Train className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Mobile Release Train</h1>
              <p className="text-xs text-muted-foreground mt-0.5">OneStep</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Version Selector */}
            <Select value={version} onValueChange={onVersionChange}>
              <SelectTrigger className="w-[120px] h-9 text-sm focus-ring">
                <SelectValue placeholder="Version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Platform Toggle */}
            <ToggleGroup 
              type="single" 
              value={platform} 
              onValueChange={(val) => val && onPlatformChange(val as Platform)}
              className="bg-muted rounded-lg p-1"
            >
              <ToggleGroupItem 
                value="ios" 
                aria-label="iOS"
                className="h-7 px-2.5 text-xs data-[state=on]:bg-background"
              >
                <Smartphone className="w-3.5 h-3.5 mr-1" />
                iOS
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="android" 
                aria-label="Android"
                className="h-7 px-2.5 text-xs data-[state=on]:bg-background"
              >
                <Smartphone className="w-3.5 h-3.5 mr-1" />
                Android
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="both" 
                aria-label="Both platforms"
                className="h-7 px-2.5 text-xs data-[state=on]:bg-background"
              >
                <TabletSmartphone className="w-3.5 h-3.5 mr-1" />
                Both
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Progress */}
            <div className="flex items-center gap-2 min-w-[140px]">
              <Progress value={progressPercent} className="h-2 flex-1" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {progress.completed}/{progress.total}
              </span>
            </div>

            {/* View Mode Indicator */}
            {isViewingPast && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                <Eye className="w-3.5 h-3.5" />
                Read-only
              </div>
            )}

            {/* Reset Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetDemo}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Demo
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
