import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import CategoryBadge from '../components/CategoryBadge';

/**
 * Ticket Details Page
 * Displays comprehensive ticket information and allows Admins to change ticket status.
 */
export default function TicketDetails() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState('');

  useEffect(() => {
    async function loadTicket() {
      try {
        setLoading(true);
        setError('');
        const data = await ticketService.getById(id);
        if (data.success && data.ticket) {
          setTicket(data.ticket);
          setStatusInput(data.ticket.status);
        }
      } catch (err) {
        setError(
          err.response?.data?.message || 'Failed to load ticket details or access denied.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [id]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateSuccess('');
    setError('');

    try {
      const data = await ticketService.updateStatus(id, statusInput);
      if (data.success && data.ticket) {
        setTicket(data.ticket);
        setUpdateSuccess(`Status successfully updated to "${statusInput}".`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update ticket status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading ticket #{id}...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ maxWidth: '650px', margin: '2rem auto' }}>
        <div className="alert alert-danger">{error || 'Ticket not found.'}</div>
        <Link to="/tickets" className="btn btn-outline">
          &larr; Back to Ticket List
        </Link>
      </div>
    );
  }

  const confidencePct = (Number(ticket.confidence) * 100).toFixed(1);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <Link to="/tickets" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
            &larr; Back to Tickets
          </Link>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Ticket #{ticket.id}</h1>
        </div>

        <div>
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      {updateSuccess && <div className="alert alert-success">{updateSuccess}</div>}

      {/* Main Ticket Problem Description Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Problem Description</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Submitted by: <strong>{ticket.user_name}</strong> ({ticket.user_email})
          </span>
        </div>
        <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
          {ticket.description}
        </p>
      </div>

      {/* Machine Learning Model Prediction Info Card */}
      <div className="ml-result-card">
        <div className="ml-result-header">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
          </svg>
          <span>Machine Learning Classification Details</span>
        </div>

        <div className="ml-metric-row">
          <div className="ml-metric-item">
            <span className="ml-metric-label">Predicted Category</span>
            <span style={{ marginTop: '0.3rem' }}>
              <CategoryBadge category={ticket.category} />
            </span>
          </div>

          <div className="ml-metric-item">
            <span className="ml-metric-label">Prediction Confidence</span>
            <span className="ml-metric-val">{confidencePct}%</span>
          </div>

          <div className="ml-metric-item">
            <span className="ml-metric-label">NLP Model</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>
              TF-IDF + Logistic Regression
            </span>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div className="confidence-bar-bg">
            <div
              className="confidence-bar-fill"
              style={{ width: `${Math.min(100, Math.max(10, Number(ticket.confidence) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Admin Action: Update Status */}
      {isAdmin && (
        <div className="card" style={{ borderColor: '#c7d2fe' }}>
          <div className="card-header">
            <h2 className="card-title" style={{ color: '#4338ca' }}>
              Support Admin Controls: Update Status
            </h2>
          </div>

          <form onSubmit={handleStatusUpdate} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Change Ticket Status:</label>
            <select
              className="form-control"
              style={{ width: '200px' }}
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={updating || statusInput === ticket.status}
            >
              {updating ? 'Updating...' : 'Save Status'}
            </button>
          </form>
        </div>
      )}

      {/* Metadata Card */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
          Ticket Metadata
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.9rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Created: </span>
            <strong>{new Date(ticket.created_at).toLocaleString()}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Last Updated: </span>
            <strong>{new Date(ticket.updated_at || ticket.created_at).toLocaleString()}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Database Ticket ID: </span>
            <strong>{ticket.id}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
