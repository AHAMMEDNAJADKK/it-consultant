import React, { useState, useEffect } from 'react';
import {
  LifeBuoy, Plus, Search, Filter, AlertTriangle, CheckCircle2, Clock,
  MessageSquare, User, Building, FolderKanban, ShieldCheck, Tag, X,
  ChevronDown, Send, Eye, Trash2, Edit3, ShieldAlert, Check, Loader2,
  Lock, Globe, AlertCircle
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

export default function SupportTicketsPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, critical: 0, breached: 0 });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
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
    isInternal: false
  });

  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const [ticketsRes, statsRes, clientsRes, projectsRes] = await Promise.all([
        getSupportTickets(params),
        getSupportTicketStats(),
        getClients({ limit: 100 }),
        getProjects()
      ]);

      setTickets(ticketsRes?.data || []);
      setStats(statsRes?.data || { total: 0, open: 0, inProgress: 0, resolved: 0, critical: 0, breached: 0 });
      setClients(clientsRes?.data?.clients || clientsRes?.data || []);
      setProjects(projectsRes?.data?.projects || projectsRes?.data || []);
    } catch (err) {
      console.error('Failed to load support tickets:', err);
      toast.showError('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (ticketId) => {
    try {
      setDetailLoading(true);
      const res = await getSupportTicketById(ticketId);
      if (res?.success) {
        setSelectedTicket(res.data);
        setResolutionNotes(res.data.resolutionNotes || '');
      }
    } catch (err) {
      toast.showError('Failed to load ticket details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.description || !createForm.client) {
      toast.showError('Title, description, and client are required.');
      return;
    }

    try {
      const res = await createSupportTicket(createForm);
      if (res?.success) {
        toast.showSuccess(res.message || 'Support ticket logged!');
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
      console.error('Create ticket error:', err);
      toast.showError(err.response?.data?.message || 'Failed to create ticket');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentForm.message.trim()) return;

    try {
      const ticketId = selectedTicket._id || selectedTicket.id;
      const res = await addTicketComment(ticketId, commentForm);
      if (res?.success) {
        toast.showSuccess('Comment recorded');
        setCommentForm({ message: '', isInternal: false });
        handleOpenDetail(ticketId);
        loadData();
      }
    } catch (err) {
      toast.showError('Failed to post comment');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const ticketId = selectedTicket._id || selectedTicket.id;
      const payload = { status: newStatus };
      if (newStatus === 'Resolved' || newStatus === 'Closed') {
        payload.resolutionNotes = resolutionNotes;
      }

      const res = await updateSupportTicket(ticketId, payload);
      if (res?.success) {
        toast.showSuccess(`Ticket status updated to ${newStatus}`);
        handleOpenDetail(ticketId);
        loadData();
      }
    } catch (err) {
      toast.showError('Failed to update ticket status');
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await deleteSupportTicket(ticketId);
      toast.showSuccess('Ticket deleted');
      if (selectedTicket?._id === ticketId || selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
      loadData();
    } catch (err) {
      toast.showError('Failed to delete ticket');
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.ticketNumber?.toLowerCase().includes(q) ||
      t.title?.toLowerCase().includes(q) ||
      t.client?.companyName?.toLowerCase().includes(q) ||
      t.project?.projectName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <LifeBuoy size={16} /> Module 11 — Bug Tracking & Support
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Support Desk & Issue Lifecycle
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log client issues, manage bug resolutions, track SLA response timers, and isolate client visibility from internal staff discussions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-600/25 shrink-0"
        >
          <Plus size={15} /> Raise Ticket
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400">Total Tickets</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-blue-500 font-semibold">Open / Backlog</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.open || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-amber-500 font-semibold">In Progress</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.inProgress || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-rose-500 font-semibold">Critical Priority</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.critical || 0}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <AlertTriangle size={12} /> SLA Breaches
          </p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.breached || 0}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ticket #, title, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none"
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
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Bug">Bug</option>
            <option value="Feature Request">Feature Request</option>
            <option value="Incident">Incident</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin text-indigo-600 mr-2" /> Loading support tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-20">
            <LifeBuoy size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Support Tickets Found</p>
            <p className="text-xs text-slate-400 mt-0.5">Tickets raised by clients or internal QA will be listed here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Client & Project</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Target</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTickets.map(ticket => {
                  const priorityClass = PRIORITY_THEMES[ticket.priority] || PRIORITY_THEMES.Medium;
                  const statusClass = STATUS_THEMES[ticket.status] || STATUS_THEMES.Open;
                  const isBreached = ticket.slaStatus === 'Breached';
                  const isMet = ticket.slaStatus === 'Met';

                  return (
                    <tr
                      key={ticket._id || ticket.id}
                      onClick={() => handleOpenDetail(ticket._id || ticket.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {ticket.ticketNumber}
                        <p className="font-sans text-xs font-semibold text-slate-900 dark:text-white mt-0.5 max-w-[220px] truncate">
                          {ticket.title}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {ticket.client?.companyName || ticket.client?.clientName || 'Direct Client'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {ticket.project?.projectName ? `${ticket.project.projectName} (${ticket.project.projectCode})` : 'General Support'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                        {ticket.category}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${priorityClass}`}>
                          {ticket.priority}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${statusClass}`}>
                          {ticket.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {ticket.slaDeadline ? (
                          <div className="space-y-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isBreached
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black'
                                : isMet
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {ticket.slaStatus}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {new Date(ticket.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(ticket.slaDeadline).toLocaleDateString()})
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No SLA Rule</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(ticket._id || ticket.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket._id || ticket.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TICKET DETAIL & RESOLUTION MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_THEMES[selectedTicket.priority]}`}>
                    {selectedTicket.priority}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_THEMES[selectedTicket.status]}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {selectedTicket.title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Client: <b>{selectedTicket.client?.companyName}</b> • Project: <b>{selectedTicket.project?.projectName || 'N/A'}</b>
                </p>
              </div>

              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            {/* Description */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {selectedTicket.description}
            </div>

            {/* SLA Badge Bar */}
            {selectedTicket.slaDeadline && (
              <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" />
                  <span className="text-slate-600 dark:text-slate-300">Agreed SLA Deadline:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {new Date(selectedTicket.slaDeadline).toLocaleString()}
                  </span>
                </div>
                <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white">
                  {selectedTicket.slaStatus}
                </span>
              </div>
            )}

            {/* Lifecycle Status Switcher */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">Advance Status:</span>
              {['Open', 'Under Review', 'In Progress', 'Resolved', 'Closed'].map(st => (
                <button
                  key={st}
                  disabled={selectedTicket.status === st}
                  onClick={() => handleStatusChange(st)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                    selectedTicket.status === st
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Resolution Notes field when resolving/resolved */}
            {(selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed' || selectedTicket.resolutionNotes) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution Notes & Technical RCA
                </label>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain how the bug was fixed, PR reference, or workaround..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>
            )}

            {/* Comments & Activity Timeline */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-1.5">
                <MessageSquare size={14} /> Activity & Discussion ({selectedTicket.comments?.length || 0})
              </h4>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {selectedTicket.comments?.map((c, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl text-xs space-y-1 ${
                      c.isInternal
                        ? 'bg-amber-500/10 border border-amber-500/20 text-slate-900 dark:text-amber-100'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-bold flex items-center gap-1">
                        {c.authorName || 'Staff'} ({c.authorRole || 'Support'})
                        {c.isInternal && (
                          <span className="bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded text-[8px] flex items-center gap-0.5">
                            <Lock size={8} /> Internal Staff Only
                          </span>
                        )}
                      </span>
                      <span>{new Date(c.createdAt).toLocaleTimeString()} ({new Date(c.createdAt).toLocaleDateString()})</span>
                    </div>
                    <p className="leading-relaxed">{c.message}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="space-y-2 pt-2">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Write a response or investigation update..."
                    value={commentForm.message}
                    onChange={(e) => setCommentForm({ ...commentForm, message: e.target.value })}
                    className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1"
                  >
                    <Send size={13} /> Send
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-500 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={commentForm.isInternal}
                    onChange={(e) => setCommentForm({ ...commentForm, isInternal: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mark as internal staff discussion (hide from client view)</span>
                </label>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LifeBuoy size={18} className="text-indigo-600" /> Raise Support Ticket
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Summary / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payment Gateway 500 error on checkout"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Client Account *
                  </label>
                  <select
                    required
                    value={createForm.client}
                    onChange={(e) => setCreateForm({ ...createForm, client: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => (
                      <option key={c._id || c.id} value={c._id || c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Linked Project
                  </label>
                  <select
                    value={createForm.project}
                    onChange={(e) => setCreateForm({ ...createForm, project: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="">No Project (General)</option>
                    {projects.map(p => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.projectName} ({p.projectCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="Bug">Bug</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Incident">Incident</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="Critical">Critical (1-4h SLA)</option>
                    <option value="High">High (4-12h SLA)</option>
                    <option value="Medium">Medium (8-24h SLA)</option>
                    <option value="Low">Low (24-48h SLA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Description & Steps to Reproduce *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the defect, expected behaviour, and current error message..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
