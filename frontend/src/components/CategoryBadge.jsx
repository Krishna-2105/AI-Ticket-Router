import React from 'react';

/**
 * CategoryBadge Component
 * Renders a color-coded badge for predicted categories:
 * Payment, Refund, Account, Technical, Delivery, Other.
 */
export default function CategoryBadge({ category }) {
  const normalized = (category || 'Other').toLowerCase();
  const badgeClass = `badge badge-cat-${normalized}`;

  return <span className={badgeClass}>{category || 'Other'}</span>;
}
