import React from 'react';

const STATUS_DOT = {
  completed: 'bg-emerald-500',
  running:   'bg-blue-500 animate-pulse',
  failed:    'bg-red-500',
};

const STATUS_TEXT = {
  completed: 'text-emerald-400',
  running:   'text-blue-400',
  failed:    'text-red-400',
};

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ts; }
}

export default function HistoryPanel({ campaigns, onRefresh }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex-1">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span className="text-base">📋</span> Campaign History
        </h2>
        <button
          onClick={onRefresh}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
        {campaigns.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-10">No campaigns yet</p>
        ) : (
          campaigns.map((c) => (
            <div
              key={c.campaign_id}
              className="px-5 py-3 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${STATUS_DOT[c.status] || 'bg-slate-500'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{fmtDate(c.created_at)}</p>
                </div>
                <span className={`text-xs font-medium capitalize shrink-0 ${STATUS_TEXT[c.status] || 'text-slate-500'}`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
