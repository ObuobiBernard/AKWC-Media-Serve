import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Lock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  initialIdentifier = '',
}) => {
  const { requestPasswordReset, verifyAndResetPassword, showToast } = useApp();

  const [step, setStep] = useState<'request' | 'verify' | 'new_password'>('request');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Verification state
  const [code, setCode] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [targetPhone, setTargetPhone] = useState('');

  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your registered email address or phone number.');
      return;
    }

    setLoading(true);
    const res = await requestPasswordReset(cleanId, method);
    setLoading(false);

    if (res.success && res.code) {
      setActiveCode(res.code);
      setMaskedTarget(res.maskedTarget || cleanId);
      setTargetPhone(res.targetPhone || '');
      setSuccess(res.message);
      // Auto-prefill the verification code so the user doesn't have to scramble
      setCode(res.code);
      setStep('verify');
    } else {
      setError(res.message || 'Could not verify account. Please check your input.');
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (cleanCode !== activeCode) {
      setError('Verification code does not match. Please verify and try again.');
      return;
    }

    setStep('new_password');
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    const res = await verifyAndResetPassword(identifier, code, newPassword);
    setLoading(false);

    if (res.success) {
      // Trigger native browser credential manager prompt if supported
      if (typeof window !== 'undefined' && 'PasswordCredential' in window && (window as any).PasswordCredential) {
        try {
          const cred = new (window as any).PasswordCredential({
            id: identifier.trim(),
            password: newPassword,
            name: identifier.trim(),
          });
          await navigator.credentials?.store(cred);
        } catch {
          // Ignore browser credential store exceptions
        }
      }

      showToast('Password updated! You are now securely signed in.');
      onClose();
    } else {
      setError(res.message);
    }
  };

  const handleOpenWhatsAppCode = () => {
    if (!targetPhone) return;
    const cleanPhone = targetPhone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.substring(1) : cleanPhone;
    const msg = `*AKWC MediaServe Verification Code:* ${activeCode}\nUse this code to set your new password on the portal.`;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Reset Account Password
              </h2>
              <p className="text-xs text-slate-400">
                Email & Phone / WhatsApp Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between my-4 px-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'request'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              1
            </span>
            <span className={step === 'request' ? 'font-bold text-white' : 'text-slate-400'}>
              Identity
            </span>
          </div>

          <div className="h-0.5 w-8 bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'verify'
                  ? 'bg-amber-500 text-slate-950'
                  : step === 'new_password'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={step === 'verify' ? 'font-bold text-white' : 'text-slate-400'}>
              Verify
            </span>
          </div>

          <div className="h-0.5 w-8 bg-slate-800" />

          <div className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'new_password'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              3
            </span>
            <span className={step === 'new_password' ? 'font-bold text-white' : 'text-slate-400'}>
              New Password
            </span>
          </div>
        </div>

        {/* STEP 1: REQUEST VERIFICATION CODE */}
        {step === 'request' && (
          <form onSubmit={handleRequestCode} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Roster Verification</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Enter the email address or phone number linked to your AKWC Media account. We will issue a verification code.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Registered Email or Phone Number <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError('');
                }}
                placeholder="e.g. bernardoobuobi@gmail.com or 0543515464"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Verification Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('email')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    method === 'email'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('phone')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    method === 'phone'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone / WhatsApp</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <span>{loading ? 'Verifying Account...' : 'Generate Verification Code'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY CODE */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Target Contact:</span>
                <span className="font-mono font-bold text-amber-400">{maskedTarget}</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                A 6-digit verification code has been generated. For your convenience, your code is prefilled below:
              </div>

              {/* Instant Verification Display */}
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-amber-300 uppercase font-semibold">
                    Verification Code (Valid 15m)
                  </div>
                  <div className="text-lg font-mono font-black tracking-widest text-white mt-0.5">
                    {activeCode}
                  </div>
                </div>

                {targetPhone && (
                  <button
                    type="button"
                    onClick={handleOpenWhatsAppCode}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all"
                    title="Send code to your WhatsApp"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Enter 6-Digit Code <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError('');
                }}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 text-center font-mono text-base tracking-widest bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <span>Verify Code</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: CREATE NEW PASSWORD */}
        {step === 'new_password' && (
          <form
            method="POST"
            action="#"
            onSubmit={handleSetNewPassword}
            className="space-y-4 text-xs"
          >
            {/* Hidden email input for browser password managers */}
            <input
              type="text"
              name="username"
              id="username-reset"
              value={identifier}
              readOnly
              className="sr-only"
              autoComplete="username"
            />

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Identity verified! Now choose a private password for your account.</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                New Password <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="new-password"
                  id="new-password-reset"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
              <label className="block text-slate-300 font-semibold mb-1.5">
                Confirm New Password <span className="text-amber-400">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirm-password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="Repeat your new password"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Your browser will prompt you to save this new password automatically.</span>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving New Password...' : 'Save Password & Enter MediaServe'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
