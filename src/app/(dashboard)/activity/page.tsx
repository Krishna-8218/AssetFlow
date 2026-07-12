'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, Eye, Filter, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../layout';
import { format } from 'date-fns';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';

interface Log {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  previousValue: string | null;
  newValue: string | null;
  role: string;
  createdAt: string;
  user: { name: string; email: string };
}

export default function ActivityLogsTrailPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [role, setRole] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Expanded log index state for detailed delta JSON view
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        entityType,
        role,
        page: String(page),
        limit: '15'
      });

      const res = await fetch(`/api/activity?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (e) {
      console.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, entityType, role, page]);

  const handleToggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const handleReset = () => {
    setSearch('');
    setEntityType('');
    setRole('');
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div>
        <h1 className="page-title">System Audit Log Trail</h1>
        <p className="page-subtitle">Traceable transactional log of all inventory modifications, bookings, allocations, and user promotions.</p>
      </div>

      {/* Action filters bar */}
      <div className="card p-4">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          
          {/* Search Query */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>Search Actions / ID</label>
            <div style={{ position: 'relative' }}>
              <Search className="search-icon" style={{ left: '10px' }} size={14} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '34px', height: '38px' }}
                placeholder="Search description..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {/* Entity select */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>Module Area</label>
            <select 
              className="form-select" 
              style={{ height: '38px' }}
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            >
              <option value="">All Module Areas</option>
              <option value="USER">User profiles</option>
              <option value="DEPARTMENT">Departments</option>
              <option value="CATEGORY">Categories</option>
              <option value="ASSET">Assets Registry</option>
              <option value="ALLOCATION">Allocations</option>
              <option value="TRANSFER">Transfers</option>
              <option value="BOOKING">Bookings</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="AUDIT">Audits</option>
            </select>
          </div>

          {/* Role select */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '12px' }}>Action By Role</label>
            <select 
              className="form-select" 
              style={{ height: '38px' }}
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="ASSET_MANAGER">Asset Manager</option>
              <option value="DEPARTMENT_HEAD">Department Head</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" style={{ height: '38px', width: '100%' }} onClick={handleReset}>
              Reset Filters
            </button>
          </div>

        </div>
      </div>

      {/* Audit Log Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action description</th>
              <th>Performed By</th>
              <th>Role Level</th>
              <th>Module Area</th>
              <th style={{ textAlign: 'right' }}>Payload Delta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: 'auto' }} />
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty">No activity logs recorded.</td>
              </tr>
            ) : (
              logs.map((log) => {
                const expanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.action}</td>
                      <td>
                        <div>{log.user.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.user.email}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${ROLE_COLORS[log.role]}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                          {ROLE_LABELS[log.role] || log.role}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '12px' }}>{log.entityType}</td>
                      <td style={{ textAlign: 'right' }}>
                        {(log.previousValue || log.newValue) ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleToggleExpand(log.id)}>
                            <Eye size={12} /> {expanded ? 'Hide details' : 'View delta'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Collapsible detailed JSON view */}
                    {expanded && (log.previousValue || log.newValue) && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--bg-tertiary)', padding: '16px 24px' }} className="animate-fadeIn">
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {log.previousValue && (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                  Before Changes
                                </div>
                                <pre style={{
                                  fontSize: '11px',
                                  fontFamily: 'monospace',
                                  background: 'var(--bg-secondary)',
                                  padding: '12px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-color)',
                                  overflowX: 'auto',
                                  color: 'var(--text-primary)'
                                }}>
                                  {JSON.stringify(JSON.parse(log.previousValue), null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newValue && (
                              <div style={{ gridColumn: log.previousValue ? 'auto' : 'span 2' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                  After Changes
                                </div>
                                <pre style={{
                                  fontSize: '11px',
                                  fontFamily: 'monospace',
                                  background: 'var(--bg-secondary)',
                                  padding: '12px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-color)',
                                  overflowX: 'auto',
                                  color: 'var(--text-primary)'
                                }}>
                                  {JSON.stringify(JSON.parse(log.newValue), null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination control */}
      {!loading && logs.length > 0 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} activities
          </div>
          <div className="pagination-buttons">
            <button 
              className="pagination-button" 
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i}
                className={`pagination-button ${page === i + 1 ? 'active' : ''}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button 
              className="pagination-button" 
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
