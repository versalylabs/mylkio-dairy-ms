// Outbreak reports in Community groups (step 2): the rules and shapes the server, the screens and the tests share.
// No browser or Next.js imports. The database enforces the limits (db/migrations/0013_outbreak_reports.sql); a test reads
// that file for the same numbers. Design: docs/community-groups-design.md.
//
// The signs come from the vet guide's own list (lib/vet/red-flags.ts), so the wording is consistent and sourced. That list
// and the emergency steps are DRAFT until a veterinarian approves them (lib/vet/review.ts), so reporting stays closed on
// live farms until then (see outbreakReportsOpen): health wording is never shown to farmers before it has been checked.

import { RED_FLAGS, SIGNS, screenRedFlags, type RedFlag, type Sign } from './vet/red-flags';
import { draftContentAllowed, visibleEntries } from './vet/review';

/** Mirrors the limits in 0013: change both together. */
export const REPORT_LIMITS = {
  maxSigns: 8,
  maxAnimals: 500,
  maxDays: 60,
  seenWithinDays: 14,
  perDay: 5,
  alertDays: 7,
  keepReportsDays: 90,
  keepAnswersDays: 30,
} as const;

export type VetSeen = 'yes' | 'called' | 'no';
export type AlertAnswer = 'also' | 'not_here';

export interface ReportInput { signs: string[]; animals: number; days: number; seenOn: string; vetSeen: VetSeen }

/** The count for one sign in one area of one group over the last 7 days. No farm is named. */
export interface AlertCluster {
  area: string; areaKey: string; county: string | null; sign: string; farms: number; latestAt: string;
  iReported: boolean; also: number; notHere: number; myAnswer: AlertAnswer | null;
}
export interface MyReport { id: string; createdAt: string; signs: string[]; animals: number }
export interface GroupAlerts { canAnswer: boolean; clusters: AlertCluster[]; mine: MyReport[] }
export interface HomeAlert { groupId: string; groupName: string; area: string; sign: string; farms: number; latestAt: string }

/** What the group's admin sees for follow-up: the only place a reporting farm is named. */
export interface ReporterRow {
  id: string; createdAt: string; area: string; farmName: string; personName: string; phone: string;
  signs: string[]; animals: number; days: number; seenOn: string; vetSeen: VetSeen;
}

export const SIGN_IDS: ReadonlySet<string> = new Set(SIGNS.map((s) => s.id));
export const signById = (id: string): Sign | undefined => SIGNS.find((s) => s.id === id);
export const signLabel = (id: string): string => signById(id)?.label ?? id;

/** The signs in the guide's own groups and order, for the tick list. */
export function signGroups(): { group: Sign['group']; signs: Sign[] }[] {
  const out: { group: Sign['group']; signs: Sign[] }[] = [];
  for (const sign of SIGNS) {
    const found = out.find((g) => g.group === sign.group);
    if (found) found.signs.push(sign); else out.push({ group: sign.group, signs: [sign] });
  }
  return out;
}

/**
 * Reporting is open only where the vet guide's red flags may be shown: approved by a veterinarian, or drafts allowed
 * (local work and previews). On live farms it stays closed until a vet signs off, because every report shows the guide's
 * emergency steps first. The server checks this too.
 */
export const outbreakReportsOpen = (includeDrafts: boolean = draftContentAllowed(), flags: readonly RedFlag[] = RED_FLAGS): boolean =>
  visibleEntries(flags, includeDrafts).length > 0;

/** The guide's red flags that a single sign sets off (emergencies first), only those a farmer may see. */
export function redFlagsForSign(sign: string, includeDrafts: boolean = draftContentAllowed()): RedFlag[] {
  return screenRedFlags([sign], visibleEntries(RED_FLAGS, includeDrafts));
}

/** Every red flag the signs of a report set off, and whether a notifiable one is among them. */
export function flagsForSigns(signs: readonly string[], includeDrafts: boolean = draftContentAllowed()) {
  const flags = screenRedFlags(signs, visibleEntries(RED_FLAGS, includeDrafts));
  return { flags, notifiable: flags.some((f) => f.notifiable), humanRisk: flags.some((f) => f.humanRisk) };
}

export const VET_SEEN_VALUES: readonly VetSeen[] = ['yes', 'called', 'no'];
