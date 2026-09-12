import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Shield, Lock, Mail, AlertCircle, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore(state => state.login);
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(username, password);
    if (result.success) {
      navigate('/');
    } else {
      setError("Invalid username or password");
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 relative"
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--text)',
        backgroundImage: isDark 
          ? 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)'
          : 'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }}
    >
      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-lg transition-colors flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {isDark ? <Sun className="w-4 h-4 text-slate-400 hover:text-white" /> : <Moon className="w-4 h-4 text-slate-500 hover:text-slate-900" />}
        </button>
      </div>

      <div 
        className="w-full shadow-2xl overflow-hidden"
        style={{ 
          maxWidth: '400px', 
          backgroundColor: 'var(--surface)', 
          border: '1px solid var(--border)',
          borderRadius: '16px'
        }}
      >
        <div style={{ padding: '24px 24px 16px 24px' }} className="text-center flex flex-col items-center">
          <div className="bg-white rounded-xl p-2 mb-3 shadow-sm inline-block">
            <img src="/logo-original.png" alt="AeriSeg Logo" className="w-24 object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-1" style={{ color: 'var(--text)' }}>AeriSeg</h1>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Security Operations Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px 24px' }} className="space-y-4">
          {error && (
            <div 
              className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-1"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 text-sm focus:outline-none transition-colors"
                style={{
                  height: '42px',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)'
                }}
                placeholder="Email or Username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 text-sm focus:outline-none transition-colors"
                style={{
                  height: '42px',
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text)'
                }}
                placeholder="Password"
              />
            </div>
          </div>

          <div className="flex items-center pt-1 pb-2">
            <input 
              type="checkbox" 
              id="remember" 
              className="w-3.5 h-3.5 rounded border-gray-300 focus:ring-0" 
              style={{ accentColor: 'rgb(var(--primary))' }}
            />
            <label htmlFor="remember" className="ml-2 text-xs font-medium cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              Remember Me
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full font-bold text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            style={{
              height: '42px',
              backgroundColor: 'rgb(var(--primary))',
              borderRadius: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authenticating...
              </>
            ) : 'Sign In'}
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <p>SOC Dashboard • Threat Hunting • SOAR</p>
        <div className="flex gap-3 font-medium">
          <span>Version 1.0</span>
          <span>© AeriSeg</span>
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Terms</a>
        </div>
      </div>
    </div>
  );
}
