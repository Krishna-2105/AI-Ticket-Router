import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ticketService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';

/**
 * Admin Dashboard Page
 * High-level overview of support tickets, department breakdowns, and quick status controls.
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    by_category: {
      Payment: 0,
      Refund: 0,
      Account: 0,
      Technical: 0,
      Delivery: 0,
      Other: 0
    }
  });

  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsData, ticketsData] = await Promise.all([
        ticketService.getStats(),
        ticketService.getAll()
      ]);

      if (statsData.success) {
        setStats(statsData.stats);
      }

      if (ticketsData.success) {
        setRecentTickets(ticketsData.tickets);
      }
    } catch (err) {
      setError('Failed to load admin metrics. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleQuickStatusChange = async (ticketId, newStatus) => {
    try {
      setUpdatingId(ticketId);
      await ticketService.updateStatus(ticketId, newStatus);
      // Reload stats and tickets
      await loadAdminData();
    } catch (err) {
      alert('Failed to update ticket status: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !recentTickets.length) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading support statistics...</p>
      </div>
    );
  }

  const categories = ['Payment', 'Refund', 'Account', 'Technical', 'Delivery', 'Other'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Support Administration Console</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            System-wide statistics, ML ticket categorization breakdown, and queue operations.
          </p>
        </div>
        <button onClick={loadAdminData} className="btn btn-outline btn-sm">
          Refresh Data
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* 4 Primary Metric Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-title">Total Inquiries</div>
          <div className="stat-card-value">{stats.total}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-card-title">Open Queue</div>
          <div className="stat-card-value" style={{ color: '#1d4ed8' }}>{stats.open}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-card-title">In Progress</div>
          <div className="stat-card-value" style={{ color: '#d97706' }}>{stats.in_progress}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-card-title">Resolved</div>
          <div className="stat-card-value" style={{ color: '#047857' }}>{stats.resolved}</div>
        </div>
      </div>

      {/* Machine Learning Category Distribution Breakdown */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Automated Classification by Category</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Predicted via TF-IDF + Logistic Regression
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          {categories.map((cat) => {
            const count = stats.by_category ? stats.by_category[cat] || 0 : 0;
            const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : 0;
            return (
              <div
                key={cat}
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '0.85rem',
                  textAlign: 'center'
                }}
              >
                <CategoryBadge category={cat} />
                <div style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.4rem 0 0.1rem' }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {pct}% of queue
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Tickets with Inline Status Modification */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Support Queue & Ticket Operations</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing latest {recentTickets.length} tickets
          </span>
        </div>

        {recentTickets.length === 0 ? (
          <div className="empty-state">
            <p>No support tickets in database.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Description</th>
                  <th>Predicted Category</th>
                  <th>Confidence</th>
                  <th>Current Status</th>
                  <th>Change Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>#{t.id}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{t.user_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.user_email}</div>
                    </td>
                    <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                    <td>
                      <select
                        className="form-control"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                        value={t.status}
                        disabled={updatingId === t.id}
                        onChange={(e) => handleQuickStatusChange(t.id, e.target.value)}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td>
                      <Link to={`/tickets/${t.id}`} className="btn btn-outline btn-sm">
                        View
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
