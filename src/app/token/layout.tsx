import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Tokens',
    template: '%s | Tokens | S4 Labs'
  },
  description: 'Create and manage tokens on S4 Labs platform.',
};

export default function TokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}