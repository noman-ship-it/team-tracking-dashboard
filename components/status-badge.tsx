import { cn } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/scoring/config';
import type { Status } from '@/lib/db/schema';

const STATUS_BG_CLASS: Record<Status, string> = {
  going_great: 'status-going-great',
  on_track: 'status-on-track',
  needs_attention: 'status-needs-attention',
  behind_target: 'status-behind-target',
  at_risk: 'status-at-risk',
};

export function StatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: Status;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs',
        STATUS_BG_CLASS[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
