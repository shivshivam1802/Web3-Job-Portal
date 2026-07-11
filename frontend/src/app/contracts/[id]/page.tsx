'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '@/context/Web3Context';
import { api } from '@/services/api';
import { 
  ArrowLeft, 
  Landmark, 
  Clock, 
  CheckCircle, 
  Loader2, 
  ExternalLink, 
  Send, 
  XOctagon, 
  Check, 
  Lock, 
  Unlock,
  AlertTriangle,
  FolderOpen,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const contractId = resolvedParams.id;

  const { isConnected, isSiweAuthenticated, address, fundMilestoneOnChain, releaseMilestoneOnChain } = useWeb3();
  const router = useRouter();

  const [contract, setContract] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Freelancer submit work form
  const [submitIpfs, setSubmitIpfs] = useState('');
  const [submittingWork, setSubmittingWork] = useState<number | null>(null);

  // Client feedback form for rejection
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [activeRejectIndex, setActiveRejectIndex] = useState<number | null>(null);

  // Tx loading status
  const [txLoadingIndex, setTxLoadingIndex] = useState<number | null>(null);
  const [txStatusMessage, setTxStatusMessage] = useState<string | null>(null);

  const fetchContractDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getContractDetail(contractId);
      setContract(data);

      if (isConnected && isSiweAuthenticated) {
        const u = await api.getMe();
        setCurrentUser(u);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve contract information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractDetails();
  }, [isConnected, isSiweAuthenticated, contractId]);

  const handleFundMilestone = async (milestone: any) => {
    setTxLoadingIndex(milestone.index);
    setTxStatusMessage('1/2: Submitting deposit transaction on-chain...');
    setError(null);

    try {
      // Step 1: Deposit funds into escrow on-chain
      await fundMilestoneOnChain(
        contract.escrowAddress,
        Number(milestone.budget),
        milestone.index
      );

      setTxStatusMessage('2/2: Confirming payment on database indexer...');

      // Step 2: Trigger indexer sync update directly for immediate response
      // In production the backend watches for logs, but we force sync for smooth dev experience
      await api.approveMilestoneWork(contract.id, milestone.index);

      // Reload state
      const updated = await api.getContractDetail(contractId);
      setContract(updated);
      setTxStatusMessage(null);
    } catch (err: any) {
      console.error('Funding failed:', err);
      setError(err.message || 'MetaMask transaction failed.');
    } finally {
      setTxLoadingIndex(null);
    }
  };

  const handleReleasePayment = async (milestone: any) => {
    setTxLoadingIndex(milestone.index);
    setTxStatusMessage('1/2: Invoking releaseMilestone on-chain...');
    setError(null);

    try {
      // Step 1: Trigger release contract payout on-chain
      await releaseMilestoneOnChain(contract.escrowAddress, milestone.index);

      setTxStatusMessage('2/2: Syncing database status & completing release...');

      // Step 2: Release milestone on backend
      await api.approveMilestoneWork(contract.id, milestone.index);

      // Reload state
      const updated = await api.getContractDetail(contractId);
      setContract(updated);
      setTxStatusMessage(null);
    } catch (err: any) {
      console.error('Release failed:', err);
      setError(err.message || 'Escrow release transaction failed.');
    } finally {
      setTxLoadingIndex(null);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent, milestone: any) => {
    e.preventDefault();
    setSubmittingWork(milestone.index);
    setError(null);

    try {
      await api.submitMilestoneWork(contract.id, milestone.index, submitIpfs || 'ipfs://QmDefaultHashGoesHere');
      setSubmitIpfs('');
      
      // Reload state
      const updated = await api.getContractDetail(contractId);
      setContract(updated);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setError(err.message || 'Failed to submit work deliverables.');
    } finally {
      setSubmittingWork(null);
    }
  };

  const handleRejectWork = async (e: React.FormEvent, milestone: any) => {
    e.preventDefault();
    setTxLoadingIndex(milestone.index);
    setError(null);

    try {
      await api.rejectMilestoneWork(contract.id, milestone.index, rejectFeedback);
      setRejectFeedback('');
      setActiveRejectIndex(null);

      // Reload state
      const updated = await api.getContractDetail(contractId);
      setContract(updated);
    } catch (err: any) {
      console.error('Rejection failed:', err);
      setError(err.message || 'Failed to reject work submission.');
    } finally {
      setTxLoadingIndex(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
        <span className="text-slate-400">Loading Escrow Ledger Details...</span>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <div className="glass-card p-8 border-slate-800/40 space-y-6">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-100">Contract Not Found</h2>
          <p className="text-slate-400">The requested escrow contract records do not exist.</p>
          <Link href="/contracts" className="inline-flex rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-200">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isClient = currentUser?.id === contract.clientId;
  const isFreelancer = currentUser?.id === contract.freelancerId;

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/contracts" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Contracts
      </Link>

      {error && (
        <div className="rounded-xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400 font-medium">
          {error}
        </div>
      )}

      {/* Header Info */}
      <div className="glass-card p-6 border-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-slate-900 border border-slate-800 px-2.5 py-0.5 text-xs text-indigo-400 font-semibold">
              Escrow Active
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Network: Hardhat (31337)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-200">{contract.job?.title}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Landmark className="h-3.5 w-3.5 text-indigo-400" />
              Escrow Address: <span className="font-mono text-slate-300">{contract.escrowAddress}</span>
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center min-w-[150px]">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Total Escrow Budget</span>
          <span className="font-mono text-emerald-400 font-extrabold text-2xl mt-1">
            {contract.totalBudget} ETH
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Milestones */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            Milestone Schedule
          </h2>

          <div className="space-y-6">
            {contract.milestones?.map((milestone: any) => {
              const isLoading = txLoadingIndex === milestone.index;
              return (
                <div 
                  key={milestone.id} 
                  className={`glass-card p-6 border-slate-800/40 space-y-4 ${
                    milestone.status === 'APPROVED' ? 'bg-indigo-950/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Milestone {milestone.index}
                      </span>
                      <h3 className="text-lg font-bold text-slate-200">{milestone.title}</h3>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="font-mono text-emerald-400 font-bold text-sm bg-slate-900 border border-slate-800/60 px-2.5 py-1 rounded-lg">
                        {milestone.budget} ETH
                      </span>
                      
                      <span className={`text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5 ${
                        milestone.status === 'APPROVED' 
                          ? 'bg-indigo-900/30 border border-indigo-500/20 text-indigo-400' 
                          : milestone.status === 'FUNDED' 
                          ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                          : milestone.status === 'SUBMITTED' 
                          ? 'bg-cyan-950/40 border border-cyan-500/20 text-cyan-400' 
                          : 'bg-slate-900 text-slate-400'
                      }`}>
                        {milestone.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed">
                    {milestone.description}
                  </p>

                  {/* Submission details */}
                  {milestone.submissionIpfsHash && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-1.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block">Freelancer Submission</span>
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <span className="font-mono text-cyan-400 truncate">{milestone.submissionIpfsHash}</span>
                        <a 
                          href={milestone.submissionIpfsHash.startsWith('http') ? milestone.submissionIpfsHash : '#'} 
                          className="flex items-center gap-1 text-slate-400 hover:text-indigo-400"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      {milestone.feedback && (
                        <div className="pt-2 border-t border-slate-900 text-xs text-red-400">
                          <span className="font-semibold block uppercase text-[9px] text-slate-500 tracking-wider">Client Rejection Feedback</span>
                          "{milestone.feedback}"
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Forms */}
                  {isLoading && (
                    <div className="rounded-xl bg-indigo-950/20 border border-indigo-500/10 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                        Blockchain Transaction in Progress
                      </div>
                      {txStatusMessage && <p className="text-[11px] text-slate-400">{txStatusMessage}</p>}
                    </div>
                  )}

                  {!isLoading && (
                    <div className="pt-2">
                      {/* CLIENT ACTIONS */}
                      {isClient && milestone.status === 'PENDING' && (
                        <button
                          onClick={() => handleFundMilestone(milestone)}
                          className="glow-btn flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/15"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Fund Milestone ({milestone.budget} ETH)
                        </button>
                      )}

                      {isClient && milestone.status === 'SUBMITTED' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleReleasePayment(milestone)}
                            className="glow-btn flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/15"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            Approve & Release Funds
                          </button>

                          <button
                            onClick={() => setActiveRejectIndex(activeRejectIndex === milestone.index ? null : milestone.index)}
                            className="rounded-xl border border-red-500/30 bg-red-950/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
                          >
                            Reject Work
                          </button>
                        </div>
                      )}

                      {isClient && activeRejectIndex === milestone.index && (
                        <form onSubmit={(e) => handleRejectWork(e, milestone)} className="space-y-3 mt-4 pt-4 border-t border-slate-800/60">
                          <div>
                            <label className="text-xs font-semibold text-slate-400 block mb-1">Rejection Feedback</label>
                            <textarea
                              required
                              placeholder="Describe the issues or revisions required by the freelancer..."
                              value={rejectFeedback}
                              onChange={e => setRejectFeedback(e.target.value)}
                              className="w-full rounded-xl bg-slate-950/60 border border-slate-850 px-4.5 py-3 text-xs text-slate-200 focus:border-red-500/60 outline-none resize-none"
                            />
                          </div>
                          <button
                            type="submit"
                            className="rounded-xl bg-red-600 hover:bg-red-500 py-2 px-5 text-xs font-semibold text-white transition-colors"
                          >
                            Submit Rejection
                          </button>
                        </form>
                      )}

                      {/* FREELANCER ACTIONS */}
                      {isFreelancer && (milestone.status === 'FUNDED' || milestone.status === 'REJECTED') && (
                        <form onSubmit={(e) => handleSubmitWork(e, milestone)} className="space-y-3 mt-4">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Deliverable URL, GitHub Branch, or IPFS hash..."
                              value={submitIpfs}
                              onChange={e => setSubmitIpfs(e.target.value)}
                              className="flex-1 rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500/80"
                            />
                            <button
                              type="submit"
                              disabled={submittingWork === milestone.index}
                              className="glow-btn flex items-center justify-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 px-5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 min-w-[120px]"
                            >
                              {submittingWork === milestone.index ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Submit Work
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Roles & Escrow Agreement */}
        <div className="space-y-6">
          <div className="glass-card p-6 border-slate-800/40 space-y-6">
            <h3 className="text-base font-bold text-slate-200 pb-3 border-b border-slate-800/60">
              Contract Parties
            </h3>

            <div className="space-y-4">
              {/* Client Info */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-indigo-400">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Employer</span>
                  <span className="text-sm font-bold text-slate-200">
                    {contract.client?.username || 'Client'}
                  </span>
                </div>
              </div>

              {/* Freelancer Info */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Contractor</span>
                  <span className="text-sm font-bold text-slate-200">
                    {contract.freelancer?.username || 'Freelancer'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Secure Guarantee Card */}
          <div className="glass-card p-6 border-slate-800/40 bg-indigo-500/5 space-y-3">
            <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-indigo-400" />
              Secured Escrow Ledger
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Escrow contract proxy guarantees payout directly to the contractor wallet once milestones are satisfied. Disputes are resolved by platform delegates via multisig triggers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
