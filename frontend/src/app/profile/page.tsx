'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '@/context/Web3Context';
import { api } from '@/services/api';
import { User, Briefcase, Landmark, CheckCircle, Save, Loader2, Sparkles, RefreshCw, Globe, MapPin } from 'lucide-react';

export default function ProfilePage() {
  const { isConnected, isSiweAuthenticated, address } = useWeb3();
  const router = useRouter();

  // Core User state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Form states for core user info
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Freelancer profile state
  const [freelancerProfile, setFreelancerProfile] = useState<any>(null);
  const [freelancerTitle, setFreelancerTitle] = useState('');
  const [freelancerBio, setFreelancerBio] = useState('');
  const [freelancerSkills, setFreelancerSkills] = useState('');
  const [freelancerRate, setFreelancerRate] = useState(25);
  const [submittingFreelancer, setSubmittingFreelancer] = useState(false);

  // Client profile state
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [clientCompany, setClientCompany] = useState('');
  const [clientWebsite, setClientWebsite] = useState('');
  const [clientLocation, setClientLocation] = useState('');
  const [clientBio, setClientBio] = useState('');
  const [submittingClient, setSubmittingClient] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isConnected || !isSiweAuthenticated) {
      return;
    }

    const fetchAllProfiles = async () => {
      setLoadingUser(true);
      try {
        const uProfile = await api.getUserProfile();
        setUserProfile(uProfile);
        setUsername(uProfile.username || '');
        setEmail(uProfile.email || '');

        if (uProfile.role === 'FREELANCER') {
          try {
            const fProfile = await api.getFreelancerProfile();
            if (fProfile) {
              setFreelancerProfile(fProfile);
              setFreelancerTitle(fProfile.title || '');
              setFreelancerBio(fProfile.bio || '');
              setFreelancerSkills(fProfile.skills?.join(', ') || '');
              setFreelancerRate(fProfile.hourlyRate || 25);
            }
          } catch (e) {
            console.log('No freelancer profile exists yet.');
          }
        } else if (uProfile.role === 'CLIENT') {
          try {
            const cProfile = await api.getClientProfile();
            if (cProfile) {
              setClientProfile(cProfile);
              setClientCompany(cProfile.companyName || '');
              setClientWebsite(cProfile.companyWebsite || '');
              setClientLocation(cProfile.location || '');
              setClientBio(cProfile.bio || '');
            }
          } catch (e) {
            console.log('No client profile exists yet.');
          }
        }
      } catch (err: any) {
        console.error('Failed to load profiles:', err);
        setMessage({ type: 'error', text: err.message || 'Failed to load profile data.' });
      } finally {
        setLoadingUser(false);
      }
    };

    fetchAllProfiles();
  }, [isConnected, isSiweAuthenticated]);

  const handleRoleSwitch = async () => {
    if (!userProfile) return;
    const newRole = userProfile.role === 'CLIENT' ? 'FREELANCER' : 'CLIENT';
    
    setSubmittingUser(true);
    setMessage(null);
    try {
      const updatedUser = await api.updateUserProfile({ role: newRole });
      setUserProfile(updatedUser);
      setMessage({ type: 'success', text: `Switched active role to ${newRole}!` });
      
      // Reload profile data for new role
      window.location.reload();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to switch role.' });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleSaveCoreProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    setMessage(null);
    try {
      const updated = await api.updateUserProfile({ username, email });
      setUserProfile(updated);
      setMessage({ type: 'success', text: 'Account settings updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update account settings.' });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleSaveFreelancerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFreelancer(true);
    setMessage(null);
    try {
      const skillsArray = freelancerSkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const fProfile = await api.updateFreelancerProfile({
        title: freelancerTitle,
        bio: freelancerBio,
        skills: skillsArray,
        hourlyRate: Number(freelancerRate),
      });
      setFreelancerProfile(fProfile);
      setMessage({ type: 'success', text: 'Freelancer profile saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update freelancer profile.' });
    } finally {
      setSubmittingFreelancer(false);
    }
  };

  const handleSaveClientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingClient(true);
    setMessage(null);
    try {
      const cProfile = await api.updateClientProfile({
        companyName: clientCompany,
        companyWebsite: clientWebsite,
        location: clientLocation,
        bio: clientBio,
      });
      setClientProfile(cProfile);
      setMessage({ type: 'success', text: 'Client profile saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update client profile.' });
    } finally {
      setSubmittingClient(false);
    }
  };

  if (!isConnected || !isSiweAuthenticated) {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <div className="glass-card p-8 border-slate-800/40 space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto border border-indigo-500/20">
            <User className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Wallet Login Required</h2>
          <p className="text-slate-400">
            Please connect your Web3 wallet and authenticate SIWE to access and configure your profile dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loadingUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
        <span className="text-slate-400">Loading Profile Engine...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100">Profile Settings</h1>
          <p className="text-slate-400">Manage account information, role types, and search visibility.</p>
        </div>

        {/* Role Switcher Action */}
        <div className="glass-panel rounded-xl border-slate-800/60 p-3.5 flex items-center gap-4 w-full sm:w-auto justify-between">
          <div>
            <span className="text-xs text-slate-500 block uppercase tracking-wider">Active Role</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
              {userProfile?.role === 'CLIENT' ? (
                <>
                  <Landmark className="h-4 w-4 text-emerald-400" />
                  Client (Hiring)
                </>
              ) : (
                <>
                  <Briefcase className="h-4 w-4 text-indigo-400" />
                  Freelancer (Bidding)
                </>
              )}
            </span>
          </div>
          <button
            onClick={handleRoleSwitch}
            disabled={submittingUser}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700/60 transition-all"
          >
            {submittingUser ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
            )}
            Switch Role
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
              : 'bg-red-950/40 border-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Side: Account Info Form */}
        <div className="space-y-6">
          <div className="glass-card p-6 border-slate-800/40">
            <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2 pb-3 border-b border-slate-800/60">
              <User className="h-5 w-5 text-indigo-400" />
              Account Settings
            </h2>
            <form onSubmit={handleSaveCoreProfile} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Wallet Address</label>
                <input
                  type="text"
                  disabled
                  value={address || ''}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800/80 px-4 py-2.5 text-xs text-slate-400 font-mono outline-none cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={submittingUser}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
              >
                {submittingUser ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 text-cyan-400" />
                )}
                Save Settings
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Role Specific Profile Fields */}
        <div className="md:col-span-2 space-y-6">
          {userProfile?.role === 'FREELANCER' ? (
            <div className="glass-card p-6 border-slate-800/40">
              <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2 pb-3 border-b border-slate-800/60">
                <Briefcase className="h-5 w-5 text-indigo-400" />
                Freelancer Details
              </h2>
              <form onSubmit={handleSaveFreelancerProfile} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Professional Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Solidity & NextJS Engineer"
                      value={freelancerTitle}
                      onChange={e => setFreelancerTitle(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Hourly Rate (USDC or ETH equivalent)</label>
                    <input
                      type="number"
                      required
                      min={5}
                      value={freelancerRate}
                      onChange={e => setFreelancerRate(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Skills (Comma separated list)</label>
                  <input
                    type="text"
                    required
                    placeholder="Solidity, Rust, React, NestJS, Hardhat"
                    value={freelancerSkills}
                    onChange={e => setFreelancerSkills(e.target.value)}
                    className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Professional Bio</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Tell clients about your technical background and experience..."
                    value={freelancerBio}
                    onChange={e => setFreelancerBio(e.target.value)}
                    className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFreelancer}
                  className="glow-btn flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 w-full sm:w-auto sm:px-6"
                >
                  {submittingFreelancer ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Freelancer Profile
                </button>
              </form>
            </div>
          ) : (
            <div className="glass-card p-6 border-slate-800/40">
              <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2 pb-3 border-b border-slate-800/60">
                <Landmark className="h-5 w-5 text-emerald-400" />
                Client Profile
              </h2>
              <form onSubmit={handleSaveClientProfile} className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Company / Organization Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DecentDAO"
                      value={clientCompany}
                      onChange={e => setClientCompany(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Location</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Remote"
                        value={clientLocation}
                        onChange={e => setClientLocation(e.target.value)}
                        className="w-full rounded-xl bg-slate-950/50 border border-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
                      />
                      <MapPin className="h-4 w-4 text-slate-500 absolute left-3 top-3.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Company Website</label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="e.g. https://decentdao.org"
                      value={clientWebsite}
                      onChange={e => setClientWebsite(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/50 border border-slate-800 pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none"
                    />
                    <Globe className="h-4 w-4 text-slate-500 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Company Description</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Draft a brief overview explaining what your startup or protocol builds..."
                    value={clientBio}
                    onChange={e => setClientBio(e.target.value)}
                    className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:border-indigo-500/80 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingClient}
                  className="glow-btn flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 w-full sm:w-auto sm:px-6"
                >
                  {submittingClient ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Client Profile
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
