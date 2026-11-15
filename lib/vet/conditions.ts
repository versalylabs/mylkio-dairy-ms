import { DRAFT, type Review } from './review';
import type { Urgency } from './red-flags';

// The symptom checker's knowledge base: conditions common in Kenyan dairy herds. Each entry is written in
// the team's own words from the published sources it lists (checked 15 November 2026) and says only what
// those sources support. No drug names or doses. ALL ENTRIES ARE DRAFTS until a veterinarian approves
// them (review.ts): drafts are hidden on live farms.
//
// "Fits closely" and "Fits partly" describe how well the signs the farmer ticked match this description.
// They are not probabilities and not a diagnosis.

export interface Source {
  publisher: string;
  title: string;
  url: string;
  /** YYYY-MM-DD, when the team last read the page. */
  checkedOn: string;
}

export type AnimalKind = 'adult' | 'calf' | 'any';

export interface Condition {
  id: string;
  name: string;
  animal: AnimalKind;
  summary: string;
  /** Sign id to weight (3 = characteristic, 1 = supporting). */
  signs: Record<string, number>;
  /** At least one of these must be ticked for the entry to show at all. */
  keySigns: string[];
  /** Only for a cow that calved in the last two weeks. */
  requiresCalving?: boolean;
  /** Fits "closely" only within three days of calving; later it can only fit "partly". */
  closeOnlyWithinThreeDays?: boolean;
  urgency: Urgency;
  notifiable: boolean;
  humanRisk?: boolean;
  doNow: string[];
  doNot: string[];
  tellTheVet: string[];
  /** Other problems that can look the same, when the sources say so. */
  lookAlikes?: string;
  sources: Source[];
  review: Review;
}

const CHECKED = '2026-11-15';
const MERCK = 'Merck Veterinary Manual';
const merck = (title: string, url: string): Source => ({ publisher: MERCK, title, url, checkedOn: CHECKED });
const woah = (title: string, url: string): Source => ({ publisher: 'World Organisation for Animal Health (WOAH)', title, url, checkedOn: CHECKED });

export const CONDITIONS: Condition[] = [
  {
    id: 'mastitis', name: 'Mastitis (udder infection)', animal: 'adult',
    summary: 'An infection of the udder. The milk changes and the quarter is hot, hard and sore. In severe cases the whole cow becomes ill.',
    signs: { hot_hard_udder: 3, abnormal_milk: 3, milk_dropped: 1, high_fever_dull: 1, not_eating: 1 },
    keySigns: ['hot_hard_udder', 'abnormal_milk'],
    urgency: 'today', notifiable: false,
    doNow: ['Call a vet today. A cow that is sick as well as having a bad udder needs help quickly.', 'Keep this cow’s milk out of the milk you sell, and away from calves and people.'],
    doNot: ['Do not give antibiotics without vet advice. Treated milk needs a withdrawal period before it can be sold.'],
    tellTheVet: ['Which quarter, and how long the milk has looked different', 'Whether she has a fever or has stopped eating', 'Any recent calving or treatment'],
    sources: [merck('Mastitis in Cattle', 'https://www.merckvetmanual.com/reproductive-system/mastitis-in-large-animals/mastitis-in-cattle')],
    review: DRAFT,
  },
  {
    id: 'ecf', name: 'East Coast fever (tick-borne)', animal: 'any',
    summary: 'A tick-borne disease that causes fever, swollen lumps in front of the shoulder and trouble breathing. It can kill an untreated animal.',
    signs: { swollen_nodes: 3, high_fever_dull: 2, ticks_many: 2, laboured_breathing: 1, not_eating: 1, milk_dropped: 1 },
    keySigns: ['swollen_nodes', 'ticks_many'],
    urgency: 'today', notifiable: false,
    doNow: ['Call a vet today. Treatment works best early.', 'Check her ears, tail and udder for ticks and tell the vet what you find.', 'Keep her calm, in the shade, with clean water.'],
    doNot: ['Do not wait several days to see if she improves.'],
    tellTheVet: ['Her temperature, if you can take it', 'How many ticks, and where', 'Whether you dip or spray, and when you last did', 'Whether other cattle are sick'],
    sources: [
      merck('Theileriosis in Animals', 'https://www.merckvetmanual.com/circulatory-system/blood-parasites/theileriosis-in-animals'),
      woah('Theileriosis (technical factsheet)', 'https://www.woah.org/app/uploads/2021/03/theileriosis.pdf'),
    ],
    review: DRAFT,
  },
  {
    id: 'fmd', name: 'Foot-and-mouth disease', animal: 'any',
    summary: 'A very contagious virus disease: fever, blisters in the mouth and between the hooves, heavy drooling, lameness and a sharp fall in milk.',
    signs: { blisters_mouth: 3, blisters_feet: 3, high_fever_dull: 1, milk_dropped: 1, lameness: 1 },
    keySigns: ['blisters_mouth', 'blisters_feet'],
    urgency: 'emergency', notifiable: true,
    doNow: ['Separate this animal from the rest of the herd.', 'Call your vet and the sub-county veterinary officer now.', 'Wash and disinfect boots, hands and equipment, and change your clothes before going near other animals.', 'Keep milk from sick animals out of the milk you sell until a vet says what to do.'],
    doNot: ['Do not move animals on or off the farm.', 'Do not visit other farms or share equipment.'],
    tellTheVet: ['When the signs started and how many animals are affected', 'Whether animals recently came onto the farm, or you visited a market'],
    lookAlikes: 'Other blister diseases look the same, so only a laboratory test can confirm it.',
    sources: [
      merck('Foot-and-Mouth Disease in Animals', 'https://www.merckvetmanual.com/infectious-diseases/foot-and-mouth-disease/foot-and-mouth-disease-in-animals'),
      { publisher: 'UNEP LEAP', title: 'Animal Diseases Act, Cap 364 (Kenya)', url: 'https://leap.unep.org/en/countries/ke/national-legislation/animal-diseases-act-cap-364', checkedOn: CHECKED },
    ],
    review: DRAFT,
  },
  {
    id: 'lsd', name: 'Lumpy skin disease', animal: 'any',
    summary: 'A virus spread by biting insects: fever, firm round lumps on the skin, swollen glands and a fall in milk. It is not passed to people.',
    signs: { skin_nodules: 3, eye_nose_discharge: 2, high_fever_dull: 1, swollen_nodes: 1, milk_dropped: 1 },
    keySigns: ['skin_nodules'],
    urgency: 'today', notifiable: true,
    doNow: ['Separate the animal from the herd.', 'Call your vet and the sub-county veterinary officer today.', 'Keep biting flies off her where you can.'],
    doNot: ['Do not move animals on or off the farm until a vet has seen them.'],
    tellTheVet: ['When the lumps appeared and how many there are', 'Whether she had a fever, or eye and nose discharge first', 'Whether other cattle have lumps'],
    lookAlikes: 'A milder disease called pseudo-lumpy skin disease can look like the early stage. Only a vet can tell them apart.',
    sources: [
      woah('Lumpy skin disease', 'https://www.woah.org/en/disease/lumpy-skin-disease/'),
      merck('Lumpy Skin Disease in Cattle', 'https://www.merckvetmanual.com/integumentary-system/pox-diseases/lumpy-skin-disease-in-cattle'),
    ],
    review: DRAFT,
  },
  {
    id: 'milk_fever', name: 'Milk fever (low blood calcium after calving)', animal: 'adult',
    summary: 'Most often seen in the first days after calving, when a cow loses calcium into her milk faster than her body can replace it. She becomes weak and may go down.',
    signs: { down_cannot_rise: 3, not_eating: 1, convulsions: 1 },
    keySigns: ['down_cannot_rise'],
    requiresCalving: true, closeOnlyWithinThreeDays: true,
    urgency: 'emergency', notifiable: false,
    doNow: ['Call a vet immediately. A cow that stays down can damage her muscles and nerves, so quick treatment matters.', 'Tell the vet how many days ago she calved.', 'Give her soft, dry ground and shade.'],
    doNot: ['Do not force food or water into her mouth.', 'Do not drag her.'],
    tellTheVet: ['The date she calved, and whether the calving was hard', 'How long she has been down'],
    lookAlikes: 'A hard calving, an injury from slipping, or another illness can also make a newly calved cow go down. A vet must decide which it is.',
    sources: [
      merck('Parturient Paresis in Cows', 'https://www.merckvetmanual.com/metabolic-disorders/parturient-paresis-in-ruminants/parturient-paresis-in-cows'),
      merck('Bovine Secondary Recumbency', 'https://www.merckvetmanual.com/musculoskeletal-system/bovine-secondary-recumbency/bovine-secondary-recumbency'),
    ],
    review: DRAFT,
  },
  {
    id: 'bloat', name: 'Bloat', animal: 'any',
    summary: 'Gas or froth trapped in the stomach swells the left side. Bad bloat can make an animal suffocate, and it is an emergency when she is in distress.',
    signs: { swollen_left_flank: 3, laboured_breathing: 1, not_eating: 1, stopped_chewing_cud: 1 },
    keySigns: ['swollen_left_flank'],
    urgency: 'emergency', notifiable: false,
    doNow: ['Call a vet immediately. Relieving the gas needs a vet, who will use a tube or a trocar.', 'Take her off wet, lush pasture, legumes and grain.'],
    doNot: ['Do not push a tube or a sharp object into her side yourself.', 'Do not drench her with oil, milk or herbal mixtures unless a vet tells you to. A bloated cow can choke on liquid.'],
    tellTheVet: ['What she ate and drank in the last few hours', 'When the swelling started'],
    lookAlikes: 'Something stuck in the throat can also cause bloat. A vet can tell the difference.',
    sources: [merck('Bloat in Ruminants', 'https://www.merckvetmanual.com/digestive-system/diseases-of-the-ruminant-forestomach/bloat-in-ruminants')],
    review: DRAFT,
  },
  {
    id: 'foot_rot', name: 'Foot rot (hoof infection)', animal: 'any',
    summary: 'An infection of the foot that causes sudden limping, and swelling of the leg just above the hoof.',
    signs: { lameness: 3, swelling_above_hoof: 3, high_fever_dull: 1 },
    keySigns: ['lameness', 'swelling_above_hoof'],
    urgency: 'soon', notifiable: false,
    doNow: ['Call a vet in the next day or two, and sooner if she will not put the foot down or has a fever.', 'Keep her on clean, dry ground.'],
    doNot: ['Do not leave it untreated. A deep infection of the foot can follow.'],
    tellTheVet: ['Which leg, and how long she has been limping', 'Whether others in the herd are limping', 'Whether there are blisters between the hooves or in the mouth'],
    lookAlikes: 'Foot-and-mouth disease also causes limping, with blisters. If you see blisters, treat it as an emergency.',
    sources: [merck('Lameness Originating in the Hoof in Cattle', 'https://www.merckvetmanual.com/musculoskeletal-system/lameness-in-cattle/lameness-originating-in-the-hoof-in-cattle')],
    review: DRAFT,
  },
  {
    id: 'calf_scours', name: 'Calf scours (diarrhoea in young calves)', animal: 'calf',
    summary: 'Diarrhoea is the most important cause of death in calves under a month old. A calf can lose a dangerous amount of fluid very quickly.',
    signs: { calf_diarrhoea: 3, calf_weak: 3, not_eating: 1, bloody_diarrhoea: 1 },
    keySigns: ['calf_diarrhoea'],
    urgency: 'today', notifiable: false,
    doNow: ['Call a vet today. If she is weak, will not suck or cannot stand, call now.', 'Keep clean water in front of her.', 'Keep her apart from other calves and wash your hands after handling her.'],
    doNot: ['Do not wait to see if she gets better on her own.'],
    tellTheVet: ['Her age in days, and how long she has had diarrhoea', 'The colour of the dung, and whether there is blood', 'Whether she is still sucking, and whether other calves are affected'],
    sources: [merck('Diarrhea in Neonatal Ruminants', 'https://www.merckvetmanual.com/digestive-system/intestinal-diseases-in-ruminants/diarrhea-in-neonatal-ruminants')],
    review: DRAFT,
  },
  {
    id: 'pneumonia', name: 'Pneumonia (lung infection)', animal: 'any',
    summary: 'An infection of the lungs, often after a virus. The animal coughs, has a nose or eye discharge and breathes fast and shallow, and becomes listless as it gets worse.',
    signs: { cough: 2, eye_nose_discharge: 2, laboured_breathing: 2, high_fever_dull: 1, not_eating: 1 },
    keySigns: ['cough', 'laboured_breathing', 'eye_nose_discharge'],
    urgency: 'today', notifiable: false,
    doNow: ['Call a vet today. Pneumonia gets worse quickly once bacteria join the infection.', 'Keep her in a clean, dry, airy shelter, out of cold wind and rain.'],
    doNot: ['Do not make her walk or run.'],
    tellTheVet: ['How long she has been coughing', 'Whether it is a calf or a cow, and whether others are coughing', 'Whether her breathing is fast or noisy'],
    lookAlikes: 'Eye and nose discharge with a fever can also be an early sign of lumpy skin disease.',
    sources: [merck('Bacterial Pneumonia in Cattle with Bovine Respiratory Disease Complex', 'https://www.merckvetmanual.com/respiratory-system/bovine-respiratory-disease-complex/bacterial-pneumonia-in-cattle-with-bovine-respiratory-disease-complex')],
    review: DRAFT,
  },
  {
    id: 'retained_afterbirth', name: 'Retained afterbirth or womb infection', animal: 'adult',
    summary: 'The afterbirth is normally passed within 24 hours of calving. If it stays in, or the discharge smells foul, infection can follow and make the cow ill.',
    signs: { afterbirth_retained: 3, foul_discharge: 3, high_fever_dull: 1, milk_dropped: 1, not_eating: 1 },
    keySigns: ['afterbirth_retained', 'foul_discharge'],
    requiresCalving: true,
    urgency: 'today', notifiable: false,
    doNow: ['Call a vet today. Many cows with a retained afterbirth look well at first, but infection can follow.', 'Note the time she calved and whether the afterbirth came away in one piece.'],
    doNot: ['Do not wait and hope: cows with a retained afterbirth are more likely to get womb infection, mastitis and other illness.'],
    tellTheVet: ['When she calved, and whether the calving was assisted', 'Her temperature, if you can take it', 'Whether she is eating and giving milk normally'],
    sources: [
      merck('Retained Fetal Membranes in Cows', 'https://www.merckvetmanual.com/reproductive-system/retained-fetal-membranes-in-large-animals-retained-placenta/retained-fetal-membranes-in-cows'),
      merck('Metritis in Production Animals', 'https://www.merckvetmanual.com/reproductive-system/uterine-diseases-in-production-animals/metritis-in-production-animals'),
    ],
    review: DRAFT,
  },
  {
    id: 'abortion', name: 'Abortion (can be an infection, including brucellosis)', animal: 'adult',
    summary: 'Late abortions can be caused by infections that spread to other cows, and to people, such as brucellosis. The infection can pass into the milk.',
    signs: { aborted: 3 },
    keySigns: ['aborted'],
    urgency: 'today', notifiable: false, humanRisk: true,
    doNow: ['Call a vet today and ask about testing.', 'Wear gloves if you must handle the aborted calf or afterbirth, and wash well afterwards.', 'Keep the aborted calf, the afterbirth and her milk away from people, dogs and other animals until a vet says what to do.'],
    doNot: ['Do not drink or share unboiled milk from this cow.'],
    tellTheVet: ['How far along the pregnancy was', 'Whether other cows have aborted', 'Whether she was vaccinated, and whether new animals joined the herd'],
    sources: [
      merck('Brucellosis in Cattle', 'https://www.merckvetmanual.com/reproductive-system/brucellosis-in-large-animals/brucellosis-in-cattle'),
      merck('Abortion in Cattle', 'https://www.merckvetmanual.com/reproductive-system/abortion-in-large-animals/abortion-in-cattle'),
      woah('Brucellosis (Terrestrial Manual, chapter 3.1.4)', 'https://www.woah.org/app/uploads/2021/03/3-01-04-brucellosis-1.pdf'),
    ],
    review: DRAFT,
  },
];

/** Sources behind the red flags and the seasonal calendar, which carry the same draft status. */
export const GENERAL_SOURCES: Source[] = [
  merck('Anthrax in Animals', 'https://www.merckvetmanual.com/generalized-conditions/anthrax/anthrax-in-animals'),
  { publisher: 'UNEP LEAP', title: 'Animal Diseases Act, Cap 364 (Kenya): lists anthrax, foot-and-mouth disease and lumpy skin disease as notifiable', url: 'https://leap.unep.org/en/countries/ke/national-legislation/animal-diseases-act-cap-364', checkedOn: CHECKED },
];
