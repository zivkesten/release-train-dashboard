import { useMemo } from 'react';
import { ReleaseRun, Stop } from '@/types/release';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, Timer, TrendingUp } from 'lucide-react';
import { formatDistanceStrict, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

interface ReleaseAnalyticsProps {
  run: ReleaseRun;
}

interface StepDuration {
  number: number;
  title: string;
  duration: number | null; // in minutes
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

export function ReleaseAnalytics({ run }: ReleaseAnalyticsProps) {
  const analytics = useMemo(() => {
    // Find when the train started (first stop started_at)
    const firstStop = run.stops.find(s => s.number === 1);
    const trainStartTime = firstStop?.startedAt ? new Date(firstStop.startedAt) : null;
    
    if (!trainStartTime) {
      return {
        trainStartTime: null,
        totalDuration: null,
        stepDurations: [] as StepDuration[],
        completedSteps: 0,
        averageStepTime: null,
      };
    }

    const now = new Date();
    const lastCompletedStop = [...run.stops]
      .filter(s => s.status === 'done' && s.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];
    
    const endTime = lastCompletedStop?.completedAt 
      ? new Date(lastCompletedStop.completedAt) 
      : now;
    
    const totalMinutes = differenceInMinutes(endTime, trainStartTime);
    
    const stepDurations: StepDuration[] = run.stops.map(stop => {
      let duration: number | null = null;
      
      if (stop.startedAt && stop.completedAt) {
        duration = differenceInMinutes(new Date(stop.completedAt), new Date(stop.startedAt));
      } else if (stop.startedAt && stop.status === 'in-progress') {
        duration = differenceInMinutes(now, new Date(stop.startedAt));
      }
      
      return {
        number: stop.number,
        title: stop.title,
        duration,
        status: stop.status,
        startedAt: stop.startedAt,
        completedAt: stop.completedAt,
      };
    });

    const completedSteps = run.stops.filter(s => s.status === 'done').length;
    const completedDurations = stepDurations
      .filter(s => s.status === 'done' && s.duration !== null)
      .map(s => s.duration!);
    
    const averageStepTime = completedDurations.length > 0
      ? Math.round(completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length)
      : null;

    return {
      trainStartTime,
      totalDuration: totalMinutes,
      stepDurations,
      completedSteps,
      averageStepTime,
    };
  }, [run.stops]);

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return '—';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return `${days}d ${hours}h`;
  };

  const getMaxDuration = () => {
    const durations = analytics.stepDurations
      .filter(s => s.duration !== null)
      .map(s => s.duration!);
    return durations.length > 0 ? Math.max(...durations) : 1;
  };

  if (!analytics.trainStartTime) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Release Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start the train to see analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxDuration = getMaxDuration();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer className="w-4 h-4" />
          Release Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Time</p>
            <p className="font-semibold text-sm">{formatDuration(analytics.totalDuration)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Avg Step</p>
            <p className="font-semibold text-sm">{formatDuration(analytics.averageStepTime)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <Timer className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="font-semibold text-sm">{analytics.completedSteps}/{run.stops.length}</p>
          </div>
        </div>

        {/* Step Durations */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Step Durations
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {analytics.stepDurations.map(step => (
              <div key={step.number} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-muted-foreground">{step.number}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="truncate" title={step.title}>
                      {step.title}
                    </span>
                    <span className={`ml-2 ${
                      step.status === 'in-progress' ? 'text-primary' :
                      step.status === 'done' ? 'text-status-done' :
                      step.status === 'blocked' ? 'text-status-blocked' :
                      'text-muted-foreground'
                    }`}>
                      {step.duration !== null ? formatDuration(step.duration) : '—'}
                    </span>
                  </div>
                  {step.duration !== null && (
                    <Progress 
                      value={(step.duration / maxDuration) * 100} 
                      className="h-1"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
