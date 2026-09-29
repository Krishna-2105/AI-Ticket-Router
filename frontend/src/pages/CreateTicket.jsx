import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ticketService } from '../services/api';
import CategoryBadge from '../components/CategoryBadge';
import StatusBadge from '../components/StatusBadge';

/**
 * Create Ticket Page
 * Allows customers to submit a problem description.
 * Shows the immediate ML prediction and confidence score returned from FastAPI.
 */
export default function CreateTicket() {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);

  const navigate = useNavigate();

  // Preset sample queries for quick demonstration
  const sampleQueries = [
    { label: 'Payment', text: 'Money was deducted from my account but my order failed at checkout.' },
    { label: 'Refund', text: 'I returned the item 5 days ago and still have not received my refund.' },
    { label: 'Account', text: 'I forgot my password and cannot login to my account.' },
    { label: 'Technical', text: 'The web application keeps crashing whenever I open the checkout page.' },
    { label: 'Delivery', text: 'Where is my delivery? Courier tracking has not updated in 4 days.' },
    { label: 'Other', text: 'Where is your company headquarters located?' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (description.trim().length < 5) {
      setError('Please provide a description of at least 5 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await ticketService.create(description.trim());
      if (response.success && response.ticket) {
        setCreatedTicket(response.ticket);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to submit support ticket. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCreatedTicket(null);
    setDescription('');
    setError('');
  };

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Submit Support Ticket</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Describe your problem below. Our Scikit-learn ML model will automatically analyze and classify your request.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Real-time ML Prediction Result Banner */}
      {createdTicket ? (
        <div>
          <div className="alert alert-success">
            ✓ Ticket #{createdTicket.id} created and classified successfully!
          </div>

          <div className="ml-result-card">
            <div className="ml-result-header">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
              <span>Machine Learning Classification Result</span>
            </div>

            <p style={{ fontStyle: 'italic', color: '#1e293b', marginBottom: '1rem', background: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              "{createdTicket.description}"
            </p>

            <div className="ml-metric-row">
              <div className="ml-metric-item">
                <span className="ml-metric-label">Predicted Category</span>
                <span style={{ marginTop: '0.25rem' }}>
                  <CategoryBadge category={createdTicket.category} />
                </span>
              </div>

              <div className="ml-metric-item">
                <span className="ml-metric-label">Confidence Score</span>
                <span className="ml-metric-val">
                  {(Number(createdTicket.confidence) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="ml-metric-item">
                <span className="ml-metric-label">Initial Status</span>
                <span style={{ marginTop: '0.25rem' }}>
                  <StatusBadge status={createdTicket.status} />
                </span>
              </div>
            </div>

            {/* Confidence Progress Bar */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Model Confidence</span>
                <span>{(Number(createdTicket.confidence) * 100).toFixed(1)}%</span>
              </div>
              <div className="confidence-bar-bg">
                <div
                  className="confidence-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(10, Number(createdTicket.confidence) * 100))}%` }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <Link to={`/tickets/${createdTicket.id}`} className="btn btn-primary">
                View Ticket Details
              </Link>
              <button onClick={handleReset} className="btn btn-outline">
                Submit Another Ticket
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Problem Description
              </label>
              <textarea
                id="description"
                className="form-control"
                rows="5"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the issue you are facing in detail (e.g., 'Money was deducted from my account but order failed')..."
                required
              />
            </div>

            {/* Quick Demo Pre-fill Prompts */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Try an example query (click to insert):
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {sampleQueries.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.55rem' }}
                    onClick={() => setDescription(item.text)}
                  >
                    {item.label} Example
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Analyzing & Saving...' : 'Submit Ticket'}
              </button>
              <Link to="/tickets" className="btn btn-outline">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
