// "Dismiss" and "Snooze" for alerts that are worked out from the records (such as a cow's milk drop), as opposed to
// reminders, which are stored records the farmer ticks off. Kept on the phone, per farm: it is a convenience for the
// person looking at the screen, not a farm record, so it is never synced or sent anywhere.
//
//   * Dismiss hides the alert until the cow has recovered. When she is no longer in the open alerts the entry is
//     removed (see prune), so a later, new drop raises a fresh alert.
//   * Snooze hides it for SNOOZE_DAYS days, then it shows again if she is still down.

import { addDays } from './dates';

export const SNOOZE_DAYS = 3;

export type Dismissal = { mode: 'dismissed' } | { mode: 'snoozed'; until: string };
export type Dismissals = Record<string, Dismissal>;

const keyFor = (farmId: string) => `mylkio_alert_hide_${farmId}`;

export function loadDismissals(farmId: string): Dismissals {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(keyFor(farmId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Dismissals) : {};
  } catch {
    return {};
  }
}

function save(farmId: string, value: Dismissals) {
  try { window.localStorage.setItem(keyFor(farmId), JSON.stringify(value)); } catch { /* the choice just is not remembered */ }
}

/** Pure: is this alert hidden today? */
export function isHidden(entry: Dismissal | undefined, today: string): boolean {
  if (!entry) return false;
  return entry.mode === 'dismissed' || entry.until > today;
}

export function dismissAlert(farmId: string, id: string): Dismissals {
  const next = { ...loadDismissals(farmId), [id]: { mode: 'dismissed' } as Dismissal };
  save(farmId, next);
  return next;
}

export function snoozeAlert(farmId: string, id: string, today: string): Dismissals {
  const next = { ...loadDismissals(farmId), [id]: { mode: 'snoozed', until: addDays(today, SNOOZE_DAYS) } as Dismissal };
  save(farmId, next);
  return next;
}

/** Forget choices about alerts that are no longer open, so the next drop of that cow is shown. */
export function prune(farmId: string, openIds: readonly string[]): Dismissals {
  const current = loadDismissals(farmId);
  const keep = Object.fromEntries(Object.entries(current).filter(([id]) => openIds.includes(id)));
  if (Object.keys(keep).length !== Object.keys(current).length) save(farmId, keep);
  return keep;
}
