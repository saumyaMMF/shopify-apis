import type { Metadata } from 'next';
import { STORE_NAME } from '@/lib/format';
import { StorefrontShell } from './shell';

export const metadata: Metadata = {
  title: { default: STORE_NAME, template: `%s · ${STORE_NAME}` },
  description: `Shop premium snowboards and gear at ${STORE_NAME}.`,
  openGraph: { title: STORE_NAME, type: 'website' },
  robots: { index: true, follow: true },
};

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
