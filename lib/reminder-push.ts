// Phone reminders: the words of the morning summary, and the settings screen's wording, in English and Kiswahili.
// No browser or server imports, so the daily job, the screens and the tests share it. See db/migrations/0015.

export type Lang = 'en' | 'sw';

export interface DigestReminder { title: string; type: string; dueDate: string }
export interface DigestMessage { title: string; body: string; url: string }

/** How many reminder titles the notification lists before "and N more". */
export const DIGEST_LISTED = 3;

/** One notification for the morning: "Mylkio: 3 reminders today (1 overdue)" and the first few titles. */
export function digestMessage(reminders: readonly DigestReminder[], lang: Lang, today: string): DigestMessage {
  const n = reminders.length;
  const overdue = reminders.filter((r) => r.dueDate < today).length;
  const listed = reminders.slice(0, DIGEST_LISTED).map((r) => r.title).join('; ');
  const more = n - Math.min(n, DIGEST_LISTED);
  if (lang === 'sw') {
    return {
      title: `Mylkio: ${n === 1 ? 'kikumbusho 1' : `vikumbusho ${n}`} leo${overdue ? ` (${overdue} vimechelewa)` : ''}`,
      body: more ? `${listed}; na ${more} zaidi` : listed,
      url: '/',
    };
  }
  return {
    title: `Mylkio: ${n === 1 ? '1 reminder' : `${n} reminders`} today${overdue ? ` (${overdue} overdue)` : ''}`,
    body: more ? `${listed}; and ${more} more` : listed,
    url: '/',
  };
}

export interface PushCopy {
  title: string; intro: string; on: string; off: string; turnOn: string; turnOff: string; working: string;
  unsupported: string; iphone: string; blocked: string; notReady: string; offline: string; failed: string;
}

export const PUSH_COPY: Record<Lang, PushCopy> = {
  en: {
    title: 'Phone reminders',
    intro: 'One notification each morning, about 6:30, listing the reminders due today and any that are overdue. Nothing is sent on a day with nothing due.',
    on: 'Turned on for this phone.', off: 'Off on this phone.',
    turnOn: 'Turn on for this phone', turnOff: 'Turn off', working: 'Working…',
    unsupported: 'This browser cannot show notifications.',
    iphone: 'On an iPhone, first add Mylkio to your Home Screen (Share, then Add to Home Screen), open it from there, then turn this on.',
    blocked: 'Notifications are blocked for Mylkio in this browser. Allow them in the browser settings, then try again.',
    notReady: 'Phone reminders are not available yet. Please try again later.',
    offline: 'You need a connection to turn this on or off.',
    failed: 'That did not work. Please try again.',
  },
  sw: {
    title: 'Vikumbusho kwenye simu',
    intro: 'Taarifa moja kila asubuhi, karibu saa 12:30, ikiorodhesha vikumbusho vya leo na vilivyochelewa. Hakuna kinachotumwa siku isiyo na kikumbusho.',
    on: 'Imewashwa kwenye simu hii.', off: 'Imezimwa kwenye simu hii.',
    turnOn: 'Washa kwenye simu hii', turnOff: 'Zima', working: 'Inashughulikia…',
    unsupported: 'Kivinjari hiki hakiwezi kuonyesha taarifa.',
    iphone: 'Kwenye iPhone, kwanza ongeza Mylkio kwenye Skrini ya Mwanzo (Shiriki, kisha Ongeza kwenye Skrini ya Mwanzo), ifungue kutoka hapo, kisha uwashe hii.',
    blocked: 'Taarifa za Mylkio zimezuiwa kwenye kivinjari hiki. Ziruhusu kwenye mipangilio ya kivinjari, kisha jaribu tena.',
    notReady: 'Vikumbusho kwenye simu bado havipatikani. Tafadhali jaribu tena baadaye.',
    offline: 'Unahitaji mtandao ili kuwasha au kuzima hii.',
    failed: 'Haikufanikiwa. Tafadhali jaribu tena.',
  },
};
