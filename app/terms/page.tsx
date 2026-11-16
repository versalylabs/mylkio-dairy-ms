import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { TERMS, withSupportEmail } from '@/lib/legal';
import { currentSupportEmail } from '@/lib/server/support-email';

export const metadata: Metadata = {
  title: 'Terms of use | Mylkio',
  description: 'The simple rules for using Mylkio: your account, your plan, your records.',
  alternates: { canonical: '/terms' },
};

// Shown with the support address saved in Admin > Website; refreshed at most once a minute.
export const revalidate = 60;

export default async function TermsPage() {
  const email = await currentSupportEmail();
  return <LegalPage doc={withSupportEmail(TERMS, email)} other={{ href: '/privacy', label: 'Privacy notice' }} />;
}
