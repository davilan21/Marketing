import React from 'react';

const STATUS = {
  idle:      { label: 'Idle',      dot: 'bg-slate-500',                  text: 'text-slate-400',  ring: 'border-slate-800' },
  running:   { label: 'Running',   dot: 'bg-blue-500 animate-pulse',     text: 'text-blue-400',   ring: 'border-blue-800'  },
  completed: { label: 'Done',      dot: 'bg-emerald-500',                text: 'text-emerald-400',ring: 'border-emerald-900'},
  review:    { label: 'Review',    dot: 'bg-amber-400 animate-pulse',    text: 'text-amber-400',  ring: 'border-amber-700' },
  error:     { label: 'Error',     dot: 'bg-red-500',                    text: 'text-red-400',    ring: 'border-red-900'   },
  failed:    { label: 'Error',     dot: 'bg-red-500',                    text: 'text-red-400',    ring: 'border-red-900'   },
  rejected:  { label: 'Rejected',  dot: 'bg-red-500',                    text: 'text-red-400',    ring: 'border-red-900'   },
};

export default function AgentCard({ name, icon, status = 'idle', task }) {
  const cfg = STATUS[status] || STATUS.idle;

  return (
    <div className={`bg-slate-900 border ${cfg.ring} rounded-xl p-4 transition-all duration-500`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{icon}</span>
          <span className="text-sm font-semibold text-slate-100 leading-tight">{name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 truncate min-h-[1rem]">
        {task || 'Waiting for work…'}
      </p>
    </div>
  );
}
