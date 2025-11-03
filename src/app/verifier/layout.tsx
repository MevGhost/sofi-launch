import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verifier Panel',
  description: 'Escrow verification and milestone approval dashboard for authorized verifiers.',
};

export default function VerifierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}