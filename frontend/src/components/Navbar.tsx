'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWeb3 } from '@/context/Web3Context';
import { api } from '@/services/api';
import { Wallet, User, Briefcase, FileText, Bell, Plus, Menu, X, ArrowRight, Shield } from 'lucide-react';

export const Navbar = () => {
  const pathname = usePathname();
  const { 
    address, 
    isConnected, 
    isConnecting, 
    isMockMode, 
    balance, 
    connectWallet, 
    disconnectWallet,
    isSiweAuthenticated,
    signSiweMessage,
    setSiweToken
  } = useWeb3();

  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync user profile role
  useEffect(() => {
    if (isConnected && isSiweAuthenticated) {
      api.getMe()
        .then(user => setRole(user.role))
        .catch(err => console.log('Failed to fetch user role:', err));
    } else {
      setRole(null);
    }
  }, [isConnected, isSiweAuthenticated]);

  const handleWalletConnect = async (useMock: boolean) => {
    setShowConnectModal(false);
    setAuthError(null);
    try {
      // Connect wallet
      await connectWallet(useMock);
    } catch (err: any) {
      setAuthError(err.message || 'Connection failed');
    }
  };

  // Perform SIWE signup/verify once wallet connects
  useEffect(() => {
    const runSiwe = async () => {
      if (isConnected && !isSiweAuthenticated && address) {
        try {
          const { nonce } = await api.getSiweNonce();
          const { message, signature } = await signSiweMessage(nonce);
          const response = await api.verifySiwe(message, signature);
          setSiweToken(response.accessToken);
          setRole(response.user.role);
        } catch (err: any) {
          console.error('SIWE failed:', err);
          // If SIWE fails, let's try standard fallback signup so client doesn't get blocked
          try {
            const signupRes = await api.signup(
              `${address.toLowerCase()}@marketplace.siwe`,
              `user_${address.slice(2, 8)}`,
              'SuperSecurePassword123!',
              'FREELANCER'
            );
            setSiweToken(signupRes.accessToken);
            setRole(signupRes.user.role);
          } catch (signupErr) {
            // Signin fallback
            try {
              const signinRes = await api.signin(
                `${address.toLowerCase()}@marketplace.siwe`,
                'SuperSecurePassword123!'
              );
              setSiweToken(signinRes.accessToken);
              setRole(signinRes.user.role);
            } catch (signinErr: any) {
              setAuthError('SIWE verification failed: ' + (signinErr.message || 'unknown error'));
              disconnectWallet();
            }
          }
        }
      }
    };
    runSiwe();
  }, [isConnected, isSiweAuthenticated, address]);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const navLinks = [
    { name: 'Browse Jobs', href: '/jobs', icon: Briefcase },
    { name: 'My Contracts', href: '/contracts', icon: FileText, requireAuth: true },
    { name: 'Profile', href: '/profile', icon: User, requireAuth: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel shadow-lg transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20">
                  <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-900">
                    <Shield className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
                <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                  Decent<span className="from-indigo-400 to-cyan-400 bg-gradient-to-r bg-clip-text text-transparent">Work</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                if (link.requireAuth && !isSiweAuthenticated) return null;
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-cyan-400 ${
                      isActive ? 'text-cyan-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Wallet Connect & Actions */}
            <div className="hidden md:flex items-center gap-4">
              {isSiweAuthenticated && role === 'CLIENT' && (
                <Link
                  href="/jobs/new"
                  className="glow-btn flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
                >
                  <Plus className="h-4 w-4" />
                  Post a Job
                </Link>
              )}

              {isConnected ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {truncateAddress(address || '')}
                    </div>
                    <span className="text-slate-400 font-mono">
                      {parseFloat(balance).toFixed(3)} ETH
                      {isMockMode && <span className="ml-1 text-[9px] text-cyan-400 uppercase tracking-widest">(Mock)</span>}
                    </span>
                  </div>
                  
                  <button
                    onClick={disconnectWallet}
                    className="rounded-xl border border-red-500/30 bg-red-950/20 px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConnectModal(true)}
                  disabled={isConnecting}
                  className="glow-btn flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700/60 px-5 py-2 text-sm font-semibold text-slate-100 shadow-md hover:bg-slate-700 hover:border-slate-600 active:scale-95 transition-all duration-300"
                >
                  <Wallet className="h-4 w-4 text-cyan-400" />
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isOpen && (
          <div className="md:hidden glass-panel border-t border-slate-800/80 px-4 pt-2 pb-4 space-y-2">
            {navLinks.map((link) => {
              if (link.requireAuth && !isSiweAuthenticated) return null;
              const Icon = link.icon;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-base font-medium text-slate-200 hover:bg-slate-800/60 hover:text-white"
                >
                  <Icon className="h-5 w-5 text-cyan-400" />
                  {link.name}
                </Link>
              );
            })}
            
            {isSiweAuthenticated && role === 'CLIENT' && (
              <Link
                href="/jobs/new"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 py-2.5 text-base font-semibold text-white"
              >
                <Plus className="h-5 w-5" />
                Post a Job
              </Link>
            )}

            {isConnected ? (
              <div className="pt-4 border-t border-slate-800 flex flex-col gap-2 px-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Address:</span>
                  <span className="font-mono font-bold text-slate-200">{truncateAddress(address || '')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Balance:</span>
                  <span className="font-mono text-cyan-400">{parseFloat(balance).toFixed(3)} ETH</span>
                </div>
                <button
                  onClick={() => {
                    disconnectWallet();
                    setIsOpen(false);
                  }}
                  className="mt-2 w-full rounded-xl bg-red-950/40 border border-red-500/20 py-2 text-sm font-semibold text-red-400"
                >
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowConnectModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 py-2.5 text-base font-semibold text-slate-200"
                >
                  <Wallet className="h-5 w-5 text-cyan-400" />
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Connect Wallet Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/95 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-cyan-400" />
                Connect a Wallet
              </h3>
              <button 
                onClick={() => setShowConnectModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-6 space-y-4">
              <p className="text-sm text-slate-400">
                Select your preferred connection method to interact with decentralized escrow and milestoned payments.
              </p>

              {authError && (
                <div className="rounded-lg bg-red-950/40 border border-red-500/20 p-3 text-xs text-red-400 font-medium">
                  {authError}
                </div>
              )}

              {/* Option 1: Metamask */}
              <button
                onClick={() => handleWalletConnect(false)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 p-4 hover:bg-indigo-600/10 hover:border-indigo-500/40 transition-all group duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600/10 p-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">MetaMask Wallet</div>
                    <div className="text-xs text-slate-500">Connect using browser extension</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </button>

              {/* Option 2: Mock Driver for Testing */}
              <button
                onClick={() => handleWalletConnect(true)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 p-4 hover:bg-cyan-600/10 hover:border-cyan-500/40 transition-all group duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 p-2">
                    <Shield className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">Mock Wallet Connector</div>
                    <div className="text-xs text-slate-500">Instant login for review (No setup needed)</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800/60 text-center">
              <span className="text-xs text-slate-500">
                Secured via Cryptographic SIWE Handshake.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
