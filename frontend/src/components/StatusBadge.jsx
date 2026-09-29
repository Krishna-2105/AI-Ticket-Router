import React from 'react';

/**
 * StatusBadge Component
 * Renders a color-coded badge for ticket statuses: Open, In Progress, Resolved.
 */
export default function StatusBadge({ status }) {
  const normalized = (status || 'Open').toLowerCase().replace(/\s+/g, '-');
  const badgeClass = `badge badge-status-${normalized}`;

  return <span className={badgeClass}>{status || 'Open'}</span>;
}
