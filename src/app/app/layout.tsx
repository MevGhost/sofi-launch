import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Access your S4 Labs dashboard and manage your tokens.',
};

export default function AppDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}