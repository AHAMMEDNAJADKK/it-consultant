import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Plus, Search, Filter, Calendar, Clock, AlertTriangle,
  CheckCircle2, Building, RefreshCw, X, Eye, Edit3, Trash2, ShieldAlert,
  ArrowRight, FileText, DollarSign, Layers, ChevronDown, Loader2
} from 'lucide-react';
import {
  getSLAContracts,
  getSLAMetrics,
  getSLAContractById,
  createSLAContract,
  updateSLAContract,
  renewSLAContract,
  deleteSLAContract
} from '../services/slaService';
import { getClients } from '../services/clientService';
import { getProjects } from '../services/projectService';
import { useToast } from '../components/ToastProvider';

const TIER_BADGES = {
  Platinum: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  Gold: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  Silver: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  Bronze: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  Custom: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
};

export default function SLAMaintenancePage() {
  const toast = useToast();
  const [contracts, setContracts] = useState([]);
  const [metrics, setMetrics] = useState({
    totalContracts: 0,
    activeContracts: 0,
    expiringSoon: 0,
    complianceRate: 100
  });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);

  // Forms
  const [contractForm, setContractForm] = useState({
    title: '',
    client: '',
    project: '',
    tier: 'Gold',
    coverageType: 'Business Hours (9x5)',
    startDate: '',
    endDate: '',
    monthlyFee: 0,
    responseTimes: { criticalHours: 1, highHours: 4, mediumHours: 8, lowHours: 24 },
    resolutionTimes: { criticalHours: 4, highHours: 16, mediumHours: 48, lowHours: 72 },
    terms: '',
    notes: ''
  });

  const [renewForm, setRenewForm] = useState({
    newEndDate: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [tierFilter, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (tierFilter !== 'all') params.tier = tierFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const [contractsRes, metricsRes, clientsRes, projectsRes] = await Promise.all([
        getSLAContracts(params),
        getSLAMetrics(),
        getClients({ limit: 100 }),
        getProjects()
      ]);

      setContracts(contractsRes?.data || []);
      setMetrics(metricsRes?.data || { totalContracts: 0, activeContracts: 0, expiringSoon: 0, complianceRate: 100 });
      setClients(clientsRes?.data?.clients || clientsRes?.data || []);
      setProjects(projectsRes?.data?.projects || projectsRes?.data || []);
    } catch (err) {
      console.error('Failed to load SLA contracts:', err);
      toast.showError('Failed to load SLA contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    if (!contractForm.title || !contractForm.client || !contractForm.startDate || !contractForm.endDate) {
      toast.showError('Title, Client, Start Date, and End Date are required.');
      return;
    }

    try {
      const res = await createSLAContract(contractForm);
      if (res?.success) {
        toast.showSuccess(res.message || 'SLA contract created!');
        setShowCreateModal(false);
        setContractForm({
          title: '',
          client: '',
          project: '',
          tier: 'Gold',
          coverageType: 'Business Hours (9x5)',
          startDate: '',
          endDate: '',
          monthlyFee: 0,
          responseTimes: { criticalHours: 1, highHours: 4, mediumHours: 8, lowHours: 24 },
          resolutionTimes: { criticalHours: 4, highHours: 16, mediumHours: 48, lowHours: 72 },
          terms: '',
          notes: ''
        });
        loadData();
      }
    } catch (err) {
      console.error('Create SLA error:', err);
      toast.showError(err.response?.data?.message || 'Failed to create SLA contract');
    }
  };

  const handleRenew = async (e) => {
    e.preventDefault();
    if (!renewForm.newEndDate) {
      toast.showError('Please specify the new contract end date.');
      return;
    }

    try {
      const contractId = renewTarget._id || renewTarget.id;
      const res = await renewSLAContract(contractId, renewForm);
      if (res?.success) {
        toast.showSuccess(res.message || 'Contract renewed!');
        setShowRenewModal(false);
        setRenewTarget(null);
        setRenewForm({ newEndDate: '', notes: '' });
        loadData();
      }
    } catch (err) {
      toast.showError('Failed to renew contract');
    }
  };

  const handleDelete = async (contractId) => {
    if (!window.confirm('Are you sure you want to delete this SLA contract?')) return;
    try {
      await deleteSLAContract(contractId);
      toast.showSuccess('Contract deleted');
      loadData();
    } catch (err) {
      toast.showError('Failed to delete contract');
    }
  };

  const handleViewDetail = async (contractId) => {
    try {
      const res = await getSLAContractById(contractId);
      if (res?.success) {
        setSelectedContract(res.data);
      }
    } catch (err) {
      toast.showError('Failed to load contract details');
    }
  };

  const filteredContracts = contracts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.contractNumber?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.client?.companyName?.toLowerCase().includes(q) ||
      c.project?.projectName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={16} /> Module 12 — SLA & Maintenance Contracts
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Service Level Agreements & Retainers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Define SLA coverage tiers, track resolution targets, monitor real-time compliance rate, and manage contract renewals.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-600/25 shrink-0"
        >
          <Plus size={15} /> New SLA Contract
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400">SLA Compliance Rate</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {metrics.complianceRate || 100}%
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Active Retainers</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {metrics.activeContracts || 0}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Renewals in 30 Days</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {metrics.expiringSoon || 0}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Tracked Support Incidents</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {metrics.totalTrackedTickets || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search contract #, title, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Tiers</option>
            <option value="Platinum">Platinum (24x7 / 1h)</option>
            <option value="Gold">Gold (4h)</option>
            <option value="Silver">Silver (8h)</option>
            <option value="Bronze">Bronze (24h)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending Renewal">Pending Renewal</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin text-indigo-600 mr-2" /> Loading contracts...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-20">
            <ShieldCheck size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No SLA Contracts Configured</p>
            <p className="text-xs text-slate-400 mt-0.5">Create your first client maintenance contract to automate SLA enforcement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Contract #</th>
                  <th className="py-3 px-4">Client & Project</th>
                  <th className="py-3 px-4">Tier & Coverage</th>
                  <th className="py-3 px-4">Response / Resolution</th>
                  <th className="py-3 px-4">Coverage Period</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredContracts.map(c => {
                  const isExpiring = new Date(c.endDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  const isExpired = new Date(c.endDate) < new Date();

                  return (
                    <tr
                      key={c._id || c.id}
                      onClick={() => handleViewDetail(c._id || c.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {c.contractNumber}
                        <p className="font-sans text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                          {c.title}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {c.client?.companyName || 'Client'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {c.project?.projectName ? `${c.project.projectName} (${c.project.projectCode})` : 'All Client Projects'}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${TIER_BADGES[c.tier] || TIER_BADGES.Gold}`}>
                          {c.tier}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {c.coverageType}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 space-y-0.5 text-[11px]">
                        <div>
                          <span className="text-slate-400">Response:</span>{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {c.responseTimes?.criticalHours || 1}h (Crit) / {c.responseTimes?.highHours || 4}h (High)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Resolution:</span>{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {c.resolutionTimes?.criticalHours || 4}h (Crit) / {c.resolutionTimes?.highHours || 16}h (High)
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-600 dark:text-slate-400">
                        <p>{new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}</p>
                        {isExpired ? (
                          <span className="text-[10px] font-bold text-rose-500">Expired</span>
                        ) : isExpiring ? (
                          <span className="text-[10px] font-bold text-amber-500">Expiring soon</span>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          c.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }`}>
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setRenewTarget(c);
                              setShowRenewModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                            title="Renew Contract"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => handleDelete(c._id || c.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
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

      {/* RENEW MODAL */}
      {showRenewModal && renewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw size={18} className="text-indigo-600" /> Renew SLA Contract
              </h3>
              <button onClick={() => setShowRenewModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Renewing contract <b>{renewTarget.contractNumber}</b> for <b>{renewTarget.client?.companyName}</b>.
            </p>

            <form onSubmit={handleRenew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Expiration Date *
                </label>
                <input
                  type="date"
                  required
                  value={renewForm.newEndDate}
                  onChange={(e) => setRenewForm({ ...renewForm, newEndDate: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Renewal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Terms extended by mutual agreement..."
                  value={renewForm.notes}
                  onChange={(e) => setRenewForm({ ...renewForm, notes: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Confirm Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CONTRACT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" /> Create SLA & Maintenance Contract
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Cloud Maintenance & 24/7 SLA"
                  value={contractForm.title}
                  onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
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
                    value={contractForm.client}
                    onChange={(e) => setContractForm({ ...contractForm, client: e.target.value })}
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
                    value={contractForm.project}
                    onChange={(e) => setContractForm({ ...contractForm, project: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="">All Projects (Client-Wide)</option>
                    {projects.map(p => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.projectName} ({p.projectCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Service Tier
                  </label>
                  <select
                    value={contractForm.tier}
                    onChange={(e) => setContractForm({ ...contractForm, tier: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="Platinum">Platinum</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Coverage Window
                  </label>
                  <select
                    value={contractForm.coverageType}
                    onChange={(e) => setContractForm({ ...contractForm, coverageType: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="24x7">24x7 Continuous</option>
                    <option value="Business Hours (9x5)">Business Hours (9x5)</option>
                    <option value="Extended (12x6)">Extended (12x6)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Retainer ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={contractForm.monthlyFee}
                    onChange={(e) => setContractForm({ ...contractForm, monthlyFee: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Effective Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expiration Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
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
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
