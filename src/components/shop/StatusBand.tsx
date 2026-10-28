'use client';

import { BUSINESS } from '@/config/business';
import { useScheduleStatus, useSpecialDay } from '@/hooks/useScheduleStatus';
import { getSimulatedNow, type ScheduleStatus } from '@/lib/schedule';

const { operatingHours, preorderCutoff, timeZone } = BUSINESS.schedule;

/** "vie 23/10 21:30", in the shop's time zone */
const simulatedFormatter = new Intl.DateTimeFormat(BUSINESS.locale, {
  timeZone,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

interface BandCopy {
  lead: string;
  detail: string | null;
}

/** Same wording as the cart and checkout notices, so the three never disagree */
const getBandCopy = (status: ScheduleStatus): BandCopy => {
  if (!status.isTakingOrders) {
    return {
      lead: status.isPaused ? 'Por hoy no tomamos más pedidos.' : status.isOpenToday ? 'Ya cerramos por hoy.' : 'Hoy no abrimos.',
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
  const specialDay = useSpecialDay();
  const copy = status ? getBandCopy(status) : null;
  // Only read once the clock is known (after hydration), like the status itself; always null in production
  const simulated = status ? getSimulatedNow() : null;

  return (
    <div
      role="status"
      className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-0.5 rounded-xl bg-washi px-4 py-2.5 text-sm text-sumi"
    >
      {specialDay && status?.isTakingOrders && (
        <p className="basis-full font-bold">
          Hoy <span className="rounded-md bg-kin px-1.5 py-0.5">−{specialDay.percent}%</span> en todos los Combos
        </p>
      )}
      {copy && (
        <>
          <p className="font-bold">{copy.lead}</p>
          {copy.detail && <p className="font-medium">{copy.detail}</p>}
        </>
      )}
      {simulated && (
        <p className="basis-full pt-1 text-xs font-medium">
          <span className="rounded-md border border-sumi/50 px-1.5 py-0.5 font-bold">Hora simulada</span>{' '}
          {simulatedFormatter.format(simulated)} · solo en desarrollo
        </p>
      )}
    </div>
  );
}
