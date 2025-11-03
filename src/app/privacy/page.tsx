'use client';

import React from 'react';
import { LayoutShell, SectionHeader } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileLayout, MobileCard } from '@/components/mobile/MobileLayout';

export default function PrivacyPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileLayout showNav title="Privacy Policy">
        <div className="min-h-screen px-4 py-6">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Privacy Policy</h1>
          <p className="text-xs text-text-muted mb-6">Last updated: March 2024</p>
          
          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Information We Collect</h2>
            <p className="text-text-secondary text-sm">
              We collect wallet addresses and transaction data for platform functionality.
              No personal information is required or stored.
            </p>
          </MobileCard>

          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">How We Use Data</h2>
            <ul className="space-y-1">
              <li className="text-text-secondary text-sm">• Process transactions</li>
              <li className="text-text-secondary text-sm">• Improve platform features</li>
              <li className="text-text-secondary text-sm">• Generate analytics</li>
            </ul>
          </MobileCard>

          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Data Security</h2>
            <p className="text-text-secondary text-sm">
              All transactions are secured by blockchain technology.
              We never store private keys or seed phrases.
            </p>
          </MobileCard>

          <MobileCard>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Contact</h2>
            <p className="text-text-secondary text-sm">
              For privacy concerns, contact us at privacy@s4labs.xyz
            </p>
          </MobileCard>
        </div>
      </MobileLayout>
    );
  }

  return (
    <LayoutShell>
      <div className="container mx-auto px-4 pt-6 pb-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-text-primary mb-8">Privacy Policy</h1>
          
          <div className="glass rounded-xl p-8 space-y-6 text-text-primary/80">
            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Introduction</h2>
              <p className="leading-relaxed">
                S4 Launchpad ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our decentralized token bonding platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Information We Collect</h2>
              <p className="leading-relaxed mb-4">
                As a decentralized platform, we collect minimal information:
              </p>
              
              <h3 className="text-lg font-medium text-text-primary mb-2">Blockchain Data</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Wallet addresses (public)</li>
                <li>Transaction history on the blockchain</li>
                <li>Token creation and trading activities</li>
                <li>Smart contract interactions</li>
              </ul>

              <h3 className="text-lg font-medium text-text-primary mb-2">Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Browser type and version</li>
                <li>Device information</li>
                <li>IP address (may be logged temporarily)</li>
                <li>Usage patterns and preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">3. How We Use Your Information</h2>
              <p className="leading-relaxed mb-3">
                We use the collected information to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Facilitate token creation and trading</li>
                <li>Process transactions on the blockchain</li>
                <li>Improve platform functionality and user experience</li>
                <li>Detect and prevent fraudulent activities</li>
                <li>Provide customer support when requested</li>
                <li>Analyze platform usage and performance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Data Storage and Security</h2>
              <p className="leading-relaxed mb-3">
                We implement appropriate technical and organizational measures to protect your information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All blockchain transactions are immutable and publicly visible</li>
                <li>We do not store private keys or seed phrases</li>
                <li>Session data is stored locally in your browser</li>
                <li>We use encryption for data transmission</li>
                <li>Regular security audits of our smart contracts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Third-Party Services</h2>
              <p className="leading-relaxed mb-3">
                We may use third-party services that collect information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Web3 wallet providers (MetaMask, WalletConnect, etc.)</li>
                <li>Blockchain infrastructure providers</li>
                <li>Analytics services (anonymized data only)</li>
                <li>Content delivery networks (CDNs)</li>
              </ul>
              <p className="mt-3">
                These services have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Cookies and Tracking</h2>
              <p className="leading-relaxed">
                We use minimal cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Remember your preferences and settings</li>
                <li>Analyze platform usage patterns</li>
                <li>Improve platform performance</li>
                <li>Provide a personalized experience</li>
              </ul>
              <p className="mt-3">
                You can control cookies through your browser settings, but disabling them may affect platform functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Data Sharing and Disclosure</h2>
              <p className="leading-relaxed mb-3">
                We do not sell your personal information. We may share information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>When required by law or legal process</li>
                <li>To protect our rights and property</li>
                <li>To prevent fraud or illegal activities</li>
                <li>With your consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Your Rights and Choices</h2>
              <p className="leading-relaxed mb-3">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access publicly available blockchain data</li>
                <li>Use the platform pseudonymously through your wallet</li>
                <li>Disconnect your wallet at any time</li>
                <li>Clear local storage and cookies</li>
                <li>Opt-out of analytics (where applicable)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Data Retention</h2>
              <p className="leading-relaxed">
                Blockchain data is permanent and immutable. Off-chain data may be retained for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Session data: Until you clear your browser</li>
                <li>Analytics data: Anonymized and aggregated</li>
                <li>Support communications: As needed for service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">10. International Users</h2>
              <p className="leading-relaxed">
                S4 Launchpad is a global platform. By using our services, you consent to the transfer and processing of your information in accordance with this policy, regardless of your location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Children's Privacy</h2>
              <p className="leading-relaxed">
                Our platform is not intended for users under 18 years of age. We do not knowingly collect information from children. If you believe we have collected information from a minor, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">12. Updates to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify users of significant changes through the platform. Your continued use constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">13. Contact Us</h2>
              <p className="leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us through our official channels or community forums.
              </p>
            </section>

            <div className="pt-6 mt-8 border-t border-border">
              <p className="text-sm text-text-primary/60">
                Last updated: January 15, 2025
              </p>
              <p className="text-sm text-text-primary/60 mt-2">
                Version 1.0
              </p>
              <p className="text-sm text-text-primary/60 mt-2">
                Effective Date: January 15, 2025
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </LayoutShell>
  );
}