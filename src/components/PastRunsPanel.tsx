import { motion } from 'framer-motion';
import { ReleaseRun, Platform } from '@/types/release';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Smartphone, TabletSmartphone, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PastRunsPanelProps {
  pastRuns: ReleaseRun[];
  currentRunId: string;
  selectedRunId: string | null;
  onSelectRun: (runId: string | null) => void;
  getProgress: (run: ReleaseRun) => { completed: number; total: number };
}

const platformIcons: Record<Platform, typeof Smartphone> = {
  ios: Smartphone,
  android: Smartphone,
  both: TabletSmartphone,
};

const platformLabels: Record<Platform, string> = {
  ios: 'iOS',
  android: 'Android',
  both: 'iOS & Android',
};

export function PastRunsPanel({
  pastRuns,
  currentRunId,
  selectedRunId,
  onSelectRun,
  getProgress,
}: PastRunsPanelProps) {
  return (
    <div className="bg-sidebar rounded-lg border p-4">
      <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Past Runs
      </h2>
      
      {pastRuns.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No past runs yet
        </p>
      ) : (
        <div className="space-y-2">
          {pastRuns.map((run) => {
            const progress = getProgress(run);
            const isComplete = progress.completed === progress.total;
            const isSelected = selectedRunId === run.id;
            const PlatformIcon = platformIcons[run.platform];
            
            return (
              <motion.button
                key={run.id}
                onClick={() => onSelectRun(isSelected ? null : run.id)}
                className={cn(
                  'w-full p-3 rounded-md text-left transition-all',
                  'hover:bg-sidebar-accent focus-ring',
                  isSelected && 'bg-sidebar-accent ring-2 ring-primary'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{run.version}</span>
                  <div className="flex items-center gap-1">
                    <PlatformIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {platformLabels[run.platform]}
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="h-1.5 bg-muted rounded-full mb-2">
                  <div 
                    className={cn(
                      'h-full rounded-full transition-all',
                      isComplete ? 'bg-status-done' : 'bg-primary'
                    )}
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    {isComplete ? (
                      <CheckCircle className="w-3 h-3 text-status-done" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-status-in-progress" />
                    )}
                    <span>{progress.completed}/{progress.total} complete</span>
                  </div>
                  <span>
                    {formatDistanceToNow(new Date(run.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
      
      {/* Back to current button when viewing past */}
      {selectedRunId && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onSelectRun(null)}
          className="w-full mt-4 p-2 text-xs font-medium text-primary hover:bg-sidebar-accent rounded-md transition-colors focus-ring"
        >
          ← Back to current release
        </motion.button>
      )}
    </div>
  );
}
