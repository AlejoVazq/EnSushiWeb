import { cn } from '@/lib/cn';
import type { CartScheduleNotice } from '@/lib/schedule';

interface ScheduleNoticesProps {
  notices: readonly CartScheduleNotice[];
  className?: string;
}

export function ScheduleNotices({ notices, className }: ScheduleNoticesProps) {
  if (notices.length === 0) return null;

  return (
    <ul className={cn('space-y-2', className)}>
      {notices.map((notice) => (
        <li
          key={notice.message}
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-xl border p-3 text-sm leading-relaxed',
            notice.tone === 'error' ? 'border-danger/40 bg-danger/10' : 'border-accent/40 bg-accent/10',
          )}
        >
          {notice.message}
        </li>
      ))}
    </ul>
  );
}
