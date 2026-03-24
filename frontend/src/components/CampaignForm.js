import React, { useState } from 'react';
import { campaignApi } from '../services/api';

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
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 16,
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, color: '#94a3b8', fontWeight: 500 },
  input: {
    background: '#0f0f1a',
    border: '1px solid #2d2d4e',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
  },
  textarea: {
    background: '#0f0f1a',
    border: '1px solid #2d2d4e',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    minHeight: 80,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  button: {
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    marginTop: 8,
    transition: 'opacity 0.2s',
  },
  disabledButton: {
    background: '#2d2d4e',
    color: '#64748b',
    border: 'none',
    borderRadius: 8,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'not-allowed',
    width: '100%',
    marginTop: 8,
  },
  status: {
    marginTop: 16,
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 14,
  },
  agentPipeline: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  agentChip: {
    background: '#0f0f1a',
    border: '1px solid #2d2d4e',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 12,
    color: '#94a3b8',
  },
  arrow: { color: '#4f46e5', fontSize: 16 },
};

const AGENTS = ['Analytics Agent', 'Content Agent', 'Email Agent', 'Social Media Agent'];

export default function CampaignForm({ onResult }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    target_audience: '',
    goals: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeAgent, setActiveAgent] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.target_audience || !form.goals) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);

    const agentInterval = simulateAgentProgress();

    try {
      const { data } = await campaignApi.run(form);
      clearInterval(agentInterval);
      setActiveAgent(null);
      onResult(data);
      setForm({ name: '', description: '', target_audience: '', goals: '' });
    } catch (err) {
      clearInterval(agentInterval);
      setActiveAgent(null);
      setError(err.response?.data?.detail || 'Campaign failed. Check the backend.');
    } finally {
      setLoading(false);
    }
  };

  const simulateAgentProgress = () => {
    let idx = 0;
    setActiveAgent(AGENTS[0]);
    return setInterval(() => {
      idx = (idx + 1) % AGENTS.length;
      setActiveAgent(AGENTS[idx]);
    }, 8000);
  };

  return (
    <div style={styles.card}>
      <div style={styles.title}>
        <span>🚀</span> Launch Marketing Campaign
      </div>

      <div style={styles.agentPipeline}>
        {AGENTS.map((agent, i) => (
          <React.Fragment key={agent}>
            <span style={{
              ...styles.agentChip,
              ...(activeAgent === agent ? {
                background: '#1e1b4b',
                borderColor: '#7c3aed',
                color: '#a78bfa',
                boxShadow: '0 0 8px #7c3aed44',
              } : {}),
            }}>
              {activeAgent === agent ? '⚡ ' : ''}{agent}
            </span>
            {i < AGENTS.length - 1 && <span style={styles.arrow}>→</span>}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={styles.grid}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Campaign Name *</label>
            <input
              style={styles.input}
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Summer Product Launch"
              disabled={loading}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Target Audience *</label>
            <input
              style={styles.input}
              name="target_audience"
              value={form.target_audience}
              onChange={handleChange}
              placeholder="e.g. Tech-savvy millennials aged 25-35"
              disabled={loading}
            />
          </div>
        </div>

        <div style={{ ...styles.fieldGroup, marginBottom: 16 }}>
          <label style={styles.label}>Campaign Goals *</label>
          <input
            style={styles.input}
            name="goals"
            value={form.goals}
            onChange={handleChange}
            placeholder="e.g. Increase brand awareness by 30% and generate 500 qualified leads"
            disabled={loading}
          />
        </div>

        <div style={{ ...styles.fieldGroup, marginBottom: 16 }}>
          <label style={styles.label}>Description (optional)</label>
          <textarea
            style={styles.textarea}
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Additional context about your product, brand, or campaign..."
            disabled={loading}
          />
        </div>

        {error && (
          <div style={{ ...styles.status, background: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ ...styles.status, background: '#1e1b4b', border: '1px solid #4f46e5', color: '#a78bfa' }}>
            ⚡ Agents are working... This may take a minute. Currently: {activeAgent}
          </div>
        )}

        <button
          type="submit"
          style={loading ? styles.disabledButton : styles.button}
          disabled={loading}
        >
          {loading ? '⚡ Agents Running...' : '🚀 Run All Agents'}
        </button>
      </form>
    </div>
  );
}
