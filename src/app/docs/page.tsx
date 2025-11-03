'use client';

import React from 'react';
import { LayoutShell, SectionHeader } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/useIsMobile';
import { MobileLayout, MobileCard } from '@/components/mobile/MobileLayout';

export default function DocsPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileLayout showNav title="Documentation">
        <div className="min-h-screen px-4 py-6">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Documentation</h1>
          
          {/* Introduction */}
          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Introduction</h2>
            <p className="text-text-secondary text-sm mb-3">
              Let's Bonk! is a meme coin launchpad built on Base L2, powered by S4 Labs.
            </p>
            <p className="text-text-secondary text-sm">
              Create and trade tokens using our fair bonding curve mechanism.
            </p>
          </MobileCard>

          {/* Getting Started */}
          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Getting Started</h2>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <p className="text-text-secondary text-sm">Connect your wallet</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <p className="text-text-secondary text-sm">Get Base ETH for gas</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <p className="text-text-secondary text-sm">Launch or trade tokens</p>
              </div>
            </div>
          </MobileCard>

          {/* Features */}
          <MobileCard className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Key Features</h2>
            <ul className="space-y-2">
              <li className="text-text-secondary text-sm">• Fair bonding curve launches</li>
              <li className="text-text-secondary text-sm">• Automatic Uniswap V3 deployment</li>
              <li className="text-text-secondary text-sm">• Anti-rug mechanisms</li>
              <li className="text-text-secondary text-sm">• Community-driven</li>
            </ul>
          </MobileCard>

          {/* Links */}
          <MobileCard>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Resources</h2>
            <div className="space-y-2">
              <a href="#" className="text-primary text-sm hover:underline block">Contract Documentation</a>
              <a href="#" className="text-primary text-sm hover:underline block">API Reference</a>
              <a href="#" className="text-primary text-sm hover:underline block">GitHub Repository</a>
            </div>
          </MobileCard>
        </div>
      </MobileLayout>
    );
  }
  return (
    <LayoutShell>
      <div className="container mx-auto px-4 pt-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl font-bold text-text-primary mb-8">Documentation</h1>
          
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Introduction</h2>
            <div className="glass rounded-xl p-6">
              <p className="text-text-secondary mb-4">
                Let&apos;s Bonk! is a meme coin launchpad built on Base L2, powered by S4 Labs. 
                Our platform enables anyone to create and trade tokens using a fair bonding curve mechanism.
              </p>
              <p className="text-text-secondary">
                When a token&apos;s bonding curve reaches 100%, liquidity is automatically deployed to Uniswap V3, 
                ensuring permanent liquidity and decentralized trading.
              </p>
            </div>
          </section>

          {/* How It Works */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">1. Token Creation</h3>
                <ul className="space-y-2 text-text-secondary">
                  <li>• Choose your token name, symbol, and supply</li>
                  <li>• Configure bonding curve parameters</li>
                  <li>• Pay a one-time launch fee of 0.02 ETH</li>
                  <li>• Token deploys instantly on Base L2</li>
                </ul>
              </div>
              
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">2. Bonding Curve</h3>
                <ul className="space-y-2 text-text-secondary">
                  <li>• Price increases as more tokens are purchased</li>
                  <li>• Fair launch mechanism - no pre-sales or team allocation</li>
                  <li>• Transparent pricing based on mathematical formula</li>
                  <li>• Progress tracked in real-time</li>
                </ul>
              </div>
              
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">3. Liquidity Migration</h3>
                <ul className="space-y-2 text-text-secondary">
                  <li>• At 100% bonding curve completion</li>
                  <li>• Liquidity automatically moves to Uniswap V3</li>
                  <li>• Creates concentrated liquidity position</li>
                  <li>• Token becomes permanently tradeable</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Fees */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Fees</h2>
            <div className="glass rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-secondary">Token Launch Fee</span>
                  <span className="text-text-primary font-semibold">0.02 ETH</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-secondary">Trading Fee</span>
                  <span className="text-text-primary font-semibold">2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Gas Fees</span>
                  <span className="text-text-primary font-semibold">Base L2 rates (very low)</span>
                </div>
              </div>
            </div>
          </section>

          {/* Smart Contracts */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Smart Contracts</h2>
            <div className="glass rounded-xl p-6">
              <p className="text-text-secondary mb-4">
                All smart contracts are deployed on Base L2 and verified on Basescan.
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-text-muted text-sm mb-1">Bonding Curve Factory</p>
                  <code className="text-blue-400 text-sm">Coming Soon</code>
                </div>
                <div>
                  <p className="text-text-muted text-sm mb-1">Router Contract</p>
                  <code className="text-blue-400 text-sm">Coming Soon</code>
                </div>
              </div>
            </div>
          </section>

          {/* API Documentation */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">API Endpoints</h2>
            <div className="space-y-4">
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">GET /api/tokens</h3>
                <p className="text-text-secondary mb-2">Fetch list of tokens with pagination and filters</p>
                <pre className="bg-surface3 p-3 rounded text-sm text-text-muted overflow-x-auto">
{`Parameters:
- limit: number (default: 50)
- offset: number (default: 0)
- sortBy: string (marketCap|volume|holders|change24h)
- search: string`}
                </pre>
              </div>
              
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">POST /api/trade</h3>
                <p className="text-text-secondary mb-2">Execute a trade on the bonding curve</p>
                <pre className="bg-surface3 p-3 rounded text-sm text-text-muted overflow-x-auto">
{`Body:
{
  "tokenAddress": "0x...",
  "type": "buy" | "sell",
  "amount": "1000"
}`}
                </pre>
              </div>
              
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-3">GET /api/stats</h3>
                <p className="text-text-secondary mb-2">Get platform statistics</p>
                <pre className="bg-surface3 p-3 rounded text-sm text-text-muted overflow-x-auto">
{`Response:
{
  "tokensLaunched": 12345,
  "totalVolume": 45678900,
  "activeTraders": 89234,
  ...
}`}
                </pre>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Support</h2>
            <div className="glass rounded-xl p-6">
              <p className="text-text-secondary mb-4">
                Need help? The S4 Labs team is here to assist you.
              </p>
              <div className="space-y-2">
                <p className="text-text-secondary">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#0EA5E9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    General inquiries: <a href="mailto:contact@s4labs.xyz" className="text-blue-400 hover:text-blue-300">contact@s4labs.xyz</a>
                  </span>
                </p>
                <p className="text-text-secondary">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#0EA5E9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Technical support: <a href="mailto:support@s4labs.xyz" className="text-blue-400 hover:text-blue-300">support@s4labs.xyz</a>
                  </span>
                </p>
                <p className="text-text-secondary">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#0EA5E9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin/Partnership: <a href="mailto:admin@s4labs.xyz" className="text-blue-400 hover:text-blue-300">admin@s4labs.xyz</a>
                  </span>
                </p>
                <p className="text-text-secondary mt-4">
                  Follow us on Twitter:{' '}
                  <a href="https://twitter.com/s4onbase" className="text-blue-400 hover:text-blue-300">@s4onbase</a>
                  {' '}|{' '}
                  <a href="https://twitter.com/getonS4" className="text-blue-400 hover:text-blue-300">@getonS4</a>
                </p>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </LayoutShell>
  );
}