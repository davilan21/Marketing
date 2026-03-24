import React, { useState } from 'react';
import CampaignForm from './components/CampaignForm';
import AgentLogs from './components/AgentLogs';
import ResultsPanel from './components/ResultsPanel';

const styles = {
  root: {
    minHeight: '100vh',
    background: '#0f0f1a',
    color: '#e2e8f0',
  },
  header: {
    background: '#1a1a2e',
    borderBottom: '1px solid #2d2d4e',
    padding: '18px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 20,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #a78bfa, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    background: '#1e1b4b',
    border: '1px solid #4f46e5',
    borderRadius: 20,
    padding: '3px 12px',
    fontSize: 12,
    color: '#818cf8',
  },
  main: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 24px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    alignItems: 'start',
  },
  leftCol: {},
  rightCol: {},
  agentCards: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginBottom: 24,
  },
  agentCard: {
    background: '#1a1a2e',
    border: '1px solid #2d2d4e',
    borderRadius: 10,
    padding: '14px 16px',
  },
  agentCardTitle: { fontSize: 13, fontWeight: 600, marginBottom: 4 },
  agentCardDesc: { fontSize: 11, color: '#64748b' },
};

const AGENTS_INFO = [
  { icon: '📊', name: 'Analytics Agent', desc: 'Market analysis & KPIs', color: '#0ea5e9' },
  { icon: '✍️', name: 'Content Agent',   desc: 'Copy & content strategy', color: '#a78bfa' },
  { icon: '📧', name: 'Email Agent',     desc: 'Email sequences & flows', color: '#34d399' },
  { icon: '📱', name: 'Social Media Agent', desc: 'Social content & ads', color: '#fb923c' },
];

export default function App() {
  const [result, setResult] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleResult = (data) => {
    setResult(data);
    setRefreshTrigger((n) => n + 1);
  };

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <span>🤖</span> Marketing Agent System
        </div>
        <div style={styles.badge}>CrewAI + Claude Sonnet</div>
      </header>

      <main style={styles.main}>
        <div style={styles.leftCol}>
          <div style={styles.agentCards}>
            {AGENTS_INFO.map(({ icon, name, desc, color }) => (
              <div key={name} style={{ ...styles.agentCard, borderColor: '#2d2d4e' }}>
                <div style={{ ...styles.agentCardTitle, color }}>
                  {icon} {name}
                </div>
                <div style={styles.agentCardDesc}>{desc}</div>
              </div>
            ))}
          </div>

          <CampaignForm onResult={handleResult} />
        </div>

        <div style={styles.rightCol}>
          {result && <ResultsPanel result={result} />}
          <AgentLogs refreshTrigger={refreshTrigger} />
        </div>
      </main>
    </div>
  );
}
