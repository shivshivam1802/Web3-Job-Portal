'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { api } from '@/services/api';
import { Landmark, FileText, ChevronRight, DollarSign, Loader2, Award, ShieldAlert, CheckCircle } from 'lucide-react';

export default function ContractsPage() {
  const { isConnected, isSiweAuthenticated } = useWeb3();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !isSiweAuthenticated) return;

    const fetchContracts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getMyContracts();
        setContracts(data);
      } catch (err: any) {
        console.error('Failed to load contracts:', err);
        setError(err.message || 'Failed to fetch contracts.');
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [isConnected, isSiweAuthenticated]);

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected || !isSiweAuthenticated) {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <div className="glass-card p-8 border-slate-800/40 space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto border border-indigo-500/20">
            <FileText className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Wallet Login Required</h2>
          <p className="text-slate-400">
            Please connect your wallet and log in to inspect your active escrows and milestone progress.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
        <span className="text-slate-400">Loading Contracts Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100">Contracts Escrow</h1>
        <p className="text-slate-400">Monitor active agreements, secure deposits in smart contracts, and release milestone payouts.</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400 font-medium">
          {error}
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="glass-card p-12 text-center text-slate-400 border-slate-800/40 space-y-4">
          <Landmark className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-200">No Active Contracts</h3>
          <p className="text-sm max-w-md mx-auto">
            You do not have any active escrow contracts. Apply to a job or accept a proposal to initialize one.
          </p>
          <Link
            href="/jobs"
            className="inline-flex rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-6 py-2.5 text-xs font-semibold text-white shadow-md"
          >
            Find a Job
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="glass-card p-6 border-slate-800/40 flex flex-col justify-between hover:border-indigo-500/20"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    contract.status === 'ACTIVE' 
                      ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400'
                      : contract.status === 'COMPLETED'
                      ? 'bg-indigo-950/40 border border-indigo-500/20 text-indigo-400'
                      : 'bg-amber-950/40 border border-amber-500/20 text-amber-400'
                  }`}>
                    {contract.status}
                  </span>
                  
                  <span className="text-[11px] font-mono text-slate-500 hover:text-indigo-400 transition-colors">
                    Escrow: {truncateAddress(contract.escrowAddress)}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-200 line-clamp-1">{contract.job?.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Freelancer: <span className="text-slate-300 font-medium">{contract.freelancer?.user?.username || 'freelancer'}</span>
                  </p>
                </div>

                {/* Milestone summary */}
                <div className="bg-slate-950/30 border border-slate-850/40 rounded-xl p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block uppercase tracking-wider">Budget</span>
                    <span className="font-mono text-emerald-400 font-extrabold text-base mt-0.5">
                      {contract.totalBudget} ETH
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase tracking-wider text-right">Milestones</span>
                    <span className="text-slate-300 font-bold block text-right mt-0.5">
                      {contract.milestones?.length || 1} Stages
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800/60 pt-4 mt-6 flex items-center justify-end">
                <Link
                  href={`/contracts/${contract.id}`}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  Manage Milestone Escrow
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
