import React from 'react';

const DECISION_STYLE = {
  approved: {
    row:    'border-emerald-900/40',
    badge:  'bg-emerald-950 text-emerald-400 border-emerald-800',
    icon:   '✓',
  },
  rejected: {
    row:    'border-red-900/40',
    badge:  'bg-red-950 text-red-400 border-red-800',
    icon:   '✗',
  },
};

const AGENT_COLOR = {
  'Analytics Agent':    'text-sky-400',
  'Content Agent':      'text-violet-400',
  'Email Agent':        'text-emerald-400',
  'Social Media Agent': 'text-orange-400',
};

function fmtDateTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch { return ts; }
}

export default function ApprovalLogPanel({ entries, onRefresh }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span className="text-base">📝</span> Approval Audit Log
        </h2>
        <button
          onClick={onRefresh}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Log entries */}
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-8">
            No decisions logged yet
          </p>
        ) : (
          entries.map((e) => {
            const style = DECISION_STYLE[e.decision] || DECISION_STYLE.approved;
            return (
              <div
                key={e.id}
                className={`px-5 py-3 border-l-2 ${style.row} hover:bg-slate-800/30 transition-colors`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Agent + task */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold ${AGENT_COLOR[e.agent_name] || 'text-slate-300'}`}>
                        {e.agent_name}
                      </span>
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-xs text-slate-400">{e.task}</span>
                    </div>
                    {/* Timestamp */}
                    <p className="text-xs text-slate-600 tabular-nums">{fmtDateTime(e.decided_at)}</p>
                  </div>
                  {/* Decision badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border shrink-0 ${style.badge}`}>
                    {style.icon} {e.decision}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
