'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Monitor, 
  Calendar, 
  MapPin, 
  Activity, 
  History, 
  Wrench, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  AlertOctagon,
  Trash2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ASSET_STATUS_LABELS, ASSET_STATUS_COLORS, CONDITION_LABELS } from '@/lib/constants';
import { useAuth } from '../../layout';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AssetDetails {
  id: string;
  name: string;
  assetTag: string;
  serialNumber: string;
  acquisitionDate: string;
  acquisitionCost: number;
  condition: string;
  location: string;
  status: string;
  isShared: boolean;
  isBookable: boolean;
  notes: string | null;
  qrCode: string | null;
  images: string | null;
  category: { id: string; name: string; customFields: string | null };
  department?: { id: string; name: string; code: string } | null;
  assignedTo?: { id: string; name: string; email: string } | null;
  registeredBy?: { name: string } | null;
  allocations: any[];
  maintenanceRequests: any[];
  bookings: any[];
}

export default function AssetDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'allocations' | 'maintenance'>('overview');

  const fetchAsset = async () => {
    try {
      const res = await fetch(`/api/assets/${id}`);
      if (res.ok) {
        setAsset(await res.json());
      } else {
        toast.error('Asset details could not be found');
        router.push('/assets');
      }
    } catch (e) {
      toast.error('Network error loading asset details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();
  }, [id]);

  const handleRetireAsset = async () => {
    if (!window.confirm('Are you sure you want to retire this asset from active service? This state transition is permanent.')) return;
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RETIRED' })
      });
      if (res.ok) {
        toast.success('Asset retired from service.');
        fetchAsset();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update status');
      }
    } catch (e) {
      toast.error('Request failed');
    }
  };

  const handleDisposeAsset = async () => {
    if (!window.confirm('Are you sure you want to permanently dispose/write-off this asset?')) return;
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Asset written off / disposed.');
        fetchAsset();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update status');
      }
    } catch (e) {
      toast.error('Request failed');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div className="skeleton skeleton-circle" style={{ width: '48px', height: '48px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton skeleton-text" style={{ width: '200px', height: '24px' }} />
            <div className="skeleton skeleton-text" style={{ width: '100px' }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-lg mt-4">
          <div className="skeleton" style={{ height: '300px' }} />
          <div className="skeleton" style={{ height: '300px', gridColumn: 'span 2' }} />
        </div>
      </div>
    );
  }

  if (!asset) return <div className="empty-state">Asset details not found.</div>;

  const isInventoryManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';
  const customFieldsConfig = asset.category.customFields ? JSON.parse(asset.category.customFields) : [];
  const customFieldsValues = asset.images ? JSON.parse(asset.images) : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header breadcrumb bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/assets" className="btn btn-ghost btn-icon btn-sm" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="page-title" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {asset.name} 
              <span className={`badge badge-${ASSET_STATUS_COLORS[asset.status]}`}>
                {ASSET_STATUS_LABELS[asset.status]}
              </span>
            </h1>
            <p className="page-subtitle">Tracked Tag: <strong>{asset.assetTag}</strong> | Category: {asset.category.name}</p>
          </div>
        </div>

        {/* Quick action buttons depending on role */}
        {isInventoryManager && asset.status !== 'DISPOSED' && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {asset.status === 'AVAILABLE' && (
              <Link href="/allocation" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary btn-sm">Allocate Asset</button>
              </Link>
            )}
            
            {asset.status === 'AVAILABLE' && (
              <button className="btn btn-secondary btn-sm" onClick={handleRetireAsset}>
                Retire Asset
              </button>
            )}
            
            {(asset.status === 'AVAILABLE' || asset.status === 'LOST' || asset.status === 'RETIRED') && (
              <button className="btn btn-danger btn-sm" onClick={handleDisposeAsset}>
                <Trash2 size={14} /> Dispose Asset
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-lg">
        
        {/* Left Column: QR and quick overview card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card text-center p-6">
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <div style={{ background: '#fff', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <QRCodeSVG value={asset.qrCode || ''} size={150} />
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Scanning Tag: <strong>{asset.assetTag}</strong>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Condition:</span>
                <span style={{ fontWeight: 600 }}>{CONDITION_LABELS[asset.condition] || asset.condition}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
                <span style={{ fontWeight: 600 }}>{asset.location}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Serial Num:</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{asset.serialNumber}</span>
              </div>
            </div>
          </div>

          {/* Allocation card context */}
          <div className="card p-4">
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={16} /> Asset Assignment
            </h4>
            {asset.assignedTo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div>Currently allocated to:</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>{asset.assignedTo.name}</div>
                <div style={{ color: 'var(--text-muted)' }}>{asset.assignedTo.email}</div>
                {asset.department && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Department: <strong>{asset.department.name} ({asset.department.code})</strong>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                This asset is currently in inventory stock and not assigned to any department or individual.
              </div>
            )}
          </div>

        </div>

        {/* Right Columns: Tab content */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="tabs-container">
            <div className="tabs-list">
              <button 
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <Monitor size={16} /> Specifications
              </button>
              <button 
                className={`tab-button ${activeTab === 'allocations' ? 'active' : ''}`}
                onClick={() => setActiveTab('allocations')}
              >
                <History size={16} /> Allocation History ({asset.allocations.length})
              </button>
              <button 
                className={`tab-button ${activeTab === 'maintenance' ? 'active' : ''}`}
                onClick={() => setActiveTab('maintenance')}
              >
                <Wrench size={16} /> Repairs & Maintenance ({asset.maintenanceRequests.length})
              </button>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="card p-6 animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 className="section-title" style={{ fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    Financial & General Details
                  </h4>
                  <div className="grid grid-cols-2 gap-md mt-3" style={{ fontSize: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Acquisition Cost</span>
                      <span style={{ fontWeight: 600, fontSize: '16px' }}>
                        INR {asset.acquisitionCost.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Acquisition Date</span>
                      <span style={{ fontWeight: 600 }}>
                        {format(new Date(asset.acquisitionDate), 'MMMM dd, yyyy')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Registered By</span>
                      <span style={{ fontWeight: 600 }}>{asset.registeredBy?.name || 'System Seeder'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Resource Type</span>
                      <span style={{ fontWeight: 600 }}>
                        {asset.isShared ? (asset.isBookable ? 'Shared (Bookable)' : 'Shared (Non-bookable)') : 'Sole Allocation Asset'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Custom category fields rendering */}
                {customFieldsConfig.length > 0 && (
                  <div>
                    <h4 className="section-title" style={{ fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginTop: '10px' }}>
                      Specifications & Attributes
                    </h4>
                    <div className="grid grid-cols-2 gap-md mt-3" style={{ fontSize: '14px' }}>
                      {customFieldsConfig.map((field: any) => {
                        const val = customFieldsValues[field.name];
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} key={field.name}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{field.label}</span>
                            <span style={{ fontWeight: 600 }}>
                              {val === true ? 'Yes' : val === false ? 'No' : (val || '-')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {asset.notes && (
                  <div>
                    <h4 className="section-title" style={{ fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginTop: '10px' }}>
                      Operational Notes
                    </h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '8px' }}>
                      {asset.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Allocations */}
            {activeTab === 'allocations' && (
              <div className="table-container animate-fadeIn">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Allocated To</th>
                      <th>Allocated By</th>
                      <th>Allocated On</th>
                      <th>Expected Return</th>
                      <th>Returned On</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asset.allocations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="table-empty">No allocation logs recorded.</td>
                      </tr>
                    ) : (
                      asset.allocations.map((alloc) => (
                        <tr key={alloc.id}>
                          <td style={{ fontWeight: 600 }}>{alloc.allocatedTo.name}</td>
                          <td>{alloc.allocatedBy.name}</td>
                          <td>{format(new Date(alloc.allocatedAt), 'MMM dd, yyyy')}</td>
                          <td>{alloc.expectedReturnDate ? format(new Date(alloc.expectedReturnDate), 'MMM dd, yyyy') : '-'}</td>
                          <td>{alloc.returnedAt ? format(new Date(alloc.returnedAt), 'MMM dd, yyyy') : '-'}</td>
                          <td>
                            <span className={`badge badge-${alloc.status === 'ACTIVE' ? 'success' : alloc.status === 'OVERDUE' ? 'danger' : 'neutral'}`}>
                              {alloc.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Maintenance */}
            {activeTab === 'maintenance' && (
              <div className="table-container animate-fadeIn">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Problem Description</th>
                      <th>Priority</th>
                      <th>Raised On</th>
                      <th>Assigned To</th>
                      <th>Resolution Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asset.maintenanceRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="table-empty">No maintenance tickets reported.</td>
                      </tr>
                    ) : (
                      asset.maintenanceRequests.map((req) => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 600, fontSize: '11px', fontFamily: 'monospace' }}>{req.id.substring(0, 8).toUpperCase()}</td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.description}</td>
                          <td>
                            <span className={`badge badge-${req.priority === 'CRITICAL' || req.priority === 'HIGH' ? 'danger' : 'neutral'}`}>
                              {req.priority}
                            </span>
                          </td>
                          <td>{format(new Date(req.createdAt), 'MMM dd, yyyy')}</td>
                          <td>{req.assignedTo?.name || 'Unassigned'}</td>
                          <td>
                            <span className={`badge badge-neutral`}>
                              {req.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
