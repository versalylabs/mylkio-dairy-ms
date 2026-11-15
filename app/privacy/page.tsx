import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { PRIVACY } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy notice | Mylkio',
  description: 'What Mylkio collects, why, where it is kept, and the choices you have.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} other={{ href: '/terms', label: 'Terms of use' }} />;
}
