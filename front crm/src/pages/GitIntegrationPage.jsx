import React, { useState, useEffect } from 'react';
import {
  GitBranch, GitCommit, GitPullRequest, FolderGit2, Plus, RefreshCw,
  ExternalLink, CheckCircle2, AlertTriangle, ShieldCheck, Copy, Check,
  Trash2, X, Play, Clock, Code2, Link as LinkIcon, Loader2
} from 'lucide-react';
import { getGitIntegrations, createGitIntegration, deleteGitIntegration, getGitEvents, simulateGitEvent } from '../services/gitService';
import { getProjects } from '../services/projectService';
import { useToast } from '../components/ToastProvider';

export default function GitIntegrationPage() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [simulatingId, setSimulatingId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    provider: 'github',
    project: '',
    repoUrl: '',
    defaultBranch: 'main',
    webhookSecret: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [intRes, evtRes, prjRes] = await Promise.all([
        getGitIntegrations(),
        getGitEvents({ limit: 40 }),
        getProjects()
      ]);

      setIntegrations(intRes?.data || []);
      setEvents(evtRes?.data || []);
      setProjects(prjRes?.data?.projects || prjRes?.data || []);
    } catch (err) {
      console.error('Failed to load git data:', err);
      toast.showError('Failed to load Git integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.project || !form.repoUrl) {
      toast.showError('Name, Project, and Repo URL are required.');
      return;
    }

    try {
      const res = await createGitIntegration(form);
      if (res?.success) {
        toast.showSuccess('Git repository connected!');
        setShowAddModal(false);
        setForm({
          name: '',
          provider: 'github',
          project: '',
          repoUrl: '',
          defaultBranch: 'main',
          webhookSecret: ''
        });
        loadData();
      }
    } catch (err) {
      console.error('Create git error:', err);
      toast.showError(err.response?.data?.message || 'Failed to connect repository');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this repository integration?')) return;
    try {
      await deleteGitIntegration(id);
      toast.showSuccess('Integration removed');
      loadData();
    } catch (err) {
      toast.showError('Failed to remove integration');
    }
  };

  const handleSimulate = async (integrationId) => {
    try {
      setSimulatingId(integrationId);
      const res = await simulateGitEvent(integrationId, {
        branch: 'main',
        commitMessage: 'feat(api): optimize response times and update webhook handler #TASK-101',
        authorName: 'Alex Mercer'
      });
      if (res?.success) {
        toast.showSuccess('Simulated Git commit dispatched and logged!');
        loadData();
      }
    } catch (err) {
      console.error('Simulate error:', err);
      toast.showError('Failed to simulate commit');
    } finally {
      setSimulatingId(null);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
    toast.showSuccess('Copied to clipboard');
  };

  const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
  const rootBackend = apiBase.startsWith('http')
    ? apiBase.replace(/\/v1\/?$/, '').replace(/\/api\/?$/, '')
    : (window.location.origin.includes('localhost') ? 'http://localhost:5000' : window.location.origin);
  const webhookBaseUrl = `${rootBackend}/api/v1/git/webhook/github`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <GitBranch size={16} /> Module 10 — Git Provider Integration
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Source Control & Webhooks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Connect GitHub, GitLab, or Bitbucket. Automate task status updates and sync pull requests directly from code commits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition"
            title="Refresh feed"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-600/25"
          >
            <Plus size={15} /> Connect Repository
          </button>
        </div>
      </div>

      {/* Webhook Configuration Guide Box */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
              <ShieldCheck size={16} /> Webhook Endpoint Configuration
            </div>
            <p className="text-xs text-slate-300">
              Add this Webhook Payload URL to your GitHub / GitLab repository settings (select <b>Push</b> and <b>Pull Request</b> events).
            </p>
            <div className="flex items-center gap-2 mt-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
              <span className="truncate">{webhookBaseUrl}</span>
              <button
                onClick={() => copyToClipboard(webhookBaseUrl, 'webhookUrl')}
                className="text-slate-400 hover:text-white shrink-0"
              >
                {copiedKey === 'webhookUrl' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 shrink-0">
            <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              HMAC SHA-256 Verified
            </span>
          </div>
        </div>
      </div>

      {/* Connected Repositories Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
          Connected Repositories ({integrations.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 size={24} className="animate-spin text-indigo-600 mr-2" /> Loading integrations...
          </div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
            <Code2 size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Git Repositories Configured</p>
            <p className="text-xs text-slate-400 mt-0.5">Connect your repository to begin tracking code events and PR milestones.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
            >
              + Connect your first repository
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {integrations.map(repo => (
              <div
                key={repo._id || repo.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200">
                      <FolderGit2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[160px]">
                        {repo.name}
                      </h3>
                      <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                        {repo.project?.projectCode || 'PRJ'} • {repo.defaultBranch || 'main'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {repo.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                  {repo.repoUrl}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>{repo.eventCount || 0} events synced</span>
                  <span>{repo.lastEventAt ? new Date(repo.lastEventAt).toLocaleDateString() : 'No events yet'}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => handleSimulate(repo._id || repo.id)}
                    disabled={simulatingId === (repo._id || repo.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition disabled:opacity-50"
                  >
                    {simulatingId === (repo._id || repo.id) ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Play size={12} />
                    )}
                    Simulate Commit
                  </button>

                  <button
                    onClick={() => handleDelete(repo._id || repo.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real-Time Git Activity Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit size={18} className="text-indigo-600" />
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Recent Code Activity & Commits ({events.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">Live webhook audit log</span>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No code activity recorded yet. Push a commit or click "Simulate Commit" above to test the webhook parser.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {events.map((evt) => {
              const isPR = evt.eventType === 'pull_request';
              return (
                <div key={evt._id || evt.id} className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 p-2 rounded-xl transition">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${isPR ? 'bg-purple-500/10 text-purple-600' : 'bg-indigo-500/10 text-indigo-600'}`}>
                      {isPR ? <GitPullRequest size={16} /> : <GitCommit size={16} />}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {isPR ? `PR #${evt.prNumber}: ${evt.prTitle}` : evt.commitMessage}
                        </span>

                        {evt.linkedTask && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
                            <LinkIcon size={10} /> Linked: {evt.linkedTask.title}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {evt.author?.name || evt.author?.username || 'Git Contributor'}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          {evt.ref?.replace('refs/heads/', '') || 'main'}
                        </span>
                        <span>•</span>
                        {evt.commitId && (
                          <span className="font-mono text-[10px] text-slate-500">
                            {evt.commitId.substring(0, 7)}
                          </span>
                        )}
                        <span>•</span>
                        <span>{new Date(evt.createdAt).toLocaleTimeString()} ({new Date(evt.createdAt).toLocaleDateString()})</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {evt.project?.projectCode || 'PRJ'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONNECT REPOSITORY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderGit2 size={18} className="text-indigo-600" /> Connect Git Repository
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Integration Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nexora Core Backend"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Project *
                </label>
                <select
                  required
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.projectName} ({p.projectCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Repository Git URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/organization/repo"
                  value={form.repoUrl}
                  onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Provider
                  </label>
                  <select
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                    <option value="bitbucket">Bitbucket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Branch
                  </label>
                  <input
                    type="text"
                    value={form.defaultBranch}
                    onChange={(e) => setForm({ ...form, defaultBranch: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
