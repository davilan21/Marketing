import React from 'react';

const STATUS_BADGE = {
  running:          'bg-blue-950 text-blue-400 border-blue-800',
  completed:        'bg-emerald-950 text-emerald-400 border-emerald-800',
  done:             'bg-emerald-950 text-emerald-400 border-emerald-800',
  approved:         'bg-emerald-950 text-emerald-400 border-emerald-800',
  pending_approval: 'bg-amber-950 text-amber-400 border-amber-700',
  failed:           'bg-red-950 text-red-400 border-red-800',
  error:            'bg-red-950 text-red-400 border-red-800',
  rejected:         'bg-red-950 text-red-400 border-red-800',
  pending:          'bg-slate-800 text-slate-400 border-slate-700',
};

const AGENT_COLOR = {
  'Analytics Agent':    'text-sky-400',
  'Content Agent':      'text-violet-400',
  'Email Agent':        'text-emerald-400',
  'Social Media Agent': 'text-orange-400',
};

function fmtTime(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleTimeString(); } catch { return ts; }
}

export default function LogTable({ logs }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span className="text-base">⚡</span> Live Activity Log
        </h2>
        <span className="text-xs text-slate-500 tabular-nums">{logs.length} entries</span>
      </div>

      {/* Table */}
      <div className="overflow-y-auto flex-1">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-600">
            <span className="text-3xl mb-3">📭</span>
            <p className="text-sm">No activity yet — run a campaign to see live logs.</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="border-b border-slate-800">
                {['Time', 'Agent', 'Task', 'Status', 'Output'].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const badge = STATUS_BADGE[log.status] || STATUS_BADGE.pending;
                const agentColor = AGENT_COLOR[log.agent] || 'text-slate-300';
                return (
                  <tr
                    key={log.id ?? i}
                    className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                      {fmtTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium ${agentColor}`}>{log.agent}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">{log.task}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${badge}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[260px]">
                      <span className="block truncate" title={log.output}>
                        {log.output ? `${log.output.slice(0, 90)}${log.output.length > 90 ? '…' : ''}` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
