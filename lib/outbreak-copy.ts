// Wording for outbreak reports and alerts in Community groups, in English and Kiswahili. The signs and emergency steps
// themselves come from the vet guide (lib/vet/red-flags.ts), which is English only until a veterinarian has reviewed it,
// so those lines stay in English in both languages. Kiswahili here is a first draft for a native speaker.

export type Lang = 'en' | 'sw';

export interface OutbreakCopy {
  // alerts in a group
  alertsTitle: string; alertsIntro: string; noAlerts: string;
  farmsReport: (farms: number, area: string) => string;
  safety: string; notifiable: string; humanRisk: string; doThisFirst: string; callVetNow: string;
  weSeeThis: string; notHere: string; counts: (also: number, notHere: number) => string; youReported: string; answerSaved: string;
  yourReports: string; withdraw: string; withdrawConfirm: string; reportedSigns: (n: number) => string;
  // the report
  reportButton: string; formTitle: string; formIntro: string; tickSigns: string; maxSigns: string; animals: string; days: string; seenOn: string;
  vetSeen: string; vetYes: string; vetCalled: string; vetNo: string; submit: string; sending: string; sent: string; needSign: string;
  reportingTitle: string; reportingNote: string; reportingContacts: string; cancel: string;
  closed: string;
  // the group admin
  adminTitle: string; adminIntro: string; adminEmpty: string; seenOnDate: (date: string) => string; animalsLine: (n: number, days: number) => string; vetLine: (v: string) => string;
  // Home
  homeTag: string; homeItem: (farms: number, area: string, group: string) => string; homeOpen: string; homeSafety: string;
  // errors
  tooMany: string; actionError: string;
}

export const OUTBREAK_COPY: Record<Lang, OutbreakCopy> = {
  en: {
    alertsTitle: 'Outbreak alerts',
    alertsIntro: 'What farms in this group reported in the last 7 days, counted by area. No farm is named.',
    noAlerts: 'No outbreak reports this week.',
    farmsReport: (farms, area) => (farms === 1 ? `1 farm in ${area} reports this week:` : `${farms} farms in ${area} report this week:`),
    safety: 'This is guidance from neighbours, not a diagnosis and not a vet. Call a vet. Never give or hold back treatment because of what a report says.',
    notifiable: 'This can be a notifiable disease. It must be reported to the county veterinary office, not only to this group.',
    humanRisk: 'It can also infect people.',
    doThisFirst: 'Do this first', callVetNow: 'If you are worried about an animal, call a vet now. Do not wait for more signs.',
    weSeeThis: 'We see this too', notHere: 'Not here',
    counts: (also, notHere) => `${also} say they see this too · ${notHere} say not here`,
    youReported: 'Your farm reported this.', answerSaved: 'Your answer is counted. Nobody is named.',
    yourReports: 'Your reports this week', withdraw: 'Withdraw', withdrawConfirm: 'Withdraw this report? It stops being counted in the alerts.',
    reportedSigns: (n) => (n === 1 ? '1 sign' : `${n} signs`),
    reportButton: 'Report signs on my farm', formTitle: 'Report signs on your farm',
    formIntro: 'Tell your group what you are seeing so neighbours can watch for it. Members see only the area and the signs, never your farm. Only this group’s admin can see which farm made a report, to follow up with you.',
    tickSigns: 'Which signs do you see?', maxSigns: 'Choose up to 8 signs.', animals: 'How many animals?', days: 'For how many days?', seenOn: 'Date you saw it',
    vetSeen: 'Has a vet seen the animals?', vetYes: 'Yes', vetCalled: 'I have called one', vetNo: 'No',
    submit: 'Send report', sending: 'Sending…', sent: 'Report sent. Neighbours see your area, not your farm.', needSign: 'Choose at least one sign.',
    reportingTitle: 'Report to the authorities too',
    reportingNote: 'This group is not a reporting channel. A suspected notifiable disease (for example foot-and-mouth disease or lumpy skin disease) must be reported to your sub-county veterinary officer or the county veterinary office.',
    reportingContacts: 'Who to call', cancel: 'Cancel',
    closed: 'Outbreak reports open once a veterinarian has checked the health guide. Until then, call a vet if you are worried about an animal.',
    adminTitle: 'Reports for follow-up', adminIntro: 'You can see which farm reported because you look after this group. Use it only to follow up with the farm. Do not share it in the group.',
    adminEmpty: 'No reports in the last 30 days.', seenOnDate: (date) => `Seen ${date}`,
    animalsLine: (n, days) => `${n === 1 ? '1 animal' : `${n} animals`}, unwell for ${days === 1 ? '1 day' : `${days} days`}`,
    vetLine: (v) => `Vet: ${v}`,
    homeTag: 'COMMUNITY', homeItem: (farms, area, group) => (farms === 1 ? `1 farm in ${area} reports signs in ${group}` : `${farms} farms in ${area} report signs in ${group}`),
    homeOpen: 'See the alert', homeSafety: 'Guidance from neighbours, not a diagnosis. Call a vet if you are worried.',
    tooMany: 'You have sent several reports today. Please try again tomorrow.', actionError: 'That did not work. Please try again.',
  },
  sw: {
    alertsTitle: 'Tahadhari za mlipuko',
    alertsIntro: 'Kile ambacho mashamba kwenye kikundi hiki yaliripoti katika siku 7 zilizopita, kikihesabiwa kwa eneo. Hakuna shamba linalotajwa.',
    noAlerts: 'Hakuna ripoti za mlipuko wiki hii.',
    farmsReport: (farms, area) => (farms === 1 ? `Shamba 1 katika ${area} linaripoti wiki hii:` : `Mashamba ${farms} katika ${area} yanaripoti wiki hii:`),
    safety: 'Huu ni ushauri wa majirani, si utambuzi wala daktari wa mifugo. Mwite daktari wa mifugo. Usitoe au kuzuia matibabu kwa sababu ya ripoti.',
    notifiable: 'Huu unaweza kuwa ugonjwa unaotakiwa kuripotiwa. Lazima uripotiwe kwa ofisi ya mifugo ya kaunti, si kwa kikundi hiki tu.',
    humanRisk: 'Unaweza pia kuwaambukiza watu.',
    doThisFirst: 'Fanya hivi kwanza', callVetNow: 'Ukiwa na wasiwasi kuhusu mnyama, mwite daktari wa mifugo sasa. Usisubiri dalili zaidi.',
    weSeeThis: 'Tunaona hivi pia', notHere: 'Si hapa',
    counts: (also, notHere) => `${also} wanasema wanaona hivi pia · ${notHere} wanasema si hapa`,
    youReported: 'Shamba lako liliripoti hili.', answerSaved: 'Jibu lako limehesabiwa. Hakuna anayetajwa.',
    yourReports: 'Ripoti zako wiki hii', withdraw: 'Ondoa', withdrawConfirm: 'Kuondoa ripoti hii? Itaacha kuhesabiwa kwenye tahadhari.',
    reportedSigns: (n) => (n === 1 ? 'dalili 1' : `dalili ${n}`),
    reportButton: 'Ripoti dalili kwenye shamba langu', formTitle: 'Ripoti dalili kwenye shamba lako',
    formIntro: 'Waambie kikundi chako unachoona ili majirani wawe macho. Wanachama wanaona eneo na dalili tu, kamwe si shamba lako. Msimamizi wa kikundi hiki pekee ndiye anayeweza kuona shamba lililoripoti, ili akufuatilie.',
    tickSigns: 'Unaona dalili zipi?', maxSigns: 'Chagua hadi dalili 8.', animals: 'Wanyama wangapi?', days: 'Kwa siku ngapi?', seenOn: 'Tarehe uliyoona',
    vetSeen: 'Daktari wa mifugo ameshawaona wanyama?', vetYes: 'Ndiyo', vetCalled: 'Nimemwita mmoja', vetNo: 'Hapana',
    submit: 'Tuma ripoti', sending: 'Inatuma…', sent: 'Ripoti imetumwa. Majirani wanaona eneo lako, si shamba lako.', needSign: 'Chagua angalau dalili moja.',
    reportingTitle: 'Ripoti pia kwa mamlaka',
    reportingNote: 'Kikundi hiki si njia ya kuripoti. Ugonjwa unaoshukiwa kuwa wa kuripotiwa (kwa mfano homa ya miguu na midomo au ugonjwa wa ngozi ya uvimbe) lazima uripotiwe kwa afisa wa mifugo wa kaunti ndogo au ofisi ya mifugo ya kaunti.',
    reportingContacts: 'Wapigie simu', cancel: 'Ghairi',
    closed: 'Ripoti za mlipuko zitafunguliwa daktari wa mifugo atakapokuwa ameukagua mwongozo wa afya. Hadi hapo, mwite daktari wa mifugo ukiwa na wasiwasi kuhusu mnyama.',
    adminTitle: 'Ripoti za kufuatilia', adminIntro: 'Unaweza kuona shamba lililoripoti kwa sababu unasimamia kikundi hiki. Litumie kufuatilia shamba tu. Usilishiriki kwenye kikundi.',
    adminEmpty: 'Hakuna ripoti katika siku 30 zilizopita.', seenOnDate: (date) => `Imeonekana ${date}`,
    animalsLine: (n, days) => `${n === 1 ? 'mnyama 1' : `wanyama ${n}`}, wagonjwa kwa ${days === 1 ? 'siku 1' : `siku ${days}`}`,
    vetLine: (v) => `Daktari: ${v}`,
    homeTag: 'JAMII', homeItem: (farms, area, group) => (farms === 1 ? `Shamba 1 katika ${area} linaripoti dalili kwenye ${group}` : `Mashamba ${farms} katika ${area} yanaripoti dalili kwenye ${group}`),
    homeOpen: 'Tazama tahadhari', homeSafety: 'Ushauri wa majirani, si utambuzi. Mwite daktari wa mifugo ukiwa na wasiwasi.',
    tooMany: 'Umetuma ripoti kadhaa leo. Tafadhali jaribu tena kesho.', actionError: 'Haikufanikiwa. Tafadhali jaribu tena.',
  },
};
