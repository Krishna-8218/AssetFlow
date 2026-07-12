'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User as UserIcon, Phone, Building2, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDepartments() {
      try {
        const res = await fetch('/api/departments');
        if (res.ok) {
          const data = await res.json();
          // Filter to active departments
          setDepartments(data.filter((d: any) => d.status === 'ACTIVE'));
        }
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    }
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          name,
          email,
          phone,
          password,
          departmentId: departmentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      toast.success('Account created successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Toaster position="top-right" />
      <div className="auth-card animate-slideUp">
        <div className="auth-header">
          <div className="logo-text" style={{ justifyContent: 'center' }}>
            <span>AF</span> AssetFlow
          </div>
          <h1>Create Account</h1>
          <p>Join AssetFlow as an Employee</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name *</label>
            <div style={{ position: 'relative' }}>
              <UserIcon className="search-icon" style={{ left: '12px' }} size={16} />
              <input
                id="name"
                type="text"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address *</label>
            <div style={{ position: 'relative' }}>
              <Mail className="search-icon" style={{ left: '12px' }} size={16} />
              <input
                id="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="john.doe@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Phone className="search-icon" style={{ left: '12px' }} size={16} />
              <input
                id="phone"
                type="tel"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="department">Department</label>
            <div style={{ position: 'relative' }}>
              <Building2 className="search-icon" style={{ left: '12px' }} size={16} />
              <select
                id="department"
                className="form-select"
                style={{ paddingLeft: '38px' }}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm *</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="show-password"
              className="form-checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
            />
            <label htmlFor="show-password" style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              Show Passwords
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-lg mt-1" disabled={loading} style={{ width: '100%' }}>
            {loading ? <div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: '#fff' }} /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?
          <Link href="/login">Sign In</Link>
        </div>

        <div className="divider" style={{ margin: '24px 0 16px' }} />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.4' }}>
          🔒 By registering, you understand that your account is automatically created as an <strong>Employee</strong>. Elevated roles like Asset Manager or Department Head can only be promoted by a system Admin.
        </div>
      </div>
    </div>
  );
}
