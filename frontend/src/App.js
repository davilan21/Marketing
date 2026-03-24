import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import AgentCard from './components/AgentCard';
import LogTable from './components/LogTable';
import ReviewPanel from './components/ReviewPanel';
import HistoryPanel from './components/HistoryPanel';
import RunCampaignModal from './components/RunCampaignModal';
import { campaignApi, logsApi, reviewApi } from './services/api';

// ── Constants ────────────────────────────────────────────────────────────────

const AGENTS = [
  { name: 'Analytics Agent',    icon: '📊' },
  { name: 'Content Agent',      icon: '✍️'  },
  { name: 'Email Agent',        icon: '📧' },
  { name: 'Social Media Agent', icon: '📱' },
];

const mkStatuses = () =>
  Object.fromEntries(AGENTS.map(({ name }) => [name, { status: 'idle', task: '' }]));

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { events, connected } = useWebSocket();
  const lastEventKeyRef = useRef(null);

  const [agentStatuses, setAgentStatuses] = useState(mkStatuses);
  const [logs, setLogs]                   = useState([]);
  const [reviews, setReviews]             = useState([]);
  const [campaigns, setCampaigns]         = useState([]);
  const [showModal, setShowModal]         = useState(false);
  const [campaignRunning, setCampaignRunning] = useState(false);

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    try { setCampaigns((await campaignApi.list()).data); } catch { /* ignore */ }
  }, []);

  const fetchPendingReviews = useCallback(async () => {
    try {
      const data = (await reviewApi.getPending()).data;
      setReviews(data.map((r) => ({ ...r, agent: r.agent })));
    } catch { /* ignore */ }
  }, []);

  const fetchHistoricLogs = useCallback(async () => {
    try {
      const rows = (await logsApi.getAll({ limit: 100 })).data;
      setLogs(
        rows.map((l) => ({
          id:        `db-${l.id}`,
          timestamp: l.timestamp,
          agent:     l.agent_name,
          task:      l.task,
          status:    l.status,
          output:    l.output || '',
        }))
      );
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchPendingReviews();
    fetchHistoricLogs();
  }, [fetchCampaigns, fetchPendingReviews, fetchHistoricLogs]);

  // ── WebSocket event processor ──────────────────────────────────────────────

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    // De-duplicate
    const key = `${latest.type}-${latest.timestamp}-${latest.agent ?? ''}`;
    if (key === lastEventKeyRef.current) return;
    lastEventKeyRef.current = key;

    if (latest.type === 'agent_update') {
      setAgentStatuses((prev) => ({
        ...prev,
        [latest.agent]: { status: latest.status, task: latest.task || '' },
      }));
      setLogs((prev) => [
        {
          id:        `ws-${Date.now()}-${Math.random()}`,
          timestamp: latest.timestamp,
          agent:     latest.agent,
          task:      latest.task,
          status:    latest.status,
          output:    latest.output || '',
        },
        ...prev,
      ].slice(0, 300));
    }

    if (latest.type === 'review_request') {
      setReviews((prev) => {
        if (prev.find((r) => r.id === latest.review_id)) return prev;
        return [
          {
            id:          latest.review_id,
            campaign_id: latest.campaign_id,
            agent:       latest.agent,
            task:        latest.task,
            output:      latest.output,
            timestamp:   latest.timestamp,
          },
          ...prev,
        ];
      });
    }

    if (latest.type === 'review_decided') {
      setReviews((prev) => prev.filter((r) => r.id !== latest.review_id));
    }

    if (latest.type === 'campaign_start') {
      setCampaignRunning(true);
      setAgentStatuses(mkStatuses());
    }

    if (latest.type === 'campaign_complete' || latest.type === 'campaign_error') {
      setCampaignRunning(false);
      fetchCampaigns();
    }
  }, [events, fetchCampaigns]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleReviewDecision = useCallback(async (reviewId, decision) => {
    try {
      await reviewApi.decide(reviewId, decision);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (e) {
      console.error('Review decision failed', e);
    }
  }, []);

  const handleLaunched = useCallback(() => {
    setShowModal(false);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

      {/* ── Top bar ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Marketing Agent System</h1>
            <p className="text-xs text-slate-500">CrewAI · Claude Sonnet 4 · 4 Agents</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* WS indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-500">{connected ? 'Live' : 'Reconnecting…'}</span>
          </div>

          {/* Running badge */}
          {campaignRunning && (
            <span className="flex items-center gap-1.5 bg-blue-950 border border-blue-800 text-blue-300 text-xs font-medium px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Running
            </span>
          )}

          {/* Run Campaign */}
          <button
            onClick={() => setShowModal(true)}
            disabled={campaignRunning}
            className="bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Run Campaign
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-6 flex flex-col gap-6">

        {/* ── Agent status cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {AGENTS.map(({ name, icon }) => (
            <AgentCard
              key={name}
              name={name}
              icon={icon}
              status={agentStatuses[name]?.status}
              task={agentStatuses[name]?.task}
            />
          ))}
        </div>

        {/* ── Main content ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 flex-1 min-h-0">

          {/* Log table — takes 3/5 */}
          <div className="xl:col-span-3 min-h-[520px] flex flex-col">
            <LogTable logs={logs} />
          </div>

          {/* Right sidebar — reviews + history */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            <ReviewPanel reviews={reviews} onDecision={handleReviewDecision} />
            <HistoryPanel campaigns={campaigns} onRefresh={fetchCampaigns} />
          </div>
        </div>
      </main>

      {/* ── Modal ── */}
      {showModal && (
        <RunCampaignModal onClose={() => setShowModal(false)} onLaunched={handleLaunched} />
      )}
    </div>
  );
}
