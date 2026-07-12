'use client';

import React, { useState, useEffect } from 'react';
import { CalendarRange, Clock, AlertTriangle, Plus, X, Trash2, CalendarDays, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../layout';
import { format, addHours, parseISO } from 'date-fns';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/constants';

interface Resource {
  id: string;
  name: string;
  assetTag: string;
  location: string;
  category: { name: string };
}

interface Booking {
  id: string;
  assetId: string;
  bookedById: string;
  startTime: string;
  endTime: string;
  purpose: string | null;
  status: string;
  notes: string | null;
  asset: { name: string; assetTag: string; location: string };
  bookedBy: { name: string; email: string };
}

export default function BookingsCalendarPage() {
  const { user } = useAuth();
  
  // Data lists
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Booking Form values
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Overlap Alert Info
  const [overlapError, setOverlapError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      const [resList, bookingList] = await Promise.all([
        // Fetch bookable assets only
        fetch('/api/assets?isBookable=true&limit=100'),
        fetch('/api/bookings')
      ]);

      if (resList.ok) {
        const d = await resList.json();
        setResources(d.assets);
      }
      if (bookingList.ok) {
        setBookings(await bookingList.json());
      }
    } catch (e) {
      toast.error('Failed to load shared reservations ledger');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenBookingModal = (resId: string = '') => {
    setSelectedResourceId(resId);
    setStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
    setPurpose('');
    setNotes('');
    setOverlapError(null);
    setModalOpen(true);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId || !startTime || !endTime) {
      toast.error('Please specify the resource and timeslots');
      return;
    }

    setLoading(true);
    setOverlapError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedResourceId,
          startTime,
          endTime,
          purpose,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.conflict) {
          setOverlapError(data.message);
          return;
        }
        throw new Error(data.error || 'Failed to submit booking');
      }

      toast.success('Resource booked successfully!');
      setModalOpen(false);
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          status: 'CANCELLED'
        })
      });
      if (res.ok) {
        toast.success('Booking cancelled.');
        fetchBookings();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to cancel booking');
      }
    } catch (e) {
      toast.error('Action failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Resource Booking</h1>
          <p className="page-subtitle">Schedule and reserve shared company resources: meeting rooms, vehicles, and AV equipment.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenBookingModal()}>
          <Plus size={16} /> New Reservation
        </button>
      </div>

      <div className="grid grid-cols-3 gap-lg">
        
        {/* Left Column: Shared resources directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 className="section-title" style={{ marginBottom: '8px' }}>Shared Resources</h3>
          {resources.length === 0 ? (
            <div className="empty-state">No bookable resources configured.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {resources.map((res) => (
                <div key={res.id} className="card p-4 hover-lift" style={{ cursor: 'pointer' }} onClick={() => handleOpenBookingModal(res.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{res.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tag: {res.assetTag} | {res.category.name}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                    <MapPin size={12} /> {res.location}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Columns: Active reservation grid lists */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 className="section-title" style={{ marginBottom: '8px' }}>Active Reservation Ledger</h3>
          
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Location</th>
                  <th>Reserved By</th>
                  <th>Time Duration</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty">No active reservations made yet.</td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const isUpcoming = booking.status === 'UPCOMING';
                    const canCancel = isUpcoming && (user?.role !== 'EMPLOYEE' || booking.bookedById === user?.userId);
                    return (
                      <tr key={booking.id} style={{ opacity: booking.status === 'CANCELLED' ? 0.6 : 1 }}>
                        <td style={{ fontWeight: 600 }}>{booking.asset.name}</td>
                        <td style={{ fontSize: '13px' }}>{booking.asset.location}</td>
                        <td>{booking.bookedBy.name}</td>
                        <td style={{ fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {format(new Date(booking.startTime), 'MMM dd, HH:mm')} ➔ {format(new Date(booking.endTime), 'HH:mm')}
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${BOOKING_STATUS_COLORS[booking.status]}`}>
                            {BOOKING_STATUS_LABELS[booking.status]}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {canCancel ? (
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none', color: 'var(--danger)' }} onClick={() => handleCancelBooking(booking.id)} title="Cancel Booking">
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Lock</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ============================================================
         MODAL: RESOURCE BOOKING FORM
         ============================================================ */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Reserve Shared Resource</h3>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ border: 'none' }} onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBook}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label">Select Resource *</label>
                  <select 
                    className="form-select"
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    required
                  >
                    <option value="">Select Resource</option>
                    {resources.map(res => (
                      <option key={res.id} value={res.id}>{res.name} ({res.category.name})</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Reservation Start *</label>
                    <input 
                      type="datetime-local" 
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reservation End *</label>
                    <input 
                      type="datetime-local" 
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Overlap blocking alert box */}
                {overlapError && (
                  <div className="card p-3 animate-fadeIn" style={{ borderLeft: '4px solid var(--danger)', background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
                    <AlertTriangle size={16} /> {overlapError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Purpose of Reservation *</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Project Sprint review, Client visit..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Additional Instructions</label>
                  <textarea 
                    className="form-input"
                    style={{ height: '70px' }}
                    placeholder="e.g. Setup video conference, key pickup..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: '#fff' }} /> : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
