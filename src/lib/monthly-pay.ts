// Currency per hour derived from the agreed monthly salary and contracted hours.
export function monthlyHourlyRate(amount: number, hours: number) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(hours) || hours < 1 || hours > 744) return null;
  return Math.round(amount / hours * 100) / 100;
}
