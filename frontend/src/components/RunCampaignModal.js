import React, { useState } from 'react';
import { campaignApi } from '../services/api';

const FIELD = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors';

export default function RunCampaignModal({ onClose, onLaunched }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    target_audience: '',
    goals: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.target_audience.trim() || !form.goals.trim()) {
      setError('Name, target audience, and goals are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await campaignApi.run(form);
      onLaunched();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start campaign. Is the backend running?');
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>🚀</span> New Marketing Campaign
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Campaign Name <span className="text-red-400">*</span>
            </label>
            <input
              className={FIELD}
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Summer Product Launch"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Target Audience <span className="text-red-400">*</span>
            </label>
            <input
              className={FIELD}
              value={form.target_audience}
              onChange={set('target_audience')}
              placeholder="e.g. Tech-savvy millennials aged 25–35"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Goals <span className="text-red-400">*</span>
            </label>
            <input
              className={FIELD}
              value={form.goals}
              onChange={set('goals')}
              placeholder="e.g. 30% brand awareness increase, 500 qualified leads"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Description <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              className={`${FIELD} resize-none`}
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Additional context about your product, brand, or campaign…"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-950/60 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Note about approval gates + posting */}
          <p className="text-xs text-slate-600 bg-slate-800/50 rounded-lg px-3 py-2">
            ⚠️ Both the Email Agent and Social Media Agent pause for approval before publishing.
            Configure Instagram, LinkedIn &amp; TikTok credentials via ⚙️ Settings.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {loading ? '⚡ Launching…' : '🚀 Run Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
