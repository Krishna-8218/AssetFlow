'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, LogIn, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'session' }),
        });
        if (res.ok) {
          router.push('/dashboard');
        }
      } catch (err) {
        // Ignore
      }
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      toast.success('Successfully logged in!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.custom((t) => (
      <div style={{
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '350px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--warning)' }}>
          <ShieldAlert size={18} /> Forgot Password?
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          For security reasons, password resets in AssetFlow are managed by system administrators. Please contact your IT Department or Administrator to reset your password.
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => toast.dismiss(t.id)}>Dismiss</button>
      </div>
    ), { duration: 6000 });
  };

  return (
    <div className="auth-container">
      <Toaster position="top-right" />
      <div className="auth-card animate-slideUp">
        <div className="auth-header">
          <div className="logo-text" style={{ justifyContent: 'center' }}>
            <span>AF</span> AssetFlow
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your enterprise ERP dashboard</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail className="search-icon" style={{ left: '12px' }} size={16} />
              <input
                id="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <a href="#" className="page-subtitle" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }} onClick={handleForgotPassword}>
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock className="search-icon" style={{ left: '12px' }} size={16} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '38px', paddingRight: '40px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg mt-2" disabled={loading} style={{ width: '100%' }}>
            {loading ? <div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: '#fff' }} /> : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <div className="auth-footer">
          New here?
          <Link href="/signup">Create Account</Link>
        </div>

        <div className="divider" style={{ margin: '24px 0 16px' }} />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
          🔒 Sign up creates an <strong>Employee account only</strong>. Admin and Manager roles must be assigned by an administrator from the employee directory.
        </div>
      </div>
    </div>
  );
}
