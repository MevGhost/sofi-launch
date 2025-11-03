import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Tokens',
  description: 'Discover and explore tokens launched on S4 Labs. Filter by trending, new launches, and more.',
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}