import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import AgentCard from './components/AgentCard';
import LogTable from './components/LogTable';
import ReviewPanel from './components/ReviewPanel';
import HistoryPanel from './components/HistoryPanel';
import ApprovalLogPanel from './components/ApprovalLogPanel';
import RunCampaignModal from './components/RunCampaignModal';
import SettingsModal from './components/SettingsModal';
import { campaignApi, logsApi, reviewApi, approvalLogApi } from './services/api';

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

  const [agentStatuses, setAgentStatuses]     = useState(mkStatuses);
  const [logs, setLogs]                       = useState([]);
  const [reviews, setReviews]                 = useState([]);
  const [approvalLogs, setApprovalLogs]       = useState([]);
  const [campaigns, setCampaigns]             = useState([]);
  const [showModal, setShowModal]             = useState(false);
  const [showSettings, setShowSettings]       = useState(false);
  const [campaignRunning, setCampaignRunning] = useState(false);

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    try { setCampaigns((await campaignApi.list()).data); } catch { /* ignore */ }
  }, []);

  const fetchPendingReviews = useCallback(async () => {
    try {
      setReviews((await reviewApi.getPending()).data);
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

  const fetchApprovalLogs = useCallback(async () => {
    try {
      setApprovalLogs((await approvalLogApi.getAll({ limit: 50 })).data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchPendingReviews();
    fetchHistoricLogs();
    fetchApprovalLogs();
  }, [fetchCampaigns, fetchPendingReviews, fetchHistoricLogs, fetchApprovalLogs]);

  // ── WebSocket event processor ──────────────────────────────────────────────

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];

    // De-duplicate by a stable key
    const key = `${latest.type}-${latest.timestamp}-${latest.agent ?? ''}${latest.review_id ?? ''}`;
    if (key === lastEventKeyRef.current) return;
    lastEventKeyRef.current = key;

    // Agent execution state change → update card + add log row
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

    // Agent finished drafting and is waiting for human approval
    if (latest.type === 'approval_requested') {
      setReviews((prev) => {
        if (prev.find((r) => r.id === latest.review_id)) return prev;
        return [
          {
            id:          latest.review_id,
            campaign_id: latest.campaign_id,
            agent:       latest.agent,
            task:        latest.task,
            output:      latest.output,
            created_at:  latest.timestamp,
          },
          ...prev,
        ];
      });
    }

    // User approved or rejected — remove from pending panel, add to audit log
    if (latest.type === 'approval_decided') {
      setReviews((prev) => prev.filter((r) => r.id !== latest.review_id));
      setApprovalLogs((prev) => [
        {
          id:                `ws-${Date.now()}`,
          review_request_id: latest.review_id,
          campaign_id:       latest.campaign_id,
          agent_name:        latest.agent,
          task:              latest.task,
          decision:          latest.decision,
          decided_at:        latest.decided_at,
        },
        ...prev,
      ].slice(0, 100));
    }

    // Platform posting result from orchestrator
    if (latest.type === 'platform_post') {
      const icon = latest.success ? '✓' : (latest.draft ? '📋' : '✗');
      setLogs((prev) => [
        {
          id:        `ws-${Date.now()}-${Math.random()}`,
          timestamp: latest.timestamp,
          agent:     'Social Media Agent',
          task:      `Post to ${latest.platform}`,
          status:    latest.success ? 'completed' : (latest.draft ? 'draft' : 'error'),
          output:    latest.success
            ? `${icon} Posted — ${latest.post_id || ''}`
            : `${icon} ${latest.error || 'Skipped'}`,
        },
        ...prev,
      ].slice(0, 300));
    }

    if (latest.type === 'campaign_start') {
      setCampaignRunning(true);
      setAgentStatuses(mkStatuses());
    }

    if (latest.type === 'campaign_complete' || latest.type === 'campaign_error') {
      setCampaignRunning(false);
      fetchCampaigns();
      fetchApprovalLogs();
    }
  }, [events, fetchCampaigns, fetchApprovalLogs]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleReviewDecision = useCallback(async (reviewId, decision) => {
    try {
      await reviewApi.decide(reviewId, decision);
      // Optimistic removal; the approval_decided WS event will also update state
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (e) {
      console.error('Approval decision failed', e);
    }
  }, []);

  const handleLaunched = useCallback(() => setShowModal(false), []);

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

          {/* Pending-approval alert */}
          {reviews.length > 0 && (
            <span className="flex items-center gap-1.5 bg-amber-950 border border-amber-700 text-amber-300 text-xs font-medium px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {reviews.length} awaiting approval
            </span>
          )}

          <button
            onClick={() => setShowSettings(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            title="Platform Settings"
          >
            ⚙️
          </button>
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

          {/* Log table — 3/5 width */}
          <div className="xl:col-span-3 min-h-[520px] flex flex-col">
            <LogTable logs={logs} />
          </div>

          {/* Right sidebar — approvals + audit log + history */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            <ReviewPanel reviews={reviews} onDecision={handleReviewDecision} />
            <ApprovalLogPanel entries={approvalLogs} onRefresh={fetchApprovalLogs} />
            <HistoryPanel campaigns={campaigns} onRefresh={fetchCampaigns} />
          </div>
        </div>
      </main>

      {/* ── Modal ── */}
      {showModal && (
        <RunCampaignModal onClose={() => setShowModal(false)} onLaunched={handleLaunched} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
