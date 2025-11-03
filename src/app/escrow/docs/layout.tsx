import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Escrow Documentation',
  description: 'Learn how to use the S4 Labs escrow system for secure milestone-based payments.',
};

export default function EscrowDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}