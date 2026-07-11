'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '@/context/Web3Context';
import { api } from '@/services/api';
import { Landmark, ArrowLeft, Plus, Trash, Loader2, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function PostJobPage() {
  const { isConnected, isSiweAuthenticated } = useWeb3();
  const router = useRouter();

  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Development');
  const [tagsInput, setTagsInput] = useState('');
  const [budget, setBudget] = useState(2.0);
  const [useTokenAddress, setUseTokenAddress] = useState(false);
  const [tokenAddress, setTokenAddress] = useState('');
  const [isMilestoneBased, setIsMilestoneBased] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user role
  useEffect(() => {
    if (isConnected && isSiweAuthenticated) {
      setLoadingRole(true);
      api.getMe()
        .then(user => {
          setRole(user.role);
          setLoadingRole(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingRole(false);
        });
    } else {
      setLoadingRole(false);
    }
  }, [isConnected, isSiweAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const tagsArray = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const jobData = {
        title,
        description,
        category,
        tags: tagsArray,
        budget: Number(budget),
        isMilestoneBased,
        tokenAddress: useTokenAddress ? tokenAddress || undefined : undefined,
        chainId: 31337, // default hardhat net
      };

      await api.createJob(jobData);
      router.push('/jobs');
    } catch (err: any) {
      console.error('Failed to post job:', err);
      setError(err.message || 'Failed to submit job posting.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'Development',
    'Design',
    'Marketing',
    'Content Writing',
    'Cybersecurity',
    'Smart Contracts',
  ];

  if (!isConnected || !isSiweAuthenticated) {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <div className="glass-card p-8 border-slate-800/40 space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto border border-indigo-500/20">
            <Landmark className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Client Auth Required</h2>
          <p className="text-slate-400">
            Please connect your wallet and log in to publish projects.
          </p>
        </div>
      </div>
    );
  }

  if (loadingRole) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
        <span className="text-slate-400">Authenticating client session...</span>
      </div>
    );
  }

  if (role !== 'CLIENT') {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <div className="glass-card p-8 border-slate-800/40 space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 mx-auto border border-red-500/20">
            <Landmark className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Hiring Account Required</h2>
          <p className="text-slate-400 mb-6">
            Your current profile is configured as a **Freelancer**. Switch your role to **Client** on the profile page to list new job descriptions.
          </p>
          <Link
            href="/profile"
            className="inline-flex rounded-xl bg-slate-800 hover:bg-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-200"
          >
            Go to Profile Switcher
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Back Link */}
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 flex items-center gap-2">
          Post a New Project
        </h1>
        <p className="text-slate-400">Define your project requirements, specify funding amounts, and prepare smart escrow parameters.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400 font-medium animate-pulse">
          {error}
        </div>
      )}

      <div className="glass-card p-8 border-slate-800/40">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Job Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Develop ERC20 Staking Escrow App"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Total Budget (ETH)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Skills Tags (Comma separated)</label>
            <input
              type="text"
              placeholder="React, Hardhat, Solidity, Ethers"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Job Description & Scope</label>
            <textarea
              required
              rows={8}
              placeholder="Outline the goals, developer requirements, scope of work, and expected milestone completions..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none resize-none"
            />
          </div>

          {/* Escrow Settings */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Web3 Escrow Configurations
            </h3>
            
            <div className="flex items-center justify-between py-2 border-b border-indigo-500/10">
              <div className="text-xs">
                <span className="font-bold text-slate-200 block">Milestone Based Escrow Payments</span>
                <span className="text-slate-400">Escrow funds are locked securely and payout occurs in stages</span>
              </div>
              <input
                type="checkbox"
                checked={isMilestoneBased}
                disabled
                className="h-4 w-4 text-indigo-600 rounded cursor-not-allowed"
              />
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Upon selection of an applicant, you will deposit the total milestone amount into a dedicated escrow contract proxy clone. The freelancer submits work deliverables to specific milestones, and you release the payment to their wallet once verified.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="glow-btn flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 w-full transition-all"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Publish Project Post
          </button>
        </form>
      </div>
    </div>
  );
}
