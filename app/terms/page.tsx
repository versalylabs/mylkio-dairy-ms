import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { TERMS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms of use | Mylkio',
  description: 'The simple rules for using Mylkio: your account, your plan, your records.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <LegalPage doc={TERMS} other={{ href: '/privacy', label: 'Privacy notice' }} />;
}
