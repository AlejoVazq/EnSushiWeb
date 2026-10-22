import { cn } from '@/lib/cn';
import type { CartScheduleNotice } from '@/lib/schedule';

interface ScheduleNoticesProps {
  notices: readonly CartScheduleNotice[];
  className?: string;
}

/** Schedule notices as crema bands, like the menu's status band; the blocking one is an alert */
export function ScheduleNotices({ notices, className }: ScheduleNoticesProps) {
  if (notices.length === 0) return null;

  return (
    <ul className={cn('space-y-2', className)}>
      {notices.map((notice) => (
        <li
          key={notice.message}
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'rounded-xl bg-washi px-4 py-3 text-sm leading-relaxed text-pretty text-sumi',
            notice.tone === 'error' ? 'font-bold' : 'font-medium',
          )}
        >
          {notice.message}
        </li>
      ))}
    </ul>
  );
}
