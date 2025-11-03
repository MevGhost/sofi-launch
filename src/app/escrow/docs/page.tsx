'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutShell, SectionHeader } from '@/components/alien/Layout';
import { Button } from '@/components/alien/Button';
import { Card } from '@/components/alien/Card';
import { 
  FiBookOpen, 
  FiCode, 
  FiShield, 
  FiZap, 
  FiUsers, 
  FiFileText,
  FiChevronRight,
  FiExternalLink,
  FiSearch,
  FiCopy,
  FiCheck
} from 'react-icons/fi';

export default function EscrowDocsPage() {
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: FiBookOpen },
    { id: 'quickstart', label: 'Quick Start', icon: FiZap },
    { id: 'contracts', label: 'Smart Contracts', icon: FiCode },
    { id: 'integration', label: 'Integration Guide', icon: FiFileText },
    { id: 'security', label: 'Security', icon: FiShield },
    { id: 'faq', label: 'FAQ', icon: FiUsers },
  ];

  const codeExamples = {
    createEscrow: `// Create a new escrow
const escrow = await escrowFactory.createEscrow({
  kol: "0x...",
  token: "0x...",
  amount: ethers.utils.parseEther("1000"),
  milestones: [
    { amount: 500, deadline: timestamp1 },
    { amount: 500, deadline: timestamp2 }
  ]
});`,
    claimFunds: `// KOL claims milestone funds
await escrow.claim(milestoneId, proof);`,
    releasePayment: `// Project releases payment
await escrow.release(milestoneId);`
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      
      
      <div className="relative z-10 container mx-auto px-4 py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] bg-clip-text text-transparent">
            Escrow Documentation
          </h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Complete guide to integrating and using the S4 Labs escrow system on Base L2
          </p>
        </motion.div>

        {/* FiSearch Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto mb-12"
        >
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface2 backdrop-blur-xl border border-border rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-surface2 backdrop-blur-xl border border-border rounded-xl p-6 sticky top-24">
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                Documentation
              </h3>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activeSection === section.id
                          ? 'bg-gradient-to-r from-[#0052FF]/20 to-[#0EA5E9]/20 text-[#0EA5E9] border border-[#0EA5E9]/30'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface3'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{section.label}</span>
                      {activeSection === section.id && (
                        <FiChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <div className="bg-surface2 backdrop-blur-xl border border-border rounded-xl p-8">
              {/* Overview Section */}
              {activeSection === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-text-primary mb-4">Overview</h2>
                    <p className="text-text-muted leading-relaxed mb-6">
                      The S4 Labs Escrow System is a decentralized, trustless solution for managing payments between projects and KOLs (Key Opinion Leaders) on Base L2. Built with security and efficiency in mind, our smart contracts ensure transparent and fair transactions for all parties.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-xl font-semibold text-text-primary mb-3">For Projects</h3>
                      <ul className="space-y-2 text-text-muted">
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Secure milestone-based payments</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Automated release conditions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Dispute resolution mechanisms</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-xl font-semibold text-text-primary mb-3">For KOLs</h3>
                      <ul className="space-y-2 text-text-muted">
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Guaranteed payment security</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Transparent milestone tracking</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Easy proof submission</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#0052FF]/10 to-[#0EA5E9]/10 rounded-lg p-6 border border-[#0EA5E9]/30">
                    <h3 className="text-xl font-semibold text-text-primary mb-3">Key Features</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-[#0EA5E9]/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <FiShield className="w-6 h-6 text-[#0EA5E9]" />
                        </div>
                        <h4 className="font-medium text-text-primary mb-1">Secure</h4>
                        <p className="text-xs text-text-muted">Audited smart contracts</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-[#0EA5E9]/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <FiZap className="w-6 h-6 text-[#0EA5E9]" />
                        </div>
                        <h4 className="font-medium text-text-primary mb-1">Fast</h4>
                        <p className="text-xs text-text-muted">Instant settlements on Base L2</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-[#0EA5E9]/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <FiUsers className="w-6 h-6 text-[#0EA5E9]" />
                        </div>
                        <h4 className="font-medium text-text-primary mb-1">Fair</h4>
                        <p className="text-xs text-text-muted">Transparent dispute resolution</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Start Section */}
              {activeSection === 'quickstart' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-text-primary mb-4">Quick Start</h2>
                    <p className="text-text-muted leading-relaxed mb-6">
                      Get started with the S4 Labs Escrow system in just a few steps.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] rounded-full flex items-center justify-center text-text-primary font-bold">
                          1
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary">Connect Your Wallet</h3>
                      </div>
                      <p className="text-text-muted mb-4">
                        Connect your Web3 wallet to Base L2 network. Make sure you have some ETH for gas fees.
                      </p>
                      <div className="bg-canvas/40 rounded-lg p-4 font-mono text-sm text-gray-300">
                        Network: Base L2<br />
                        Chain ID: 8453<br />
                        RPC: https://mainnet.base.org
                      </div>
                    </div>

                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] rounded-full flex items-center justify-center text-text-primary font-bold">
                          2
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary">Create an Escrow</h3>
                      </div>
                      <p className="text-text-muted mb-4">
                        Use our factory contract to deploy a new escrow with your desired parameters.
                      </p>
                      <div className="bg-canvas/40 rounded-lg p-4 relative">
                        <button
                          onClick={() => copyToClipboard(codeExamples.createEscrow, 'create')}
                          className="absolute top-2 right-2 p-2 hover:bg-surface2 rounded-lg transition-colors"
                        >
                          {copiedCode === 'create' ? (
                            <FiCheck className="w-4 h-4 text-green-400" />
                          ) : (
                            <FiCopy className="w-4 h-4 text-text-muted" />
                          )}
                        </button>
                        <pre className="font-mono text-sm text-gray-300 overflow-x-auto">
                          <code>{codeExamples.createEscrow}</code>
                        </pre>
                      </div>
                    </div>

                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-[#0052FF] to-[#0EA5E9] rounded-full flex items-center justify-center text-text-primary font-bold">
                          3
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary">Manage Milestones</h3>
                      </div>
                      <p className="text-text-muted mb-4">
                        Projects can release payments and KOLs can claim funds as milestones are completed.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-canvas/40 rounded-lg p-4 relative">
                          <button
                            onClick={() => copyToClipboard(codeExamples.releasePayment, 'release')}
                            className="absolute top-2 right-2 p-2 hover:bg-surface2 rounded-lg transition-colors"
                          >
                            {copiedCode === 'release' ? (
                              <FiCheck className="w-4 h-4 text-green-400" />
                            ) : (
                              <FiCopy className="w-4 h-4 text-text-muted" />
                            )}
                          </button>
                          <pre className="font-mono text-sm text-gray-300">
                            <code>{codeExamples.releasePayment}</code>
                          </pre>
                        </div>
                        <div className="bg-canvas/40 rounded-lg p-4 relative">
                          <button
                            onClick={() => copyToClipboard(codeExamples.claimFunds, 'claim')}
                            className="absolute top-2 right-2 p-2 hover:bg-surface2 rounded-lg transition-colors"
                          >
                            {copiedCode === 'claim' ? (
                              <FiCheck className="w-4 h-4 text-green-400" />
                            ) : (
                              <FiCopy className="w-4 h-4 text-text-muted" />
                            )}
                          </button>
                          <pre className="font-mono text-sm text-gray-300">
                            <code>{codeExamples.claimFunds}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Contracts Section */}
              {activeSection === 'contracts' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-text-primary mb-4">Smart Contracts</h2>
                    <p className="text-text-muted leading-relaxed mb-6">
                      Our escrow system consists of modular, upgradeable smart contracts deployed on Base L2.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-xl font-semibold text-text-primary mb-4">Contract Architecture</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-[#0EA5E9] rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-medium text-text-primary mb-1">EscrowFactory.sol</h4>
                            <p className="text-sm text-text-muted">
                              Factory contract for deploying new escrow instances using minimal proxy pattern for gas efficiency.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-[#0EA5E9] rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-medium text-text-primary mb-1">Escrow.sol</h4>
                            <p className="text-sm text-text-muted">
                              Individual escrow contract managing milestone-based payments between parties.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-2 h-2 bg-[#0EA5E9] rounded-full mt-2"></div>
                          <div>
                            <h4 className="font-medium text-text-primary mb-1">AdminEscrow.sol</h4>
                            <p className="text-sm text-text-muted">
                              Admin-controlled variant for platform-managed escrows with additional oversight.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-xl font-semibold text-text-primary mb-4">Deployed Addresses</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-canvas/40 rounded-lg">
                          <div>
                            <p className="text-sm text-text-muted">EscrowFactory (Base Mainnet)</p>
                            <p className="font-mono text-xs text-[#0EA5E9]">0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7</p>
                          </div>
                          <a
                            href="https://basescan.org/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-surface2 rounded-lg transition-colors"
                          >
                            <FiExternalLink className="w-4 h-4 text-text-muted" />
                          </a>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-canvas/40 rounded-lg">
                          <div>
                            <p className="text-sm text-text-muted">AdminEscrowFactory (Base Mainnet)</p>
                            <p className="font-mono text-xs text-[#0EA5E9]">0x5FbDB2315678afecb367f032d93F642f64180aa3</p>
                          </div>
                          <a
                            href="https://basescan.org/address/0x5FbDB2315678afecb367f032d93F642f64180aa3"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-surface2 rounded-lg transition-colors"
                          >
                            <FiExternalLink className="w-4 h-4 text-text-muted" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Integration Guide Section */}
              {activeSection === 'integration' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-text-primary mb-4">Integration Guide</h2>
                    <p className="text-text-muted leading-relaxed mb-6">
                      Integrate the S4 Labs Escrow system into your application with our SDKs and APIs.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-lg font-semibold text-text-primary mb-4">JavaScript/TypeScript SDK</h3>
                      <div className="bg-canvas/40 rounded-lg p-4 mb-4">
                        <code className="text-sm text-gray-300">npm install @s4labs/escrow-sdk</code>
                      </div>
                      <ul className="space-y-2 text-sm text-text-muted">
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Full TypeScript support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Built-in wallet connections</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Event listeners</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-lg font-semibold text-text-primary mb-4">REST API</h3>
                      <div className="bg-canvas/40 rounded-lg p-4 mb-4">
                        <code className="text-sm text-gray-300">https://api.s4labs.xyz/v1/escrow</code>
                      </div>
                      <ul className="space-y-2 text-sm text-text-muted">
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>RESTful endpoints</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>WebSocket support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiChevronRight className="w-4 h-4 text-[#0EA5E9] mt-0.5" />
                          <span>Rate limiting: 100 req/min</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-text-primary mb-4">Security</h2>
                    <p className="text-text-muted leading-relaxed mb-6">
                      Security is our top priority. Our contracts are audited and follow best practices.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-[#0052FF]/10 to-[#0EA5E9]/10 rounded-lg p-6 border border-[#0EA5E9]/30 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <FiShield className="w-6 h-6 text-[#0EA5E9]" />
                      <h3 className="text-xl font-semibold text-text-primary">Security Features</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <ul className="space-y-2 text-sm text-text-muted">
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-4 h-4 text-green-400 mt-0.5" />
                          <span>ReentrancyGuard on all fund transfers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-4 h-4 text-green-400 mt-0.5" />
                          <span>Pausable emergency mechanisms</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-4 h-4 text-green-400 mt-0.5" />
                          <span>Time-locked admin functions</span>
                        </li>
                      </ul>
                      <ul className="space-y-2 text-sm text-text-muted">
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-4 h-4 text-green-400 mt-0.5" />
                          <span>Multi-signature wallet support</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-4 h-4 text-green-400 mt-0.5" />
                          <span>Formal verification completed</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FiCheck className="w-4 h-4 text-green-400 mt-0.5" />
                          <span>Bug bounty program active</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-surface2 rounded-lg p-6 border border-border">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Audit Reports</h3>
                    <div className="space-y-3">
                      <a
                        href="#"
                        className="flex items-center justify-between p-3 bg-canvas/40 rounded-lg hover:bg-canvas/60 transition-colors"
                      >
                        <div>
                          <p className="text-text-primary font-medium">OpenZeppelin Audit</p>
                          <p className="text-xs text-text-muted">Completed: March 2024</p>
                        </div>
                        <FiExternalLink className="w-4 h-4 text-text-muted" />
                      </a>
                      <a
                        href="#"
                        className="flex items-center justify-between p-3 bg-canvas/40 rounded-lg hover:bg-canvas/60 transition-colors"
                      >
                        <div>
                          <p className="text-text-primary font-medium">Trail of Bits Review</p>
                          <p className="text-xs text-text-muted">Completed: February 2024</p>
                        </div>
                        <FiExternalLink className="w-4 h-4 text-text-muted" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* FAQ Section */}
              {activeSection === 'faq' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-text-primary mb-4">Frequently Asked Questions</h2>
                    <p className="text-text-muted leading-relaxed mb-6">
                      Common questions about the S4 Labs Escrow system.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        What happens if there's a dispute?
                      </h3>
                      <p className="text-text-muted">
                        Our escrow system includes a built-in dispute resolution mechanism. Either party can initiate a dispute, which freezes the funds and triggers a review process by designated arbitrators.
                      </p>
                    </div>

                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        What are the fees?
                      </h3>
                      <p className="text-text-muted">
                        The platform charges a 2% fee on successful escrow completions. This fee is deducted from the final payment. There are no fees for creating escrows or for cancelled transactions.
                      </p>
                    </div>

                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        Which tokens are supported?
                      </h3>
                      <p className="text-text-muted">
                        Currently, we support all ERC-20 tokens on Base L2, including USDC, USDT, DAI, and native ETH. Token support is continuously expanding based on user demand.
                      </p>
                    </div>

                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        How long are funds locked?
                      </h3>
                      <p className="text-text-muted">
                        Funds are locked according to the milestone deadlines set during escrow creation. Each milestone can have its own timeline, typically ranging from 7 to 90 days.
                      </p>
                    </div>

                    <div className="bg-surface2 rounded-lg p-6 border border-border">
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        Can I cancel an escrow?
                      </h3>
                      <p className="text-text-muted">
                        Escrows can be cancelled by mutual agreement before any milestones are completed. Once a milestone is marked as complete, only the remaining uncompleted milestones can be cancelled.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resources Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 grid md:grid-cols-3 gap-6"
            >
              <a
                href="https://github.com/s4labs/escrow-contracts"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface2 backdrop-blur-xl border border-border rounded-xl p-6 hover:bg-surface2 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <FiCode className="w-8 h-8 text-[#0EA5E9]" />
                  <FiExternalLink className="w-4 h-4 text-text-muted group-hover:text-[#0EA5E9] transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">GitHub</h3>
                <p className="text-sm text-text-muted">
                  View source code and contribute to development
                </p>
              </a>

              <a
                href="#"
                className="bg-surface2 backdrop-blur-xl border border-border rounded-xl p-6 hover:bg-surface2 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <FiUsers className="w-8 h-8 text-[#0EA5E9]" />
                  <FiExternalLink className="w-4 h-4 text-text-muted group-hover:text-[#0EA5E9] transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Discord</h3>
                <p className="text-sm text-text-muted">
                  Join our community for support and updates
                </p>
              </a>

              <a
                href="#"
                className="bg-surface2 backdrop-blur-xl border border-border rounded-xl p-6 hover:bg-surface2 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <FiFileText className="w-8 h-8 text-[#0EA5E9]" />
                  <FiExternalLink className="w-4 h-4 text-text-muted group-hover:text-[#0EA5E9] transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">API Reference</h3>
                <p className="text-sm text-text-muted">
                  Complete API documentation and examples
                </p>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}