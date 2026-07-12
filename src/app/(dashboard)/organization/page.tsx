'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Users as UsersIcon, 
  Plus, 
  Edit, 
  Search, 
  Trash2, 
  UserCheck, 
  ShieldAlert, 
  Sliders, 
  PlusCircle, 
  X,
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../layout';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  headId: string | null;
  head?: { name: string; email: string } | null;
  parentId: string | null;
  parent?: { name: string; code: string } | null;
  status: string;
  _count?: { users: number; assets: number };
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  customFields: string | null; // JSON String
  status: string;
  _count?: { assets: number };
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  departmentId: string | null;
  department?: { name: string; code: string } | null;
}

export default function OrganizationSetupPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'departments' | 'categories' | 'employees'>('departments');
  const [loading, setLoading] = useState(true);

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Selection dropdown inputs
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Modals
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [empModalOpen, setEmpModalOpen] = useState(false);

  // Edit contexts
  const [currentDept, setCurrentDept] = useState<Partial<Department> | null>(null);
  const [currentCat, setCurrentCat] = useState<Partial<Category> & { parsedFields?: any[] } | null>(null);
  const [currentEmp, setCurrentEmp] = useState<Partial<Employee> | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
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
          setEmployees(empData);
          setAllUsers(empData.map((e: any) => ({ id: e.id, name: e.name })));
        }
      } catch (err) {
        toast.error('Failed to load organizational configuration');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshData = async () => {
    try {
      const [deptRes, catRes, empRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/categories'),
        fetch('/api/employees')
      ]);
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  // --- Department Logic ---
  const handleOpenDeptModal = (dept: Department | null = null) => {
    if (!isAdmin) return;
    if (dept) {
      setCurrentDept(dept);
    } else {
      setCurrentDept({ name: '', code: '', description: '', headId: '', parentId: '', status: 'ACTIVE' });
    }
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDept?.name || !currentDept?.code) {
      toast.error('Name and Code are required');
      return;
    }

    try {
      const isEdit = !!currentDept.id;
      const url = '/api/departments';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentDept),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      toast.success(`Department ${isEdit ? 'updated' : 'created'} successfully!`);
      setDeptModalOpen(false);
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // --- Category Logic ---
  const handleOpenCatModal = (cat: Category | null = null) => {
    if (!isAdmin) return;
    if (cat) {
      const parsedFields = cat.customFields ? JSON.parse(cat.customFields) : [];
      setCurrentCat({ ...cat, parsedFields });
    } else {
      setCurrentCat({ name: '', description: '', icon: 'Package', parsedFields: [], status: 'ACTIVE' });
    }
    setCatModalOpen(true);
  };

  const handleAddField = () => {
    if (!currentCat) return;
    const fields = currentCat.parsedFields || [];
    setCurrentCat({
      ...currentCat,
      parsedFields: [...fields, { name: '', label: '', type: 'text' }]
    });
  };

  const handleRemoveField = (index: number) => {
    if (!currentCat) return;
    const fields = [...(currentCat.parsedFields || [])];
    fields.splice(index, 1);
    setCurrentCat({ ...currentCat, parsedFields: fields });
  };

  const handleFieldChange = (index: number, key: string, value: string) => {
    if (!currentCat) return;
    const fields = [...(currentCat.parsedFields || [])];
    fields[index][key] = value;
    setCurrentCat({ ...currentCat, parsedFields: fields });
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCat?.name) {
      toast.error('Category Name is required');
      return;
    }

    try {
      const isEdit = !!currentCat.id;
      const url = '/api/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        id: currentCat.id,
        name: currentCat.name,
        description: currentCat.description,
        icon: currentCat.icon,
        status: currentCat.status,
        customFields: currentCat.parsedFields
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      toast.success(`Category ${isEdit ? 'updated' : 'created'} successfully!`);
      setCatModalOpen(false);
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // --- Employee RBAC Logic ---
  const handleOpenEmpModal = (emp: Employee) => {
    if (!isAdmin) return;
    setCurrentEmp(emp);
    setEmpModalOpen(true);
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmp?.id) return;

    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentEmp.id,
          role: currentEmp.role,
          status: currentEmp.status,
          departmentId: currentEmp.departmentId || 'null'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Promotion failed');

      toast.success('Employee security credentials updated successfully!');
      setEmpModalOpen(false);
      refreshData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Filters
  const filteredDepartments = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole ? e.role === filterRole : true;
    const matchesDept = filterDept ? e.departmentId === filterDept : true;
    return matchesSearch && matchesRole && matchesDept;
  });

  if (!isAdmin) {
    return (
      <div className="card p-8 text-center" style={{ maxWidth: '500px', margin: '40px auto' }}>
        <ShieldAlert size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
          Organization Setup is restricted to System Administrators only. If you need roles promoted or departments created, please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div>
        <h1 className="page-title">Organization Setup</h1>
        <p className="page-subtitle">Manage corporate structure, custom categorizations, and assign RBAC roles.</p>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs-list">
          <button 
            className={`tab-button ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => { setActiveTab('departments'); setSearchTerm(''); }}
          >
            <Building2 size={16} /> Departments
          </button>
          <button 
            className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => { setActiveTab('categories'); setSearchTerm(''); }}
          >
            <Layers size={16} /> Asset Categories
          </button>
          <button 
            className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => { setActiveTab('employees'); setSearchTerm(''); }}
          >
            <UsersIcon size={16} /> Employee Directory
          </button>
        </div>

        {/* Tab Search / Action Bar */}
        <div className="card p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div className="global-search" style={{ width: '280px' }}>
              <Search className="search-icon" size={16} />
              <input 
                type="text" 
                className="search-input" 
                placeholder={`Search ${activeTab}...`} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {activeTab === 'employees' && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <select className="form-select" style={{ width: '150px' }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>

                <select className="form-select" style={{ width: '180px' }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab !== 'employees' && (
              <button className="btn btn-primary btn-sm" onClick={() => activeTab === 'departments' ? handleOpenDeptModal() : handleOpenCatModal()}>
                <Plus size={14} /> Add {activeTab === 'departments' ? 'Department' : 'Category'}
              </button>
            )}
          </div>
        </div>

        {/* --- Tab Content A: Departments --- */}
        {activeTab === 'departments' && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department Head</th>
                  <th>Parent Dept</th>
                  <th>Employees</th>
                  <th>Assets</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty">No departments configured. Click Add Department.</td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept) => (
                    <tr key={dept.id}>
                      <td style={{ fontWeight: 600 }}>{dept.code}</td>
                      <td style={{ paddingLeft: dept.parentId ? '30px' : '20px' }}>
                        {dept.parentId && <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>└─</span>}
                        {dept.name}
                      </td>
                      <td>{dept.head?.name || <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unassigned</span>}</td>
                      <td>{dept.parent?.name || <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>}</td>
                      <td>{dept._count?.users || 0}</td>
                      <td>{dept._count?.assets || 0}</td>
                      <td>
                        <span className={`badge badge-${dept.status === 'ACTIVE' ? 'success' : 'neutral'}`}>
                          {dept.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => handleOpenDeptModal(dept)}>
                          <Edit size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- Tab Content B: Categories --- */}
        {activeTab === 'categories' && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Default Icon</th>
                  <th>Custom Attributes</th>
                  <th>Assets Tracked</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">No categories configured.</td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => {
                    const fields = cat.customFields ? JSON.parse(cat.customFields) : [];
                    return (
                      <tr key={cat.id}>
                        <td style={{ fontWeight: 600 }}>{cat.name}</td>
                        <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description || '-'}</td>
                        <td>{cat.icon || 'Package'}</td>
                        <td>
                          {fields.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                          ) : (
                            <span className="badge badge-info" style={{ fontSize: '11px' }}>
                              {fields.length} field{fields.length > 1 ? 's' : ''} configured
                            </span>
                          )}
                        </td>
                        <td>{cat._count?.assets || 0}</td>
                        <td>
                          <span className={`badge badge-${cat.status === 'ACTIVE' ? 'success' : 'neutral'}`}>
                            {cat.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => handleOpenCatModal(cat)}>
                            <Edit size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* --- Tab Content C: Employees --- */}
        {activeTab === 'employees' && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Assigned Department</th>
                  <th>Security Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">No employees match this filter criteria.</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 600 }}>{emp.name}</td>
                      <td>{emp.email}</td>
                      <td>{emp.phone || '-'}</td>
                      <td>{emp.department?.name || <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unassigned</span>}</td>
                      <td>
                        <span className={`badge badge-${ROLE_COLORS[emp.role]}`} style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                          {ROLE_LABELS[emp.role]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${emp.status === 'ACTIVE' ? 'success' : 'neutral'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {emp.role === 'ADMIN' ? (
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} disabled title="System Administrator settings locked">
                            <Lock size={14} />
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => handleOpenEmpModal(emp)} title="Promote Role / Toggle Access">
                            <UserCheck size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
         MODAL 1: DEPARTMENT CREATE & UPDATE
         ============================================================ */}
      {deptModalOpen && currentDept && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{currentDept.id ? 'Edit Department' : 'Create Department'}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setDeptModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveDept}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Department Code *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. IT-DEV"
                      value={currentDept.code || ''}
                      onChange={(e) => setCurrentDept({ ...currentDept, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Software Engineering"
                      value={currentDept.name || ''}
                      onChange={(e) => setCurrentDept({ ...currentDept, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-input" 
                    style={{ height: '80px' }}
                    placeholder="Short description of department responsibilities"
                    value={currentDept.description || ''}
                    onChange={(e) => setCurrentDept({ ...currentDept, description: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Department Head</label>
                    <select 
                      className="form-select"
                      value={currentDept.headId || ''}
                      onChange={(e) => setCurrentDept({ ...currentDept, headId: e.target.value })}
                    >
                      <option value="">Select Department Head</option>
                      {allUsers.map((usr) => (
                        <option key={usr.id} value={usr.id}>{usr.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Parent Department (Hierarchy)</label>
                    <select 
                      className="form-select"
                      value={currentDept.parentId || ''}
                      onChange={(e) => setCurrentDept({ ...currentDept, parentId: e.target.value })}
                    >
                      <option value="">Select Parent Department</option>
                      {departments
                        .filter(d => d.id !== currentDept.id) // Prevent self hierarchy loop
                        .map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select"
                    value={currentDept.status || 'ACTIVE'}
                    onChange={(e) => setCurrentDept({ ...currentDept, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDeptModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
         MODAL 2: CATEGORY CREATE & UPDATE
         ============================================================ */}
      {catModalOpen && currentCat && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{currentCat.id ? 'Edit Category' : 'Create Category'}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setCatModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCat}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Electronics"
                      value={currentCat.name || ''}
                      onChange={(e) => setCurrentCat({ ...currentCat, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Lucide Icon</label>
                    <select 
                      className="form-select"
                      value={currentCat.icon || 'Package'}
                      onChange={(e) => setCurrentCat({ ...currentCat, icon: e.target.value })}
                    >
                      <option value="Package">Package (Box)</option>
                      <option value="Monitor">Monitor (Computers)</option>
                      <option value="Armchair">Armchair (Furniture)</option>
                      <option value="Car">Car (Vehicles)</option>
                      <option value="DoorOpen">DoorOpen (Rooms)</option>
                      <option value="Projector">Projector (Equipment)</option>
                      <option value="Wifi">Wifi (Networking)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Short categorization description"
                    value={currentCat.description || ''}
                    onChange={(e) => setCurrentCat({ ...currentCat, description: e.target.value })}
                  />
                </div>

                {/* Custom Fields Setup */}
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={14} /> Category-Specific Fields (Optional)
                  </label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddField} style={{ padding: '4px 10px' }}>
                    <PlusCircle size={14} /> Add Attribute
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {(currentCat.parsedFields || []).length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
                      No category fields defined yet.
                    </div>
                  ) : (
                    (currentCat.parsedFields || []).map((field, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Attribute ID (e.g. warranty)"
                          style={{ flex: 1 }}
                          value={field.name}
                          onChange={(e) => handleFieldChange(idx, 'name', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                          required
                        />
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Attribute Label (e.g. Warranty)"
                          style={{ flex: 1.5 }}
                          value={field.label}
                          onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                          required
                        />
                        <select 
                          className="form-select" 
                          style={{ width: '110px' }}
                          value={field.type}
                          onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Checkbox</option>
                        </select>
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none', color: 'var(--danger)' }} onClick={() => handleRemoveField(idx)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="divider" />
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select"
                    value={currentCat.status || 'ACTIVE'}
                    onChange={(e) => setCurrentCat({ ...currentCat, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCatModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
         MODAL 3: EMPLOYEE PROMOTION & ROLE ASSIGNMENT
         ============================================================ */}
      {empModalOpen && currentEmp && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>RBAC Promotion & Department Assignment</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setEmpModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEmp}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div className="avatar avatar-lg">
                    {currentEmp.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{currentEmp.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{currentEmp.email}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Department</label>
                  <select 
                    className="form-select"
                    value={currentEmp.departmentId || ''}
                    onChange={(e) => setCurrentEmp({ ...currentEmp, departmentId: e.target.value })}
                  >
                    <option value="null">Unassigned</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Security Role (RBAC Level) *</label>
                  <select 
                    className="form-select"
                    value={currentEmp.role || 'EMPLOYEE'}
                    onChange={(e) => setCurrentEmp({ ...currentEmp, role: e.target.value })}
                    required
                  >
                    <option value="EMPLOYEE">Employee (Standard Access)</option>
                    <option value="DEPARTMENT_HEAD">Department Head (Manage Dept Assets & Requests)</option>
                    <option value="ASSET_MANAGER">Asset Manager (Full Inventory & Operations Access)</option>
                  </select>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Note: Signup is standard employee-only. Promoted role immediately alters user dashboard screens.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Account Access Status</label>
                  <select 
                    className="form-select"
                    value={currentEmp.status || 'ACTIVE'}
                    onChange={(e) => setCurrentEmp({ ...currentEmp, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE (Granted Login)</option>
                    <option value="INACTIVE">DEACTIVATED (Locked Out)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEmpModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
