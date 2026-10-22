'use client';

import { BUSINESS } from '@/config/business';
import { useScheduleStatus } from '@/hooks/useScheduleStatus';
import type { ScheduleStatus } from '@/lib/schedule';

const { operatingHours, preorderCutoff } = BUSINESS.schedule;

interface BandCopy {
  lead: string;
  detail: string | null;
}

/** Same wording as the cart and checkout notices, so the three never disagree */
const getBandCopy = (status: ScheduleStatus): BandCopy => {
  if (!status.isTakingOrders) {
    return {
      lead: status.isOpenToday ? 'Ya cerramos por hoy.' : 'Hoy no abrimos.',
      detail: status.nextOpening ? `Abrimos ${status.nextOpening} a las ${operatingHours.open}.` : null,
    };
  }
  const cutoff = status.isPreorderAvailable ? `Rolls y nigiris hasta las ${preorderCutoff}` : null;
  if (!status.isStoreOpen) {
    return { lead: `Abrimos hoy a las ${operatingHours.open}`, detail: cutoff ?? 'Ya podés mandar tu pedido' };
  }
  return { lead: `Abierto hoy hasta las ${operatingHours.close}`, detail: cutoff };
};

/** Whether the shop takes orders today, right under the header */
export function StatusBand() {
  const status = useScheduleStatus();
  const copy = status ? getBandCopy(status) : null;

  return (
    <div
      role="status"
      className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-0.5 rounded-xl bg-washi px-4 py-2.5 text-sm text-sumi"
    >
      {copy && (
        <>
          <p className="font-bold">{copy.lead}</p>
          {copy.detail && <p className="font-medium">{copy.detail}</p>}
        </>
      )}
    </div>
  );
}
