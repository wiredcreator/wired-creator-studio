/**
 * Timezone-aware date formatting utilities.
 *
 * All functions accept an IANA timezone string (e.g., "America/New_York")
 * and use Intl.DateTimeFormat under the hood, which handles DST automatically.
 */

/**
 * Format a date as a localized date string in the given timezone.
 * Equivalent to toLocaleDateString but timezone-aware.
 */
export function formatDate(
  date: string | Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(date).toLocaleDateString('en-US', { ...options, timeZone: timezone });
}

/**
 * Format a date as a localized date+time string in the given timezone.
 * Equivalent to toLocaleString but timezone-aware.
 */
export function formatDateTime(
  date: string | Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(date).toLocaleString('en-US', { ...options, timeZone: timezone });
}

/**
 * Get the current local date as YYYY-MM-DD in the given timezone.
 * Use this instead of `new Date().toISOString().split('T')[0]` which gives UTC date.
 */
export function getLocalDateISO(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/**
 * Get the current hour (0-23) in the given timezone.
 * Useful for greeting logic ("Good morning" / "Good afternoon" / "Good evening").
 */
export function getLocalHour(timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  return parseInt(parts.find((p) => p.type === 'hour')?.value || '12', 10);
}

/**
 * Convert a UTC timestamp to its YYYY-MM-DD representation in the given timezone.
 * Useful for bucketing timestamps into calendar days.
 */
export function toLocalDateKey(date: Date | string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(date));
}

/**
 * Check if two dates fall on the same calendar day in the given timezone.
 */
export function isSameDayInTimezone(a: Date | string, b: Date | string, timezone: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
  return fmt.format(new Date(a)) === fmt.format(new Date(b));
}

/**
 * Check if `dateToCheck` is the calendar day immediately before `referenceDate`
 * in the given timezone.
 */
export function isYesterdayInTimezone(
  dateToCheck: Date | string,
  referenceDate: Date | string,
  timezone: string
): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
  const checkStr = fmt.format(new Date(dateToCheck));
  const refStr = fmt.format(new Date(referenceDate));

  // Parse the formatted date strings at noon UTC to avoid DST edge cases
  const checkDay = new Date(checkStr + 'T12:00:00Z');
  const refDay = new Date(refStr + 'T12:00:00Z');
  const diffMs = refDay.getTime() - checkDay.getTime();
  return Math.round(diffMs / 86400000) === 1;
}

/**
 * Get the day of week (0=Sun, 1=Mon, ..., 6=Sat) for a date in the given timezone.
 */
export function getDayOfWeekInTimezone(date: Date | string, timezone: string): number {
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(date));
  return new Date(dateStr + 'T12:00:00Z').getDay();
}

/**
 * Get year, month (0-indexed), and day for a date in the given timezone.
 */
export function getDatePartsInTimezone(
  date: Date | string,
  timezone: string
): { year: number; month: number; day: number } {
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(date));
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month: month - 1, day };
}

/**
 * Generate timezone options for a dropdown, grouped by region with UTC offset labels.
 * Returns all IANA timezones sorted by offset within each region group.
 *
 * Client-side only (uses Intl.supportedValuesOf).
 */
export function getTimezoneOptions(): { region: string; options: { value: string; label: string }[] }[] {
  let tzIds: string[];
  try {
    tzIds = Intl.supportedValuesOf('timeZone');
  } catch {
    // Fallback if Intl.supportedValuesOf is unavailable
    tzIds = [
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
      'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
      'Australia/Sydney', 'UTC',
    ];
  }

  const now = new Date();

  const withOffset = tzIds.map((tz) => {
    const offsetMinutes = getOffsetMinutes(now, tz);
    const offsetStr = formatOffset(offsetMinutes);
    const city = tz.split('/').slice(1).join('/').replace(/_/g, ' ') || tz;
    const region = tz.split('/')[0];
    return { value: tz, label: `(GMT${offsetStr}) ${city}`, region, offsetMinutes };
  });

  // Group by region
  const regionOrder = ['America', 'Europe', 'Asia', 'Africa', 'Australia', 'Pacific', 'Indian', 'Atlantic', 'Arctic', 'Antarctica'];
  const groups: Record<string, typeof withOffset> = {};

  for (const tz of withOffset) {
    const region = regionOrder.includes(tz.region) ? tz.region : 'Other';
    if (!groups[region]) groups[region] = [];
    groups[region].push(tz);
  }

  // Sort each group by offset
  for (const region of Object.keys(groups)) {
    groups[region].sort((a, b) => a.offsetMinutes - b.offsetMinutes);
  }

  // Return in region order
  return regionOrder
    .filter((r) => groups[r]?.length)
    .map((region) => ({
      region,
      options: groups[region].map(({ value, label }) => ({ value, label })),
    }))
    .concat(
      groups['Other']?.length
        ? [{ region: 'Other', options: groups['Other'].map(({ value, label }) => ({ value, label })) }]
        : []
    );
}

function getOffsetMinutes(now: Date, timezone: string): number {
  const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = now.toLocaleString('en-US', { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
