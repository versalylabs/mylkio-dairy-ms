// Kiswahili for the screens added after the first translation pass: plan and billing notices, backup and storage,
// saving to the cloud, finding a vet, and sign-in. English is the original wording; each entry has both so a test can
// check nothing is missing. No browser or Next.js imports.
//
// The Kiswahili is plain and everyday on purpose (it is read on a phone in a milking shed). It has not been reviewed
// by a native speaker yet: see docs/kiswahili.md.

export type Lang = 'en' | 'sw';

const plural = (n: number, one: string, many: (n: number) => string) => (n === 1 ? one : many(n));

// ── Billing ─────────────────────────────────────────────────────────────────────────────────────────────────

export const BILLING_COPY = {
  en: {
    stateLabel: {
      complimentary: 'Platform account', trial: 'Free trial', trial_ending: 'Trial ending soon', trial_ended: 'Trial ended',
      paid: 'Paid', due_soon: 'Payment due soon', overdue: 'Payment overdue', cancelled: 'Cancelled',
    },
    pill: { trial: 'Free trial', trial_ended: 'Trial ended', overdue: 'Payment overdue', cancelled: 'Cancelled', plan: (name: string) => `${name} Plan` },
    describe: {
      complimentary: 'Platform account',
      cancelled: 'This plan was cancelled. Your records are still here and you can export them.',
      trialUnknown: 'Free trial',
      trial: (left: number, date: string) => `Free trial: ${left <= 0 ? 'ends today' : `${plural(left, '1 day', (n) => `${n} days`)} left`} (ends ${date})`,
      trialEnded: (date: string) => `Free trial ended on ${date}. Your records are safe and can be exported.`,
      paid: (date: string) => `Paid until ${date}`,
      overdue: (date: string) => `Payment was due on ${date}`,
    },
    notice: {
      trialEndsToday: 'Your free trial ends today',
      trialEnds: (left: number) => `Your free trial ends in ${plural(left, '1 day', (n) => `${n} days`)}`,
      trialEnded: 'Your free trial has ended',
      dueToday: 'Your plan is due today',
      due: (left: number) => `Your plan is due in ${plural(left, '1 day', (n) => `${n} days`)}`,
      overdue: 'Your payment is overdue',
      cancelled: 'Your plan was cancelled',
      paused: ' The symptom checker and vet finder are paused until payment; everything else keeps working.',
      safe: ' Your records stay safe either way.',
      message: 'Message Mylkio',
    },
    payMessage: (plan: string, farm: string) => `Hello Mylkio, I would like to pay for my ${plan} plan. Farm: ${farm}.`,
    settings: {
      title: 'Monthly Subscription', subtitle: 'Your current plan and renewal details', planWord: (name: string) => `${name} plan`,
      perMonth: '/month', billedMonthly: 'Billed monthly',
      cows: (n: number, name: string, limit: number) => `${n} ${n === 1 ? 'cow' : 'cows'} on your farm. The ${name} plan covers up to ${limit}.`,
      overLimit: ' You have more than that: message us to move to a bigger plan. Nothing stops you adding cows meanwhile.',
      howToPay: 'To pay, renew or change your plan, message Mylkio. Your records are always yours to export.',
    },
  },
  sw: {
    stateLabel: {
      complimentary: 'Akaunti ya jukwaa', trial: 'Majaribio bila malipo', trial_ending: 'Majaribio yanaisha karibuni', trial_ended: 'Majaribio yameisha',
      paid: 'Imelipwa', due_soon: 'Malipo yanakaribia', overdue: 'Malipo yamechelewa', cancelled: 'Imefutwa',
    },
    pill: { trial: 'Majaribio bila malipo', trial_ended: 'Majaribio yameisha', overdue: 'Malipo yamechelewa', cancelled: 'Imefutwa', plan: (name: string) => `Mpango wa ${name}` },
    describe: {
      complimentary: 'Akaunti ya jukwaa',
      cancelled: 'Mpango huu ulifutwa. Rekodi zako bado ziko hapa na unaweza kuzipakua.',
      trialUnknown: 'Majaribio bila malipo',
      trial: (left: number, date: string) => `Majaribio bila malipo: ${left <= 0 ? 'yanaisha leo' : `siku ${left} zimebaki`} (yanaisha ${date})`,
      trialEnded: (date: string) => `Majaribio bila malipo yaliisha tarehe ${date}. Rekodi zako ziko salama na unaweza kuzipakua.`,
      paid: (date: string) => `Umelipa hadi ${date}`,
      overdue: (date: string) => `Malipo yalikuwa yadaiwe tarehe ${date}`,
    },
    notice: {
      trialEndsToday: 'Majaribio yako bila malipo yanaisha leo',
      trialEnds: (left: number) => `Majaribio yako bila malipo yanaisha baada ya ${plural(left, 'siku 1', (n) => `siku ${n}`)}`,
      trialEnded: 'Majaribio yako bila malipo yameisha',
      dueToday: 'Mpango wako unadaiwa leo',
      due: (left: number) => `Mpango wako unadaiwa baada ya ${plural(left, 'siku 1', (n) => `siku ${n}`)}`,
      overdue: 'Malipo yako yamechelewa',
      cancelled: 'Mpango wako ulifutwa',
      paused: ' Kikagua dalili na kitafuta daktari wa mifugo vimesimamishwa hadi malipo; kila kitu kingine kinaendelea kufanya kazi.',
      safe: ' Rekodi zako ziko salama kwa vyovyote vile.',
      message: 'Tuandikie Mylkio',
    },
    payMessage: (plan: string, farm: string) => `Habari Mylkio, ningependa kulipia mpango wangu wa ${plan}. Shamba: ${farm}.`,
    settings: {
      title: 'Usajili wa Kila Mwezi', subtitle: 'Mpango wako wa sasa na tarehe ya kuongeza muda', planWord: (name: string) => `Mpango wa ${name}`,
      perMonth: '/mwezi', billedMonthly: 'Hutozwa kila mwezi',
      cows: (n: number, name: string, limit: number) => `Una ng’ombe ${n} shambani. Mpango wa ${name} unaruhusu hadi ${limit}.`,
      overLimit: ' Umezidi idadi hiyo: tuandikie ili uhamie mpango mkubwa zaidi. Hakuna kinachokuzuia kuongeza ng’ombe kwa sasa.',
      howToPay: 'Kulipa, kuongeza muda au kubadilisha mpango, tuandikie Mylkio. Rekodi zako ni zako daima na unaweza kuzipakua.',
    },
  },
} as const;

// ── Backup and storage ──────────────────────────────────────────────────────────────────────────────────────

export const STORAGE_COPY = {
  en: {
    title: 'Backup and storage',
    intro: 'Your farm is saved on this phone and in the cloud. A backup file is your own copy, kept outside Mylkio.',
    backup: 'Backup', download: 'Download backup',
    restoreHint: 'To restore a backup into this farm, use “Restore from a backup” below. Records that are already here are kept as they are.',
    onPhone: 'On this phone',
    using: (used: string, quota: string | null, low: boolean) => `Using ${used}${quota ? ` of about ${quota} available` : ''}${low ? '. Space is running low.' : '.'}`,
    sizeUnknown: 'Storage size is not reported by this browser.',
    protectedYes: 'Protected: the phone will not clear it to make room.',
    protectedNo: 'Not protected yet. Adding Mylkio to your home screen helps keep your records on this phone.',
    offlineTitle: 'Opens without internet',
    offlineReady: 'Ready. Mylkio is saved on this phone.',
    offlineNotYet: 'Not ready yet. Stay online for a minute after opening Mylkio, then check again.',
    offlineUnsupported: 'This browser cannot save Mylkio for offline use.',
    checking: 'Checking…',
    photos: 'Photos',
    photoCount: (n: number, bytes: string) => `${n} saved ${n === 1 ? 'photo' : 'photos'} using ${bytes}.`,
    photosLarge: (n: number) => ` ${n} ${n === 1 ? 'is' : 'are'} larger than needed.`,
    photosGood: ' All are a good size.',
    shrink: 'Shrink photos', shrinking: 'Shrinking…',
    nothingToShrink: 'Nothing needed shrinking.',
    shrunk: (n: number, bytes: string) => `Shrunk ${n} ${n === 1 ? 'photo' : 'photos'}, freeing about ${bytes}.`,
    shrinkFailed: 'Could not shrink the photos.',
  },
  sw: {
    title: 'Nakala rudufu na hifadhi',
    intro: 'Shamba lako limehifadhiwa kwenye simu hii na kwenye wingu. Faili ya nakala rudufu ni nakala yako mwenyewe, iliyo nje ya Mylkio.',
    backup: 'Nakala rudufu', download: 'Pakua nakala rudufu',
    restoreHint: 'Kurejesha nakala rudufu kwenye shamba hili, tumia “Rejesha kutoka nakala rudufu” hapa chini. Rekodi zilizopo tayari zinabaki kama zilivyo.',
    onPhone: 'Kwenye simu hii',
    using: (used: string, quota: string | null, low: boolean) => `Inatumia ${used}${quota ? ` kati ya takriban ${quota} zinazopatikana` : ''}${low ? '. Nafasi inaisha.' : '.'}`,
    sizeUnknown: 'Kivinjari hiki hakitoi ukubwa wa hifadhi.',
    protectedYes: 'Imelindwa: simu haitaifuta ili kupata nafasi.',
    protectedNo: 'Haijalindwa bado. Kuweka Mylkio kwenye skrini kuu ya simu husaidia kuweka rekodi zako kwenye simu hii.',
    offlineTitle: 'Inafunguka bila intaneti',
    offlineReady: 'Iko tayari. Mylkio imehifadhiwa kwenye simu hii.',
    offlineNotYet: 'Bado haiko tayari. Kaa mtandaoni kwa dakika moja baada ya kufungua Mylkio, kisha angalia tena.',
    offlineUnsupported: 'Kivinjari hiki hakiwezi kuhifadhi Mylkio kwa matumizi bila intaneti.',
    checking: 'Inaangalia…',
    photos: 'Picha',
    photoCount: (n: number, bytes: string) => `Picha ${n} zilizohifadhiwa zinatumia ${bytes}.`,
    photosLarge: (n: number) => ` ${n} ${n === 1 ? 'ni kubwa' : 'ni kubwa'} kuliko inavyohitajika.`,
    photosGood: ' Zote zina ukubwa mzuri.',
    shrink: 'Punguza ukubwa wa picha', shrinking: 'Inapunguza…',
    nothingToShrink: 'Hakuna kilichohitaji kupunguzwa.',
    shrunk: (n: number, bytes: string) => `Imepunguza picha ${n}, ikiokoa takriban ${bytes}.`,
    shrinkFailed: 'Imeshindwa kupunguza ukubwa wa picha.',
  },
} as const;

/** Backup reminder, from the facts that lib/backup.ts works out. */
export function backupMessage(lang: Lang, kind: 'never_many' | 'never_few' | 'old' | 'today' | 'recent', ago = 0): string {
  const days = lang === 'sw' ? `siku ${ago}` : plural(ago, '1 day', (n) => `${n} days`);
  if (lang === 'sw') {
    switch (kind) {
      case 'never_many': return 'Bado hujatengeneza nakala rudufu. Pakua moja sasa uihifadhi mahali salama, kama kujitumia kwenye WhatsApp au Google Drive.';
      case 'never_few': return 'Hakuna nakala rudufu bado. Ukisharekodi zaidi, pakua moja uihifadhi mahali salama.';
      case 'old': return `Nakala rudufu yako ya mwisho ilikuwa ${days} zilizopita. Pakua mpya.`;
      case 'today': return 'Umetengeneza nakala rudufu leo.';
      default: return `Nakala rudufu yako ya mwisho ilikuwa ${days} zilizopita.`;
    }
  }
  switch (kind) {
    case 'never_many': return 'You have not made a backup yet. Download one now and keep it somewhere safe, such as WhatsApp to yourself or Google Drive.';
    case 'never_few': return 'No backup yet. Once you have recorded more, download one and keep it somewhere safe.';
    case 'old': return `Your last backup was ${days} ago. Download a fresh one.`;
    case 'today': return 'You made a backup today.';
    default: return `Your last backup was ${days} ago.`;
  }
}

// ── Saving to the cloud ─────────────────────────────────────────────────────────────────────────────────────

export const SYNC_COPY = {
  en: {
    review: (n: number) => `${n} change${n > 1 ? 's need' : ' needs'} your review. Everything is still saved on this device.`,
    hide: 'Hide', reviewButton: 'Review',
    keepMine: 'Keep this device’s version', useCloud: 'Use the cloud version', discard: 'Discard this change',
    confirmUseCloud: 'Discard the change made on this device and use the cloud copy instead?',
    changedElsewhere: 'This was changed on another device before your change reached the cloud.',
    rejectedDefault: 'The cloud did not accept this change. Records of milk, deliveries and payments can only be voided, not edited.',
    pending: (n: number, running: boolean) => `${n} change${n === 1 ? '' : 's'} saved on this device. ${running ? 'Saving to cloud…' : 'Waiting to save to the cloud.'}`,
    retry: 'Retry',
    notYetInCloud: (n: number) => (n ? `${n} change${n === 1 ? '' : 's'} not yet in the cloud.` : 'Your cloud copy is up to date.'),
    kind: {
      farm: 'Farm profile', cows: 'Cow', buyers: 'Buyer', milk: 'Milk record', deliveries: 'Delivery', payments: 'Payment', health: 'Health record',
      breeding: 'Breeding record', expenses: 'Expense', reminders: 'Reminder', statements: 'Co-op statement', bills: 'Customer bill', allocations: 'Payment allocation',
    },
    did: { deleted: 'deleted', voided: 'voided', added: 'added', changed: 'changed' },
  },
  sw: {
    review: (n: number) => `Mabadiliko ${n} yanahitaji ukaguzi wako. Kila kitu bado kimehifadhiwa kwenye kifaa hiki.`,
    hide: 'Ficha', reviewButton: 'Kagua',
    keepMine: 'Weka toleo la kifaa hiki', useCloud: 'Tumia toleo la wingu', discard: 'Achana na badiliko hili',
    confirmUseCloud: 'Uachane na badiliko lililofanywa kwenye kifaa hiki na utumie nakala ya wingu badala yake?',
    changedElsewhere: 'Hili lilibadilishwa kwenye kifaa kingine kabla badiliko lako halijafika kwenye wingu.',
    rejectedDefault: 'Wingu halikukubali badiliko hili. Rekodi za maziwa, utoaji na malipo zinaweza kubatilishwa tu, si kuhaririwa.',
    pending: (n: number, running: boolean) => `Mabadiliko ${n} yamehifadhiwa kwenye kifaa hiki. ${running ? 'Inahifadhi kwenye wingu…' : 'Inasubiri kuhifadhi kwenye wingu.'}`,
    retry: 'Jaribu tena',
    notYetInCloud: (n: number) => (n ? `Mabadiliko ${n} bado hayako kwenye wingu.` : 'Nakala yako ya wingu iko sawa.'),
    kind: {
      farm: 'Wasifu wa shamba', cows: 'Ng’ombe', buyers: 'Mnunuzi', milk: 'Rekodi ya maziwa', deliveries: 'Utoaji', payments: 'Malipo', health: 'Rekodi ya afya',
      breeding: 'Rekodi ya uzazi', expenses: 'Gharama', reminders: 'Kikumbusho', statements: 'Taarifa ya ushirika', bills: 'Bili ya mteja', allocations: 'Ugawaji wa malipo',
    },
    did: { deleted: 'imefutwa', voided: 'imebatilishwa', added: 'imeongezwa', changed: 'imebadilishwa' },
  },
} as const;

// ── Messages produced deep in the storage and sync code ─────────────────────────────────────────────────────

const KNOWN_SW: Record<string, string> = {
  'This phone is out of storage space, so your latest changes could not be saved on it. Free up space on the phone, or make room by shrinking photos in Settings.':
    'Simu hii imejaa, kwa hiyo mabadiliko yako ya karibuni hayakuweza kuhifadhiwa humu. Futa vitu kwenye simu, au pata nafasi kwa kupunguza ukubwa wa picha kwenye Mipangilio.',
  'This phone could not save your latest changes. Your records are not lost, but keep the app open and try again, or make a backup in Settings.':
    'Simu hii haikuweza kuhifadhi mabadiliko yako ya karibuni. Rekodi zako hazijapotea, lakini acha programu wazi na ujaribu tena, au tengeneza nakala rudufu kwenye Mipangilio.',
  'Could not download farm changes.': 'Imeshindwa kupakua mabadiliko ya shamba.',
  'Cloud save failed. Changes remain on this device.': 'Kuhifadhi kwenye wingu kumeshindikana. Mabadiliko yamebaki kwenye kifaa hiki.',
  'Could not load your farm from the cloud. Please retry.': 'Imeshindwa kupakia shamba lako kutoka wingu. Tafadhali jaribu tena.',
  'Too many attempts. Please wait a few minutes and try again.': 'Majaribio mengi mno. Tafadhali subiri dakika chache kisha ujaribu tena.',
  'Sign-in failed. Check your email and password.': 'Kuingia kumeshindikana. Hakikisha barua pepe na nenosiri lako.',
  'Please fill in all required fields.': 'Tafadhali jaza sehemu zote zinazohitajika.',
  'Password must be at least 12 characters.': 'Nenosiri lazima liwe na angalau herufi 12.',
  'Account service unavailable. Please try again.': 'Huduma ya akaunti haipatikani. Tafadhali jaribu tena.',
  'An unexpected error occurred during login.': 'Hitilafu isiyotarajiwa imetokea wakati wa kuingia.',
  'An error occurred while creating your account.': 'Hitilafu imetokea wakati wa kutengeneza akaunti yako.',
  'Failed to create your farm account.': 'Imeshindwa kutengeneza akaunti ya shamba lako.',
  'Check your email to confirm your account, then sign in.': 'Angalia barua pepe yako kuthibitisha akaunti yako, kisha uingie.',
  'Please confirm your email address first, then sign in.': 'Tafadhali thibitisha anwani yako ya barua pepe kwanza, kisha uingie.',
  'Enter the invitation code you were given.': 'Weka nambari ya mwaliko uliyopewa.',
  'That invitation code is not valid. Check it, or ask Mylkio for one.': 'Nambari hiyo ya mwaliko si sahihi. Iangalie, au iombe kutoka Mylkio.',
  'Could not create the account. If you already have one, sign in instead.': 'Imeshindwa kutengeneza akaunti. Kama tayari unayo, ingia badala yake.',
  'Your farm could not be set up. Please try again.': 'Shamba lako halikuweza kuandaliwa. Tafadhali jaribu tena.',
};

/** A message from the system, in the person's language when we have it. Anything unknown stays as it was. */
export const translateMessage = (message: string, lang: Lang): string => (lang === 'sw' ? KNOWN_SW[message] ?? message : message);
export const KNOWN_MESSAGE_KEYS = Object.keys(KNOWN_SW);

// ── Finding a vet ───────────────────────────────────────────────────────────────────────────────────────────

export const VET_COPY = {
  en: {
    title: 'Finding a vet', intro: 'Keep your vet’s number where you can reach it in a hurry.',
    kvbRegisters: 'Kenya Veterinary Board registers', ringBoard: (phone: string) => `Ring the Board ${phone}`,
    kvbNote: 'Number from the Board’s own website, not yet confirmed by phone.',
    kvbRegistersNote: 'Before you pay anyone to treat an animal, check that they are on the Kenya Veterinary Board registers (veterinary surgeons, technologists and technicians).',
    kvbContactNote: 'The regulator of vets, not a treatment service. Ring it to check that a vet is registered, or to make a complaint. Email: info@kenyavetboard.or.ke.',
    call: 'Call', whatsapp: 'WhatsApp', sendCheck: 'Send my check',
    myVets: 'My vets', savedAccount: 'Saved on your account and on this phone, so the call buttons work without signal.', savedPhone: 'Saved on this phone only.',
    noneYet: 'You have not saved a vet yet. Add the vet or animal health worker you call, so the number is one tap away in an emergency.',
    remove: (name: string) => `Remove ${name}`,
    name: 'Name', kind: 'Kind', phone: 'Phone', noteOptional: 'Note (optional)', namePlaceholder: 'e.g. Dr Otieno', phonePlaceholder: 'e.g. 0712 345 678', notePlaceholder: 'e.g. Comes out at night',
    save: 'Save vet', cancel: 'Cancel', add: 'Add a vet',
    nameAndPhone: 'Enter a name and a phone number.', nameCountyPhone: 'Enter a name, a county and a phone number.',
    nearYou: (county?: string) => `Vets near you${county ? ` (${county})` : ''}`,
    farmProOnly: 'A list of confirmed vets and animal health workers in your county is part of the Farm Pro plan. You can still save your own vets above.',
    signInToSee: 'Sign in with your farm account to see vets near you.', loading: 'Loading…',
    noneListed: (county?: string) => `No vets are listed for ${county} yet. We only list a vet after we have rung the number and confirmed it. You can suggest one below.`,
    emergency: 'Emergency call-outs', covers: (areas: string) => `Covers: ${areas}`,
    confirmed: (date: string) => `Number confirmed by phone on ${date}`, kvbReg: (no: string) => `KVB registration: ${no} (check it on the registers)`,
    suggestTitle: 'Suggest a vet for the list', signInToSuggest: 'Sign in with your farm account to suggest a vet.',
    suggestIntro: 'Know a good vet or animal health worker? Tell us. We ring the number and confirm it before anyone else can see it.',
    county: 'County', areas: 'Areas covered (optional)', areasPlaceholder: 'e.g. Kabete, Dagoretti', hours: 'Hours (optional)', hoursPlaceholder: 'e.g. Daily 6am to 8pm',
    kvbNumber: 'KVB registration number (optional)', usesWhatsapp: 'Uses WhatsApp', comesEmergency: 'Comes out in emergencies', send: 'Send suggestion',
    thanks: 'Thank you. We will ring the number before this vet is listed.',
    savedOnPhone: 'Showing the vets saved on this phone. Could not refresh them from your account.',
    kinds: { veterinarian: 'Veterinarian', animal_health_assistant: 'Animal health assistant', co_op_vet: 'Co-op vet', agrovet: 'Agrovet', clinic: 'Clinic' },
  },
  sw: {
    title: 'Kutafuta daktari wa mifugo', intro: 'Weka nambari ya daktari wako mahali utakapoipata haraka.',
    kvbRegisters: 'Rejista za Bodi ya Madaktari wa Mifugo Kenya', ringBoard: (phone: string) => `Piga simu Bodi ${phone}`,
    kvbNote: 'Nambari kutoka tovuti ya Bodi yenyewe, bado haijathibitishwa kwa simu.',
    kvbRegistersNote: 'Kabla ya kumlipa mtu yeyote kutibu mnyama, hakikisha yuko kwenye rejista za Bodi ya Madaktari wa Mifugo Kenya (madaktari wa mifugo, mafundi sanifu na mafundi).',
    kvbContactNote: 'Ni msimamizi wa madaktari wa mifugo, si huduma ya matibabu. Mpigie kuhakikisha daktari amesajiliwa, au kutoa malalamiko. Barua pepe: info@kenyavetboard.or.ke.',
    call: 'Piga simu', whatsapp: 'WhatsApp', sendCheck: 'Tuma ukaguzi wangu',
    myVets: 'Madaktari wangu', savedAccount: 'Imehifadhiwa kwenye akaunti yako na kwenye simu hii, kwa hiyo vitufe vya kupiga simu vinafanya kazi bila mtandao.', savedPhone: 'Imehifadhiwa kwenye simu hii tu.',
    noneYet: 'Bado hujahifadhi daktari. Ongeza daktari au mhudumu wa afya ya mifugo unayempigia, ili nambari iwe mguso mmoja wakati wa dharura.',
    remove: (name: string) => `Ondoa ${name}`,
    name: 'Jina', kind: 'Aina', phone: 'Simu', noteOptional: 'Maelezo (si lazima)', namePlaceholder: 'mfano: Dkt Otieno', phonePlaceholder: 'mfano: 0712 345 678', notePlaceholder: 'mfano: Huja usiku',
    save: 'Hifadhi daktari', cancel: 'Ghairi', add: 'Ongeza daktari',
    nameAndPhone: 'Weka jina na nambari ya simu.', nameCountyPhone: 'Weka jina, kaunti na nambari ya simu.',
    nearYou: (county?: string) => `Madaktari karibu nawe${county ? ` (${county})` : ''}`,
    farmProOnly: 'Orodha ya madaktari na wahudumu wa afya ya mifugo waliothibitishwa kwenye kaunti yako ni sehemu ya mpango wa Farm Pro. Bado unaweza kuhifadhi madaktari wako mwenyewe hapo juu.',
    signInToSee: 'Ingia kwa akaunti ya shamba lako kuona madaktari karibu nawe.', loading: 'Inapakia…',
    noneListed: (county?: string) => `Hakuna madaktari walioorodheshwa kwa ${county} bado. Tunaorodhesha daktari tu baada ya kupiga nambari na kuthibitisha. Unaweza kupendekeza mmoja hapa chini.`,
    emergency: 'Anaitikia dharura', covers: (areas: string) => `Anahudumia: ${areas}`,
    confirmed: (date: string) => `Nambari imethibitishwa kwa simu tarehe ${date}`, kvbReg: (no: string) => `Usajili wa KVB: ${no} (iangalie kwenye rejista)`,
    suggestTitle: 'Pendekeza daktari kwa orodha', signInToSuggest: 'Ingia kwa akaunti ya shamba lako kupendekeza daktari.',
    suggestIntro: 'Unamjua daktari au mhudumu wa afya ya mifugo mzuri? Tuambie. Tunapiga nambari na kuthibitisha kabla mtu mwingine yeyote kumwona.',
    county: 'Kaunti', areas: 'Maeneo anayohudumia (si lazima)', areasPlaceholder: 'mfano: Kabete, Dagoretti', hours: 'Saa za kazi (si lazima)', hoursPlaceholder: 'mfano: Kila siku saa 12 asubuhi hadi saa 2 usiku',
    kvbNumber: 'Nambari ya usajili wa KVB (si lazima)', usesWhatsapp: 'Anatumia WhatsApp', comesEmergency: 'Huja wakati wa dharura', send: 'Tuma pendekezo',
    thanks: 'Asante. Tutapiga nambari kabla daktari huyu kuorodheshwa.',
    savedOnPhone: 'Inaonyesha madaktari waliohifadhiwa kwenye simu hii. Imeshindwa kuwasasisha kutoka akaunti yako.',
    kinds: { veterinarian: 'Daktari wa mifugo', animal_health_assistant: 'Msaidizi wa afya ya mifugo', co_op_vet: 'Daktari wa ushirika', agrovet: 'Duka la dawa za mifugo', clinic: 'Kliniki' },
  },
} as const;

// ── Signing in ──────────────────────────────────────────────────────────────────────────────────────────────

export const AUTH_COPY = {
  en: {
    tagline: 'Dairy farm management', tablist: 'Sign in or create an account', signIn: 'Sign in', createAccount: 'Create account', close: 'Close',
    email: 'Email address', password: 'Password', yourPassword: 'Your password', verifying: 'Verifying…', signInButton: 'Sign in to your farm',
    orSample: 'Or try sample data', demo: 'Explore the demo farm',
    trialNote: (days: number) => `Includes a ${days}-day full free trial. Your farm starts clean, with no demo data.`,
    yourName: 'Your name *', phoneMpesa: 'Phone (M-Pesa)', farmName: 'Farm name *', county: 'County *', subCounty: 'Sub-county', setPassword: 'Set password *', atLeast12: 'At least 12 characters',
    invitation: 'Invitation code *', invitationHint: 'Mylkio is invitation-only during the pilot. No code? Use the contact form to request one.', invitationPlaceholder: 'The code you were given',
    choosePlan: (days: number) => `Choose a monthly plan (${days} days free)`, settingUp: 'Setting up your farm…', startTrial: (days: number) => `Start ${days}-day free trial`,
    noCharge: 'No M-Pesa charge today. Cancel anytime.',
    agree: (terms: string, privacy: string) => ({ before: 'By creating an account you agree to our ', terms, and: ' and ', privacy }),
    terms: 'Terms of use', privacy: 'Privacy notice', language: 'Kiswahili',
  },
  sw: {
    tagline: 'Usimamizi wa shamba la maziwa', tablist: 'Ingia au tengeneza akaunti', signIn: 'Ingia', createAccount: 'Tengeneza akaunti', close: 'Funga',
    email: 'Anwani ya barua pepe', password: 'Nenosiri', yourPassword: 'Nenosiri lako', verifying: 'Inahakiki…', signInButton: 'Ingia kwenye shamba lako',
    orSample: 'Au jaribu data ya mfano', demo: 'Tazama shamba la mfano',
    trialNote: (days: number) => `Inajumuisha majaribio kamili ya siku ${days} bila malipo. Shamba lako linaanza safi, bila data ya mfano.`,
    yourName: 'Jina lako *', phoneMpesa: 'Simu (M-Pesa)', farmName: 'Jina la shamba *', county: 'Kaunti *', subCounty: 'Kaunti ndogo', setPassword: 'Weka nenosiri *', atLeast12: 'Angalau herufi 12',
    invitation: 'Nambari ya mwaliko *', invitationHint: 'Mylkio ni kwa mwaliko tu wakati wa majaribio. Huna nambari? Tumia fomu ya mawasiliano kuomba.', invitationPlaceholder: 'Nambari uliyopewa',
    choosePlan: (days: number) => `Chagua mpango wa kila mwezi (siku ${days} bila malipo)`, settingUp: 'Inaandaa shamba lako…', startTrial: (days: number) => `Anza majaribio ya siku ${days} bila malipo`,
    noCharge: 'Hakuna malipo ya M-Pesa leo. Ghairi wakati wowote.',
    agree: (terms: string, privacy: string) => ({ before: 'Kwa kutengeneza akaunti unakubali ', terms, and: ' na ', privacy }),
    terms: 'Masharti ya matumizi', privacy: 'Taarifa ya faragha', language: 'English',
  },
} as const;
