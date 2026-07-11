'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '@/context/Web3Context';
import { api } from '@/services/api';
import { 
  ArrowLeft, 
  Briefcase, 
  Tag, 
  Clock, 
  Landmark, 
  AlertCircle, 
  Loader2, 
  Send, 
  Check, 
  User, 
  FileText,
  DollarSign,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const { isConnected, isSiweAuthenticated, address, deployJobEscrow } = useWeb3();
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Freelancer proposal form
  const [bidAmount, setBidAmount] = useState(1.0);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [coverLetter, setCoverLetter] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState<any | null>(null);

  // Client accept contract state
  const [acceptingProposalId, setAcceptingProposalId] = useState<string | null>(null);
  const [web3Status, setWeb3Status] = useState<string | null>(null);

  const fetchJobDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const jobData = await api.getJobDetail(jobId);
      setJob(jobData);
      setBidAmount(jobData.budget);

      if (isConnected && isSiweAuthenticated) {
        const u = await api.getMe();
        setCurrentUser(u);

        // Fetch proposals
        const props = await api.getJobProposals(jobId);
        setProposals(props);

        // Check if user already applied
        const applied = props.find((p: any) => p.freelancer?.userId === u.id);
        if (applied) {
          setAlreadyApplied(applied);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch job details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobDetails();
  }, [isConnected, isSiweAuthenticated, jobId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProposal(true);
    setError(null);

    try {
      const prop = await api.submitProposal({
        jobId,
        bidAmount: Number(bidAmount),
        deliveryDays: Number(deliveryDays),
        coverLetter,
      });
      setAlreadyApplied(prop);
      
      // Refresh proposals list
      const props = await api.getJobProposals(jobId);
      setProposals(props);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit bid.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleAcceptProposal = async (proposal: any) => {
    setAcceptingProposalId(proposal.id);
    setWeb3Status('1/3: Triggering smart contract clone deployment...');
    setError(null);

    try {
      const freelancerWallet = proposal.freelancer?.user?.walletAddress;
      if (!freelancerWallet) {
        throw new Error('Selected freelancer does not have a linked wallet address.');
      }

      // Step 1: Deploy Escrow Contract Proxy Clone via Factory
      const escrowAddress = await deployJobEscrow(
        jobId,
        proposal.bidAmount,
        freelancerWallet
      );
      
      setWeb3Status('2/3: Escrow deployed! Updating proposal status in database...');

      // Step 2: Accept proposal on backend
      await api.updateProposalStatus(proposal.id, 'ACCEPTED');

      setWeb3Status('3/3: Syncing contract terms and initializing milestones...');

      // Step 3: Create Contract object in backend
      const contract = await api.createContract({
        jobId,
        freelancerId: proposal.freelancerId,
        totalBudget: Number(proposal.bidAmount),
        escrowAddress,
        chainId: 31337,
        milestones: [
          {
            title: 'Initial Stage Deliverable',
            description: 'Provide core code delivery for the project.',
            budget: Number(proposal.bidAmount),
            index: 0,
          }
        ],
      });

      setWeb3Status('Complete! Redirecting to escrow contract panel...');
      
      // Redirect to newly created contract view
      router.push(`/contracts/${contract.id}`);
    } catch (err: any) {
      console.error('Failed to accept proposal:', err);
      setError(err.message || 'Web3 transaction failed. Please ensure local blockchain node is running.');
      setAcceptingProposalId(null);
      setWeb3Status(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
        <span className="text-slate-400">Fetching Job Details...</span>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <div className="glass-card p-8 border-slate-800/40 space-y-6">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-100">Job Not Found</h2>
          <p className="text-slate-400">The requested project listing does not exist or has been deleted.</p>
          <Link href="/jobs" className="inline-flex rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-slate-200">
            Back to Job Board
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = currentUser?.id === job.clientId;

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Job Board
      </Link>

      {error && (
        <div className="rounded-xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-400 font-medium animate-pulse">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Job Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 border-slate-800/40 space-y-6">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-900 border border-slate-800/60 px-3 py-1 text-xs text-indigo-400 font-semibold">
                {job.category}
              </span>
              <span className="rounded-full bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 font-semibold">
                {job.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">{job.title}</h1>

            <div className="flex items-center gap-6 text-sm text-slate-400 border-y border-slate-800/60 py-4">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-400" />
                Created {new Date(job.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-cyan-400" />
                Chain ID: 31337
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-200">About the Job</h3>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">
                {job.description}
              </p>
            </div>

            {job.tags && job.tags.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-slate-800/40">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required Skills</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {job.tags.map((tag: string) => (
                    <span key={tag} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-slate-300 border border-slate-800/60">
                      <Tag className="h-3 w-3 text-indigo-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bid / Manage Proposals */}
        <div className="space-y-6">
          {/* Budget Overview Card */}
          <div className="glass-card p-6 border-slate-800/40 space-y-4">
            <span className="text-xs text-slate-500 uppercase tracking-wider block">Estimated Project Budget</span>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">
              {job.budget} {job.tokenAddress ? 'USDC' : 'ETH'}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upon award, budget funds are deposited to a secure escrow contract proxy. Payments are released as milestones are completed.
            </p>
          </div>

          {/* Interactive Actions */}
          {!isConnected || !isSiweAuthenticated ? (
            <div className="glass-card p-6 border-slate-800/40 text-center space-y-4">
              <ShieldAlert className="h-10 w-10 text-cyan-400 mx-auto" />
              <h4 className="font-bold text-slate-200">Login to Apply</h4>
              <p className="text-xs text-slate-400">
                Connect your wallet to pitch proposals or review details.
              </p>
            </div>
          ) : isOwner ? (
            // CLIENT VIEW: List Applicants
            <div className="glass-card p-6 border-slate-800/40 space-y-6">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-800/60">
                <FileText className="h-5 w-5 text-indigo-400" />
                Proposals ({proposals.length})
              </h3>

              {acceptingProposalId && (
                <div className="rounded-lg bg-indigo-950/40 border border-indigo-500/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    Processing Web3 Escrow Contract
                  </div>
                  <p className="text-[11px] text-slate-400">{web3Status}</p>
                </div>
              )}

              {proposals.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  No applicants have submitted proposals for this project.
                </p>
              ) : (
                <div className="space-y-4">
                  {proposals.map((prop) => (
                    <div key={prop.id} className="rounded-xl border border-slate-800/80 bg-slate-950/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-200">
                            {prop.freelancer?.user?.username || 'user'}
                          </span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold text-sm">
                          {prop.bidAmount} ETH
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                        "{prop.coverLetter}"
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Delivery: {prop.deliveryDays} days</span>
                        {job.status === 'OPEN' && !acceptingProposalId && (
                          <button
                            onClick={() => handleAcceptProposal(prop)}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-md shadow-emerald-600/15"
                          >
                            Accept & Deploy Escrow
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : currentUser?.role === 'FREELANCER' ? (
            // FREELANCER VIEW: Submit bid or show proposal status
            alreadyApplied ? (
              <div className="glass-card p-6 border-slate-800/40 space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Check className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Application Submitted</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    You bid **{alreadyApplied.bidAmount} ETH** with delivery in **{alreadyApplied.deliveryDays} days**.
                  </p>
                </div>
                <div className="rounded-lg bg-slate-950/50 border border-slate-800 p-3 text-xs text-slate-400 italic">
                  "{alreadyApplied.coverLetter}"
                </div>
                <div className="text-xs text-slate-500">
                  Status: <span className="font-semibold text-indigo-400">{alreadyApplied.status}</span>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 border-slate-800/40 space-y-4">
                <h3 className="text-lg font-bold text-slate-200 pb-3 border-b border-slate-800/60">
                  Submit Proposal
                </h3>
                <form onSubmit={handleApply} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Your Bid (ETH)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={bidAmount}
                      onChange={e => setBidAmount(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Delivery Time (Days)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={deliveryDays}
                      onChange={e => setDeliveryDays(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Cover Letter / Pitch</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Explain your approach, portfolio references, and technical fit..."
                      value={coverLetter}
                      onChange={e => setCoverLetter(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingProposal}
                    className="glow-btn flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg w-full"
                  >
                    {submittingProposal ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Proposal Bid
                  </button>
                </form>
              </div>
            )
          ) : (
            <div className="glass-card p-6 border-slate-800/40 text-center space-y-4">
              <ShieldAlert className="h-10 w-10 text-cyan-400 mx-auto" />
              <h4 className="font-bold text-slate-200">Role Incompatible</h4>
              <p className="text-xs text-slate-400">
                You must switch to a Freelancer profile to submit proposals to clients.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
