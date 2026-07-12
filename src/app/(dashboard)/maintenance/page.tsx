'use client';

import React, { useState, useEffect } from 'react';
import { Wrench, Plus, X, UserCheck, CheckCircle2, ShieldAlert, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../layout';
import { format } from 'date-fns';
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants';

interface MaintenanceRequest {
  id: string;
  assetId: string;
  requestedById: string;
  assignedToId: string | null;
  description: string;
  priority: string;
  issueType: string | null;
  status: string;
  resolutionNotes: string | null;
  createdAt: string;
  asset: { name: string; assetTag: string; location: string };
  requestedBy: { name: string };
  assignedTo?: { name: string } | null;
}

interface Asset {
  id: string;
  name: string;
  assetTag: string;
  status: string;
}

export default function MaintenanceWorkflowPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);

  // Raised Form state
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [issueType, setIssueType] = useState('Hardware Malfunction');
  const [modalOpen, setModalOpen] = useState(false);

  // Assign Tech Modal State
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');

  // Close Ticket State
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');

  const isInventoryManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';

  const loadData = async () => {
    try {
      const [reqRes, assetRes, empRes] = await Promise.all([
        fetch('/api/maintenance'),
        fetch('/api/assets?limit=100'),
        fetch('/api/employees')
      ]);

      if (reqRes.ok) setRequests(await reqRes.json());
      if (assetRes.ok) {
        const d = await assetRes.json();
        setAssets(d.assets);
      }
      if (empRes.ok) {
        const empData = await empRes.json();
        // Technicians can be any employee
        setTechnicians(empData);
      }
    } catch (e) {
      toast.error('Failed to load maintenance tracking');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !description) {
      toast.error('Please specify the asset and describe the issue');
      return;
    }

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetId,
          description,
          priority,
          issueType
        })
      });

      if (res.ok) {
        toast.success('Maintenance ticket raised successfully!');
        setModalOpen(false);
        setSelectedAssetId('');
        setDescription('');
        loadData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit ticket');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateStatus = async (requestId: string, nextStatus: string, additionalData = {}) => {
    try {
      const res = await fetch('/api/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          status: nextStatus,
          ...additionalData
        })
      });

      if (res.ok) {
        toast.success(`Ticket shifted to ${nextStatus.replace('_', ' ')}!`);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to transition ticket');
      }
    } catch (e) {
      toast.error('Transition failed');
    }
  };

  const handleOpenTechModal = (req: MaintenanceRequest) => {
    setSelectedRequest(req);
    setSelectedTechId(req.assignedToId || '');
    setTechModalOpen(true);
  };

  const handleSaveTechAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !selectedTechId) return;

    await handleUpdateStatus(selectedRequest.id, 'TECHNICIAN_ASSIGNED', {
      assignedToId: selectedTechId
    });
    setTechModalOpen(false);
  };

  const handleOpenCloseModal = (req: MaintenanceRequest) => {
    setSelectedRequest(req);
    setCloseNotes('');
    setCloseModalOpen(true);
  };

  const handleCloseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !closeNotes) return;

    await handleUpdateStatus(selectedRequest.id, 'RESOLVED', {
      resolutionNotes: closeNotes
    });
    setCloseModalOpen(false);
  };

  // Group requests by Kanban Columns
  const getRequestsByStatus = (status: string) => {
    return requests.filter(r => r.status === status);
  };

  const columns = [
    { title: 'Pending Approval', status: 'PENDING', bg: 'var(--warning-bg)' },
    { title: 'Approved', status: 'APPROVED', bg: 'var(--info-bg)' },
    { title: 'In Repair', status: 'IN_PROGRESS', bg: 'var(--primary-glow)' },
    { title: 'Resolved', status: 'RESOLVED', bg: 'var(--success-bg)' },
    { title: 'Rejected', status: 'REJECTED', bg: 'var(--danger-bg)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Maintenance & Repairs</h1>
          <p className="page-subtitle">File maintenance tickets for broken items and manage technician repair workflows.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Raise Repair Ticket
        </button>
      </div>

      {/* Kanban Board Layout */}
      <div className="kanban-board">
        {columns.map((col) => {
          const colRequests = getRequestsByStatus(col.status);
          return (
            <div key={col.status} className="kanban-column">
              <div className="kanban-column-header">
                <span className="kanban-column-title" style={{ color: 'var(--text-primary)' }}>
                  <Wrench size={14} style={{ color: 'var(--primary)' }} />
                  {col.title}
                </span>
                <span className="kanban-card-count">{colRequests.length}</span>
              </div>
              
              <div className="kanban-cards-container">
                {colRequests.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    Column empty
                  </div>
                ) : (
                  colRequests.map((req) => (
                    <div key={req.id} className="kanban-card animate-fadeIn">
                      <div className="kanban-card-tag">{req.asset.assetTag}</div>
                      <div className="kanban-card-title">{req.asset.name}</div>
                      
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {req.description}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span className={`badge badge-${PRIORITY_COLORS[req.priority]}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                          {PRIORITY_LABELS[req.priority]}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {format(new Date(req.createdAt), 'MMM dd')}
                        </span>
                      </div>

                      {req.assignedTo && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', marginTop: '4px' }}>
                          Tech: <strong>{req.assignedTo.name}</strong>
                        </div>
                      )}

                      {/* Managers Quick Status Changes triggers */}
                      {isInventoryManager && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px', flexWrap: 'wrap' }}>
                          {req.status === 'PENDING' && (
                            <>
                              <button className="btn btn-success btn-sm" style={{ padding: '4px 8px', fontSize: '11px', flex: 1 }} onClick={() => handleUpdateStatus(req.id, 'APPROVED')}>
                                Approve
                              </button>
                              <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px', fontSize: '11px', flex: 1 }} onClick={() => handleUpdateStatus(req.id, 'REJECTED')}>
                                Reject
                              </button>
                            </>
                          )}
                          
                          {req.status === 'APPROVED' && (
                            <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '11px', width: '100%' }} onClick={() => handleOpenTechModal(req)}>
                              Assign Technician
                            </button>
                          )}

                          {req.status === 'TECHNICIAN_ASSIGNED' && (
                            <button className="btn btn-info btn-sm" style={{ padding: '4px 8px', fontSize: '11px', width: '100%' }} onClick={() => handleUpdateStatus(req.id, 'IN_PROGRESS')}>
                              Start Repair Work
                            </button>
                          )}

                          {req.status === 'IN_PROGRESS' && (
                            <button className="btn btn-success btn-sm" style={{ padding: '4px 8px', fontSize: '11px', width: '100%' }} onClick={() => handleOpenCloseModal(req)}>
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================
         MODAL 1: RAISE REPAIR REQUEST FORM
         ============================================================ */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Raise Asset Repair Ticket</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label">Select Damaged Asset *</label>
                  <select 
                    className="form-select"
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    required
                  >
                    <option value="">Select Asset (Tag - Name)</option>
                    {assets
                      .filter(a => a.status !== 'DISPOSED' && a.status !== 'RETIRED')
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.assetTag} - {a.name}</option>
                      ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Urgency Priority *</label>
                    <select 
                      className="form-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      required
                    >
                      <option value="LOW">Low (Cosmetic/Minor)</option>
                      <option value="MEDIUM">Medium (Normal)</option>
                      <option value="HIGH">High (Impacts work)</option>
                      <option value="CRITICAL">Critical (Total blocker)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Issue Category *</label>
                    <select 
                      className="form-select"
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      required
                    >
                      <option value="Hardware Malfunction">Hardware Malfunction</option>
                      <option value="Software Issue">Software Issue</option>
                      <option value="Physical Damage">Physical Damage</option>
                      <option value="Battery/Power issue">Battery/Power Issue</option>
                      <option value="Periodic Service">Periodic Service</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Problem Description *</label>
                  <textarea 
                    className="form-input"
                    style={{ height: '100px' }}
                    placeholder="Describe exactly what isn't working, error messages, flickering, details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">File Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
         MODAL 2: ASSIGN TECHNICIAN
         ============================================================ */}
      {techModalOpen && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Assign Technician to Repair Work</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setTechModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveTechAssignment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Assigning technician for repair of <strong>{selectedRequest.asset.name} ({selectedRequest.asset.assetTag})</strong>.
                </div>
                
                <div className="form-group">
                  <label className="form-label">Select Employee/Technician *</label>
                  <select 
                    className="form-select"
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    required
                  >
                    <option value="">Select Technician</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setTechModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
         MODAL 3: CLOSE TICKET & RESOLUTION REMARKS
         ============================================================ */}
      {closeModalOpen && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Close Maintenance Ticket</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setCloseModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCloseTicket}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Resolving repair ticket for <strong>{selectedRequest.asset.name} ({selectedRequest.asset.assetTag})</strong>.
                  The asset status will immediately revert to Available.
                </div>
                
                <div className="form-group">
                  <label className="form-label">Resolution Notes / Action Taken *</label>
                  <textarea 
                    className="form-input"
                    style={{ height: '100px' }}
                    placeholder="Describe what was repaired (e.g. motherboard replaced, screen fixed, clean installation done)..."
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCloseModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Resolve & Close Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
