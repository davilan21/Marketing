import React, { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../services/api';

const FIELD_BASE =
  'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 ' +
  'placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors font-mono';

const PLATFORM_ICON = {
  instagram: '📸',
  linkedin:  '💼',
  tiktok:    '🎵',
};

// ── Single credential field ────────────────────────────────────────────────────
function CredField({ fieldMeta, value, onChange, disabled }) {
  const [show, setShow] = useState(false);
  const isSecret = fieldMeta.secret;
  const type = isSecret && !show ? 'password' : 'text';

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {fieldMeta.label}
        {fieldMeta.hint && (
          <span className="ml-1 text-slate-600 font-normal">— {fieldMeta.hint}</span>
        )}
      </label>
      <div className="relative">
        <input
          type={type}
          className={FIELD_BASE}
          value={value}
          onChange={(e) => onChange(fieldMeta.key, e.target.value)}
          placeholder={fieldMeta.placeholder || ''}
          disabled={disabled}
          autoComplete="off"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            tabIndex={-1}
          >
            {show ? 'hide' : 'show'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Platform card ─────────────────────────────────────────────────────────────
function PlatformCard({ platform, onSave }) {
  const [data, setData]       = useState(null);
  const [form, setForm]       = useState({});
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError]     = useState('');
  const [dirty, setDirty]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await settingsApi.get(platform);
      setData(res.data);
      setForm(res.data.credentials || {});
      setEnabled(res.data.enabled ?? true);
    } catch { /* ignore */ }
  }, [platform]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setDirty(true);
    setTestResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await settingsApi.save(platform, { credentials: form, enabled });
      setDirty(false);
      await load();
      onSave && onSave(platform);
    } catch (e) {
      setError(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await settingsApi.test(platform);
      setTestResult(res.data);
    } catch (e) {
      setTestResult({ success: false, error: e.response?.data?.detail || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  if (!data) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-5 animate-pulse h-48" />
    );
  }

  const configured = data.configured;

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{PLATFORM_ICON[platform]}</span>
          <span className="font-semibold text-slate-100">{data.label}</span>
          {configured ? (
            <span className="text-xs bg-emerald-950 border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded">
              ✓ Configured
            </span>
          ) : (
            <span className="text-xs bg-slate-900 border border-slate-700 text-slate-500 px-2 py-0.5 rounded">
              Not configured
            </span>
          )}
        </div>
        {/* Enable toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-slate-500">Enabled</span>
          <div
            onClick={() => { setEnabled((e) => !e); setDirty(true); }}
            className={`relative w-9 h-5 rounded-full transition-colors ${enabled ? 'bg-violet-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </label>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-3">
        {(data.fields || []).map((f) => (
          <CredField
            key={f.key}
            fieldMeta={f}
            value={form[f.key] || ''}
            onChange={handleChange}
            disabled={saving}
          />
        ))}

        {/* Docs link */}
        {data.docs && (
          <p className="text-xs text-slate-600">
            API setup guide:{' '}
            <a
              href={data.docs}
              target="_blank"
              rel="noreferrer"
              className="text-violet-400 hover:text-violet-300 underline"
            >
              {data.docs}
            </a>
          </p>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`text-xs rounded-lg px-3 py-2 border ${
            testResult.success
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
              : 'bg-red-950/50 border-red-800 text-red-400'
          }`}>
            {testResult.success
              ? `✓ Connected${testResult.note ? ' — ' + testResult.note : ''}`
              : `✗ ${testResult.error}`}
          </div>
        )}

        {error && (
          <div className="text-xs rounded-lg px-3 py-2 border bg-red-950/50 border-red-800 text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || saving || !configured}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
          >
            {testing ? 'Testing…' : '⚡ Test'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Settings modal ─────────────────────────────────────────────────────────────
export default function SettingsModal({ onClose }) {
  const platforms = ['instagram', 'linkedin', 'tiktok'];

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 shrink-0">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>⚙️</span> Platform Settings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Note */}
        <div className="px-6 pt-4 shrink-0">
          <p className="text-xs text-slate-500 bg-slate-800/60 rounded-lg px-4 py-3">
            Enter your API credentials below. They are stored in the local database and never leave your server.
            Secret fields are masked after saving. After Social Media Agent content is{' '}
            <span className="text-emerald-400 font-medium">approved</span>, posts are automatically
            published to all enabled &amp; configured platforms.
          </p>
        </div>

        {/* Platform cards */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {platforms.map((p) => (
            <PlatformCard key={p} platform={p} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
