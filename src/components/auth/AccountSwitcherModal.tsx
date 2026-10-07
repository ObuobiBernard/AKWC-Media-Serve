import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  ShieldCheck,
  KeyRound,
  Check,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({ isOpen, onClose }) => {
  const {
    currentAccount,
    currentMember,
    availableAccounts,
    members,
    roles,
    setupFirstTimePassword,
    loginWithPassword,
    resetPasswordForMember,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'first-time' | 'login'>('first-time');

  // First-time setup state
  const [firstTimeEmail, setFirstTimeEmail] = useState(
    availableAccounts.find((a) => !a.hasSetPassword)?.email || 'osei397@gmail.com'
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');

  // Standard login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  if (!isOpen) return null;

  // Find member details for first-time email
  const selectedFirstTimeAcc = availableAccounts.find(
    (a) => a.email.toLowerCase() === firstTimeEmail.trim().toLowerCase()
  );
  const recognizedMember = members.find((m) => m.id === selectedFirstTimeAcc?.memberId);
  const recognizedRole = roles.find((r) => r.id === recognizedMember?.primaryRole);

  const handleFirstTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setSetupSuccess('');

    if (newPassword.length < 6) {
      setSetupError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSetupError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    const res = await setupFirstTimePassword(firstTimeEmail, newPassword);

    if (res.success) {
      setSetupSuccess(res.message);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setSetupError(res.message);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const res = await loginWithPassword(loginEmail, loginPassword);

    if (res.success) {
      onClose();
    } else if (res.requiresSetup) {
      setLoginError(res.message);
      setFirstTimeEmail(loginEmail);
      setActiveTab('first-time');
    } else {
      setLoginError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">MediaServe Account Authentication</h3>
              <p className="text-xs text-slate-400">COP Akweteyman Worship Center (AKWC) Media Team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl my-4">
          <button
            onClick={() => setActiveTab('first-time')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'first-time'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>First-Time Password Setup</span>
          </button>

          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>

        {/* TAB 1: FIRST-TIME PASSWORD SETUP */}
        {activeTab === 'first-time' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-1">
              <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>First Time on MediaServe?</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Use the email address you provided in the AKWC Media Team registration form. Once verified, create your personal password to activate your account.
              </p>
            </div>

            <form onSubmit={handleFirstTimeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Select or Enter Your Registered Email Address
                </label>
                <div className="space-y-2">
                  <select
                    value={firstTimeEmail}
                    onChange={(e) => setFirstTimeEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    {availableAccounts.map((acc) => {
                      const mem = members.find((m) => m.id === acc.memberId);
                      return (
                        <option key={acc.id} value={acc.email}>
                          {mem?.name} — {acc.email} {!acc.hasSetPassword ? '(Pending Password)' : '(Password Set)'}
                        </option>
                      );
                    })}
                  </select>

                  <input
                    type="email"
                    placeholder="Or type your exact email here..."
                    value={firstTimeEmail}
                    onChange={(e) => setFirstTimeEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </div>
              </div>

              {/* Verified Member Badge */}
              {recognizedMember ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                      {recognizedMember.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                        <span>{recognizedMember.name}</span>
                        {recognizedMember.gender && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({recognizedMember.gender})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {recognizedRole?.name || 'Media Team Member'}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Registered
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-center gap-2 text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>That email is not currently linked to a Media Team member.</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Create Your Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </div>
              </div>

              {setupError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-300 text-xs">
                  {setupError}
                </div>
              )}

              {setupSuccess && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {setupSuccess}
                </div>
              )}

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Activate Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: LOGIN */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Sign In to MediaServe</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Enter the email address and password associated with your AKWC MediaServe account.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-10 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-300 text-xs">
                  {loginError}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFirstTimeEmail(loginEmail || availableAccounts[0]?.email);
                    setActiveTab('first-time');
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Forgot or haven&apos;t set a password yet?
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Log In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Current Active Session Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Active Member: <strong className="text-white">{currentMember.name}</strong> ({currentAccount.email})
          </div>
          <div>
            {currentAccount.hasSetPassword ? (
              <span className="text-emerald-400 font-mono text-[11px]">Password: Protected</span>
            ) : (
              <span className="text-amber-400 font-mono text-[11px]">Password: Unset</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
