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

  const handleFirstTimeSubmit = (e: React.FormEvent) => {
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

    const res = setupFirstTimePassword(firstTimeEmail, newPassword);
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

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const res = loginWithPassword(loginEmail, loginPassword);
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
                      <div className="text-[11px] text-slate-400">
                        Station: {recognizedRole?.name || recognizedMember.primaryRole} · Phone: {recognizedMember.phone}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" /> Verified on Sheet
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Email not found in AKWC spreadsheet roster. Please check spelling.</span>
                </div>
              )}

              {/* Create Password */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Create New Password (Min 6 Characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter a secure password..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
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
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{setupSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!recognizedMember}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  recognizedMember
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Save Password & Activate My Account</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: SIGN IN WITH EXISTING PASSWORD */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Sign in with your AKWC Media email and the personal password you set.
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Registered Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. osei397@gmail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
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
