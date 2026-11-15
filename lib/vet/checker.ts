import { SIGNS, URGENCY_ORDER, screenRedFlags, type RedFlag, type Urgency } from './red-flags';
import { CONDITIONS, type Condition } from './conditions';
import { DISCLAIMER_SHORT } from './disclaimer';

// The symptom checker. Plain code, no AI, no connection: it matches the signs a farmer ticked against the
// sourced descriptions in conditions.ts and the red flags in red-flags.ts. It never says what an animal
// "has". It says which descriptions the signs fit, how urgent that is, and what to do.

export type AnimalKind = 'adult' | 'calf';
export type Calved = 'no' | 'within_3_days' | 'within_2_weeks';

export interface CheckInput {
  signs: readonly string[];
  animal: AnimalKind;
  calved: Calved;
}

export type Fit = 'close' | 'partial';

export interface ConditionMatch {
  condition: Condition;
  fit: Fit;
  /** Ids of the ticked signs that count towards this entry. */
  matchedSigns: string[];
  /** 0 to 1: how much of the entry's description the ticked signs cover. */
  score: number;
}

export interface Assessment {
  redFlags: RedFlag[];
  conditions: ConditionMatch[];
  /** The most urgent level among everything shown, raised when many signs match nothing. */
  urgency: Urgency | null;
  /** Signs were ticked but nothing in the guide matches. This is NOT an all-clear. */
  noClearMatch: boolean;
}

export const FIT_LABEL: Record<Fit, string> = { close: 'Fits closely', partial: 'Fits partly' };
export const MAX_CONDITIONS_SHOWN = 3;
const CLOSE_AT = 0.5;
const PARTIAL_AT = 0.25;
/** With this many signs and no clear match, still advise seeing a vet soon. */
const MANY_SIGNS = 3;

const KNOWN_SIGNS = new Set(SIGNS.map((sign) => sign.id));

export function assess(
  input: CheckInput,
  options: { flags?: readonly RedFlag[]; conditions?: readonly Condition[] } = {},
): Assessment {
  const ticked = [...new Set(input.signs)].filter((id) => KNOWN_SIGNS.has(id));
  const tickedSet = new Set(ticked);
  const redFlags = screenRedFlags(ticked, options.flags);

  const matches: ConditionMatch[] = [];
  for (const condition of options.conditions ?? CONDITIONS) {
    if (condition.animal !== 'any' && condition.animal !== input.animal) continue;
    if (condition.requiresCalving && input.calved === 'no') continue;
    if (!condition.keySigns.some((sign) => tickedSet.has(sign))) continue;

    const total = Object.values(condition.signs).reduce((sum, weight) => sum + weight, 0);
    const matchedSigns = Object.keys(condition.signs).filter((sign) => tickedSet.has(sign));
    const score = matchedSigns.reduce((sum, sign) => sum + condition.signs[sign], 0) / total;
    if (score < PARTIAL_AT) continue;

    let fit: Fit = score >= CLOSE_AT ? 'close' : 'partial';
    if (condition.closeOnlyWithinThreeDays && input.calved !== 'within_3_days') fit = 'partial';
    matches.push({ condition, fit, matchedSigns, score });
  }

  matches.sort((a, b) => b.score - a.score || URGENCY_ORDER[a.condition.urgency] - URGENCY_ORDER[b.condition.urgency]);
  const conditions = matches.slice(0, MAX_CONDITIONS_SHOWN);

  let urgency: Urgency | null = null;
  const consider = (level: Urgency) => {
    if (urgency === null || URGENCY_ORDER[level] < URGENCY_ORDER[urgency]) urgency = level;
  };
  redFlags.forEach((flag) => consider(flag.urgency));
  conditions.forEach((match) => consider(match.condition.urgency));
  // When several signs match nothing the guide knows, err on the side of seeing a vet.
  if (urgency === null && ticked.length >= MANY_SIGNS) urgency = 'soon';

  return { redFlags, conditions, urgency, noClearMatch: ticked.length > 0 && redFlags.length === 0 && conditions.length === 0 };
}

const signLabel = (id: string) => SIGNS.find((sign) => sign.id === id)?.label ?? id;

export const URGENCY_PHRASE: Record<Urgency, string> = {
  emergency: 'EMERGENCY: call a vet now',
  today: 'See a vet today',
  soon: 'See a vet in the next day or two',
};

/**
 * A plain-text summary a farmer can send to a vet (for example on WhatsApp): who, what was seen, what the
 * guide suggested, and a reminder that it is not a diagnosis. Built here so it is tested like everything else.
 */
export function summaryText(args: {
  input: CheckInput;
  assessment: Assessment;
  farmName?: string;
  cowLabel?: string;
  date: string;
}): string {
  const { input, assessment, farmName, cowLabel, date } = args;
  const lines: string[] = ['Mylkio health check'];
  lines.push(`Date: ${date}`);
  if (farmName) lines.push(`Farm: ${farmName}`);
  lines.push(`Animal: ${cowLabel || (input.animal === 'calf' ? 'a calf' : 'a cow')}`);
  if (input.calved !== 'no') lines.push(`Calved: ${input.calved === 'within_3_days' ? 'in the last 3 days' : 'in the last 2 weeks'}`);
  lines.push('', 'Signs I can see:');
  input.signs.filter((id) => KNOWN_SIGNS.has(id)).forEach((id) => lines.push(`- ${signLabel(id)}`));
  if (assessment.urgency) lines.push('', `Guide says: ${URGENCY_PHRASE[assessment.urgency]}`);
  const named = [...assessment.redFlags.map((f) => f.title), ...assessment.conditions.map((m) => `${m.condition.name} (${FIT_LABEL[m.fit].toLowerCase()})`)];
  if (named.length) {
    lines.push('', 'The signs fit these descriptions (not a diagnosis):');
    named.forEach((name) => lines.push(`- ${name}`));
  }
  lines.push('', DISCLAIMER_SHORT);
  return lines.join('\n');
}
