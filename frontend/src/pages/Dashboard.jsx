import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';

/**
 * Customer Dashboard Page
 * Displays summary cards (Total, Open, Resolved) and recent support tickets.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0 });
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // Load user stats and tickets
        const [statsData, ticketsData] = await Promise.all([
          ticketService.getStats(),
          ticketService.getAll()
        ]);

        if (statsData.success) {
          setStats(statsData.stats);
        }

        if (ticketsData.success) {
          setRecentTickets(ticketsData.tickets.slice(0, 5));
        }
      } catch (err) {
        setError('Failed to load dashboard data. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Customer Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Welcome back, {user?.name}! Here is a summary of your support requests.
          </p>
        </div>
        <Link to="/create-ticket" className="btn btn-primary">
          + Create Ticket
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Summary Statistics Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-title">Total Tickets</div>
          <div className="stat-card-value">{stats.total}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-card-title">Open Tickets</div>
          <div className="stat-card-value" style={{ color: '#1d4ed8' }}>{stats.open}</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-card-title">Resolved Tickets</div>
          <div className="stat-card-value" style={{ color: '#047857' }}>{stats.resolved}</div>
        </div>
      </div>

      {/* Recent Tickets Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Tickets</h2>
          <Link to="/tickets" className="btn btn-outline btn-sm">
            View All Tickets
          </Link>
        </div>

        {recentTickets.length === 0 ? (
          <div className="empty-state">
            <p>You have not submitted any support tickets yet.</p>
            <Link to="/create-ticket" className="btn btn-primary btn-sm">
              Create Your First Ticket
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Predicted Category</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>#{t.id}</td>
                    <td style={{ maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
