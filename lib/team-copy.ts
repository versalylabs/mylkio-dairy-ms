// Wording for the team screens and the "join a farm" step, in English and Kiswahili.
// Kept apart from the screens so a translator can read it in one place (and a test can check nothing is missing).

import { INVITE_DAYS } from './team';

export type Lang = 'en' | 'sw';

export interface TeamCopy {
  title: string; intro: string;
  oneLogin: (plan: string) => string; upgrade: string; upgradeMessage: (farm: string) => string; messageUs: string;
  members: string; you: string; lastSeen: (when: string) => string; neverSeen: string; joined: (when: string) => string;
  changeRole: string; remove: string; removeConfirm: (name: string) => string; removeNote: string;
  invite: string; inviteWho: string; inviteWhoHint: string; role: string; create: string; creating: string;
  slotsLeft: (n: number) => string; teamFull: string;
  ready: string; readyBody: (who: string) => string; shareWhatsapp: string; copy: string; copied: string; done: string; code: string;
  waiting: string; expires: (when: string) => string; withdraw: string; withdrawConfirm: string;
  loading: string; loadError: string; actionError: string;
  // joining
  joinTitle: string; joinIntro: string; joinCode: string; joinCodeHint: string; joinButton: string; joining: string; joinLink: string; joinBack: string;
  joinNeedsCode: string; invalidCode: string; passwordShort: string; yourName: string; yourPhone: string; email: string; password: string; passwordHint: string;
  haveInvite: string;
}

export const TEAM_COPY: Record<Lang, TeamCopy> = {
  en: {
    title: 'Your team',
    intro: 'Add the people who work on your farm. Each gets their own login, so you can see who recorded what. You decide what each person can see.',
    oneLogin: (plan) => `Your ${plan} plan has one login, yours. Farm Pro includes a team: you and up to five others.`,
    upgrade: 'Add your team with Farm Pro',
    upgradeMessage: (farm) => `Hello Mylkio, I would like to move ${farm} to the Farm Pro plan so I can add my farm team.`,
    messageUs: 'Message Mylkio',
    members: 'People on this farm', you: 'You', lastSeen: (when) => `Last seen ${when}`, neverSeen: 'Has not opened Mylkio yet', joined: (when) => `Joined ${when}`,
    changeRole: 'Change role', remove: 'Remove',
    removeConfirm: (name) => `Remove ${name} from your farm? They lose access at once. What they recorded stays.`,
    removeNote: 'Anything already on their phone stays there until they sign out or clear their data.',
    invite: 'Invite someone', inviteWho: 'Their name (optional)', inviteWhoHint: 'Only so you can tell invitations apart, for example "Mary, milker".',
    role: 'Role', create: 'Create invitation', creating: 'Creating…',
    slotsLeft: (n) => (n === 1 ? '1 more person can be added.' : `${n} more people can be added.`),
    teamFull: 'Your team is full for this plan. Withdraw an invitation or remove someone to add another person.',
    ready: 'Invitation ready',
    readyBody: (who) => `Send this to ${who}. The code works once, for ${INVITE_DAYS} days, and is shown only now.`,
    shareWhatsapp: 'Share on WhatsApp', copy: 'Copy message', copied: 'Copied', done: 'Done', code: 'Invitation code',
    waiting: 'Waiting to join', expires: (when) => `Expires ${when}`, withdraw: 'Withdraw', withdrawConfirm: 'Withdraw this invitation? The link and code stop working.',
    loading: 'Loading your team…', loadError: 'Could not load your team. Please try again.', actionError: 'That did not work. Please try again.',
    joinTitle: 'Join a farm', joinIntro: 'You were invited to work on a farm in Mylkio. Enter the code you were given and create your own login.',
    joinCode: 'Invitation code', joinCodeHint: 'From the message the farm owner sent you.',
    joinButton: 'Join the farm', joining: 'Joining…', joinLink: 'Have a team invitation? Join a farm', joinBack: 'Back to sign in',
    joinNeedsCode: 'Enter the invitation code you were given.',
    invalidCode: 'That invitation is not valid. It may have expired or already been used. Ask the owner for a new one.',
    passwordShort: 'Password must be at least 12 characters.', yourName: 'Your name', yourPhone: 'Phone', email: 'Email address', password: 'Choose a password',
    passwordHint: 'At least 12 characters.',
    haveInvite: 'Have a team invitation?',
  },
  sw: {
    title: 'Timu yako',
    intro: 'Waongeze watu wanaofanya kazi shambani kwako. Kila mmoja ana akaunti yake, hivyo unaona nani alirekodi nini. Wewe ndiye unayeamua kila mtu anaweza kuona nini.',
    oneLogin: (plan) => `Mpango wako wa ${plan} una akaunti moja, yako. Farm Pro inajumuisha timu: wewe na watu watano zaidi.`,
    upgrade: 'Ongeza timu yako kwa Farm Pro',
    upgradeMessage: (farm) => `Habari Mylkio, ningependa kuhamisha ${farm} hadi mpango wa Farm Pro ili niongeze timu ya shamba langu.`,
    messageUs: 'Tuandikie Mylkio',
    members: 'Watu wa shamba hili', you: 'Wewe', lastSeen: (when) => `Alionekana ${when}`, neverSeen: 'Hajafungua Mylkio bado', joined: (when) => `Alijiunga ${when}`,
    changeRole: 'Badilisha nafasi', remove: 'Ondoa',
    removeConfirm: (name) => `Umwondoe ${name} kwenye shamba lako? Atapoteza ufikiaji mara moja. Alichorekodi kitabaki.`,
    removeNote: 'Chochote kilichokwisha kuwa kwenye simu yake kitabaki hadi atoke au afute data yake.',
    invite: 'Alika mtu', inviteWho: 'Jina lake (si lazima)', inviteWhoHint: 'Ili tu uweze kutofautisha mialiko, kwa mfano "Mary, mkamuaji".',
    role: 'Nafasi', create: 'Tengeneza mwaliko', creating: 'Inatengeneza…',
    slotsLeft: (n) => (n === 1 ? 'Mtu mmoja zaidi anaweza kuongezwa.' : `Watu ${n} zaidi wanaweza kuongezwa.`),
    teamFull: 'Timu yako imejaa kwa mpango huu. Futa mwaliko au muondoe mtu ili uongeze mwingine.',
    ready: 'Mwaliko uko tayari',
    readyBody: (who) => `Mtumie ${who}. Nambari inafanya kazi mara moja, kwa siku ${INVITE_DAYS}, na inaonyeshwa sasa tu.`,
    shareWhatsapp: 'Tuma kwa WhatsApp', copy: 'Nakili ujumbe', copied: 'Imenakiliwa', done: 'Nimemaliza', code: 'Nambari ya mwaliko',
    waiting: 'Wanasubiri kujiunga', expires: (when) => `Unaisha ${when}`, withdraw: 'Futa mwaliko', withdrawConfirm: 'Ufute mwaliko huu? Kiungo na nambari vitaacha kufanya kazi.',
    loading: 'Inapakia timu yako…', loadError: 'Imeshindwa kupakia timu yako. Tafadhali jaribu tena.', actionError: 'Haikufanikiwa. Tafadhali jaribu tena.',
    joinTitle: 'Jiunge na shamba', joinIntro: 'Umealikwa kufanya kazi kwenye shamba ndani ya Mylkio. Weka nambari uliyopewa kisha tengeneza akaunti yako.',
    joinCode: 'Nambari ya mwaliko', joinCodeHint: 'Iko kwenye ujumbe uliotumwa na mmiliki wa shamba.',
    joinButton: 'Jiunge na shamba', joining: 'Inakuunganisha…', joinLink: 'Una mwaliko wa timu? Jiunge na shamba', joinBack: 'Rudi kuingia',
    joinNeedsCode: 'Weka nambari ya mwaliko uliyopewa.',
    invalidCode: 'Mwaliko huo si sahihi. Huenda umeisha muda au umeshatumika. Mwombe mmiliki akutumie mwingine.',
    passwordShort: 'Nenosiri lazima liwe na angalau herufi 12.', yourName: 'Jina lako', yourPhone: 'Simu', email: 'Barua pepe', password: 'Chagua nenosiri',
    passwordHint: 'Angalau herufi 12.',
    haveInvite: 'Una mwaliko wa timu?',
  },
};
