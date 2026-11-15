// Who to call, by county. Pilot county: Nairobi. Phone numbers appear here ONLY once they can be traced to an
// official page, and each carries a note saying whether anyone has confirmed it by phone. A wrong number in an
// emergency is worse than no number, so an unconfirmed number is labelled as unconfirmed on screen.

export interface Contact {
  name: string;
  phone: string[];
  /** What this line is and is not. */
  note: string;
  /** The official page the number came from. */
  source: string;
  /** YYYY-MM-DD when someone rang it and confirmed it reaches this service; null while unconfirmed. */
  confirmedOn: string | null;
}

export interface CountyContacts {
  county: string;
  /** Where to report suspected notifiable diseases and ask for the county veterinary service. */
  reporting: Contact[];
}

export const KVB_REGISTERS_URL = 'https://kenyavetboard.or.ke/en/registers';
export const KVB_REGISTERS_NOTE =
  'Before you pay anyone to treat an animal, check that they are on the Kenya Veterinary Board registers (veterinary surgeons, technologists and technicians).';

export const COUNTY_CONTACTS: CountyContacts[] = [
  {
    county: 'Nairobi',
    reporting: [
      {
        name: 'Nairobi City County help line',
        phone: ['0725 624489', '020 2224281'],
        note: 'This is the county’s general line, not a direct veterinary number. Ask to be put through to the county Veterinary Services department. Direct numbers for the Director of Veterinary Services are still to be added.',
        source: 'https://nairobi.go.ke/nairobi-city-county-conducts-free-mass-anti-rabies-vaccination-drive',
        confirmedOn: null,
      },
    ],
  },
];

/** "Nairobi County", "Nairobi" and "nairobi city" all find the Nairobi entry. */
export function contactsFor(county: string | null | undefined): CountyContacts | null {
  const name = (county ?? '').toLowerCase().replace(/\b(county|city)\b/g, '').trim();
  if (!name) return null;
  return COUNTY_CONTACTS.find((entry) => entry.county.toLowerCase() === name) ?? null;
}
