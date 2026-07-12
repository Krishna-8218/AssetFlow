'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { ASSET_STATUS_LABELS, ASSET_STATUS_COLORS, CONDITION_LABELS } from '@/lib/constants';
import { useAuth } from '../layout';

interface Asset {
  id: string;
  name: string;
  assetTag: string;
  serialNumber: string;
  condition: string;
  location: string;
  status: string;
  isShared: boolean;
  isBookable: boolean;
  category: { name: string };
  department?: { name: string; code: string } | null;
  assignedTo?: { name: string } | null;
}

export default function AssetsDirectoryPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  
  // Search & Filtering
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [condition, setCondition] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  
  // Sorting & Pagination
  const [sortField, setSortField] = useState('assetTag');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load supporting lists
  useEffect(() => {
    async function fetchFilters() {
      try {
        const [catRes, deptRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/departments')
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (deptRes.ok) setDepartments(await deptRes.json());
      } catch (err) {
        console.error('Filter loads failed');
      }
    }
    fetchFilters();
  }, []);

  // Fetch assets on filter changes
  useEffect(() => {
    async function fetchAssets() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          search,
          categoryId,
          status,
          condition,
          departmentId,
          sortField,
          sortOrder,
          page: String(page),
          limit: '10'
        });

        const res = await fetch(`/api/assets?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setAssets(data.assets);
          setTotalPages(data.totalPages);
          setTotal(data.total);
        }
      } catch (err) {
        console.error('Failed to load assets directory');
      } finally {
        setLoading(false);
      }
    }
    fetchAssets();
  }, [search, categoryId, status, condition, departmentId, sortField, sortOrder, page]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryId('');
    setStatus('');
    setCondition('');
    setDepartmentId('');
    setPage(1);
  };

  const isInventoryManager = user?.role === 'ADMIN' || user?.role === 'ASSET_MANAGER';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Asset Registry & Directory</h1>
          <p className="page-subtitle">Central tracking ledger of all corporate assets, shared resources, and assignments.</p>
        </div>
        {isInventoryManager && (
          <Link href="/assets/register" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary">
              <Plus size={16} /> Register New Asset
            </button>
          </Link>
        )}
      </div>

      {/* Advanced Filter Box */}
      <div className="card p-4">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            
            {/* Search Input */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Search Query</label>
              <div style={{ position: 'relative' }}>
                <Search className="search-icon" style={{ left: '10px' }} size={14} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '34px', height: '38px' }}
                  placeholder="Tag, name, serial..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>

            {/* Category Select */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Category</label>
              <select 
                className="form-select" 
                style={{ height: '38px' }}
                value={categoryId} 
                onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Lifecycle Status</label>
              <select 
                className="form-select" 
                style={{ height: '38px' }}
                value={status} 
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              >
                <option value="">All Statuses</option>
                {Object.keys(ASSET_STATUS_LABELS).map(key => (
                  <option key={key} value={key}>{ASSET_STATUS_LABELS[key]}</option>
                ))}
              </select>
            </div>

            {/* Condition Select */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Physical Condition</label>
              <select 
                className="form-select" 
                style={{ height: '38px' }}
                value={condition} 
                onChange={(e) => { setCondition(e.target.value); setPage(1); }}
              >
                <option value="">All Conditions</option>
                {Object.keys(CONDITION_LABELS).map(key => (
                  <option key={key} value={key}>{CONDITION_LABELS[key]}</option>
                ))}
              </select>
            </div>

            {/* Department Select */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px' }}>Department</label>
              <select 
                className="form-select" 
                style={{ height: '38px' }}
                value={departmentId} 
                onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
              Reset Filters
            </button>
          </div>

        </div>
      </div>

      {/* Directory Table Grid */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('assetTag')}>
                Tag <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                Asset Name <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
              </th>
              <th>Category</th>
              <th>Serial Number</th>
              <th>Condition</th>
              <th>Location</th>
              <th>Department</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: 'auto' }} />
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-empty">
                  No assets found matching the search criteria.
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <tr key={asset.id} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    <Link href={`/assets/${asset.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {asset.assetTag}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/assets/${asset.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}>
                      {asset.name}
                    </Link>
                    {asset.isShared && (
                      <span className="badge badge-neutral" style={{ padding: '1px 5px', fontSize: '9px', marginLeft: '6px', textTransform: 'uppercase' }}>
                        Shared
                      </span>
                    )}
                  </td>
                  <td>{asset.category.name}</td>
                  <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>{asset.serialNumber}</td>
                  <td>
                    <span style={{ fontSize: '13px' }}>{CONDITION_LABELS[asset.condition] || asset.condition}</span>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{asset.location}</td>
                  <td>
                    {asset.department?.code || <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unassigned</span>}
                  </td>
                  <td>
                    {asset.assignedTo?.name || <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>}
                  </td>
                  <td>
                    <span className={`badge badge-${ASSET_STATUS_COLORS[asset.status]}`}>
                      {ASSET_STATUS_LABELS[asset.status]}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link href={`/assets/${asset.id}`} style={{ textDecoration: 'none' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }}>
                        <Eye size={14} />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && assets.length > 0 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} assets
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
