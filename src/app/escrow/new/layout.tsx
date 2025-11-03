import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Escrow',
  description: 'Create a secure milestone-based escrow for token vesting or payments.',
};

export default function NewEscrowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}