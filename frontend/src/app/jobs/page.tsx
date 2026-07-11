'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { Search, Briefcase, ChevronRight, DollarSign, Cpu, Tag, RefreshCcw, Loader2 } from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter states
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [minBudget, setMinBudget] = useState<number | undefined>(undefined);
  const [maxBudget, setMaxBudget] = useState<number | undefined>(undefined);
  const [selectedChain, setSelectedChain] = useState<number | undefined>(undefined);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchJobs({
        query: query || undefined,
        category: category || undefined,
        minBudget: minBudget !== undefined ? minBudget : undefined,
        maxBudget: maxBudget !== undefined ? maxBudget : undefined,
        chainId: selectedChain || undefined,
        status: 'OPEN',
      });
      setJobs(data);
    } catch (err: any) {
      console.error('Failed to search jobs:', err);
      setError(err.message || 'Failed to retrieve jobs list.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch jobs on load
  useEffect(() => {
    fetchJobs();
  }, []);

  // Handle filter resets
  const handleResetFilters = () => {
    setQuery('');
    setCategory('');
    setMinBudget(undefined);
    setMaxBudget(undefined);
    setSelectedChain(undefined);
    
    // Fetch initial list again
    api.searchJobs({ status: 'OPEN' })
      .then(setJobs)
      .catch(err => console.error(err));
  };

  const categories = [
    'Development',
    'Design',
    'Marketing',
    'Content Writing',
    'Cybersecurity',
    'Smart Contracts',
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100">Job Marketplace</h1>
        <p className="text-slate-400">Explore open projects, submit proposals, and secure payments via on-chain milestone escrow.</p>
      </div>

      {/* Filter Options */}
      <div className="glass-card p-6 border-slate-800/40 grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
        {/* Search Input */}
        <div className="lg:col-span-2 space-y-1">
          <label className="text-xs font-semibold text-slate-400">Search keywords</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Solidity Developer, Frontend audit..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-xl bg-slate-950/50 border border-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
            />
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3.5" />
          </div>
        </div>

        {/* Category Select */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Budget Select */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">Min Budget</label>
          <input
            type="number"
            placeholder="Min amount"
            value={minBudget || ''}
            onChange={e => setMinBudget(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={fetchJobs}
            className="flex-1 glow-btn rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-indigo-600/30"
          >
            Search
          </button>
          
          <button
            onClick={handleResetFilters}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            title="Reset Filters"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Jobs Listing */}
      {error && (
        <div className="rounded-xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400 font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="glass-card h-32 animate-pulse border-slate-800/40"></div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 border-slate-800/40">
          No open job listings matched your filters. Adjust settings or check back later!
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="glass-card p-6 border-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-500/30 transition-all hover:bg-slate-950/10"
            >
              <div className="space-y-3 max-w-3xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="rounded-full bg-slate-900 border border-slate-800/60 px-2.5 py-0.5 text-xs text-indigo-400 font-semibold">
                    {job.category}
                  </span>
                  {job.isMilestoneBased && (
                    <span className="rounded-full bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400 font-semibold">
                      Milestone Escrow
                    </span>
                  )}
                  {job.chainId === 31337 && (
                    <span className="rounded-full bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-0.5 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      Hardhat Net
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-200 hover:text-indigo-400 transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mt-1">
                    {job.description}
                  </p>
                </div>

                {job.tags && job.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {job.tags.map((tag: string) => (
                      <span key={tag} className="flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-xs text-slate-400 border border-slate-800/60">
                        <Tag className="h-3 w-3 text-slate-500" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t md:border-t-0 border-slate-800 md:border-l md:pl-8 pt-4 md:pt-0 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 min-w-[150px]">
                <div className="md:text-right">
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Budget</span>
                  <div className="font-mono text-emerald-400 font-extrabold text-xl md:text-2xl mt-0.5 flex items-center gap-0.5 justify-end">
                    {job.budget} {job.tokenAddress ? 'USDC' : 'ETH'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-400 group-hover:text-indigo-300">
                  Apply Details
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
