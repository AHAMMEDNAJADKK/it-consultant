import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban, CheckCircle2, Clock, AlertTriangle, ShieldCheck,
  TrendingUp, Users, LifeBuoy, ArrowRight, DollarSign, Calendar,
  Code2, GitBranch, RefreshCw, Sparkles, Plus, AlertCircle, ArrowUpRight,
  Loader2, ShieldAlert, FileText, CheckCircle
} from 'lucide-react';
import { getDashboardMetrics } from '../services/dashboardService';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../components/ToastProvider';

export default function Dashboard() {
  const { user } = useUser();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const res = await getDashboardMetrics();
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      toast.showError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 size={36} className="animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">Aggregating IT Services ERP Metrics...</p>
      </div>
    );
  }

  const projects = data?.projects || {};
  const tasks = data?.tasks || {};
  const finance = data?.finance || {};
  const support = data?.support || {};
  const sla = data?.sla || {};
  const leads = data?.leads || {};
  const milestones = data?.milestones || { upcoming: [], delayed: [] };
  const developerWorkload = data?.developerWorkload || [];
  const deliveryRisks = data?.deliveryRisks || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles size={14} /> Nexora IT Suite — Executive & Delivery Dashboard
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Welcome back, {user?.name || 'Engineer'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Real-time software delivery status, active sprints, client financial health, open support tickets, and SLA deadline alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadMetrics}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs font-bold flex items-center gap-1.5 border border-slate-700/60"
              title="Refresh real-time data"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link
              to="/projects/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <Plus size={15} /> New Project
            </Link>
            <Link
              to="/sprints"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition backdrop-blur-md flex items-center gap-1.5"
            >
              <FolderKanban size={15} /> Sprint Board
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Active Projects */}
        <Link to="/projects" className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 transition group">
          <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Projects</span>
            <FolderKanban size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {projects.active || 0}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>{projects.total || 0} Total</span>
            <span className="text-emerald-500 font-bold">{projects.avgProgress || 0}% avg</span>
          </div>
        </Link>

        {/* Task Velocity */}
        <Link to="/todo" className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 transition group">
          <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dev Tasks</span>
            <CheckCircle2 size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {tasks.completed || 0}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>{tasks.total || 0} Total</span>
            <span className="text-indigo-500 font-bold">{tasks.completionRate || 0}% Done</span>
          </div>
        </Link>

        {/* Delivery Risks */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Delivery Risks</span>
            <AlertTriangle size={18} />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {(projects.overdue || 0) + (milestones.delayed?.length || 0)}
          </p>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>{projects.overdue || 0} overdue projects</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <Link to="/accounts" className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 transition group">
          <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Receivables</span>
            <DollarSign size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 truncate">
            ${Math.round(finance.outstandingBalance || 0).toLocaleString()}
          </p>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>Collected: ${Math.round(finance.totalReceived || 0).toLocaleString()}</span>
          </div>
        </Link>

        {/* Open Support Bugs */}
        <Link to="/support-tickets" className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 transition group">
          <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Support Desk</span>
            <LifeBuoy size={18} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {support.open || 0}
          </p>
          <div className="text-[11px] text-rose-500 font-bold mt-1">
            <span>{support.critical || 0} Critical Bugs</span>
          </div>
        </Link>

        {/* SLA Compliance */}
        <Link to="/sla-maintenance" className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 transition group">
          <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">SLA Target</span>
            <ShieldCheck size={18} />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {sla.activeContracts ? '98.5%' : '100%'}
          </p>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>{sla.activeContracts || 0} Active SLAs</span>
          </div>
        </Link>
      </div>

      {/* Row 2: Active Projects Progress & Upcoming Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects Delivery (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Active Projects & Delivery Progress
              </h2>
              <p className="text-xs text-slate-400">Tracking milestones, tech stack, and manager deliverables</p>
            </div>
            <Link to="/projects" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          {projects.recent?.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No active projects found.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.recent?.map(proj => {
                const isOverdue = proj.deadline && new Date(proj.deadline) < new Date();
                return (
                  <div
                    key={proj._id || proj.id}
                    onClick={() => navigate(`/projects/${proj._id || proj.id}`)}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                            {proj.projectCode}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {proj.projectName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          Client: <b>{proj.client?.companyName || 'Confidential'}</b> • Manager: {proj.projectManager?.name || 'Unassigned'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {proj.progress || 0}%
                        </span>
                        {isOverdue && (
                          <p className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5 justify-end mt-0.5">
                            <AlertCircle size={10} /> Overdue
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${proj.progress || 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Milestones & Deadlines (1 col) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={16} className="text-indigo-600" /> Milestones & Deadlines
            </h2>
          </div>

          <div className="space-y-2.5">
            {milestones.delayed?.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <AlertTriangle size={13} /> {milestones.delayed.length} Delayed Milestones
                </div>
                {milestones.delayed.slice(0, 2).map((m, idx) => (
                  <p key={idx} className="text-[11px] truncate">
                    • {m.title} ({m.project?.projectCode || 'PRJ'}) — Due {new Date(m.dueDate).toLocaleDateString()}
                  </p>
                ))}
              </div>
            )}

            {milestones.upcoming?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No upcoming milestones due within 14 days.
              </div>
            ) : (
              milestones.upcoming?.map(m => (
                <div
                  key={m._id || m.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                      {m.title}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Project: {m.project?.projectName || 'Project'} ({m.project?.projectCode || ''})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Developer Workload & Delivery Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Developer Workload */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Code2 size={16} className="text-indigo-600" /> Developer Workload & Progress
              </h2>
              <p className="text-xs text-slate-400">Active tasks and daily shift completion by software engineers</p>
            </div>
            <Link to="/developer-dashboard" className="text-xs font-bold text-indigo-600 hover:underline">
              Dev Reports →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {developerWorkload.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No developer workload records found.</div>
            ) : (
              developerWorkload.slice(0, 5).map(dev => (
                <div key={dev.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {dev.name?.[0] || 'D'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {dev.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {dev.designation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
                    <span className="text-slate-500">{dev.totalTasks} tasks</span>
                    <span className="text-amber-500">{dev.activeTasks} active</span>
                    <span className="text-emerald-600 font-bold">{dev.completedTasks} done</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery Risks & Blockers */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-500" /> Stalled Milestones & Delivery Blockers
              </h2>
              <p className="text-xs text-slate-400">Identified blockers and schedule risks from daily reports</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {deliveryRisks.length === 0 ? (
              <div className="py-10 text-center text-xs text-emerald-600 font-medium border border-dashed border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                ✓ No active delivery blockers or overdue milestones detected across projects.
              </div>
            ) : (
              deliveryRisks.map((risk, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900 dark:text-rose-200">
                      {risk.project} ({risk.projectCode})
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-600 text-white">
                      {risk.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {risk.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 4: ERP Module Fast Access Grid */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
          ERP Core Modules — Quick Access
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Client Leads', path: '/client-leads', icon: Users, color: 'text-blue-500' },
            { label: 'Client Accounts', path: '/clients', icon: Users, color: 'text-indigo-500' },
            { label: 'Projects & Scope', path: '/projects', icon: FolderKanban, color: 'text-purple-500' },
            { label: 'Tasks & Todo', path: '/todo', icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Developer Reports', path: '/developer-report', icon: Code2, color: 'text-cyan-500' },
            { label: 'AI Health Reports', path: '/ai-report', icon: Sparkles, color: 'text-amber-500' },
            { label: 'Invoices & Finance', path: '/accounts', icon: DollarSign, color: 'text-green-500' },
            { label: 'Agile Sprints', path: '/sprints', icon: FolderKanban, color: 'text-rose-500' },
            { label: 'Git Integration', path: '/git-integrations', icon: GitBranch, color: 'text-slate-700 dark:text-slate-300' },
            { label: 'Support Tickets', path: '/support-tickets', icon: LifeBuoy, color: 'text-red-500' },
            { label: 'SLA Contracts', path: '/sla-maintenance', icon: ShieldCheck, color: 'text-teal-500' },
            { label: 'Team & Users', path: '/users', icon: Users, color: 'text-orange-500' }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                to={item.path}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex flex-col items-center justify-center text-center gap-2 group"
              >
                <div className={`p-2 rounded-xl bg-white dark:bg-slate-900 shadow-xs group-hover:scale-110 transition ${item.color}`}>
                  <Icon size={18} />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}