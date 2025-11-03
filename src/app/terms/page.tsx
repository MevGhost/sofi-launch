'use client';

import React from 'react';
import { LayoutShell, SectionHeader } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
// AnimatedBackground import removed - not available
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileLayout, MobileCard } from '@/components/mobile/MobileLayout';

export default function TermsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileLayout showNav title="Terms of Service">
        <div className="min-h-screen px-4 py-6">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Terms of Service</h1>
          <p className="text-xs text-text-muted mb-6">Last updated: January 2025</p>
          
          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Platform Usage</h2>
            <p className="text-text-secondary text-sm">
              By using S4 Launchpad, you agree to our terms and acknowledge the risks of cryptocurrency trading.
            </p>
          </MobileCard>

          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Token Trading</h2>
            <ul className="space-y-1">
              <li className="text-text-secondary text-sm">• All transactions are final</li>
              <li className="text-text-secondary text-sm">• Platform fees apply</li>
              <li className="text-text-secondary text-sm">• No value guarantees</li>
            </ul>
          </MobileCard>

          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Risk Disclosure</h2>
            <p className="text-text-secondary text-sm">
              Trading involves substantial risk. You may lose your entire investment.
            </p>
          </MobileCard>

          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Prohibited Activities</h2>
            <ul className="space-y-1">
              <li className="text-text-secondary text-sm">• Price manipulation</li>
              <li className="text-text-secondary text-sm">• Illegal activities</li>
              <li className="text-text-secondary text-sm">• Platform exploitation</li>
            </ul>
          </MobileCard>

          <MobileCard>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Contact</h2>
            <p className="text-text-secondary text-sm">
              For terms inquiries, contact us at legal@s4labs.xyz
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
          <h1 className="text-4xl font-bold text-text-primary mb-8">Terms of Service</h1>
          
          <div className="glass rounded-xl p-8 space-y-6 text-text-primary/80">
            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing and using S4 Launchpad platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Use of the Platform</h2>
              <p className="leading-relaxed mb-3">
                S4 Launchpad is a decentralized token bonding and trading platform built on Base L2. By using our platform, you acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You are of legal age in your jurisdiction to use cryptocurrency services</li>
                <li>You understand the risks associated with cryptocurrency trading</li>
                <li>You are responsible for all activities under your wallet address</li>
                <li>You will not use the platform for illegal activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Token Creation and Trading</h2>
              <p className="leading-relaxed">
                Users can create and trade tokens on our platform. You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Token creation involves smart contract deployment on the blockchain</li>
                <li>All transactions are final and irreversible</li>
                <li>Platform fees apply to token creation and trading activities</li>
                <li>The platform does not guarantee token value or liquidity</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Risk Disclosure</h2>
              <p className="leading-relaxed">
                Cryptocurrency trading involves substantial risk. You may lose all or part of your investment. The platform provides tools and services "as is" without warranties of any kind. We are not responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Market volatility and price fluctuations</li>
                <li>Smart contract vulnerabilities or exploits</li>
                <li>Loss of funds due to user error</li>
                <li>Network congestion or transaction failures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Intellectual Property</h2>
              <p className="leading-relaxed">
                The platform's design, features, and content are protected by intellectual property laws. You may not copy, modify, or distribute our intellectual property without permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Privacy and Data</h2>
              <p className="leading-relaxed">
                We respect your privacy. Please review our Privacy Policy to understand how we collect and use information. By using the platform, you consent to our data practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Prohibited Activities</h2>
              <p className="leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Manipulate or attempt to manipulate token prices</li>
                <li>Create tokens that infringe on intellectual property rights</li>
                <li>Use the platform for money laundering or illegal activities</li>
                <li>Attempt to hack or exploit the platform or its smart contracts</li>
                <li>Impersonate others or provide false information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Limitation of Liability</h2>
              <p className="leading-relaxed">
                To the maximum extent permitted by law, S4 Launchpad and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Indemnification</h2>
              <p className="leading-relaxed">
                You agree to indemnify and hold harmless S4 Launchpad, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Modifications</h2>
              <p className="leading-relaxed">
                We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Governing Law</h2>
              <p className="leading-relaxed">
                These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text-primary mb-4">12. Contact Information</h2>
              <p className="leading-relaxed">
                For questions about these Terms of Service, please contact us through our official channels.
              </p>
            </section>

            <div className="pt-6 mt-8 border-t border-border">
              <p className="text-sm text-text-primary/60">
                Last updated: January 15, 2025
              </p>
              <p className="text-sm text-text-primary/60 mt-2">
                Version 1.0
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </LayoutShell>
  );
}