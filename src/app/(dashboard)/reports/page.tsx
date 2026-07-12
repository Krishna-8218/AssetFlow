'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  AlertTriangle, 
  Clock, 
  CalendarDays,
  Wrench,
  Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ReportsData {
  summary: {
    total: number;
    allocated: number;
    available: number;
    maintenance: number;
    lost: number;
    retired: number;
  };
  departmentAllocations: any[];
  maintenanceFrequency: any[];
  overdueReturns: any[];
  nearingRetirement: any[];
  bookingHeatmap: any[];
}

export default function ReportsAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch('/api/reports');
        if (res.ok) setData(await res.json());
      } catch (err) {
        toast.error('Failed to load reports summary');
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  // --- Export to Excel using SheetJS ---
  const handleExportExcel = () => {
    if (!data) return;
    try {
      // 1. General Summary
      const summaryWS = XLSX.utils.json_to_sheet([data.summary]);
      
      // 2. Department Allocation
      const deptWS = XLSX.utils.json_to_sheet(data.departmentAllocations);
      
      // 3. Maintenance Frequency
      const maintWS = XLSX.utils.json_to_sheet(data.maintenanceFrequency);
      
      // 4. Overdue Returns
      const overdueWS = XLSX.utils.json_to_sheet(
        data.overdueReturns.map(o => ({
          AssetTag: o.asset.assetTag,
          AssetName: o.asset.name,
          Employee: o.allocatedTo.name,
          Department: o.department?.code || '',
          AllocatedOn: format(new Date(o.allocatedAt), 'yyyy-MM-dd'),
          ExpectedReturn: format(new Date(o.expectedReturnDate), 'yyyy-MM-dd')
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
      XLSX.utils.book_append_sheet(wb, deptWS, 'Departments');
      XLSX.utils.book_append_sheet(wb, maintWS, 'Maintenance Frequency');
      XLSX.utils.book_append_sheet(wb, overdueWS, 'Overdue Returns');

      XLSX.writeFile(wb, 'AssetFlow-Enterprise-Report.xlsx');
      toast.success('Successfully exported Excel spreadsheet!');
    } catch (e) {
      toast.error('Excel generation failed');
    }
  };

  // --- Export to PDF using jsPDF + AutoTable ---
  const handleExportPDF = () => {
    if (!data) return;
    try {
      const doc = new jsPDF() as any;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('AssetFlow — Enterprise Inventory Report', 14, 20);
      
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);
      doc.text(`Scope: Organization-Wide Assets`, 14, 33);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 38, 196, 38);

      // Section A: Summary KPI values
      doc.setFont('Helvetica', 'bold');
      doc.text('1. Inventory Metrics Summary', 14, 46);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Total Assets: ${data.summary.total}`, 14, 53);
      doc.text(`Allocated: ${data.summary.allocated}`, 64, 53);
      doc.text(`Available: ${data.summary.available}`, 114, 53);
      doc.text(`Under Maintenance: ${data.summary.maintenance}`, 164, 53);

      // Section B: Department Allocations table
      doc.setFont('Helvetica', 'bold');
      doc.text('2. Department Allocations', 14, 66);
      doc.autoTable({
        startY: 72,
        head: [['Department Code', 'Department Name', 'Assets count']],
        body: data.departmentAllocations.map(d => [d.code, d.name, d.value]),
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] }
      });

      // Section C: Overdue return list
      const finalY = doc.previousAutoTable.finalY + 12;
      doc.setFont('Helvetica', 'bold');
      doc.text('3. Active Overdue Return Flags', 14, finalY);
      
      if (data.overdueReturns.length === 0) {
        doc.setFont('Helvetica', 'normal');
        doc.text('No active overdue items recorded.', 14, finalY + 8);
      } else {
        doc.autoTable({
          startY: finalY + 6,
          head: [['Tag', 'Asset Name', 'Employee', 'Expected Return']],
          body: data.overdueReturns.map(o => [
            o.asset.assetTag,
            o.asset.name,
            o.allocatedTo.name,
            format(new Date(o.expectedReturnDate), 'MMM dd, yyyy')
          ]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] }
        });
      }

      doc.save('AssetFlow-Enterprise-Report.pdf');
      toast.success('Successfully exported PDF document!');
    } catch (e) {
      toast.error('PDF generation failed');
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    try {
      const headers = ['Department Code', 'Department Name', 'Asset Count'];
      const rows = data.departmentAllocations.map(d => [d.code, d.name, d.value]);
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += headers.join(",") + "\n";
      rows.forEach(row => {
        csvContent += row.join(",") + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "AssetFlow-Department-Allocations.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Successfully exported CSV!');
    } catch (e) {
      toast.error('CSV export failed');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ height: '40px', width: '250px' }} className="skeleton" />
        <div className="grid grid-cols-4 gap-md">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: '110px' }} />
          ))}
        </div>
        <div className="skeleton mt-4" style={{ height: '350px' }} />
      </div>
    );
  }

  if (!data) return <div className="empty-state">Failed to load reports metrics data.</div>;

  const { summary, departmentAllocations, maintenanceFrequency, overdueReturns, nearingRetirement, bookingHeatmap } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Export auditable spreadsheets, analyze depreciation lifetimes, and view booking heatmaps.</p>
        </div>

        {/* Export Action Center dropdown */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <FileText size={14} /> CSV
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportPDF}>
            <Download size={14} /> PDF Report
          </button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-4 gap-md">
        <div className="stat-card" style={{ '--accent-color': 'var(--primary)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{summary.total}</span>
            <span className="stat-card-label">Total catalogued</span>
          </div>
          <div className="stat-card-icon">
            <BarChart3 size={22} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--success)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{summary.allocated}</span>
            <span className="stat-card-label">Active allocations</span>
          </div>
          <div className="stat-card-icon">
            <Monitor size={22} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--warning)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value">{summary.maintenance}</span>
            <span className="stat-card-label">Repair stock</span>
          </div>
          <div className="stat-card-icon">
            <Wrench size={22} />
          </div>
        </div>

        <div className="stat-card" style={{ '--accent-color': 'var(--danger)' } as React.CSSProperties}>
          <div className="stat-card-info">
            <span className="stat-card-value" style={{ color: overdueReturns.length > 0 ? 'var(--danger)' : 'inherit' }}>
              {overdueReturns.length}
            </span>
            <span className="stat-card-label">Overdue return flags</span>
          </div>
          <div className="stat-card-icon">
            <AlertTriangle size={22} style={{ color: overdueReturns.length > 0 ? 'var(--danger)' : 'inherit' }} />
          </div>
        </div>
      </div>

      {/* Grid: Charts Area */}
      <div className="grid grid-cols-2 gap-lg">
        
        {/* Heatmap line chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Resource Booking Heatmap (Peak Hour Windows)</h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bookingHeatmap}>
                  <defs>
                    <linearGradient id="colorBooking" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="bookings" stroke="var(--primary)" fillOpacity={1} fill="url(#colorBooking)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Maintenance cost list */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Maintenance Frequency Top Assets</h3>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset Tag</th>
                    <th>Asset Name</th>
                    <th>Repair Tickets</th>
                    <th>Cumulative Cost (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceFrequency.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table-empty">No maintenance records logged.</td>
                    </tr>
                  ) : (
                    maintenanceFrequency.map((m, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{m.tag}</td>
                        <td>{m.name}</td>
                        <td style={{ fontWeight: 600 }}>{m.count}</td>
                        <td>INR {m.cost.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Grid: Assets due for retirement and overdue return items lists */}
      <div className="grid grid-cols-2 gap-lg">
        
        {/* Retiring items */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Assets Nearing Retirement (Lifecycle age &gt; 4 Years)</h3>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Asset Name</th>
                    <th>Category</th>
                    <th>Acquisition Date</th>
                  </tr>
                </thead>
                <tbody>
                  {nearingRetirement.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table-empty">No assets nearing retirement limits.</td>
                    </tr>
                  ) : (
                    nearingRetirement.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{a.assetTag}</td>
                        <td>{a.name}</td>
                        <td>{a.category.name}</td>
                        <td>{format(new Date(a.acquisitionDate), 'yyyy-MM-dd')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Overdue Items Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Active Overdue Return Details</h3>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Asset Name</th>
                    <th>Currently Held By</th>
                    <th>Expected Return</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueReturns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table-empty">No active overdue returns flagged.</td>
                    </tr>
                  ) : (
                    overdueReturns.map((o) => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{o.asset.assetTag}</td>
                        <td>{o.asset.name}</td>
                        <td>{o.allocatedTo.name}</td>
                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          {format(new Date(o.expectedReturnDate), 'yyyy-MM-dd')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
