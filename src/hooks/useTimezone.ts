import { useTimezoneContext } from '@/components/TimezoneProvider';
import {
  formatDate,
  formatDateTime,
  getLocalDateISO,
  getLocalHour,
} from '@/lib/format-date';

/**
 * Hook that provides the user's timezone and pre-bound formatting helpers.
 *
 * Usage:
 *   const { timezone, formatDate, formatDateTime } = useTimezone();
 *   const label = formatDate(someDate, { month: 'short', day: 'numeric' });
 */
export function useTimezone() {
  const { timezone } = useTimezoneContext();

  return {
    timezone,
    formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, timezone, options),
    formatDateTime: (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDateTime(date, timezone, options),
    getLocalDateISO: () => getLocalDateISO(timezone),
    getLocalHour: () => getLocalHour(timezone),
  };
}
