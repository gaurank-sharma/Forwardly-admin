/** YYYY-MM-DD for a date (local). */
export function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekdayOf(d = new Date()) {
  return d.getDay(); // 0=Sun .. 6=Sat
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Count working days (Mon–Sat) in the current month up to `upto`. */
export function workingDaysThisMonth(upto = new Date()) {
  const y = upto.getFullYear();
  const m = upto.getMonth();
  let count = 0;
  for (let day = 1; day <= upto.getDate(); day++) {
    const wd = new Date(y, m, day).getDay();
    if (wd !== 0) count++; // exclude Sundays
  }
  return count;
}
