import React, { useState, useEffect } from 'react';
import {
  Bug, Plus, Search, Filter, AlertTriangle, CheckCircle2, Clock,
  MessageSquare, User, Building, FolderKanban, ShieldCheck, Tag, X,
  ChevronDown, Send, Eye, Trash2, Edit3, Check, Loader2,
  AlertCircle
} from 'lucide-react';
import {
  getSupportTickets,
  getSupportTicketStats,
  getSupportTicketById,
  createSupportTicket,
  updateSupportTicket,
  addTicketComment,
  deleteSupportTicket
} from '../services/supportTicketService';
import { getClients } from '../services/clientService';
import { getProjects } from '../services/projectService';
import { useToast } from '../components/ToastProvider';

const PRIORITY_THEMES = {
  Critical: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  High: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  Medium: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  Low: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
};

const STATUS_THEMES = {
  Open: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'Under Review': 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'In Progress': 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  Resolved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  Closed: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  Reopened: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
};

export default function BugTrackingPage() {
  const toast = useToast();
  const [bugs, setBugs] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, critical: 0 });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    client: '',
    project: '',
    category: 'Bug',
    priority: 'Medium'
  });

  const [commentForm, setCommentForm] = useState({
    message: '',
    isInternal: true
  });

  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, projectFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (projectFilter !== 'all') params.project = projectFilter;

      const [bugsRes, statsRes, clientsRes, projectsRes] = await Promise.all([
        getSupportTickets(params),
        getSupportTicketStats(),
        getClients({ limit: 100 }),
        getProjects()
      ]);

      const bugList = bugsRes?.data || [];
      setBugs(bugList);
      setStats(statsRes?.data || { total: 0, open: 0, inProgress: 0, resolved: 0, critical: 0 });
      setClients(clientsRes?.data?.clients || clientsRes?.data || []);
      setProjects(projectsRes?.data?.projects || projectsRes?.data || []);
    } catch (err) {
      console.error('Failed to load bugs:', err);
      toast.showError('Failed to load bug records');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (bugId) => {
    try {
      setDetailLoading(true);
      const res = await getSupportTicketById(bugId);
      if (res?.success) {
        setSelectedBug(res.data);
        setResolutionNotes(res.data.resolutionNotes || '');
      }
    } catch (err) {
      toast.showError('Failed to load bug details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateBug = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.description) {
      toast.showError('Bug title and description are required.');
      return;
    }

    try {
      // Find client from project if client is not explicitly selected
      let payloadClient = createForm.client;
      if (!payloadClient && createForm.project) {
        const matchedPrj = projects.find(p => (p._id || p.id) === createForm.project);
        if (matchedPrj?.client?._id || matchedPrj?.client) {
          payloadClient = matchedPrj.client._id || matchedPrj.client;
        }
      }
      if (!payloadClient && clients.length > 0) {
        payloadClient = clients[0]._id || clients[0].id;
      }

      const res = await createSupportTicket({
        ...createForm,
        client: payloadClient,
        category: 'Bug'
      });
      if (res?.success) {
        toast.showSuccess(res.message || 'Bug reported successfully!');
        setShowCreateModal(false);
        setCreateForm({
          title: '',
          description: '',
          client: '',
          project: '',
          category: 'Bug',
          priority: 'Medium'
        });
        loadData();
      }
    } catch (err) {
      console.error('Create bug error:', err);
      toast.showError(err.response?.data?.message || 'Failed to report bug');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentForm.message.trim()) return;

    try {
      const bugId = selectedBug._id || selectedBug.id;
      const res = await addTicketComment(bugId, commentForm);
      if (res?.success) {
        toast.showSuccess('Comment added');
        setCommentForm({ message: '', isInternal: true });
        handleOpenDetail(bugId);
        loadData();
      }
    } catch (err) {
      toast.showError('Failed to post comment');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const bugId = selectedBug._id || selectedBug.id;
      const payload = { status: newStatus };
      if (newStatus === 'Resolved' || newStatus === 'Closed') {
        payload.resolutionNotes = resolutionNotes;
      }

      const res = await updateSupportTicket(bugId, payload);
      if (res?.success) {
        toast.showSuccess(`Bug status updated to ${newStatus}`);
        handleOpenDetail(bugId);
        loadData();
      }
    } catch (err) {
      toast.showError('Failed to update bug status');
    }
  };

  const handleDeleteBug = async (bugId) => {
    if (!window.confirm('Are you sure you want to delete this bug report?')) return;
    try {
      await deleteSupportTicket(bugId);
      toast.showSuccess('Bug report deleted');
      if (selectedBug?._id === bugId || selectedBug?.id === bugId) {
        setSelectedBug(null);
      }
      loadData();
    } catch (err) {
      toast.showError('Failed to delete bug report');
    }
  };

  const filteredBugs = bugs.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.ticketNumber?.toLowerCase().includes(q) ||
      b.title?.toLowerCase().includes(q) ||
      b.project?.projectName?.toLowerCase().includes(q) ||
      b.client?.companyName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Bug size={16} /> Bug Tracking & Issue Resolution
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Bug Tracking
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log software defects, prioritize fixes, track assignee progress, and document resolutions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-600/25 shrink-0"
        >
          <Plus size={15} /> Report Bug
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-400 font-medium">Total Bugs</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-blue-500 font-semibold">Open / Backlog</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.open || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-amber-500 font-semibold">In Progress</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.inProgress || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-rose-500 font-semibold">Critical Priority</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.critical || 0}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by bug #, title, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p._id || p.id} value={p._id || p.id}>{p.projectName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bugs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20 text-slate-400">
            <Loader2 size={24} className="animate-spin text-indigo-600 mr-2" /> Loading bugs...
          </div>
        ) : filteredBugs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Bug size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold">No bugs found</p>
            <p className="text-xs text-slate-400 mt-1">Change filters or report a new bug.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3">Bug #</th>
                  <th className="px-4 py-3">Title & Description</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBugs.map((bug) => {
                  const prioTheme = PRIORITY_THEMES[bug.priority] || PRIORITY_THEMES.Medium;
                  const statusTheme = STATUS_THEMES[bug.status] || STATUS_THEMES.Open;
                  return (
                    <tr
                      key={bug._id || bug.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => handleOpenDetail(bug._id || bug.id)}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {bug.ticketNumber || 'BUG'}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{bug.title}</p>
                        <p className="text-slate-400 text-[11px] truncate mt-0.5">{bug.description}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {bug.project?.projectName || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${prioTheme}`}>
                          {bug.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusTheme}`}>
                          {bug.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {bug.assignedTo?.name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetail(bug._id || bug.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteBug(bug._id || bug.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-1"
                          title="Delete Bug"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Bug Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bug size={18} className="text-indigo-600" /> Report New Bug
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBug} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bug Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken authentication redirect on session timeout"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Project *
                  </label>
                  <select
                    value={createForm.project}
                    onChange={(e) => {
                      const prjId = e.target.value;
                      const prj = projects.find(p => (p._id || p.id) === prjId);
                      setCreateForm({
                        ...createForm,
                        project: prjId,
                        client: prj?.client?._id || prj?.client || createForm.client
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p._id || p.id} value={p._id || p.id}>{p.projectName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Steps to Reproduce *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Steps to reproduce, observed behavior, expected behavior..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                >
                  Report Bug
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bug Detail Drawer / Modal */}
      {selectedBug && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-end p-0 md:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full md:h-auto md:max-h-[92vh] md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedBug.ticketNumber}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_THEMES[selectedBug.status] || STATUS_THEMES.Open}`}>
                  {selectedBug.status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIORITY_THEMES[selectedBug.priority] || PRIORITY_THEMES.Medium}`}>
                  {selectedBug.priority}
                </span>
              </div>

              <button
                onClick={() => setSelectedBug(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedBug.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Project: <b>{selectedBug.project?.projectName || 'General'}</b>
                  {selectedBug.client?.companyName && ` • Client: ${selectedBug.client.companyName}`}
                </p>
              </div>

              {/* Status Transition Buttons */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Update Lifecycle Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Open', 'In Progress', 'Under Review', 'Resolved', 'Closed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedBug.status === st
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Description
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedBug.description}
                </div>
              </div>

              {/* Resolution Notes */}
              {(selectedBug.status === 'Resolved' || selectedBug.status === 'Closed' || selectedBug.resolutionNotes) && (
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Resolution Notes
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Document how the bug was fixed, PR reference, or commit..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    onBlur={() => handleStatusChange(selectedBug.status)}
                    className="w-full p-3 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Comments Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Discussion & Work Notes ({selectedBug.comments?.length || 0})
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedBug.comments?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No notes recorded yet.</p>
                  ) : (
                    selectedBug.comments?.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{c.authorName || 'Engineer'}</span>
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{c.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Add work note..."
                    value={commentForm.message}
                    onChange={(e) => setCommentForm({ ...commentForm, message: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Send size={12} /> Post
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
