// Wording for the Community screens (SACCO and area groups), in English and Kiswahili, kept apart from the screens so a
// translator can read it in one place and a test can check nothing is missing (tests/app-copy.test.ts).
// Kiswahili here is a first draft and needs a native speaker, like the rest (docs/kiswahili.md).

export type Lang = 'en' | 'sw';

export interface CommunityCopy {
  title: string; intro: string; demoNote: string;
  // groups
  yourGroups: string; noGroups: string; noGroupsWorker: string; members: (n: number) => string; lastActive: (when: string) => string; noPostsYet: string;
  groupAdmin: string; open: string; allGroups: string;
  // joining
  joinTitle: string; joinIntro: string; codeLabel: string; codeHint: string; linkOpened: string; join: string; joining: string;
  joined: (group: string) => string; workerCannotJoin: string;
  // the discussion
  discussion: string; noPosts: string; writeTitle: string; postPlaceholder: string; post: string; posting: string; charsLeft: (n: number) => string;
  rules: string; readOnly: string; olderPosts: string; loadingOlder: string; refresh: string; updated: (when: string) => string;
  you: string; replies: (n: number) => string; openThread: string; backToGroup: string; noReplies: string;
  replyLabel: string; replyPlaceholder: string; send: string; sending: string;
  remove: string; removePostConfirm: string; removeReplyConfirm: string;
  // leaving
  leave: string; leaveConfirm: (group: string) => string; leaveDelete: string; leaving: string;
  // state
  loading: string; loadError: string; actionError: string; offlineShowing: string; offlineWrite: string;
  // what the server said, in the farmer's language
  badInvite: string; tooMany: string; groupFull: string; tooManyGroups: string; noAccess: string; notInPlan: string;
}

export const COMMUNITY_COPY: Record<Lang, CommunityCopy> = {
  en: {
    title: 'Community',
    intro: 'Groups for your SACCO or area, to talk with the farms around you about things that affect you all. Mylkio staff create each group, so every one is a real SACCO or area.',
    demoNote: 'Groups work with a signed-in farm account. The demo farm stays on this phone.',
    yourGroups: 'Your groups',
    noGroups: 'Your farm is not in a group yet. Ask your SACCO or area group for an invitation link and open it, or type the code below.',
    noGroupsWorker: 'Your farm is not in a group yet. The farm owner or a manager can join one with an invitation link, and then you can read it here.',
    members: (n) => (n === 1 ? '1 farm' : `${n} farms`), lastActive: (when) => `Last post ${when}`, noPostsYet: 'No posts yet',
    groupAdmin: 'Your farm looks after this group', open: 'Open', allGroups: 'All groups',
    joinTitle: 'Join a group', joinIntro: 'Your SACCO or area group sends you a link or a code. Your whole farm joins, and the people you work with can read the group.',
    codeLabel: 'Invitation code', codeHint: 'For example K7M2P-9XQ4T. Capital letters and the dash do not matter.',
    linkOpened: 'You opened an invitation link. Check the code, then tap Join group.', join: 'Join group', joining: 'Joining…',
    joined: (group) => `Your farm joined ${group}.`,
    workerCannotJoin: 'Only the farm owner or a manager can join a group. You can read the groups your farm is in.',
    discussion: 'Discussion', noPosts: 'No posts yet. Start the discussion.', writeTitle: 'Write to the group',
    postPlaceholder: 'What would you like to tell or ask the farms in this group?', post: 'Post', posting: 'Posting…',
    charsLeft: (n) => (n === 1 ? '1 character left' : `${n} characters left`),
    rules: 'This is guidance from neighbours, not a vet. Do not name a farm or person as having a disease, and do not share medicine doses. For a sick animal, call a vet.',
    readOnly: 'You can read this group. Only the farm owner or a manager can write in it.',
    olderPosts: 'Show older posts', loadingOlder: 'Loading…', refresh: 'Refresh', updated: (when) => `Updated ${when}`,
    you: 'You', replies: (n) => (n === 0 ? 'Reply' : n === 1 ? '1 reply' : `${n} replies`), openThread: 'Open', backToGroup: 'Back to the discussion', noReplies: 'No replies yet.',
    replyLabel: 'Your reply', replyPlaceholder: 'Write a reply', send: 'Send reply', sending: 'Sending…',
    remove: 'Delete', removePostConfirm: 'Delete this post and all its replies?', removeReplyConfirm: 'Delete this reply?',
    leave: 'Leave this group', leaveConfirm: (group) => `Leave ${group}? Your farm will stop seeing it, and you will need a new invitation to join again.`,
    leaveDelete: `Also delete our posts and replies in this group`, leaving: 'Leaving…',
    loading: 'Loading…', loadError: 'Could not load this. Check your connection and try again.', actionError: 'That did not work. Please try again.',
    offlineShowing: 'No connection. Showing what you last read.', offlineWrite: 'You need a connection to post or reply.',
    badInvite: 'That invitation is not valid. It may have expired, been used up or withdrawn. Ask your group for a new one.',
    tooMany: 'You are posting a lot. Please wait a little before posting again.',
    groupFull: 'This group is full.', tooManyGroups: 'A farm can be in up to 5 groups. Leave one before joining another.',
    noAccess: 'You cannot do that in this group. Only the farm owner or a manager can post or join.', notInPlan: 'Community is part of the Farm Pro plan.',
  },
  sw: {
    title: 'Jamii',
    intro: 'Vikundi vya SACCO au eneo lako, kuzungumza na mashamba yanayokuzunguka kuhusu mambo yanayowahusu nyote. Wafanyakazi wa Mylkio huunda kila kikundi, kwa hivyo kila kimoja ni SACCO au eneo halisi.',
    demoNote: 'Vikundi hufanya kazi na akaunti ya shamba iliyoingia. Shamba la mfano hubaki kwenye simu hii.',
    yourGroups: 'Vikundi vyako',
    noGroups: 'Shamba lako bado halimo kwenye kikundi. Omba kiungo cha mwaliko kutoka SACCO au kikundi chako cha eneo kisha ukifungue, au andika nambari hapa chini.',
    noGroupsWorker: 'Shamba lako bado halimo kwenye kikundi. Mmiliki wa shamba au meneja anaweza kujiunga kwa kiungo cha mwaliko, kisha utaweza kukisoma hapa.',
    members: (n) => (n === 1 ? 'shamba 1' : `mashamba ${n}`), lastActive: (when) => `Ujumbe wa mwisho ${when}`, noPostsYet: 'Hakuna ujumbe bado',
    groupAdmin: 'Shamba lako linasimamia kikundi hiki', open: 'Fungua', allGroups: 'Vikundi vyote',
    joinTitle: 'Jiunge na kikundi', joinIntro: 'SACCO au kikundi chako cha eneo kinakutumia kiungo au nambari. Shamba lako lote linajiunga, na watu unaofanya nao kazi wanaweza kusoma kikundi.',
    codeLabel: 'Nambari ya mwaliko', codeHint: 'Kwa mfano K7M2P-9XQ4T. Herufi kubwa na kistari havijalishi.',
    linkOpened: 'Umefungua kiungo cha mwaliko. Hakikisha nambari, kisha gusa Jiunge na kikundi.', join: 'Jiunge na kikundi', joining: 'Inajiunga…',
    joined: (group) => `Shamba lako limejiunga na ${group}.`,
    workerCannotJoin: 'Mmiliki wa shamba au meneja pekee ndiye anayeweza kujiunga na kikundi. Unaweza kusoma vikundi ambavyo shamba lako limo.',
    discussion: 'Majadiliano', noPosts: 'Hakuna ujumbe bado. Anzisha majadiliano.', writeTitle: 'Andikia kikundi',
    postPlaceholder: 'Ungependa kuwaambia au kuwauliza nini mashamba yaliyo kwenye kikundi hiki?', post: 'Tuma', posting: 'Inatuma…',
    charsLeft: (n) => (n === 1 ? 'herufi 1 imebaki' : `herufi ${n} zimebaki`),
    rules: 'Huu ni ushauri wa majirani, si daktari wa mifugo. Usitaje shamba au mtu kuwa ana ugonjwa, na usishiriki vipimo vya dawa. Mnyama akiwa mgonjwa, mwite daktari wa mifugo.',
    readOnly: 'Unaweza kusoma kikundi hiki. Mmiliki wa shamba au meneja pekee ndiye anayeweza kuandika.',
    olderPosts: 'Onyesha jumbe za zamani', loadingOlder: 'Inapakia…', refresh: 'Sasisha', updated: (when) => `Imesasishwa ${when}`,
    you: 'Wewe', replies: (n) => (n === 0 ? 'Jibu' : n === 1 ? 'jibu 1' : `majibu ${n}`), openThread: 'Fungua', backToGroup: 'Rudi kwenye majadiliano', noReplies: 'Hakuna majibu bado.',
    replyLabel: 'Jibu lako', replyPlaceholder: 'Andika jibu', send: 'Tuma jibu', sending: 'Inatuma…',
    remove: 'Futa', removePostConfirm: 'Kufuta ujumbe huu na majibu yake yote?', removeReplyConfirm: 'Kufuta jibu hili?',
    leave: 'Ondoka kwenye kikundi hiki', leaveConfirm: (group) => `Kuondoka kwenye ${group}? Shamba lako litaacha kukiona, na utahitaji mwaliko mpya ili ujiunge tena.`,
    leaveDelete: `Futa pia jumbe na majibu yetu kwenye kikundi hiki`, leaving: 'Inaondoka…',
    loading: 'Inapakia…', loadError: 'Imeshindwa kupakia. Angalia mtandao wako ujaribu tena.', actionError: 'Haikufanikiwa. Tafadhali jaribu tena.',
    offlineShowing: 'Hakuna mtandao. Inaonyesha ulichosoma mara ya mwisho.', offlineWrite: 'Unahitaji mtandao ili kutuma ujumbe au jibu.',
    badInvite: 'Mwaliko huo si sahihi. Huenda umekwisha muda, umetumika wote au umeondolewa. Omba mwaliko mpya kutoka kwa kikundi chako.',
    tooMany: 'Unatuma jumbe nyingi. Tafadhali subiri kidogo kabla ya kutuma tena.',
    groupFull: 'Kikundi hiki kimejaa.', tooManyGroups: 'Shamba linaweza kuwa kwenye vikundi hadi 5. Ondoka kwenye kimoja kabla ya kujiunga na kingine.',
    noAccess: 'Huwezi kufanya hivyo kwenye kikundi hiki. Mmiliki wa shamba au meneja pekee ndiye anayeweza kutuma ujumbe au kujiunga.', notInPlan: 'Jamii ni sehemu ya mpango wa Farm Pro.',
  },
};
