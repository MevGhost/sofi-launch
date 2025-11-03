import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Escrow Dashboard',
  description: 'Manage and monitor your active escrows on S4 Labs.',
};

export default function EscrowDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}