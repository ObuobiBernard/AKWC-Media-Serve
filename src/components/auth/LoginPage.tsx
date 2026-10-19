import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RegisterMemberData, SkillLevel } from '../../types';
import { PasswordResetModal } from './PasswordResetModal';
import { LegalModal, LegalTab } from '../shared/LegalModal';
import { SupabaseConfigModal } from '../shared/SupabaseConfigModal';
import {
  Lock,
  Mail,
  User,
  Phone,
  Video,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserPlus,
  LogIn,
  Clock,
  X,
  ShieldCheck,
  FileText,
  Cookie,
  HeartHandshake,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    roles,
    members,
    availableAccounts,
    checkEmailStatus,
    setupFirstTimePassword,
    loginWithPassword,
    registerNewMember,
    inactivityLoggedOut,
    clearInactivityFlag,
  } = useApp();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    status: 'not_found' | 'needs_password' | 'has_password';
    memberName?: string;
    primaryRoleName?: string;
  } | null>(null);

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');

  // Legal modal state
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('privacy');

  // Supabase modal state
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  // Registration form state
  const [regData, setRegData] = useState<RegisterMemberData>({
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    primaryRole: 'role-livestream-projection',
    secondaryRoles: [],
    skillLevel: 'Intermediate',
    rawSkillDescription: 'Intermediate – Can assist and operate with guidance',
    availability: 'Flexible',
    notes: '',
    password: '',
  });
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConsentGiven, setRegConsentGiven] = useState(false);
  const [regError, setRegError] = useState('');

  // Check email when user clicks "Continue" or presses enter
  const handleCheckEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    const status = checkEmailStatus(clean);
    setEmailStatus(status);
    setEmailChecked(true);

    if (status.status === 'not_found') {
      setAuthError('We could not find this email on the AKWC Media Team roster.');
    }
  };

  // Helper to trigger browser credential saving
  const savePasswordToBrowser = async (username: string, pass: string, displayName?: string) => {
    if (typeof window !== 'undefined' && 'PasswordCredential' in window && (window as any).PasswordCredential) {
      try {
        const cred = new (window as any).PasswordCredential({
          id: username,
          password: pass,
          name: displayName || username,
        });
        await navigator.credentials?.store(cred);
      } catch {
        // Ignore browser credential store exceptions
      }
    }
  };

  // Sign In / First-time Password submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const clean = email.trim().toLowerCase();

    if (!emailChecked || !emailStatus) {
      handleCheckEmail();
      return;
    }

    if (emailStatus.status === 'needs_password') {
      if (!newPassword || newPassword.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setAuthError('Passwords do not match. Please re-enter.');
        return;
      }

      const res = await setupFirstTimePassword(clean, newPassword);
      if (res.success) {
        setAuthSuccess(res.message);
        await savePasswordToBrowser(clean, newPassword, emailStatus.memberName);
      } else {
        setAuthError(res.message);
      }
    } else if (emailStatus.status === 'has_password') {
      if (!password) {
        setAuthError('Please enter your password.');
        return;
      }

      const res = await loginWithPassword(clean, password);
      if (res.success) {
        setAuthSuccess(res.message);
        await savePasswordToBrowser(clean, password, emailStatus.memberName);
      } else {
        setAuthError(res.message);
      }
    }
  };

  // Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regData.name.trim()) {
      setRegError('Please enter your full name.');
      return;
    }
    if (!regData.email.trim() || !regData.email.includes('@')) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (!regData.phone.trim()) {
      setRegError('Please enter your phone/WhatsApp number.');
      return;
    }
    if (!regData.password || regData.password.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (regData.password !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    if (!regConsentGiven) {
      setRegError('Please check the consent box to agree to the AKWC Media Ministry data guidelines.');
      return;
    }

    const cleanEmail = regData.email.trim().toLowerCase();
    const normalizeDigits = (p: string) => {
      const digits = p.replace(/\D/g, '');
      if (digits.startsWith('0') && digits.length === 10) {
        return '233' + digits.substring(1);
      }
      return digits;
    };

    const emailTaken =
      availableAccounts.some((a) => a.email.toLowerCase() === cleanEmail) ||
      members.some((m) => m.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      setRegError('An account or team profile with this email address already exists. Please sign in or use password recovery.');
      return;
    }

    const candPhoneNorm = normalizeDigits(regData.phone);
    if (candPhoneNorm.length >= 7) {
      const phoneTaken = members.some((m) => normalizeDigits(m.phone) === candPhoneNorm);
      if (phoneTaken) {
        setRegError('An account with this phone/WhatsApp number is already registered in the AKWC Media roster. Please sign in or use a different phone number.');
        return;
      }
    }

    const res = await registerNewMember(regData);
    if (res.success) {
      await savePasswordToBrowser(cleanEmail, regData.password, regData.name);
    } else {
      setRegError(res.message);
    }
  };

  const toggleSecondaryRole = (roleId: string) => {
    setRegData((prev) => {
      const exists = prev.secondaryRoles.includes(roleId);
      return {
        ...prev,
        secondaryRoles: exists
          ? prev.secondaryRoles.filter((r) => r !== roleId)
          : [...prev.secondaryRoles, roleId],
      };
    });
  };

  const startRegistrationFromNotFound = () => {
    setRegData((prev) => ({ ...prev, email: email.trim() }));
    setMode('register');
    setAuthError('');
  };

  const openLegalWithTab = (tab: LegalTab) => {
    setLegalTab(tab);
    setShowLegalModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/20 selection:text-amber-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 sm:w-[650px] h-96 bg-amber-500/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-0 w-80 h-80 bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-lg mx-auto px-4 py-8 sm:py-12 my-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
            <Video className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>MEDIASERVE</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">
              AKWC
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
            The Church of Pentecost · Akweteyman Worship Center
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Production Scheduling, Duty Rosters & Attendance Management
          </p>
        </div>

        {inactivityLoggedOut && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-300 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold">Session Closed Due to Inactivity</strong>
                <span>You were automatically signed out to protect church roster data and administrative privileges. Please log in again.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={clearInactivityFlag}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-xl flex gap-1 mb-6 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setAuthError('');
              setRegError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              mode === 'signin'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setAuthError('');
              setRegError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              mode === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account / Join Team</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40">
          {mode === 'signin' ? (
            /* ================= SIGN IN TAB ================= */
            <form
              method="POST"
              action="#"
              onSubmit={handleSignInSubmit}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="username" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Email Address</span>
                  </label>
                  {emailChecked && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmailChecked(false);
                        setEmailStatus(null);
                        setAuthError('');
                        setPassword('');
                        setNewPassword('');
                      }}
                      className="text-[11px] text-amber-400 hover:underline"
                    >
                      Change email
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="email"
                    name="username"
                    id="username"
                    autoComplete="username"
                    required
                    value={email}
                    disabled={emailChecked}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailChecked(false);
                      setEmailStatus(null);
                      setAuthError('');
                    }}
                    placeholder="e.g. bernardoobuobi@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 disabled:bg-slate-950/50 disabled:text-slate-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              {!emailChecked && (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleCheckEmail}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setResetIdentifier(email);
                        setShowResetModal(true);
                      }}
                      className="text-xs text-slate-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reset password using email or phone verification</span>
                    </button>
                  </div>
                </div>
              )}

              {emailChecked && emailStatus && (
                <>
                  {emailStatus.status === 'needs_password' && (
                    <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                      <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-white">
                            Welcome, {emailStatus.memberName}!
                          </div>
                          <div className="text-[11px] text-amber-300/90 mt-0.5 leading-relaxed">
                            You are assigned to{' '}
                            <span className="font-semibold text-white">
                              {emailStatus.primaryRoleName || 'Media Production'}
                            </span>{' '}
                            on the AKWC Media roster. Please create your private password. Your browser will prompt you to save it.
                          </div>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="new-password-setup" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>Create Your Password</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="new-password"
                            id="new-password-setup"
                            autoComplete="new-password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="confirm-password-setup" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Confirm Password</span>
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirm-password"
                          id="confirm-password-setup"
                          autoComplete="new-password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat your password"
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Set Password & Enter MediaServe</span>
                      </button>
                    </div>
                  )}

                  {emailStatus.status === 'has_password' && (
                    <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                            {emailStatus.memberName?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{emailStatus.memberName}</div>
                            <div className="text-[10px] text-amber-400">{emailStatus.primaryRoleName}</div>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          Roster Active
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="password" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Password</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setResetIdentifier(email);
                              setShowResetModal(true);
                            }}
                            className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline"
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            id="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetIdentifier(email);
                            setShowResetModal(true);
                          }}
                          className="text-xs text-slate-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1.5"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reset password using email or phone verification</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {emailStatus.status === 'not_found' && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-3">
                      <div className="text-xs text-slate-300">
                        Are you new to the AKWC Media Ministry? You can complete the onboarding registration to create your account.
                      </div>
                      <button
                        type="button"
                        onClick={startRegistrationFromNotFound}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm"
                      >
                        Create Account / Join Media Team
                      </button>
                    </div>
                  )}
                </>
              )}

              {authError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}
            </form>
          ) : (
            /* ================= CREATE ACCOUNT / ONBOARDING TAB ================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>AKWC Media Team Registration</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All fields correspond to the AKWC Media Ministry onboarding roster.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  placeholder="e.g. Samuel Boamah Dwomoh"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Email Address *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>WhatsApp / Phone *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                    placeholder="0543515464"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Gender *</label>
                  <select
                    value={regData.gender}
                    onChange={(e) => setRegData({ ...regData, gender: e.target.value as 'Male' | 'Female' })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Primary Station *</label>
                  <select
                    value={regData.primaryRole}
                    onChange={(e) => setRegData({ ...regData, primaryRole: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Secondary Stations / Capabilities (Optional)
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl max-h-32 overflow-y-auto">
                  {roles
                    .filter((r) => r.id !== regData.primaryRole)
                    .map((r) => {
                      const checked = regData.secondaryRoles.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                            checked ? 'bg-amber-500/20 text-amber-200' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSecondaryRole(r.id)}
                            className="rounded border-slate-700 text-amber-500 focus:ring-0"
                          />
                          <span className="truncate">{r.name}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Skill Proficiency *</label>
                  <select
                    value={regData.skillLevel}
                    onChange={(e) => {
                      const val = e.target.value as SkillLevel;
                      let desc = '';
                      if (val === 'Apprentice') desc = 'Apprentice – Willing to learn and assist';
                      else if (val === 'Intermediate') desc = 'Intermediate – Can assist with guidance';
                      else if (val === 'Senior') desc = 'Senior – Can operate independently';
                      else desc = 'Lead – Can train others / Lead station';
                      setRegData({ ...regData, skillLevel: val, rawSkillDescription: desc });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Apprentice">Apprentice / Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Senior">Senior (Independent)</option>
                    <option value="Lead">Lead / Expert (Trainer)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Availability *</label>
                  <select
                    value={regData.availability}
                    onChange={(e) => setRegData({ ...regData, availability: e.target.value as 'Flexible' | 'Both Sundays & Weekdays' | 'Sundays only' })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Flexible">Flexible</option>
                    <option value="Both Sundays & Weekdays">Both Sundays & Weekdays</option>
                    <option value="Sundays only">Sundays only</option>
                  </select>
                </div>
              </div>

              {/* Password setup for new account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Create Password *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 pr-9 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Confirm Password *</span>
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Ministry Consent Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regConsentGiven}
                    onChange={(e) => setRegConsentGiven(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    I agree to the COP Akweteyman Worship Center{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLegalWithTab('terms');
                      }}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      Terms of Service
                    </button>{' '}
                    and consent to storing my contact information in accordance with the Ghana Data Protection Act 2012 /{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLegalWithTab('privacy');
                      }}
                      className="text-amber-400 hover:underline font-semibold"
                    >
                      Privacy Policy
                    </button>.
                  </div>
                </label>
              </div>

              {regError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete Registration & Enter MediaServe</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer with Compliance Links */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80">
        <div className="max-w-lg mx-auto px-4 space-y-1.5">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() => openLegalWithTab('privacy')}
              className="hover:text-amber-400 transition-colors"
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => openLegalWithTab('terms')}
              className="hover:text-amber-400 transition-colors"
            >
              Terms of Service
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => openLegalWithTab('cookies')}
              className="hover:text-amber-400 transition-colors"
            >
              Cookie Notice
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => openLegalWithTab('ministry')}
              className="hover:text-amber-400 transition-colors"
            >
              Ministry Charter
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setShowSupabaseModal(true)}
              className="hover:text-emerald-400 text-emerald-400/90 font-medium transition-colors"
            >
              Supabase DB
            </button>
          </div>
          <div className="text-[10px] text-slate-600">
            MediaServe · COP Akweteyman Worship Center (Achimota Area, Accra)
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PasswordResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        initialIdentifier={resetIdentifier}
      />

      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        defaultTab={legalTab}
      />

      <SupabaseConfigModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
      />
    </div>
  );
};
