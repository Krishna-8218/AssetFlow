'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  UserPlus, 
  History, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle,
  Clock,
  Check,
  X,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../layout';
import { format } from 'date-fns';

interface Allocation {
  id: string;
  assetId: string;
  allocatedToId: string;
  allocatedAt: string;
  expectedReturnDate: string | null;
  status: string;
  asset: { name: string; assetTag: string; serialNumber: string };
  allocatedTo: { name: string; email: string };
  allocatedBy: { name: string };
  department?: { name: string; code: string } | null;
}

interface Transfer {
  id: string;
  assetId: string;
  status: string;
  reason: string | null;
  notes: string | null;
  asset: { name: string; assetTag: string };
  fromUser: { name: string };
  toUser: { name: string };
  fromDept?: { code: string } | null;
  toDept?: { code: string } | null;
}

interface Asset {
  id: string;
  name: string;
  assetTag: string;
  status: string;
  assignedTo?: { name: string } | null;
  department?: { name: string } | null;
}

export default function AllocationTransferPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'allocate' | 'active' | 'transfers' | 'history'>('allocate');
  
  // Data lists
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [allEmployees, setAllEmployees] = useState<{ id: string; name: string }[]>([]);

  // Allocation Form State
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  
  // Transfer Request Form State
  const [transferAssetId, setTransferAssetId] = useState('');
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Return Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedAlloc, setSelectedAlloc] = useState<Allocation | null>(null);
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes] = useState('');

  // Conflict Info State
  const [conflictInfo, setConflictInfo] = useState<{ conflict: boolean; holderName?: string; deptName?: string } | null>(null);

  const isInventoryManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';

  const loadData = async () => {
    try {
      const [allocActiveRes, allocHistoryRes, transferRes, assetRes, empRes] = await Promise.all([
        fetch('/api/allocations?status=ACTIVE'),
        fetch('/api/allocations?status=RETURNED'),
        fetch('/api/transfers'),
        // Fetch ALL assets to allow search for allocations and transfers
        fetch('/api/assets?limit=100'),
        fetch('/api/employees')
      ]);

      const activeAllocData = await allocActiveRes.json();
      const historyAllocData = await allocHistoryRes.json();
      
      // Merge active and overdue
      const overdueAllocRes = await fetch('/api/allocations?status=OVERDUE');
      const overdueAllocData = await overdueAllocRes.json();
      
      setAllocations([...overdueAllocData, ...activeAllocData]);
      if (transferRes.ok) setTransfers(await transferRes.json());
      if (assetRes.ok) {
        const d = await assetRes.json();
        setAllAssets(d.assets);
      }
      if (empRes.ok) setAllEmployees(await empRes.json());
    } catch (e) {
      toast.error('Failed to reload allocation records');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Conflict check when selecting asset in Allocation Form
  useEffect(() => {
    if (!selectedAssetId) {
      setConflictInfo(null);
      return;
    }
    const assetObj = allAssets.find(a => a.id === selectedAssetId);
    if (assetObj && assetObj.status !== 'AVAILABLE') {
      setConflictInfo({
        conflict: true,
        holderName: assetObj.assignedTo?.name || 'Department Stock',
        deptName: assetObj.department?.name || 'N/A'
      });
    } else {
      setConflictInfo(null);
    }
  }, [selectedAssetId, allAssets]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !selectedEmployeeId) {
      toast.error('Please select both an asset and an employee');
      return;
    }

    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedAssetId,
          allocatedToId: selectedEmployeeId,
          expectedReturnDate: expectedReturnDate || null,
          notes: allocNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Allocation failed');
      }

      toast.success('Asset successfully allocated!');
      setSelectedAssetId('');
      setSelectedEmployeeId('');
      setExpectedReturnDate('');
      setAllocNotes('');
      loadData();
      setActiveTab('active');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenReturnModal = (alloc: Allocation) => {
    setSelectedAlloc(alloc);
    setReturnCondition('GOOD');
    setReturnNotes('');
    setReturnModalOpen(true);
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlloc) return;

    try {
      const res = await fetch('/api/allocations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocationId: selectedAlloc.id,
          conditionOnReturn: returnCondition,
          returnNotes
        })
      });

      if (res.ok) {
        toast.success('Return processed. Asset is now available.');
        setReturnModalOpen(false);
        loadData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Return check-in failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleOpenTransferModalFromConflict = () => {
    setTransferAssetId(selectedAssetId);
    setTransferToUserId(selectedEmployeeId);
    setTransferReason('');
    setTransferModalOpen(true);
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAssetId || !transferToUserId) {
      toast.error('Asset and target user are required');
      return;
    }

    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: transferAssetId,
          toUserId: transferToUserId,
          reason: transferReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer request failed');

      toast.success('Transfer request submitted to manager for approval!');
      setTransferModalOpen(false);
      setSelectedAssetId('');
      setSelectedEmployeeId('');
      loadData();
      setActiveTab('transfers');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleProcessTransferRequest = async (transferId: string, status: 'APPROVED' | 'REJECTED') => {
    const notes = window.prompt(`Enter approval/rejection remarks for this transfer:`);
    try {
      const res = await fetch('/api/transfers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferId,
          status,
          notes
        })
      });

      if (res.ok) {
        toast.success(`Transfer request ${status.toLowerCase()}!`);
        loadData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Action failed');
      }
    } catch (e) {
      toast.error('Action failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div>
        <h1 className="page-title">Allocations & Transfers</h1>
        <p className="page-subtitle">Assign physical assets to personnel, check in returns, or route direct hand-over transfers.</p>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs-list">
          {isInventoryManager && (
            <button 
              className={`tab-button ${activeTab === 'allocate' ? 'active' : ''}`}
              onClick={() => setActiveTab('allocate')}
            >
              <UserPlus size={16} /> New Allocation
            </button>
          )}
          <button 
            className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <Clock size={16} /> Active Holdings ({allocations.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'transfers' ? 'active' : ''}`}
            onClick={() => setActiveTab('transfers')}
          >
            <ArrowLeftRight size={16} /> Transfer Requests ({transfers.length})
          </button>
        </div>

        {/* --- Tab Content A: New Allocation Form (Manager Only) --- */}
        {activeTab === 'allocate' && isInventoryManager && (
          <div className="card p-6 animate-slideUp" style={{ maxWidth: '650px', margin: 'auto', width: '100%' }}>
            <h3 className="section-title">Allocate Asset to Employee</h3>
            <form onSubmit={handleAllocate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">Select Asset *</label>
                <select 
                  className="form-select"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  required
                >
                  <option value="">Select Asset (Tag - Name)</option>
                  {allAssets
                    .filter(a => a.status !== 'DISPOSED' && a.status !== 'RETIRED')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.assetTag} - {a.name} ({a.status})
                      </option>
                    ))}
                </select>
              </div>

              {/* Strict double allocation block warning alert */}
              {conflictInfo && (
                <div className="card p-4 animate-fadeIn" style={{ borderLeft: '4px solid var(--danger)', background: 'var(--danger-bg)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 700, fontSize: '14px' }}>
                    <AlertTriangle size={16} /> Double Allocation Blocked!
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    This asset is currently in use, held by <strong>{conflictInfo.holderName}</strong> ({conflictInfo.deptName}).
                    ERP business rules prevent double allocating assets.
                  </div>
                  <div>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm"
                      onClick={handleOpenTransferModalFromConflict}
                    >
                      Request Hand-over Transfer Instead
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Allocate To (Target Employee) *</label>
                <select 
                  className="form-select"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  required
                >
                  <option value="">Select Employee</option>
                  {allEmployees
                    .filter(e => e.id !== user?.userId) // Don't assign to oneself in standard flow
                    .map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Expected Return Date (Optional)</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Allocation Remarks</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '80px' }}
                  placeholder="Notes regarding hand-over condition or project assignments"
                  value={allocNotes}
                  onChange={(e) => setAllocNotes(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary mt-2" 
                disabled={!!conflictInfo}
              >
                Assign & Allocate
              </button>
            </form>
          </div>
        )}

        {/* --- Tab Content B: Active Allocations Table --- */}
        {activeTab === 'active' && (
          <div className="table-container animate-fadeIn">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Asset Name</th>
                  <th>Allocated To</th>
                  <th>Department</th>
                  <th>Allocated On</th>
                  <th>Expected Return</th>
                  <th>Status</th>
                  {isInventoryManager && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty">No active allocations found.</td>
                  </tr>
                ) : (
                  allocations.map((alloc) => {
                    const isOverdue = alloc.status === 'OVERDUE';
                    return (
                      <tr key={alloc.id} style={{ background: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'inherit' }}>
                        <td style={{ fontWeight: 700, color: isOverdue ? 'var(--danger)' : 'var(--primary)' }}>
                          {alloc.asset.assetTag}
                        </td>
                        <td style={{ fontWeight: 500 }}>{alloc.asset.name}</td>
                        <td>{alloc.allocatedTo.name}</td>
                        <td>{alloc.department?.code || '-'}</td>
                        <td>{format(new Date(alloc.allocatedAt), 'MMM dd, yyyy')}</td>
                        <td>
                          {alloc.expectedReturnDate ? (
                            <span style={{ color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 600 : 'normal' }}>
                              {format(new Date(alloc.expectedReturnDate), 'MMM dd, yyyy')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Open-ended</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${isOverdue ? 'danger animate-pulse' : 'success'}`}>
                            {alloc.status}
                          </span>
                        </td>
                        {isInventoryManager && (
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenReturnModal(alloc)}>
                              Return Asset
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
        )}

        {/* --- Tab Content C: Transfer Requests --- */}
        {activeTab === 'transfers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fadeIn">
            
            {/* Create request shortcut */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => {
                setTransferAssetId('');
                setTransferToUserId('');
                setTransferReason('');
                setTransferModalOpen(true);
              }}>
                <ArrowLeftRight size={14} /> Submit New Hand-over Request
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>From (Current Holder)</th>
                    <th>To (Target Recipient)</th>
                    <th>Departments</th>
                    <th>Transfer Reason</th>
                    <th>Status</th>
                    {user?.role !== 'EMPLOYEE' && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-empty">No transfer requests pending.</td>
                    </tr>
                  ) : (
                    transfers.map((req) => {
                      const isPending = req.status === 'REQUESTED';
                      return (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {req.asset.assetTag} - {req.asset.name}
                          </td>
                          <td>{req.fromUser.name}</td>
                          <td style={{ fontWeight: 600 }}>{req.toUser.name}</td>
                          <td style={{ fontSize: '12px' }}>
                            {req.fromDept?.code || 'Gen'} ➔ {req.toDept?.code || 'Gen'}
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.reason || ''}>
                            {req.reason || '-'}
                          </td>
                          <td>
                            <span className={`badge badge-neutral`}>
                              {req.status}
                            </span>
                          </td>
                          {user?.role !== 'EMPLOYEE' && (
                            <td style={{ textAlign: 'right' }}>
                              {isPending ? (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button className="btn btn-success btn-sm btn-icon" onClick={() => handleProcessTransferRequest(req.id, 'APPROVED')} title="Approve Hand-over">
                                    <Check size={14} />
                                  </button>
                                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleProcessTransferRequest(req.id, 'REJECTED')} title="Reject Hand-over">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Processed</span>
                              )}
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
        )}
      </div>

      {/* ============================================================
         MODAL 1: RETURN CHECK-IN CONDITION FORM
         ============================================================ */}
      {returnModalOpen && selectedAlloc && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Verify Asset Return Check-in</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setReturnModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleProcessReturn}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Returning asset:</div>
                  <div style={{ fontWeight: 700 }}>{selectedAlloc.asset.name} ({selectedAlloc.asset.assetTag})</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned to: {selectedAlloc.allocatedTo.name}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Return Condition Check *</label>
                  <select 
                    className="form-select"
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    required
                  >
                    <option value="NEW">New (Perfect)</option>
                    <option value="GOOD">Good (Working fine)</option>
                    <option value="FAIR">Fair (Visible usage marks)</option>
                    <option value="POOR">Poor (Functional defects)</option>
                    <option value="DAMAGED">Damaged (Needs repair)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Check-in Notes</label>
                  <textarea 
                    className="form-input"
                    style={{ height: '80px' }}
                    placeholder="Specific remarks regarding condition or parts return..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setReturnModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Return</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
         MODAL 2: TRANSFER REQUEST SUBMIT FORM
         ============================================================ */}
      {transferModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Submit Asset Hand-over Transfer Request</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setTransferModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRequestTransfer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label">Select Asset for Hand-over *</label>
                  <select 
                    className="form-select"
                    value={transferAssetId}
                    onChange={(e) => setTransferAssetId(e.target.value)}
                    required
                  >
                    <option value="">Select Asset (Tag - Name)</option>
                    {allAssets
                      .filter(a => a.status === 'ALLOCATED') // Can only transfer currently allocated assets
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.assetTag} - {a.name}</option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Recipient (Target Employee) *</label>
                  <select 
                    className="form-select"
                    value={transferToUserId}
                    onChange={(e) => setTransferToUserId(e.target.value)}
                    required
                  >
                    <option value="">Select Target Employee</option>
                    {allEmployees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Transfer Justification Reason *</label>
                  <textarea 
                    className="form-input"
                    style={{ height: '80px' }}
                    placeholder="Enter reason for this hand-over (e.g. project role shift)"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setTransferModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
