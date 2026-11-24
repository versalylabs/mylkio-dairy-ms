// The Privacy notice and Terms of use, as data so the pages, tests and docs share one source.
// Plain language on purpose. These describe what Mylkio actually does today; when the system changes (a new
// provider, a new kind of data), change this file in the same pull request. They have not been reviewed by a
// lawyer: see docs/phase-8-commercial.md.

import { SUPPORT_EMAIL } from './contact';

export const LEGAL_UPDATED = '23 November 2026';

export interface LegalSection { heading: string; paragraphs?: string[]; bullets?: string[] }
export interface LegalDocument { title: string; summary: string; sections: LegalSection[] }

/**
 * The notice and terms name the support address once, from lib/contact.ts. The pages show the address the
 * administrator has saved in Admin > Website (when there is one), so there is a single place to change it:
 * this swaps the built-in address for the current one. The wording itself is not touched.
 */
export function withSupportEmail(doc: LegalDocument, email: string): LegalDocument {
  if (!email || email === SUPPORT_EMAIL) return doc;
  const swap = (text: string) => text.split(SUPPORT_EMAIL).join(email);
  return {
    ...doc,
    sections: doc.sections.map((s) => ({ ...s, paragraphs: s.paragraphs?.map(swap), bullets: s.bullets?.map(swap) })),
  };
}

export const PRIVACY: LegalDocument = {
  title: 'Privacy notice',
  summary: 'What Mylkio collects, why, where it is kept, and the choices you have. We wrote this to be read, not skipped.',
  sections: [
    {
      heading: 'Who we are',
      paragraphs: [
        'Mylkio is a dairy farm management system for Kenyan farmers, made by Versaly. In this notice, "we" means the team at Versaly that runs Mylkio, and we are responsible for the personal information described here.',
        `You can reach us about anything in this notice at ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      heading: 'What we collect',
      bullets: [
        'Your account: your name, email address, phone number, farm name and county, and the plan you chose. Your password is handled by our sign-in provider; we cannot read it.',
        'Your farm records: the cows, health and breeding events, milk, deliveries, payments, buyers, expenses, reminders and photos you enter. These are yours. We keep them so they are safe, available on your phone and in sync across your devices.',
        'When you use Mylkio: the times your account last used the system, so we can give support and see how many farms are active. This history is kept for about six months.',
        'Website enquiries: the name, phone number, county, herd size and message you send us through the contact form.',
        'Vets you save or suggest: a name and phone number. Your own vets are private to your farm. A suggested vet is checked by our team before anyone else can see it.',
        'Community groups (Farm Pro and Custom): the posts and replies you write in a SACCO or area group, with your name, your farm name and the time. See "Community groups" below.',
        'Your plan payments: when you pay for a plan, our team records the amount, date, how it was paid, any M-Pesa or bank reference, and the period covered. Our team may also add short notes about your account, for example that we called you.',
      ],
    },
    {
      heading: 'What stays on your phone',
      paragraphs: [
        'The symptom checker works on your phone. What you tick, and any photo you take for it, stay on the phone unless you choose to share them (for example to a vet on WhatsApp) or to save a check to a cow\'s record.',
        'Mylkio also keeps a copy of your records in your phone\'s browser so it works without internet. If you share a phone, sign out when you finish.',
      ],
    },
    {
      heading: 'Community groups',
      paragraphs: [
        'Farm Pro and Custom farms can join a group for their SACCO or area. Mylkio staff create each group and send its members an invitation link. A group is the one place where something you write leaves your farm. Unlike your farm records, posts and replies are stored on our servers so the other farms in the group can read them.',
        'The farms in a group can see what you post or reply, your name, your farm name and when you wrote it. People on your farm with a worker login can read the groups your farm is in but cannot write in them. Our staff can see which farms are in a group and how many, but do not read what members write. Nothing from your farm records is shared with a group: a post says only what you choose to type.',
        'Outbreak reports (when your group offers them): a report holds the signs you tick, how many animals, for how long, the date, whether a vet has seen them, and the area (your sub-county, or your county) taken from your farm profile. The other farms in the group see only counts by area, never your farm, and their answers ("we see this too" or "not here") are counted without names. The group\'s admin, a farm the SACCO or area trusts, can see which farm made a report, with the name and phone number of the person who made it, so they can follow up. We record each time an admin looks. Reports are deleted after 90 days and answers after 30 days. A report in a group does not replace reporting a notifiable disease to the veterinary authorities.',
        'You can delete your own posts and replies, and leave a group at any time, choosing whether to delete what your farm wrote there. Posts and replies are also deleted when a farm is deleted. What you read in a group is kept on your phone so you can read it without internet, and is removed when you sign out. Posts in a group are guidance from neighbours, not veterinary advice.',
      ],
    },
    {
      heading: 'How we use it',
      bullets: [
        'To run Mylkio for you: sign you in, save and sync your records, and show your plan.',
        'To help you: answer your questions, call you about your trial or a payment, and fix problems.',
        'To keep the service safe and fair: prevent misuse and limit spam.',
        'To understand how many farms use Mylkio, using counts and dates, not the content of your records.',
      ],
      paragraphs: [
        'We do not sell your information. We do not use it for advertising. We do not show one farm\'s records to another farm.',
        'Our administration screens show account details (name, phone, farm, plan, payments, how many cows you keep, when you last used Mylkio). They do not show your milk, herd, health or sales records. Because we run the system, a small number of authorised Versaly staff could technically reach stored records to fix a fault or meet a legal duty; we do that only when needed.',
      ],
    },
    {
      heading: 'Who else handles your information',
      paragraphs: [
        'We use two service providers to run Mylkio. They handle your information only to provide their service to us.',
      ],
      bullets: [
        'Neon: our database and sign-in provider. Your account and records are stored in its data centre in Frankfurt, Germany.',
        'Vercel: hosts the Mylkio website and app.',
      ],
    },
    {
      heading: 'Moving information outside Kenya',
      paragraphs: [
        'Because the providers above run outside Kenya, your information is processed and stored outside Kenya. We choose providers that protect information with encryption and access controls, and we tell you here so you can decide whether to use Mylkio. If you have a concern, contact us before you sign up.',
      ],
    },
    {
      heading: 'Cookies and tracking',
      paragraphs: [
        'Mylkio uses only what it needs to work: a sign-in cookie to keep you signed in, and a saved copy of the app and your records on your phone so it works offline. We do not use advertising or analytics cookies.',
      ],
    },
    {
      heading: 'How long we keep it',
      paragraphs: [
        'We keep your account and records while you have a Mylkio account. If you stop, or ask us to delete your information, we will delete your records or give them back to you first if you want a copy, and we will tell you when it is done. Activity history is deleted after about six months. We keep website enquiries only as long as we need to reply and follow up. Payment records may be kept for as long as we need them for our accounts.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'Under the Data Protection Act, 2019, you have the right to know what we hold about you, to see it, to correct it, to object to how we use it, to ask us to delete it, and to receive your records in a form you can take elsewhere. You can export your records from Mylkio yourself at any time.',
        `To use any of these rights, email ${SUPPORT_EMAIL}. If you are not happy with our answer, you may complain to the Office of the Data Protection Commissioner of Kenya.`,
      ],
    },
    {
      heading: 'Changes to this notice',
      paragraphs: [`If we change what we collect or who handles it, we will update this page and its date (${LEGAL_UPDATED} for this version), and tell signed-in users when the change matters to them.`],
    },
  ],
};

export const TERMS: LegalDocument = {
  title: 'Terms of use',
  summary: 'The simple rules for using Mylkio: your account, your plan, your records, and what we can and cannot promise.',
  sections: [
    {
      heading: 'Agreeing to these terms',
      paragraphs: [
        'By creating a Mylkio account or using Mylkio, you agree to these terms and to our Privacy notice. If you do not agree, please do not use Mylkio.',
      ],
    },
    {
      heading: 'Your account',
      bullets: [
        'Give us true details, and keep them up to date.',
        'Keep your sign-in private. You are responsible for what is done with your account.',
        'Mylkio is for farmers and their farm staff. One account is for one farm.',
      ],
    },
    {
      heading: 'Plans, the free trial and payment',
      bullets: [
        'Every new farm starts with a 14-day free trial. Plans and monthly prices are shown on our website, in Kenya shillings.',
        'We do not charge you automatically. You pay us (for example by M-Pesa) when you choose to, and our team records your payment. Your plan then runs to the date shown in Settings.',
        'If your free trial ends, or a payment is more than a week late, or you cancel, the symptom checker and the vet finder pause. Everything else keeps working. We never lock you out of your records: they stay available and you can always export them.',
        'The number of cows each plan covers is a guide. We may talk to you about a bigger plan if your herd grows, but we will not stop you recording your animals.',
        'If you think you were charged in error, contact us and we will look into it.',
      ],
    },
    {
      heading: 'Your records belong to you',
      paragraphs: [
        'The records you enter are yours. You give us permission to store, copy and show them to you and the people you add, only so we can run Mylkio. You can export them at any time. We may look at your records only to fix a fault, keep the service safe, or meet a legal duty.',
      ],
    },
    {
      heading: 'Help, not advice',
      bullets: [
        'The illness guide, symptom checker, vet finder and health reminders give general information. They do not diagnose an animal and are not a substitute for a veterinarian. If an animal is very sick, or you are worried, call a vet.',
        'Milk withdrawal dates and other reminders are an aid. You remain responsible for checking medicine labels and your vet\'s advice, and for making sure milk is safe before it is sold.',
        'Figures such as balances and totals are worked out from what you enter. Check them against your own papers before relying on them for money.',
      ],
    },
    {
      heading: 'Using Mylkio properly',
      bullets: [
        'Do not try to get into other farms\' records, break or overload the service, or use it for anything unlawful.',
        'Do not enter false or other people\'s details to mislead.',
        'In a Community group, write only what you are happy for the other farms in it to read. Do not post abuse, other people\'s private details, medicine doses, or a rumour that a farm or a person has a disease. We may remove a post, or a farm from a group, that breaks this.',
        'We may pause an account that is misused, and we will tell you why.',
      ],
    },
    {
      heading: 'Availability and backups',
      paragraphs: [
        'We work hard to keep Mylkio running and your records safe, but we cannot promise it will always be available or error-free, and your phone or network may fail. Mylkio works offline and syncs when you are back online. Export your records now and then as your own backup.',
      ],
    },
    {
      heading: 'Our responsibility',
      paragraphs: [
        'To the extent the law allows, we are not responsible for losses that were not a foreseeable result of our fault, such as lost profit or a decision made on a reminder alone. Where we are responsible, our total liability for a claim is limited to what you paid us in the three months before it. Nothing in these terms limits a right you have under Kenyan consumer law that cannot be limited.',
      ],
    },
    {
      heading: 'Stopping',
      paragraphs: [
        'You can stop using Mylkio at any time. Tell us if you want your records deleted. We may end the service to you for serious misuse, or if we stop offering Mylkio, in which case we will give you time to export your records.',
      ],
    },
    {
      heading: 'Changes and the law',
      paragraphs: [
        `We may change these terms. We will update this page (this version is dated ${LEGAL_UPDATED}) and tell signed-in users about changes that matter. These terms are governed by the laws of Kenya.`,
        `Questions? Email ${SUPPORT_EMAIL}.`,
      ],
    },
  ],
};
