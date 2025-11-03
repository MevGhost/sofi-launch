import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Track your token holdings, escrow positions, and performance metrics on S4 Labs.',
};

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}