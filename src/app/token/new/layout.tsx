import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch Token',
  description: 'Launch your token on Base L2 with S4 Labs - Simple, fast, and secure token deployment.',
};

export default function NewTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}