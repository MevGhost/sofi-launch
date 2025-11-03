import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch Token',
  description: 'Launch your token on Solana with SoFi Launch - Simple, fast, and secure token deployment.',
};

export default function NewTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}