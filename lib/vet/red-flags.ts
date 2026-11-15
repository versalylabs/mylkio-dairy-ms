import { DRAFT, type Review } from './review';

// The red-flag screen: a farmer ticks the signs they can see and gets plain guidance, in plain code with
// no AI and no connection needed (so an emergency never waits for signal).
//
// ALL WORDING HERE IS A DRAFT until a veterinarian approves each entry (see review.ts). It is first aid
// and "who to call", never a diagnosis, and it never names a drug or a dose.

export const CALL_A_VET_NOW = 'If you are worried about an animal, call a vet now. Do not wait for more signs.';

export const REPORTING_NOTE =
  'Report suspected notifiable diseases to your sub-county veterinary officer or the county veterinary office (County Director of Veterinary Services). A vet can help you do this. Direct phone numbers for pilot counties are to be added.';

/** emergency: act now. today: see a vet today. soon: see a vet in the next day or two. */
export type Urgency = 'emergency' | 'today' | 'soon';

export interface Sign {
  id: string;
  label: string;
  group:
    | 'General' | 'Head' | 'Mouth and feet' | 'Legs and hooves' | 'Skin' | 'Belly and breathing'
    | 'Udder and milk' | 'Calving' | 'Calves' | 'Behaviour and nerves';
}

export const SIGNS: Sign[] = [
  { id: 'down_cannot_rise', label: 'Cow is down and cannot get up', group: 'General' },
  { id: 'sudden_death', label: 'Cattle on the farm died suddenly, with no clear cause', group: 'General' },
  { id: 'high_fever_dull', label: 'Very dull and weak, hot to touch or a high temperature', group: 'General' },
  { id: 'not_eating', label: 'Has not eaten for a day or more', group: 'General' },
  { id: 'milk_dropped', label: 'Milk has dropped sharply', group: 'General' },

  { id: 'blisters_mouth', label: 'Blisters or sores in the mouth or on the tongue, with a lot of drooling', group: 'Mouth and feet' },
  { id: 'blisters_feet', label: 'Blisters or sores between the hooves, with sudden lameness', group: 'Mouth and feet' },

  { id: 'skin_nodules', label: 'Firm, round lumps on the skin over the body', group: 'Skin' },
  { id: 'swollen_nodes', label: 'Swollen lumps under the skin in front of the shoulder', group: 'Skin' },

  { id: 'swollen_left_flank', label: 'Tight, swollen belly on the left side', group: 'Belly and breathing' },
  { id: 'laboured_breathing', label: 'Struggling to breathe, mouth open, or very fast breathing', group: 'Belly and breathing' },
  { id: 'bloody_diarrhoea', label: 'Severe diarrhoea, or diarrhoea with blood', group: 'Belly and breathing' },

  { id: 'hot_hard_udder', label: 'Udder is hot, hard and swollen', group: 'Udder and milk' },

  { id: 'straining_no_calf', label: 'Straining to calve for over an hour with no calf', group: 'Calving' },
  { id: 'heavy_bleeding', label: 'Heavy bleeding that does not stop', group: 'Calving' },
  { id: 'womb_out', label: 'Womb hanging out after calving', group: 'Calving' },

  { id: 'convulsions', label: 'Staggering, collapsing or fits', group: 'Behaviour and nerves' },
  { id: 'aggressive_drooling', label: 'Unusually aggressive or frightened, drooling heavily, cannot swallow', group: 'Behaviour and nerves' },

  // Signs used by the symptom checker (lib/vet/conditions.ts) as well as the red flags above.
  { id: 'stopped_chewing_cud', label: 'Has stopped chewing the cud', group: 'General' },
  { id: 'eye_nose_discharge', label: 'Discharge from the eyes or nose', group: 'Head' },
  { id: 'cough', label: 'Coughing', group: 'Belly and breathing' },
  { id: 'lameness', label: 'Limping, or does not want to put weight on a leg', group: 'Legs and hooves' },
  { id: 'swelling_above_hoof', label: 'Swelling of the lower leg just above the hoof', group: 'Legs and hooves' },
  { id: 'ticks_many', label: 'Many ticks on the animal', group: 'Skin' },
  { id: 'abnormal_milk', label: 'Milk is watery, or has clots, flakes or blood', group: 'Udder and milk' },
  { id: 'afterbirth_retained', label: 'Afterbirth not passed 24 hours after calving', group: 'Calving' },
  { id: 'foul_discharge', label: 'Foul-smelling discharge from the vagina', group: 'Calving' },
  { id: 'aborted', label: 'Aborted, or the calf was born dead or very weak', group: 'Calving' },
  { id: 'calf_diarrhoea', label: 'Calf has watery diarrhoea', group: 'Calves' },
  { id: 'calf_weak', label: 'Calf is weak, will not suck, or has sunken eyes', group: 'Calves' },
];

export interface RedFlag {
  id: string;
  title: string;
  urgency: Urgency;
  /**
   * When this applies. The outer list is "any of"; each inner list is "all of": for example
   * [['a'], ['b', 'c']] means "a, or both b and c".
   */
  triggers: string[][];
  why: string;
  doNow: string[];
  doNot: string[];
  /** Must be reported to the veterinary authorities. */
  notifiable: boolean;
  /** A risk to people as well as animals. */
  humanRisk?: boolean;
  review: Review;
}

export const RED_FLAGS: RedFlag[] = [
  {
    id: 'bloat', title: 'Possible bloat', urgency: 'emergency', triggers: [['swollen_left_flank']],
    why: 'A tight swollen left side can mean gas is trapped in the stomach. It can kill within hours.',
    doNow: ['Call a vet immediately. Relieving the gas needs a vet, who will use a tube or a trocar.', 'Take her off wet, lush pasture, legumes and grain.'],
    doNot: ['Do not push a tube or a sharp object into her side yourself.', 'Do not drench her with oil, milk or herbal mixtures unless a vet tells you to. A bloated cow can choke on liquid.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'down_cow', title: 'Cow down and cannot rise', urgency: 'emergency', triggers: [['down_cannot_rise']],
    why: 'A cow that cannot stand needs a vet quickly. This is common soon after calving, but there are other causes.',
    doNow: ['Call a vet immediately and say if she calved in the last few days.', 'Keep her on soft, dry ground in the shade, propped upright on her chest if you can do it safely.', 'Keep other animals and dogs away.'],
    doNot: ['Do not force food or water into her mouth.', 'Do not drag her.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'fmd', title: 'Possible foot-and-mouth disease', urgency: 'emergency', triggers: [['blisters_mouth'], ['blisters_feet']],
    why: 'Blisters in the mouth or between the hooves can be foot-and-mouth disease. It spreads very fast between farms and must be reported.',
    doNow: ['Separate this animal from the rest of the herd.', 'Call your vet and the sub-county veterinary officer now.', 'Wash and disinfect boots, hands and equipment after handling her.', 'Keep milk from sick animals out of the milk you sell until a vet says what to do.'],
    doNot: ['Do not move animals on or off the farm.', 'Do not visit other farms or share equipment.'],
    notifiable: true, review: DRAFT,
  },
  {
    id: 'lsd', title: 'Possible lumpy skin disease', urgency: 'today', triggers: [['skin_nodules']],
    why: 'Firm round lumps on the skin can be lumpy skin disease, which spreads between cattle and must be reported.',
    doNow: ['Separate the animal from the herd.', 'Call your vet and the sub-county veterinary officer today.', 'Keep biting flies off her where you can.'],
    doNot: ['Do not move animals on or off the farm until a vet has seen them.'],
    notifiable: true, review: DRAFT,
  },
  {
    id: 'sudden_death', title: 'Sudden death in the herd', urgency: 'emergency', triggers: [['sudden_death']],
    why: 'Cattle dying suddenly can be anthrax or another serious disease. Anthrax can infect people.',
    doNow: ['Call your vet and the sub-county veterinary officer immediately.', 'Keep people, children, dogs and other animals away from the body and any blood.', 'Wash well if you touched it, and tell your vet that you did.'],
    doNot: ['Do not open, skin or cut up the carcass.', 'Do not eat the meat or sell it.', 'Do not drag the body: wait for the vet to say how to dispose of it.'],
    notifiable: true, humanRisk: true, review: DRAFT,
  },
  {
    id: 'rabies', title: 'Possible rabies', urgency: 'emergency', triggers: [['aggressive_drooling']],
    why: 'An animal that is unusually aggressive or frightened, drools and cannot swallow can have rabies. Rabies kills people as well as animals.',
    doNow: ['Keep people and children away from her.', 'Call your vet and the local health office immediately.', 'If anyone was bitten or got saliva in a cut or the eyes or mouth, go to a health facility urgently.'],
    doNot: ['Do not put your hands in her mouth.', 'Do not touch her saliva without gloves.'],
    notifiable: true, humanRisk: true, review: DRAFT,
  },
  {
    id: 'dystocia', title: 'Calving is stuck', urgency: 'emergency', triggers: [['straining_no_calf']],
    why: 'Straining for more than an hour with no calf can mean the calf is stuck. Both cow and calf can die.',
    doNow: ['Call a vet immediately.', 'Keep the cow calm and quiet on clean bedding.'],
    doNot: ['Do not pull hard with ropes or a vehicle.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'heavy_bleeding', title: 'Heavy bleeding', urgency: 'emergency', triggers: [['heavy_bleeding']],
    why: 'Bleeding that does not stop can quickly be fatal.',
    doNow: ['Call a vet immediately.', 'If the bleeding is somewhere you can reach, press firmly on it with a clean cloth.'],
    doNot: ['Do not remove cloths that are soaked through: add more on top.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'prolapse', title: 'Womb hanging out', urgency: 'emergency', triggers: [['womb_out']],
    why: 'A womb hanging out after calving is an emergency and can lead to shock and death.',
    doNow: ['Call a vet immediately.', 'Keep the womb clean and moist by covering it with a clean, damp cloth.', 'Keep dogs and other animals away.'],
    doNot: ['Do not try to push it back unless a vet tells you how.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'breathing', title: 'Struggling to breathe', urgency: 'emergency', triggers: [['laboured_breathing']],
    why: 'Difficulty breathing can come from several serious causes.',
    doNow: ['Call a vet immediately.', 'Keep her calm, cool and in the shade.'],
    doNot: ['Do not make her walk or run.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'fits', title: 'Fits or collapse', urgency: 'emergency', triggers: [['convulsions']],
    why: 'Staggering, collapse or fits can come from several serious causes.',
    doNow: ['Call a vet immediately.', 'Move other animals and people away and keep her away from water, steep edges and fences.'],
    doNot: ['Do not put your hands near her mouth.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'toxic_mastitis', title: 'Severe udder infection', urgency: 'today',
    triggers: [['hot_hard_udder', 'high_fever_dull'], ['hot_hard_udder', 'not_eating']],
    why: 'A hot, hard udder with a sick cow can be a severe infection that spreads through the body.',
    doNow: ['Call a vet today, within a few hours if you can.', 'Keep her milk out of the milk you sell and away from calves and people.'],
    doNot: ['Do not give antibiotics without vet advice. Treated milk needs a withdrawal period before it can be sold.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'fever_swollen_nodes', title: 'Fever with swollen lumps (possible tick-borne disease)', urgency: 'today',
    triggers: [['high_fever_dull', 'swollen_nodes']],
    why: 'A high fever with swollen lumps in front of the shoulder can be a tick-borne disease, which needs treatment early.',
    doNow: ['Call a vet today.', 'Check her ears, tail and udder for ticks.', 'Take her temperature if you can, and tell the vet.'],
    doNot: ['Do not wait several days to see if she improves.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'severe_diarrhoea', title: 'Severe or bloody diarrhoea', urgency: 'today', triggers: [['bloody_diarrhoea']],
    why: 'Severe diarrhoea dries the animal out quickly, and is most dangerous in calves.',
    doNow: ['Call a vet today. If it is a calf, call now.', 'Keep her apart from the herd and give her clean water.'],
    doNot: ['Do not mix her waste with feed or water used by other animals.'],
    notifiable: false, review: DRAFT,
  },
  {
    id: 'off_feed_milk_drop', title: 'Not eating and milk has dropped', urgency: 'today',
    triggers: [['not_eating', 'milk_dropped'], ['high_fever_dull', 'not_eating']],
    why: 'A cow that stops eating and gives much less milk is telling you something is wrong, even when the cause is not clear.',
    doNow: ['Call a vet today.', 'Note when it started, her temperature if you can, and whether other cows are the same.'],
    doNot: ['Do not wait for more signs to appear.'],
    notifiable: false, review: DRAFT,
  },
];

export interface RedFlagMatch {
  flag: RedFlag;
}

export const URGENCY_ORDER: Record<Urgency, number> = { emergency: 0, today: 1, soon: 2 };

/**
 * The red flags matching the signs the farmer ticked: emergencies first, and notifiable ones before the
 * rest within each urgency. Unknown sign ids are ignored. An empty or unmatched tick list returns nothing,
 * which the screen must NOT present as "all clear".
 */
export function screenRedFlags(selected: readonly string[], flags: readonly RedFlag[] = RED_FLAGS): RedFlag[] {
  const ticked = new Set(selected);
  return flags
    .filter((flag) => flag.triggers.some((group) => group.length > 0 && group.every((sign) => ticked.has(sign))))
    .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || Number(b.notifiable) - Number(a.notifiable));
}

/** The most urgent level among the matches, or null when nothing matched. */
export function overallUrgency(matches: readonly RedFlag[]): Urgency | null {
  if (matches.length === 0) return null;
  return matches.reduce<Urgency>((worst, m) => (URGENCY_ORDER[m.urgency] < URGENCY_ORDER[worst] ? m.urgency : worst), 'soon');
}
