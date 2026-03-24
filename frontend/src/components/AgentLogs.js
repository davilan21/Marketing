import React, { useState, useEffect, useCallback } from 'react';
import { logsApi } from '../services/api';

const STATUS_COLORS = {
  completed: { bg: '#052e16', border: '#16a34a', text: '#4ade80' },
  running:   { bg: '#1e1b4b', border: '#4f46e5', text: '#818cf8' },
  failed:    { bg: '#2d1515', border: '#7f1d1d', text: '#fca5a5' },
  pending:   { bg: '#1c1917', border: '#57534e', text: '#a8a29e' },
};

const AGENT_ICONS = {
  'Analytics Agent':    '📊',
  'Content Agent':      '✍️',
  'Email Agent':        '📧',
  'Social Media Agent': '📱',
};

const styles = {
  card: {
    background: '#1a1a2e',
    border: '1px solid #2d2d4e',
    borderRadius: 12,
    padding: 28,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: 700, color: '#a78bfa' },
  statsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statChip: {
    background: '#0f0f1a',
    border: '1px solid #2d2d4e',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
  },
  filters: {
    display: 'flex',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  select: {
    background: '#0f0f1a',
    border: '1px solid #2d2d4e',
    borderRadius: 6,
    padding: '6px 12px',
    color: '#e2e8f0',
    fontSize: 13,
    cursor: 'pointer',
  },
  refreshBtn: {
    background: '#0f0f1a',
    border: '1px solid #4f46e5',
    borderRadius: 6,
    padding: '6px 14px',
    color: '#818cf8',
    fontSize: 13,
    cursor: 'pointer',
  },
  logList: { display: 'flex', flexDirection: 'column', gap: 10 },
  logItem: {
    background: '#0f0f1a',
    border: '1px solid #2d2d4e',
    borderRadius: 8,
    padding: 16,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  agentName: { fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 },
  timestamp: { fontSize: 11, color: '#64748b' },
  taskName: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  statusBadge: {
    display: 'inline-block',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedContent: {
    marginTop: 12,
    borderTop: '1px solid #2d2d4e',
    paddingTop: 12,
  },
  sectionLabel: { fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  preBox: {
    background: '#1a1a2e',
    border: '1px solid #2d2d4e',
    borderRadius: 6,
    padding: 10,
    fontSize: 12,
    color: '#94a3b8',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: 200,
    overflowY: 'auto',
    marginBottom: 10,
  },
  empty: { textAlign: 'center', color: '#64748b', padding: 40 },
};

export default function AgentLogs({ refreshTrigger }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterAgent) params.agent_name = filterAgent;
      if (filterStatus) params.status = filterStatus;
      const [logsRes, statsRes] = await Promise.all([
        logsApi.getAll(params),
        logsApi.getStats(),
      ]);
      setLogs(logsRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLoading(false);
    }
  }, [filterAgent, filterStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshTrigger]);

  const toggle = (id) => setExpanded(expanded === id ? null : id);

  const fmt = (ts) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.title}>📋 Agent Action Logs</div>
        <button style={styles.refreshBtn} onClick={fetchLogs} disabled={loading}>
          {loading ? '...' : '↺ Refresh'}
        </button>
      </div>

      {stats && (
        <div style={styles.statsRow}>
          <div style={styles.statChip}>
            <span style={{ color: '#a78bfa' }}>{stats.total_campaigns}</span>
            <span style={{ color: '#64748b' }}> campaigns</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ color: '#a78bfa' }}>{stats.total_logs}</span>
            <span style={{ color: '#64748b' }}> total actions</span>
          </div>
          {Object.entries(stats.by_status || {}).map(([status, count]) => {
            const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
            return (
              <div key={status} style={{ ...styles.statChip, borderColor: c.border }}>
                <span style={{ color: c.text }}>{count}</span>
                <span style={{ color: '#64748b' }}> {status}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.filters}>
        <select style={styles.select} value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
          <option value="">All Agents</option>
          <option>Analytics Agent</option>
          <option>Content Agent</option>
          <option>Email Agent</option>
          <option>Social Media Agent</option>
        </select>
        <select style={styles.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>completed</option>
          <option>running</option>
          <option>failed</option>
          <option>pending</option>
        </select>
      </div>

      <div style={styles.logList}>
        {logs.length === 0 && !loading && (
          <div style={styles.empty}>No logs yet. Run a campaign to see agent actions.</div>
        )}
        {logs.map((log) => {
          const c = STATUS_COLORS[log.status] || STATUS_COLORS.pending;
          const icon = AGENT_ICONS[log.agent_name] || '🤖';
          return (
            <div
              key={log.id}
              style={{ ...styles.logItem, borderColor: expanded === log.id ? '#4f46e5' : '#2d2d4e' }}
              onClick={() => toggle(log.id)}
            >
              <div style={styles.logHeader}>
                <div style={styles.agentName}>
                  <span>{icon}</span>
                  <span>{log.agent_name}</span>
                </div>
                <span style={{ ...styles.statusBadge, background: c.bg, borderColor: c.border, color: c.text }}>
                  {log.status}
                </span>
              </div>
              <div style={styles.taskName}>Task: {log.task}</div>
              <div style={styles.timestamp}>{fmt(log.timestamp)}</div>

              {expanded === log.id && (
                <div style={styles.expandedContent}>
                  {log.input && (
                    <>
                      <div style={styles.sectionLabel}>Input</div>
                      <div style={styles.preBox}>{log.input}</div>
                    </>
                  )}
                  {log.output && (
                    <>
                      <div style={styles.sectionLabel}>Output</div>
                      <div style={styles.preBox}>{log.output}</div>
                    </>
                  )}
                  {log.campaign_id && (
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Campaign ID: {log.campaign_id}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
