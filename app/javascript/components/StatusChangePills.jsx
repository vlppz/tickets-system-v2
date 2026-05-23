import React from 'react';
import { ArrowRight } from 'lucide-react';
import { getAnswerStatusConfig } from '../lib/ticketWorkflow';

function StatusPill({ status }) {
  const config = getAnswerStatusConfig(status);

  return (
    <span style={{ ...styles.statusPill, backgroundColor: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}

function StatusChangePills({ statusChange }) {
  if (!statusChange?.from || !statusChange?.to) {
    return null;
  }

  return (
    <div style={styles.statusChangeLine}>
      <span style={styles.statusChangeLabel}>Статус</span>
      <StatusPill status={statusChange.from} />
      <ArrowRight size={14} style={styles.arrowIcon} />
      <StatusPill status={statusChange.to} />
    </div>
  );
}

const styles = {
  statusChangeLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    flexWrap: 'wrap'
  },
  statusChangeLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280'
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '4px 9px',
    fontSize: '12px',
    fontWeight: '700',
    lineHeight: 1
  },
  arrowIcon: {
    color: '#6b7280',
    flexShrink: 0
  }
};

export default StatusChangePills;
