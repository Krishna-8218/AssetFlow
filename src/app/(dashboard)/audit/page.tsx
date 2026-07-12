'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Check, 
  X, 
  AlertTriangle, 
  UserCheck, 
  Plus, 
  Lock, 
  ShieldAlert, 
  Clock,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../layout';
import { format } from 'date-fns';
import { AUDIT_STATUS_LABELS, VERIFICATION_LABELS, VERIFICATION_COLORS } from '@/lib/constants';

interface AuditCycle {
  id: string;
  name: string;
  scope: string;
  startDate: string;
  endDate: string;
  status: string;
  closedAt: string | null;
  department?: { name: string; code: string } | null;
  category?: { name: string } | null;
  createdBy: { name: string };
  assignments: any[];
  _count: { items: number };
}

interface AuditItem {
  id: string;
  auditCycleId: string;
  assetId: string;
  verificationStatus: string | null;
  notes: string | null;
  verifiedAt: string | null;
  asset: { id: string; name: string; assetTag: string; location: string; status: string };
  auditor?: { name: string } | null;
}

export default function AssetAuditPage() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  
  // Create cycle form state
  const [name, setName] = useState('');
  const [scope, setScope] = useState('DEPARTMENT');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Selector lists
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [auditorsList, setAuditorsList] = useState<{ id: string; name: string }[]>([]);

  // Item verification state
  const [activeItem, setActiveItem] = useState<AuditItem | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<'VERIFIED' | 'MISSING' | 'DAMAGED'>('VERIFIED');
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  const isInventoryManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';

  const loadCycles = async () => {
    try {
      const res = await fetch('/api/audit');
      if (res.ok) setCycles(await res.json());
    } catch (e) {
      toast.error('Failed to load audit cycles');
    }
  };

  useEffect(() => {
    loadCycles();
    
    // Load selectors
    async function loadSelectors() {
      try {
        const [deptRes, catRes, empRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/categories'),
          fetch('/api/employees')
        ]);
        if (deptRes.ok) setDepartments(await deptRes.json());
        if (catRes.ok) setCategories(await catRes.json());
        if (empRes.ok) {
          const empData = await empRes.json();
          // Auditors must be managers or admins or special roles
          setAuditorsList(empData.filter((e: any) => e.role !== 'EMPLOYEE'));
        }
      } catch (err) {
        console.error('Selector load failed');
      }
    }
    loadSelectors();
  }, []);

  // Fetch detailed items when selected cycle changes
  useEffect(() => {
    if (!selectedCycleId) {
      setAuditItems([]);
      return;
    }

    async function fetchItems() {
      try {
        const res = await fetch(`/api/audit?cycleId=${selectedCycleId}`);
        if (res.ok) setAuditItems(await res.json());
      } catch (e) {
        toast.error('Failed to load audit items checklist');
      }
    }
    fetchItems();
  }, [selectedCycleId]);

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate || selectedAuditors.length === 0) {
      toast.error('Please specify the cycle name, dates, and auditors');
      return;
    }

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name,
          scope,
          departmentId: scope === 'DEPARTMENT' ? departmentId : null,
          categoryId: scope === 'CATEGORY' ? categoryId : null,
          location: scope === 'LOCATION' ? location : null,
          startDate,
          endDate,
          auditorIds: selectedAuditors
        })
      });

      if (res.ok) {
        toast.success('Audit Cycle successfully launched!');
        setModalOpen(false);
        // Reset form
        setName('');
        setSelectedAuditors([]);
        loadCycles();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to launch audit');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenVerifyModal = (item: AuditItem) => {
    setActiveItem(item);
    setVerifyStatus('VERIFIED');
    setVerifyNotes('');
    setVerifyModalOpen(true);
  };

  const handleVerifyItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          itemId: activeItem.id,
          verificationStatus: verifyStatus,
          notes: verifyNotes
        })
      });

      if (res.ok) {
        toast.success('Asset verified successfully!');
        setVerifyModalOpen(false);
        // Refresh items list
        const itemsRes = await fetch(`/api/audit?cycleId=${selectedCycleId}`);
        if (itemsRes.ok) setAuditItems(await itemsRes.json());
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Verification failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCloseCycle = async () => {
    const unverified = auditItems.filter(item => !item.verificationStatus).length;
    if (unverified > 0) {
      if (!window.confirm(`There are still ${unverified} unverified assets in this cycle. Closing the audit cycle now will lock all status verification. Proceed?`)) return;
    } else {
      if (!window.confirm('Are you sure you want to lock and close this audit cycle? This action updates confirmed missing items to LOST and cannot be undone.')) return;
    }

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          cycleId: selectedCycleId
        })
      });

      if (res.ok) {
        toast.success('Audit Cycle has been locked and closed!');
        loadCycles();
        // Refresh items list
        const itemsRes = await fetch(`/api/audit?cycleId=${selectedCycleId}`);
        if (itemsRes.ok) setAuditItems(await itemsRes.json());
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to close cycle');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedCycleObj = cycles.find(c => c.id === selectedCycleId);
  const isClosed = selectedCycleObj?.status === 'CLOSED';

  // Count discrepancies
  const missingCount = auditItems.filter(i => i.verificationStatus === 'MISSING').length;
  const damagedCount = auditItems.filter(i => i.verificationStatus === 'DAMAGED').length;
  const verifiedCount = auditItems.filter(i => i.verificationStatus === 'VERIFIED').length;
  const totalItems = auditItems.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Asset Verification Audits</h1>
          <p className="page-subtitle">Schedule, assign, and verify active inventory lists to maintain discrepancy reports.</p>
        </div>
        {isInventoryManager && (
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Create Audit Cycle
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-lg">
        
        {/* Left Column: Active/Past Cycles list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 className="section-title" style={{ marginBottom: '8px' }}>Audit Cycles</h3>
          {cycles.length === 0 ? (
            <div className="empty-state">No audit cycles created.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cycles.map((c) => {
                const active = c.id === selectedCycleId;
                return (
                  <div 
                    key={c.id} 
                    className={`card p-4 hover-lift ${active ? 'active' : ''}`} 
                    style={{ 
                      cursor: 'pointer',
                      borderLeft: active ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                      background: active ? 'var(--primary-glow)' : 'var(--bg-secondary)'
                    }} 
                    onClick={() => setSelectedCycleId(c.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{c.name}</div>
                      <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{c.status}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                      <div>Scope: <strong>{c.scope}</strong></div>
                      <div>Assets in Audit: {c._count.items}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <Clock size={12} /> {format(new Date(c.startDate), 'MMM dd')} - {format(new Date(c.endDate), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Columns: Audit items and discrepancy reports */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedCycleId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fadeIn">
              
              {/* Summary Dashboard Info */}
              <div className="card p-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{selectedCycleObj?.name} Checklist</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status: {selectedCycleObj?.status} | Total Targets: {totalItems}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ textAlign: 'center', background: 'var(--success-bg)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>{verifiedCount}</div>
                      <div style={{ fontSize: '10px', color: 'var(--success)' }}>Verified</div>
                    </div>
                    
                    <div style={{ textAlign: 'center', background: 'var(--danger-bg)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--danger)' }}>{missingCount}</div>
                      <div style={{ fontSize: '10px', color: 'var(--danger)' }}>Missing</div>
                    </div>

                    <div style={{ textAlign: 'center', background: 'var(--warning-bg)', padding: '6px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--warning)' }}>{damagedCount}</div>
                      <div style={{ fontSize: '10px', color: 'var(--warning)' }}>Damaged</div>
                    </div>
                  </div>

                  {isInventoryManager && !isClosed && (
                    <button className="btn btn-danger btn-sm" onClick={handleCloseCycle}>
                      <Lock size={14} /> Close & Lock Cycle
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic Discrepancy Alert box if discrepancy exists */}
              {(missingCount > 0 || damagedCount > 0) && (
                <div className="card p-4" style={{ borderLeft: '4px solid var(--danger)', background: 'var(--danger-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
                    <AlertTriangle size={16} /> Discrepancy Alert: Audit Flags Detected
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    There are currently <strong>{missingCount} missing</strong> and <strong>{damagedCount} damaged</strong> assets flagged in this verification cycle. 
                    {isClosed ? ' All missing assets have been locked into the registry database with LOST statuses.' : ' Closing this audit cycle will transition missing assets to LOST status in the system.'}
                  </div>
                </div>
              )}

              {/* Verification items Checklist Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Asset Tag</th>
                      <th>Asset Name</th>
                      <th>Expected Location</th>
                      <th>Verification Status</th>
                      <th>Notes</th>
                      {!isClosed && <th style={{ textAlign: 'right' }}>Verify</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {auditItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="table-empty">No items assigned to this audit.</td>
                      </tr>
                    ) : (
                      auditItems.map((item) => {
                        const verified = !!item.verificationStatus;
                        return (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.asset.assetTag}</td>
                            <td style={{ fontWeight: 500 }}>{item.asset.name}</td>
                            <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.asset.location}</td>
                            <td>
                              {verified ? (
                                <span className={`badge badge-${VERIFICATION_COLORS[item.verificationStatus as string]}`}>
                                  {VERIFICATION_LABELS[item.verificationStatus as string]}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unverified</span>
                              )}
                            </td>
                            <td style={{ fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.notes || '-'}
                            </td>
                            {!isClosed && (
                              <td style={{ textAlign: 'right' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenVerifyModal(item)}>
                                  Verify Status
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            <div className="empty-state card p-8">
              <ClipboardCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h4>No Audit Selected</h4>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Select an audit cycle from the left to review target assets, verify condition checklists, or view discrepancy logs.</p>
            </div>
          )}
        </div>

      </div>

      {/* ============================================================
         MODAL 1: CREATE AUDIT CYCLE FORM
         ============================================================ */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Launch Audit Cycle</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCycle}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label">Audit Cycle Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Q2 2025 IT Hardware Audit"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Scope Filter Level *</label>
                    <select 
                      className="form-select"
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      required
                    >
                      <option value="ORGANIZATION">Organization-Wide (All Assets)</option>
                      <option value="DEPARTMENT">Department Specific</option>
                      <option value="CATEGORY">Category Specific</option>
                      <option value="LOCATION">Physical Location Specific</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dates Scope *</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="date" 
                        className="form-input"
                        style={{ padding: '6px' }}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                      <input 
                        type="date" 
                        className="form-input"
                        style={{ padding: '6px' }}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Scope specifics fields */}
                {scope === 'DEPARTMENT' && (
                  <div className="form-group animate-fadeIn">
                    <label className="form-label">Select Target Department *</label>
                    <select className="form-select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === 'CATEGORY' && (
                  <div className="form-group animate-fadeIn">
                    <label className="form-label">Select Target Category *</label>
                    <select className="form-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === 'LOCATION' && (
                  <div className="form-group animate-fadeIn">
                    <label className="form-label">Physical Location query string *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. IT Lab" 
                      value={location} 
                      onChange={(e) => setLocation(e.target.value)} 
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Assign Auditor *</label>
                  <select 
                    multiple
                    className="form-select"
                    style={{ height: '100px' }}
                    value={selectedAuditors}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      setSelectedAuditors(values);
                    }}
                    required
                  >
                    {auditorsList.map(aud => (
                      <option key={aud.id} value={aud.id}>{aud.name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Note: hold Ctrl (or Cmd) to select multiple auditors. Standard employees cannot be auditors.
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Launch Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
         MODAL 2: CONDUCT VERIFICATION CHECK
         ============================================================ */}
      {verifyModalOpen && activeItem && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Verify Asset Status</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setVerifyModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleVerifyItem}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Verifying item:</div>
                  <div style={{ fontWeight: 700 }}>{activeItem.asset.name} ({activeItem.asset.assetTag})</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Location placement: {activeItem.asset.location}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Verification Status *</label>
                  <select 
                    className="form-select"
                    value={verifyStatus}
                    onChange={(e) => setVerifyStatus(e.target.value as any)}
                    required
                  >
                    <option value="VERIFIED">Verified (Condition Good / In Place)</option>
                    <option value="MISSING">Missing (Cannot be found)</option>
                    <option value="DAMAGED">Damaged (Faulty/Unusable)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Verification Notes</label>
                  <textarea 
                    className="form-input"
                    style={{ height: '80px' }}
                    placeholder="Enter notes on findings, physical status, or damage descriptions..."
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setVerifyModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Verification</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
