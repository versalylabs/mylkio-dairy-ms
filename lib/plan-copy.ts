// Words about what each plan includes, in English and Kiswahili: the plan descriptions on the website, the sign-up box
// and Settings, and the one calm line that shows where a feature the farm's plan does not include would appear.
// The features and which plan has them are in lib/plans.ts; this file only says them.

import type { Lang } from './app-copy';
import { FEATURES_COMING_SOON, PLANS, minimumPlanFor, type FeatureId, type PlanId } from './plans';
import { CONDITIONS } from './vet/conditions';
import { visibleEntries } from './vet/review';

/** True once a veterinarian has approved the symptom checker for live farms (see lib/vet/review.ts). */
export const symptomCheckerLive = () => visibleEntries(CONDITIONS).length > 0;

export const FEATURE_NAMES: Record<Lang, Record<FeatureId, string>> = {
  en: {
    illnessGuide: 'Emergency-signs guide', seasonalCalendar: 'Seasonal calendar', producedVsSold: 'Produced vs sold', reminderPush: 'Phone reminders',
    healthChecker: 'Symptom checker', costPerLitre: 'Cost per litre', milkDrop: 'Milk drop alerts and cow ranking', fertility: 'Fertility flags',
    reminderSms: 'SMS reminders', vetFinder: 'Vets near you', teamLogins: 'Team logins', weeklySummary: 'Weekly owner summary', farmReport: 'Farm report for a bank or SACCO', community: 'Community',
  },
  sw: {
    illnessGuide: 'Mwongozo wa dalili za dharura', seasonalCalendar: 'Kalenda ya misimu', producedVsSold: 'Yaliyozalishwa na yaliyouzwa', reminderPush: 'Vikumbusho kwenye simu',
    healthChecker: 'Kikagua dalili', costPerLitre: 'Gharama kwa lita', milkDrop: 'Tahadhari za maziwa kushuka na viwango vya ng’ombe', fertility: 'Tahadhari za uzazi',
    reminderSms: 'Vikumbusho vya SMS', vetFinder: 'Madaktari wa mifugo karibu nawe', teamLogins: 'Akaunti za timu', weeklySummary: 'Muhtasari wa kila wiki kwa mmiliki', farmReport: 'Ripoti ya shamba kwa benki au SACCO', community: 'Jamii',
  },
};

export const PLAN_TEXT = {
  en: {
    /** "Cost per litre is part of the Farmer plan" */
    locked: (feature: string, plan: string) => `${feature} is part of the ${plan} plan.`,
    seePlans: 'See plans in Settings',
    comingSoon: 'coming soon',
    afterVetReview: 'coming after vet review',
    includes: 'What your plan includes',
    core: 'Your farm records: herd, milk, sales, payments, finance, reminders, working offline and export',
    teamSize: 'Team logins (you and up to five managers and workers)',
    everythingIn: (plan: string) => `Everything in ${plan}`,
    custom: 'Team size and price agreed with you',
  },
  sw: {
    locked: (feature: string, plan: string) => `${feature} ni sehemu ya mpango wa ${plan}.`,
    seePlans: 'Tazama mipango kwenye Mipangilio',
    comingSoon: 'inakuja hivi karibuni',
    afterVetReview: 'itakuja baada ya daktari wa mifugo kuipitia',
    includes: 'Mpango wako unajumuisha nini',
    core: 'Rekodi za shamba lako: mifugo, maziwa, mauzo, malipo, fedha, vikumbusho, kufanya kazi bila intaneti na kupakua data',
    teamSize: 'Akaunti za timu (wewe na mameneja na wafanyakazi hadi watano)',
    everythingIn: (plan: string) => `Kila kitu kilicho kwenye ${plan}`,
    custom: 'Ukubwa wa timu na bei vimekubaliwa nawe',
  },
} as const;

/** The features each plan adds on top of the one before it. Starter adds the base set; Custom adds nothing to Farm Pro. */
const ADDED: Record<PlanId, FeatureId[]> = {
  starter: ['illnessGuide', 'seasonalCalendar', 'producedVsSold', 'reminderPush'],
  farmer: ['costPerLitre', 'milkDrop', 'fertility', 'reminderSms', 'healthChecker'],
  farm_pro: ['vetFinder', 'teamLogins', 'weeklySummary', 'farmReport', 'community'],
  custom: [],
};
const BELOW: Partial<Record<PlanId, PlanId>> = { farmer: 'starter', farm_pro: 'farmer', custom: 'farm_pro' };

/**
 * One feature as a plan description writes it. A feature whose screen is not built yet says so, and the symptom
 * checker says it is waiting for a vet, so a description never promises what the app cannot do today.
 */
export function featureLabel(feature: FeatureId, lang: Lang = 'en', checkerLive: boolean = symptomCheckerLive()): string {
  const t = PLAN_TEXT[lang];
  const name = feature === 'teamLogins' ? t.teamSize : FEATURE_NAMES[lang][feature];
  if (feature === 'healthChecker' && !checkerLive) return `${name} (${t.afterVetReview})`;
  if (FEATURES_COMING_SOON.has(feature)) return `${name} (${t.comingSoon})`;
  return name;
}

/** The lines a plan card lists: what it adds, led by "Everything in <the plan below>" (Starter leads with the core records). */
export function planFeatureLines(plan: PlanId, lang: Lang = 'en', checkerLive: boolean = symptomCheckerLive()): string[] {
  const t = PLAN_TEXT[lang];
  const below = BELOW[plan];
  const lead = below ? t.everythingIn(PLANS[below].name) : t.core;
  const lines = [lead, ...ADDED[plan].map((feature) => featureLabel(feature, lang, checkerLive))];
  if (plan === 'custom') lines.push(t.custom);
  return lines;
}

/** The calm line shown where a feature the farm's plan lacks would be: "Cost per litre is part of the Farmer plan." */
export function lockedLine(feature: FeatureId, lang: Lang = 'en'): string {
  return PLAN_TEXT[lang].locked(FEATURE_NAMES[lang][feature], PLANS[minimumPlanFor(feature)].name);
}
