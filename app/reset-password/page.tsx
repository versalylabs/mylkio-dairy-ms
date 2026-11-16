import type { Metadata } from 'next';
import { ResetPasswordScreen } from '@/components/auth/ResetPasswordScreen';

// A private, one-time page: kept out of search results and the sitemap.
export const metadata: Metadata = {
  title: 'Reset your password | Mylkio',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordScreen />;
}
