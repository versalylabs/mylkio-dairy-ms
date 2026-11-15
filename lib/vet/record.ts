import type { Cow, HealthEvent } from '@/types';
import { addDays } from '../dates';
import { SIGNS, type Urgency } from './red-flags';
import { FIT_LABEL, URGENCY_PHRASE, type Assessment } from './checker';

// Turning a symptom check into an ordinary health record on the cow, so it shows in her history and sets a
// reminder to look again. It is recorded as a "health check", never as a diagnosis.

/** Days until the follow-up reminder: look again tomorrow for anything urgent, in two days for "soon", in three otherwise. */
export const FOLLOW_UP_DAYS: Record<Urgency | 'none', number> = { emergency: 1, today: 1, soon: 2, none: 3 };

export const followUpDate = (date: string, urgency: Urgency | null) => addDays(date, FOLLOW_UP_DAYS[urgency ?? 'none']);

const labelFor = (id: string) => SIGNS.find((sign) => sign.id === id)?.label ?? id;

export function healthEventFromCheck(args: {
  cow: Pick<Cow, 'id' | 'tag' | 'name'>;
  date: string;
  signs: readonly string[];
  assessment: Assessment;
}): Omit<HealthEvent, 'id' | 'createdAt' | 'farmId'> {
  const { cow, date, signs, assessment } = args;
  const known = signs.filter((id) => SIGNS.some((sign) => sign.id === id));
  const parts = [
    'Symptom check with the Mylkio guide (guidance only, not a diagnosis).',
    `Signs: ${known.map(labelFor).join('; ') || 'none ticked'}.`,
  ];
  if (assessment.urgency) parts.push(`Guide said: ${URGENCY_PHRASE[assessment.urgency]}.`);
  const fits = [...assessment.redFlags.map((f) => f.title), ...assessment.conditions.map((m) => `${m.condition.name} (${FIT_LABEL[m.fit].toLowerCase()})`)];
  if (fits.length) parts.push(`The signs fit: ${fits.join('; ')}.`);
  return {
    cowId: cow.id,
    cowTag: cow.tag,
    cowName: cow.name,
    date,
    type: 'routine_check',
    nextDueDate: followUpDate(date, assessment.urgency),
    notes: parts.join(' '),
  };
}
