'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { api } from '@/services/api';
import { Shield, Sparkles, Zap, Users, Landmark, ChevronRight, Award, BadgeDollarSign, HeartHandshake } from 'lucide-react';

export default function Home() {
  const { isConnected, isSiweAuthenticated, connectWallet } = useWeb3();
  const [stats, setStats] = useState({
    openJobs: 0,
    activeContracts: 0,
    freelancers: 0,
    clients: 0,
  });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [overview, jobs] = await Promise.all([
          api.getAnalyticsOverview(),
          api.getJobs(),
        ]);
        setStats(overview);
        setRecentJobs(jobs.slice(0, 3));
      } catch (err) {
        console.error('Failed to fetch platform landing data:', err);
        // Fallback placeholders for display
        setStats({
          openJobs: 12,
          activeContracts: 4,
          freelancers: 28,
          clients: 15,
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const features = [
    {
      title: 'Decentralized Escrow',
      description: 'Funds are securely locked in smart contracts and released automatically as milestones are approved.',
      icon: Shield,
      color: 'from-blue-500/20 to-indigo-500/10 text-indigo-400 border-indigo-500/15',
    },
    {
      title: 'Instant Milestones',
      description: 'Create milestone structures. Submit work, review progress, and pay instantly with near-zero latency.',
      icon: Zap,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/15',
    },
    {
      title: 'Zero Platform Friction',
      description: 'Interact directly client-to-freelancer. No hidden overheads, minimal platform fees, secure SIWE logins.',
      icon: BadgeDollarSign,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/15',
    },
    {
      title: 'Immutable Reputation',
      description: 'Ratings and completion ratios are written immutably on-chain to construct verifiable Web3 CVs.',
      icon: Award,
      color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/15',
    },
  ];

  return (
    <div className="space-y-20 py-4">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center px-4 py-16 md:py-24 rounded-3xl overflow-hidden bg-slate-950/20 border border-slate-800/30">
        {/* Background glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300 mb-6 animate-pulse">
          <Sparkles className="h-3.5 w-3.5" />
          The Future of Decentralized Work
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl text-slate-100 leading-tight">
          Trustless Freelance Economy <br className="hidden sm:inline" />
          <span className="from-indigo-400 via-cyan-400 to-emerald-400 bg-gradient-to-r bg-clip-text text-transparent">
            Powered by Smart Escrows
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
          DecentWork connects top global freelancers with forward-thinking Web3 clients. Fund milestones securely and release payments upon approval.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link
            href="/jobs"
            className="glow-btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/35 hover:shadow-indigo-600/60 transition-all duration-300"
          >
            Browse Open Jobs
            <ChevronRight className="h-4 w-4" />
          </Link>
          
          {!isSiweAuthenticated ? (
            <button
              onClick={() => connectWallet(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-slate-200 hover:bg-slate-800 transition-all active:scale-95 duration-300"
            >
              Get Started (Mock Log)
            </button>
          ) : (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 backdrop-blur-sm px-8 py-3.5 text-base font-semibold text-slate-200 hover:bg-slate-800 transition-all active:scale-95 duration-300"
            >
              Go to Profile
            </Link>
          )}
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
        {[
          { label: 'Open Jobs', value: stats.openJobs, suffix: '', icon: Zap },
          { label: 'Active Escrows', value: stats.activeContracts, suffix: '', icon: Landmark },
          { label: 'Freelancers', value: stats.freelancers, suffix: '+', icon: Users },
          { label: 'Client Companies', value: stats.clients, suffix: '+', icon: HeartHandshake },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-card flex items-center gap-4 p-6 border-slate-800/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-slate-100">
                  {stat.value}
                  {stat.suffix}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Features Grid */}
      <section className="space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl font-bold text-slate-100">Why DecentWork?</h2>
          <p className="text-slate-400">
            Eliminating traditional payment risks through decentralized smart contract design.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="glass-card p-6 border-slate-800/40 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border bg-gradient-to-br p-2.5 ${feat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-200">{feat.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Open Jobs */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">Trending Job Opportunities</h2>
          <Link href="/jobs" className="flex items-center gap-1 text-sm font-semibold text-indigo-400 hover:text-indigo-300">
            View All Jobs
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card h-48 animate-pulse border-slate-800/40"></div>
            ))}
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="glass-card p-12 text-center text-slate-400 border-slate-800/40">
            No open jobs at the moment. Check back soon!
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {recentJobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`} className="glass-card p-6 border-slate-800/40 flex flex-col justify-between hover:-translate-y-1">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs text-indigo-400 font-semibold">
                      {job.category}
                    </span>
                    <span className="text-xs text-slate-500">
                      {job.chainId === 31337 ? 'Hardhat' : 'Ethereum'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-200 line-clamp-1 mb-2">{job.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {job.description}
                  </p>
                </div>
                <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between mt-auto">
                  <div>
                    <span className="text-xs text-slate-500 block uppercase tracking-wider">Budget</span>
                    <span className="font-mono text-emerald-400 font-bold text-lg">
                      {job.budget} {job.tokenAddress ? 'USDC' : 'ETH'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-indigo-600/10 px-3 py-1.5 text-xs text-indigo-400 font-semibold border border-indigo-500/20">
                    Apply Now
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
