import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';

/**
 * Ticket List Page
 * Displays paginated or filtered list of tickets.
 * Shows all tickets for admins and personal tickets for customers.
 */
export default function TicketList() {
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ticketService.getAll({
        status: statusFilter,
        category: categoryFilter
      });
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (err) {
      setError('Failed to fetch tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, categoryFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            {isAdmin ? 'All Support Tickets' : 'My Support Tickets'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {isAdmin
              ? 'Review and manage customer inquiries across all departments'
              : 'Track the status and resolution of your submitted inquiries'}
          </p>
        </div>
        <Link to="/create-ticket" className="btn btn-primary">
          + New Ticket
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Status:
            </label>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Category:
            </label>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Payment">Payment</option>
              <option value="Refund">Refund</option>
              <option value="Account">Account</option>
              <option value="Technical">Technical</option>
              <option value="Delivery">Delivery</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {(statusFilter || categoryFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setCategoryFilter(''); }}
              className="btn btn-outline btn-sm"
            >
              Clear Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Total: <strong>{tickets.length}</strong> {tickets.length === 1 ? 'ticket' : 'tickets'}
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <p>No tickets found matching the selected filters.</p>
            <Link to="/create-ticket" className="btn btn-primary btn-sm">
              Create New Ticket
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  {isAdmin && <th>Customer</th>}
                  <th>Problem Description</th>
                  <th>Category</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>#{t.id}</td>
                    {isAdmin && (
                      <td>
                        <div style={{ fontWeight: 500 }}>{t.user_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.user_email}</div>
                      </td>
                    )}
                    <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.description}
                    </td>
                    <td>
                      <CategoryBadge category={t.category} />
                    </td>
                    <td>
                      {(Number(t.confidence) * 100).toFixed(1)}%
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to={`/tickets/${t.id}`} className="btn btn-outline btn-sm">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
