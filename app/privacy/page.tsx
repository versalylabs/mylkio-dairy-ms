import type { Metadata } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { PRIVACY, withSupportEmail } from '@/lib/legal';
import { currentSupportEmail } from '@/lib/server/support-email';

export const metadata: Metadata = {
  title: 'Privacy notice | Mylkio',
  description: 'What Mylkio collects, why, where it is kept, and the choices you have.',
  alternates: { canonical: '/privacy' },
};

// Shown with the support address saved in Admin > Website; refreshed at most once a minute.
export const revalidate = 60;

export default async function PrivacyPage() {
  const email = await currentSupportEmail();
  return <LegalPage doc={withSupportEmail(PRIVACY, email)} other={{ href: '/terms', label: 'Terms of use' }} />;
}
