import React from 'react';

const AGENT_COLOR = {
  'Analytics Agent':    'text-sky-400',
  'Content Agent':      'text-violet-400',
  'Email Agent':        'text-emerald-400',
  'Social Media Agent': 'text-orange-400',
};

function fmtTime(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleTimeString(); } catch { return ''; }
}

export default function ReviewPanel({ reviews, onDecision }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
        <span className="text-base">🔐</span>
        <h2 className="text-sm font-semibold text-slate-100 flex-1">Awaiting Approval</h2>
        {reviews.length > 0 && (
          <span className="bg-amber-500 text-slate-900 text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
            {reviews.length}
          </span>
        )}
      </div>

      {/* Review cards */}
      <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-6">No pending approvals</p>
        ) : (
          reviews.map((r) => (
            <div
              key={r.id}
              className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-4 space-y-3"
            >
              {/* Meta row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <p className={`text-sm font-semibold ${AGENT_COLOR[r.agent] || 'text-slate-200'}`}>
                      {r.agent}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 pl-3.5">{r.task}</p>
                </div>
                <span className="text-xs text-slate-600 whitespace-nowrap shrink-0">
                  #{r.id} · {fmtTime(r.created_at || r.timestamp)}
                </span>
              </div>

              {/* Status badge */}
              <span className="inline-block bg-amber-950 border border-amber-700 text-amber-400 text-xs font-medium px-2 py-0.5 rounded">
                pending_approval
              </span>

              {/* Draft output preview */}
              {r.output && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded p-2">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                    Draft Output
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">
                    {r.output.slice(0, 300)}{r.output.length > 300 ? '…' : ''}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onDecision(r.id, 'approve')}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => onDecision(r.id, 'reject')}
                  className="flex-1 bg-red-900 hover:bg-red-800 active:bg-red-950 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
