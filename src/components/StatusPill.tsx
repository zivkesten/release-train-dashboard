import { StopStatus } from '@/types/release';
import { cn } from '@/lib/utils';

interface StatusPillProps {
  status: StopStatus;
  className?: string;
}

const statusLabels: Record<StopStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'done': 'Done',
  'blocked': 'Blocked',
};

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'status-not-started': status === 'not-started',
          'status-in-progress': status === 'in-progress',
          'status-done': status === 'done',
          'status-blocked': status === 'blocked',
        },
        className
      )}
      role="status"
      aria-label={`Status: ${statusLabels[status]}`}
    >
      {status === 'in-progress' && (
        <span className="mr-1.5 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status === 'blocked' && (
        <span className="mr-1.5 w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {statusLabels[status]}
    </span>
  );
}
