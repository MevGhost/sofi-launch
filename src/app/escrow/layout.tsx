import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Escrow',
    template: '%s | Escrow | S4 Labs'
  },
  description: 'Secure milestone-based escrow system for token vesting and payments on S4 Labs.',
};

export default function EscrowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}