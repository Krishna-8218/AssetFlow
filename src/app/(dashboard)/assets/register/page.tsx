'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ArrowLeft, Save, Plus } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  customFields: string | null; // JSON Array of fields
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function RegisterAssetPage() {
  const router = useRouter();
  
  // Data lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Form values
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [location, setLocation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [isBookable, setIsBookable] = useState(false);
  
  // Category-specific custom fields data
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(false);

  // Load categories and departments
  useEffect(() => {
    async function loadFormSelects() {
      try {
        const [catRes, deptRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/departments')
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (deptRes.ok) setDepartments(await deptRes.json());
      } catch (err) {
        toast.error('Failed to load asset attributes selectors');
      }
    }
    loadFormSelects();
  }, []);

  // Update dynamic custom fields when category changes
  useEffect(() => {
    const selectedCategory = categories.find(c => c.id === categoryId);
    if (selectedCategory && selectedCategory.customFields) {
      try {
        const fields = JSON.parse(selectedCategory.customFields);
        setCustomFields(fields);
        // Reset dynamic field values
        const initialData: Record<string, any> = {};
        fields.forEach((f: any) => {
          initialData[f.name] = f.type === 'boolean' ? false : '';
        });
        setCustomFieldsData(initialData);
      } catch (e) {
        setCustomFields([]);
      }
    } else {
      setCustomFields([]);
      setCustomFieldsData({});
    }
  }, [categoryId, categories]);

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setCustomFieldsData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !categoryId || !serialNumber || !acquisitionDate || !acquisitionCost || !location) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categoryId,
          serialNumber,
          acquisitionDate,
          acquisitionCost,
          condition,
          location,
          departmentId: departmentId || null,
          notes,
          isShared,
          isBookable: isShared ? isBookable : false,
          customFieldsData // dynamic attribute inputs
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Asset registration failed');
      }

      toast.success(`Asset registered successfully! Tagged: ${data.assetTag}`);
      router.push(`/assets/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Error occurred registering asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: 'auto' }}>
      
      {/* Breadcrumb Nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/assets" className="btn btn-ghost btn-icon btn-sm" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="page-title" style={{ fontSize: '20px' }}>Register New Asset</h1>
          <p className="page-subtitle">Add a corporate asset to the tracking system. Unique tag auto-generated on save.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card animate-slideUp">
        <div className="card-header">
          <h3 className="section-title" style={{ marginBottom: 0 }}>Asset Specifications</h3>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Asset Name *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. MacBook Pro 16-inch M3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Asset Category *</label>
              <select 
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">Select a Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Serial Number (Unique) *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Manufacturer Serial ID"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Physical Condition *</label>
              <select 
                className="form-select"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
              >
                <option value="NEW">New (In-box)</option>
                <option value="GOOD">Good (Operational)</option>
                <option value="FAIR">Fair (Slight wear)</option>
                <option value="POOR">Poor (Damaged but works)</option>
                <option value="DAMAGED">Damaged (Needs repair)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Acquisition Date *</label>
              <input 
                type="date" 
                className="form-input" 
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Acquisition Cost (INR) *</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                className="form-input" 
                placeholder="Amount in Rupees"
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Physical Placement Location *</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. IT Lab - Floor 3 East"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department Owner</label>
              <select 
                className="form-select"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">General Corporate Stock (Unassigned)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Category fields if any */}
          {customFields.length > 0 && (
            <>
              <div className="divider" />
              <label className="form-label" style={{ color: 'var(--primary)', display: 'flex', gap: '8px' }}>
                Category-Specific Specifications ({categories.find(c => c.id === categoryId)?.name})
              </label>
              <div className="grid grid-cols-2 gap-md">
                {customFields.map((field) => (
                  <div className="form-group" key={field.name}>
                    <label className="form-label">{field.label}</label>
                    {field.type === 'boolean' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '38px' }}>
                        <input 
                          type="checkbox"
                          className="form-checkbox"
                          checked={!!customFieldsData[field.name]}
                          onChange={(e) => handleCustomFieldChange(field.name, e.target.checked)}
                        />
                        <span style={{ fontSize: '13px' }}>Yes</span>
                      </div>
                    ) : (
                      <input 
                        type={field.type === 'number' ? 'number' : 'text'}
                        className="form-input"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={customFieldsData[field.name] || ''}
                        onChange={(e) => handleCustomFieldChange(field.name, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Shared Resource Settings */}
          <div className="divider" />
          <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox"
                id="isShared"
                className="form-checkbox"
                checked={isShared}
                onChange={(e) => {
                  setIsShared(e.target.checked);
                  if (!e.target.checked) setIsBookable(false);
                }}
              />
              <label htmlFor="isShared" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                Mark as Shared Resource (Available for multiple users)
              </label>
            </div>
            
            {isShared && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '26px' }} className="animate-fadeIn">
                <input 
                  type="checkbox"
                  id="isBookable"
                  className="form-checkbox"
                  checked={isBookable}
                  onChange={(e) => setIsBookable(e.target.checked)}
                />
                <label htmlFor="isBookable" style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Allow Time-slot Reservation (Bookable from Calendar interface)
                </label>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Asset Notes / Description</label>
            <textarea 
              className="form-input" 
              style={{ height: '80px' }}
              placeholder="Configuration specifications, accessory inclusions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

        </div>

        <div className="card-footer">
          <Link href="/assets" style={{ textDecoration: 'none' }}>
            <button type="button" className="btn btn-secondary">Cancel</button>
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: '#fff' }} /> : <><Save size={16} /> Save Asset</>}
          </button>
        </div>
      </form>

    </div>
  );
}
