'use client';

import React, { useState } from 'react';
import { AppStorage } from '@/lib/storage';
import { SubscriptionPlan, UserAccount } from '@/types';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  MapPin, 
  Sparkles, 
  Check, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Tractor
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  initialPlan?: SubscriptionPlan;
  onSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialPlan = 'farmer',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form fields
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [farmName, setFarmName] = useState('');
  const [county, setCounty] = useState('');
  const [subCounty, setSubCounty] = useState('');
  const [plan, setPlan] = useState<SubscriptionPlan>(initialPlan);

  React.useEffect(() => {
    setMode(initialMode);
    if (initialPlan) setPlan(initialPlan);
  }, [initialMode, initialPlan]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = AppStorage.login(loginEmail, loginPassword);
      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      } else {
        setError(res.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setError('An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setError(null);
    const demoUser = AppStorage.loginDemoUser();
    onSuccess(demoUser);
    onClose();
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!name.trim() || !signupEmail.trim() || !signupPassword.trim() || !farmName.trim() || !county.trim()) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }

      if (signupPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }

      const res = AppStorage.registerFarmer({
        name,
        email: signupEmail,
        password: signupPassword,
        phone,
        farmName,
        county,
        subCounty,
        plan,
      });

      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      } else {
        setError(res.error || 'Failed to create your farm account.');
      }
    } catch {
      setError('An error occurred while creating your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
        
        {/* Header Ribbon */}
        <div className="bg-dairy-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-dairy-600 flex items-center justify-center text-white font-black text-xl shadow-inner">
              M
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Mylkio</h2>
              <p className="text-xs text-dairy-200">Dairy Farm Management System</p>
            </div>
          </div>

          <div className="mt-4 flex bg-dairy-950/40 p-1 rounded-xl">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-dairy-900 shadow-sm'
                  : 'text-dairy-200 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-dairy-900 shadow-sm'
                  : 'text-dairy-200 hover:text-white'
              }`}
            >
              Create Farm Account
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium animate-shake">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body Form */}
        <div className="p-6">
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="farmer@dairy.co.ke"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-dairy-500 focus:ring-2 focus:ring-dairy-100 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-dairy-500 focus:ring-2 focus:ring-dairy-100 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-dairy-600 hover:bg-dairy-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-dairy-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Verifying...' : 'Sign In to Farm'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-semibold">Or Test Sample Data</span>
                </div>
              </div>

              {/* Demo 1-Click Access Button */}
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-dairy-50 hover:border-dairy-300 text-slate-700 hover:text-dairy-900 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs"
              >
                <Tractor className="w-4 h-4 text-dairy-600" />
                <span>Explore Nakuru Demo Farm (Green Hills)</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div className="p-3 bg-[#F7F4EA] border border-[#A9B392]/50 rounded-xl flex items-center gap-2 text-xs text-[#2D3327] font-medium">
                <Sparkles className="w-4 h-4 text-[#D6B46D] shrink-0" />
                <span>Includes 14-Day Full Free Trial. Starts clean with no demo data.</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Your Name *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Peter Chege"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-dairy-100 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Phone (M-Pesa)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0712 345 678"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-dairy-100 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Farm Name *
                </label>
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. Rongai Pride Dairy"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-dairy-100 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    County *
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      placeholder="e.g. Nakuru, Kiambu"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-dairy-100 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Sub-County
                  </label>
                  <input
                    type="text"
                    value={subCounty}
                    onChange={(e) => setSubCounty(e.target.value)}
                    placeholder="e.g. Rongai, Limuru"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-dairy-100 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-dairy-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Set Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-dairy-100 font-medium"
                  />
                </div>
              </div>

              {/* Plan Picker */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1.5">
                  Select Monthly Plan (14 Days Free)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlan('starter')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      plan === 'starter'
                        ? 'border-dairy-600 bg-dairy-50 text-dairy-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[11px]">Starter</div>
                    <div className="text-xs font-extrabold text-dairy-800">KSh 500</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlan('farmer')}
                    className={`p-2 rounded-xl border text-center transition-all relative ${
                      plan === 'farmer'
                        ? 'border-dairy-600 bg-dairy-50 text-dairy-900 font-bold ring-2 ring-dairy-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#D6B46D] text-[#2D3327] text-[8px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded-full shadow-2xs">
                      Popular
                    </span>
                    <div className="text-[11px]">Farmer</div>
                    <div className="text-xs font-extrabold text-dairy-800">KSh 1,000</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlan('farm_pro')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      plan === 'farm_pro'
                        ? 'border-dairy-600 bg-dairy-50 text-dairy-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[11px]">Farm Pro</div>
                    <div className="text-xs font-extrabold text-dairy-800">KSh 2,500</div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 rounded-xl bg-dairy-600 hover:bg-dairy-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-dairy-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Setting Up Your Farm...' : 'Create Account & Start 14-Day Trial'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-dairy-600" />
                <span>No M-Pesa charge today. Cancel anytime.</span>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
