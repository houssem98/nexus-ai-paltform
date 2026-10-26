import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api';

export const SignIn: React.FC<{ email: string; onSignedIn: () => void }> = ({ email: initialEmail, onSignedIn }) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/v1/auth/login', { email, password });
      onSignedIn();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  const field = 'bg-white/[0.04] text-slate-200 text-xs rounded-lg px-3 py-2 border border-white/[0.08] focus:border-blue-500/50 focus:outline-none';

  return (
    <div className="h-screen w-screen bg-[#080B11] flex items-center justify-center text-slate-300 select-none">
      <form onSubmit={submit} className="w-80 flex flex-col gap-3 p-6 rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <div className="font-medium text-sm tracking-tight text-white">Sign in to Nexus AI Platform</div>
        <input type="email" required autoFocus={!initialEmail} autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        <input type="password" required autoFocus={!!initialEmail} autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-medium rounded-lg px-3 py-2">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Sign in
        </button>
      </form>
    </div>
  );
};
