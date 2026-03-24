import React, { useState } from 'react';

const AGENT_SECTIONS = [
  { key: 'analytics',    label: 'Analytics Report',         icon: '📊', color: '#0ea5e9' },
  { key: 'content',      label: 'Content Strategy',         icon: '✍️',  color: '#a78bfa' },
  { key: 'email',        label: 'Email Campaign',            icon: '📧', color: '#34d399' },
  { key: 'social_media', label: 'Social Media Strategy',    icon: '📱', color: '#fb923c' },
];

const styles = {
  card: {
    background: '#1a1a2e',
    border: '1px solid #2d2d4e',
    borderRadius: 12,
    padding: 28,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#a78bfa',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  meta: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: {
    background: '#0f0f1a',
    border: '1px solid #2d2d4e',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s',
  },
  content: {
    background: '#0f0f1a',
    border: '1px solid #2d2d4e',
    borderRadius: 8,
    padding: 20,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: 13,
    lineHeight: 1.7,
    color: '#cbd5e1',
    maxHeight: 500,
    overflowY: 'auto',
  },
};

export default function ResultsPanel({ result }) {
  const [activeTab, setActiveTab] = useState('analytics');

  if (!result) return null;

  const { campaign_id, results } = result;

  return (
    <div style={styles.card}>
      <div style={styles.title}>
        <span>✅</span> Campaign Complete
      </div>
      <div style={styles.meta}>Campaign ID: {campaign_id}</div>

      <div style={styles.tabs}>
        {AGENT_SECTIONS.map(({ key, label, icon, color }) => (
          <button
            key={key}
            style={{
              ...styles.tab,
              ...(activeTab === key ? {
                borderColor: color,
                color,
                background: `${color}11`,
              } : { color: '#94a3b8' }),
            }}
            onClick={() => setActiveTab(key)}
          >
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {results?.[activeTab] || 'No output for this agent.'}
      </div>
    </div>
  );
}
