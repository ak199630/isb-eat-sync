/** Operating hours: 11 AM - 9 PM (campus food service) */
export const OPERATING_HOURS = {
  start: 11,
  end: 21,
} as const;

/** Slot duration in minutes */
export const SLOT_DURATION_MINUTES = 15;

export interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Returns available pickup slots for a given date, within operating hours.
 * Same-day only: if date is today, only future slots are returned.
 */
export function getAvailableSlotsForDate(date: Date): TimeSlot[] {
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const slots: TimeSlot[] = [];
  for (let hour = OPERATING_HOURS.start; hour < OPERATING_HOURS.end; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
      const start = new Date(date);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + SLOT_DURATION_MINUTES);

      if (isToday && start <= now) continue;
      slots.push({
        start,
        end,
        label: formatSlotLabel(start, end),
      });
    }
  }
  return slots;
}

function formatSlotLabel(start: Date, end: Date): string {
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
