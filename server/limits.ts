// L1 T11: limits held in memory, so a restart forgets them.
const MINUTE = 60_000;
const recent = new Map<string, number[]>();
const within = (key: string, ms: number) => (recent.get(key) ?? []).filter((t) => Date.now() - t < ms);

// Seconds until a call under key is allowed again: 0 when it is allowed now, and then it is counted.
export function rateLimited(key: string, perMinute: number) {
  const calls = within(key, MINUTE);
  if (calls.length >= perMinute) return Math.ceil((calls[0] + MINUTE - Date.now()) / 1000);
  recent.set(key, [...calls, Date.now()]);
  return 0;
}

// Five failed sign-ins for one email within fifteen minutes lock that email until the oldest of them is fifteen
// minutes old; the right password does not lift it, and unknown emails count the same as known ones.
const LOCK_MS = 15 * MINUTE;
const MAX_FAILURES = 5;
export function signInLocked(email: string) {
  const failures = within(`signin ${email.toLowerCase()}`, LOCK_MS);
  return failures.length >= MAX_FAILURES ? Math.ceil((failures[0] + LOCK_MS - Date.now()) / 1000) : 0;
}
export function signInFailed(email: string) {
  const key = `signin ${email.toLowerCase()}`;
  recent.set(key, [...within(key, LOCK_MS), Date.now()]);
}
export const signInSucceeded = (email: string) => recent.delete(`signin ${email.toLowerCase()}`);
