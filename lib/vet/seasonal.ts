import { DRAFT, type Review } from './review';

// The seasonal risk calendar: what to watch for at this time of year. No AI and no cost per use.
// ALL WORDING IS A DRAFT until a veterinarian approves each season (see review.ts). The seasons are the
// usual pattern for most of Kenya; the coast, the north and some highland areas differ, which the screen says.

export type SeasonId = 'short_dry' | 'long_rains' | 'long_dry' | 'short_rains';

export interface Risk {
  title: string;
  why: string;
  prevention: string[];
}

export interface Season {
  id: SeasonId;
  name: string;
  /** Months it usually covers, 1 to 12. */
  months: number[];
  summary: string;
  risks: Risk[];
  review: Review;
}

const WET_WEATHER_RISKS: Risk[] = [
  {
    title: 'Tick-borne diseases (such as East Coast fever)',
    why: 'Ticks multiply in wet weather and spread disease that can kill an untreated cow.',
    prevention: ['Dip or spray as your vet advises.', 'Check ears, tail and udder for ticks every few days.', 'Call a vet the same day for a cow with fever and swollen lumps in front of the shoulder.'],
  },
  {
    title: 'Mastitis from mud and wet bedding',
    why: 'Dirty, wet lying areas let germs reach the udder.',
    prevention: ['Keep lying areas dry and clean.', 'Wash and dry teats before milking and dip them afterwards.', 'Check for hot, hard or painful quarters at every milking.'],
  },
  {
    title: 'Foot rot and other hoof problems',
    why: 'Constant mud softens hooves and lets infection in.',
    prevention: ['Give cows a dry place to stand.', 'Check for limping and look between the hooves.', 'Ask your vet about hoof trimming.'],
  },
  {
    title: 'Bloat on lush young grass or legumes',
    why: 'Hungry cows turned onto wet, lush pasture can swell up with gas.',
    prevention: ['Give some dry hay before turning cows out.', 'Avoid putting hungry cows on wet, lush pasture or legumes.', 'Know the signs: a tight swollen left side means call a vet now.'],
  },
  {
    title: 'Lumpy skin disease (spread by biting insects)',
    why: 'Biting flies and mosquitoes spread it more after rains.',
    prevention: ['Ask your vet about vaccination before the rains.', 'Report firm lumps on the skin.'],
  },
  {
    title: 'Calf diarrhoea and pneumonia in cold, wet weather',
    why: 'Wet, cold and dirty conditions are hard on young calves.',
    prevention: ['Give calves a dry, sheltered place with clean bedding.', 'Make sure each calf gets colostrum in the first hours of life.', 'Clean feeding buckets and equipment every day.'],
  },
];

export const SEASONS: Season[] = [
  {
    id: 'short_dry', name: 'Short dry season', months: [1, 2],
    summary: 'Pasture dries out and milk can fall quickly.',
    risks: [
      { title: 'Feed and water shortage', why: 'Poor feed and not enough water cut milk and weaken cows, and weak cows get sick more easily.', prevention: ['Store hay or silage before you need it.', 'Check every cow can reach clean water at least twice a day.', 'Ask your vet whether your cows need mineral supplements.'] },
      { title: 'Heat and dust', why: 'Hot days stress cows and reduce eating and milk.', prevention: ['Give shade and water.', 'Milk and feed in the cooler hours of the day.'] },
    ],
    review: DRAFT,
  },
  { id: 'long_rains', name: 'Long rains', months: [3, 4, 5], summary: 'Wet weather brings ticks, mud and fast-spreading disease.', risks: WET_WEATHER_RISKS, review: DRAFT },
  {
    id: 'long_dry', name: 'Cool dry season', months: [6, 7, 8, 9],
    summary: 'Feed is scarce, and nights are cold in the highlands.',
    risks: [
      { title: 'Poor feed and weight loss', why: 'Dry pasture has little goodness, so cows lose condition and milk.', prevention: ['Use stored hay and silage and share it out through the season.', 'Ask your vet about minerals and supplements.'] },
      { title: 'Cold nights: calf pneumonia', why: 'Cold, damp nights make calves cough and struggle to breathe.', prevention: ['Give calves a dry, draught-free shelter with dry bedding.'] },
      { title: 'Dirty or scarce water', why: 'Shrinking water sources get dirty and can spread disease.', prevention: ['Keep troughs clean.', 'Do not let cows drink from stagnant pools.'] },
    ],
    review: DRAFT,
  },
  {
    id: 'short_rains', name: 'Short rains', months: [10, 11, 12],
    summary: 'Wet-weather risks return, and heavy rains can bring mosquito-borne disease.',
    risks: [
      ...WET_WEATHER_RISKS,
      {
        title: 'Rift Valley fever after unusually heavy or long rains',
        why: 'Mosquitoes spread it after flooding. It causes abortions and sudden deaths in herds, and it is dangerous to people handling sick animals or their meat.',
        prevention: ['Ask your vet about vaccination and local alerts.', 'Wear gloves when handling aborted calves or afterbirth, and wash well.', 'Report abortions and sudden deaths to your vet and the veterinary office.'],
      },
    ],
    review: DRAFT,
  },
];

export const SEASON_NOTE =
  'This is the usual pattern for most of Kenya. The coast, the north and some highland areas have different seasons, so ask your local vet what applies to your area.';

export const ALWAYS_ASK_YOUR_VET =
  'Ask your vet to set up a vaccination and deworming calendar that fits your farm, for example for foot-and-mouth disease and lumpy skin disease.';

export function seasonForMonth(month: number): Season {
  const found = SEASONS.find((season) => season.months.includes(month));
  if (!found) throw new RangeError(`month must be 1 to 12, got ${month}`);
  return found;
}

/** The season for a YYYY-MM-DD date (use the farm's Nairobi date). */
export function seasonForDate(date: string): Season {
  const month = Number(date.slice(5, 7));
  return seasonForMonth(month);
}
