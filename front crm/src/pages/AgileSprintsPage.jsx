import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  FolderKanban, Plus, Calendar, Clock, CheckCircle2, AlertCircle,
  Users, ChevronDown, Filter, Search, ArrowRight, Play, CheckCircle,
  MoreVertical, Edit3, Trash2, Tag, Flag, Award, Sparkles, X, Loader2
} from 'lucide-react';
import { getSprints, getSprintById, createSprint, updateSprint, deleteSprint, addTaskToSprint, updateTaskSprintStatus } from '../services/sprintService';
import { getProjects } from '../services/projectService';
import { useToast } from '../components/ToastProvider';

const SPRINT_COLUMNS = [
  { id: 'To Do', label: 'To Do', color: 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40' },
  { id: 'In Progress', label: 'In Progress', color: 'border-blue-400 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/20' },
  { id: 'Code Review', label: 'Code Review', color: 'border-purple-400 dark:border-purple-700 bg-purple-50/30 dark:bg-purple-950/20' },
  { id: 'QA', label: 'QA / Testing', color: 'border-amber-400 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20' },
  { id: 'Done', label: 'Done', color: 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20' }
];

const PRIORITY_BADGES = {
  urgent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  low: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
};

const TASK_TYPE_ICONS = {
  Story: { label: 'Story', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  Bug: { label: 'Bug', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  Task: { label: 'Task', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  Epic: { label: 'Epic', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' }
};

export default function AgileSprintsPage() {
  const toast = useToast();
  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [currentSprint, setCurrentSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');

  // Modals
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // Form states
  const [sprintForm, setSprintForm] = useState({
    name: '',
    project: '',
    goal: '',
    startDate: '',
    endDate: ''
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    storyPoints: 2,
    priority: 'medium',
    taskType: 'Story',
    sprintStatus: 'To Do'
  });

  // Load initial data
  useEffect(() => {
    loadProjectsAndSprints();
  }, []);

  const loadProjectsAndSprints = async () => {
    try {
      setLoading(true);
      const [sprintRes, projectRes] = await Promise.all([
        getSprints(),
        getProjects()
      ]);

      const sprintList = sprintRes?.data || [];
      const projectList = projectRes?.data?.projects || projectRes?.data || [];

      setSprints(sprintList);
      setProjects(projectList);

      if (sprintList.length > 0) {
        setSelectedSprintId(sprintList[0]._id || sprintList[0].id);
      }
    } catch (err) {
      console.error('Failed to load sprints/projects:', err);
      toast.showError('Failed to load sprints');
    } finally {
      setLoading(false);
    }
  };

  // Load selected sprint tasks
  useEffect(() => {
    if (!selectedSprintId) return;
    loadSprintDetails(selectedSprintId);
  }, [selectedSprintId]);

  const loadSprintDetails = async (id) => {
    try {
      setBoardLoading(true);
      const res = await getSprintById(id);
      if (res?.success) {
        setCurrentSprint(res.data);
      }
    } catch (err) {
      console.error('Failed to load sprint details:', err);
      toast.showError('Failed to load sprint board');
    } finally {
      setBoardLoading(false);
    }
  };

  // Drag and Drop Handler
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const newStatus = destination.droppableId;

    // Optimistic UI update
    if (currentSprint && currentSprint.tasks) {
      const updatedTasks = currentSprint.tasks.map(t => {
        if ((t._id || t.id) === draggableId) {
          return { ...t, sprintStatus: newStatus };
        }
        return t;
      });

      const totalPoints = updatedTasks.reduce((sum, t) => sum + (t.storyPoints || 1), 0);
      const completedPoints = updatedTasks
        .filter(t => t.sprintStatus === 'Done')
        .reduce((sum, t) => sum + (t.storyPoints || 1), 0);

      setCurrentSprint({
        ...currentSprint,
        tasks: updatedTasks,
        totalPoints,
        completedPoints,
        progress: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0
      });
    }

    // Persist to backend
    try {
      await updateTaskSprintStatus(currentSprint._id || currentSprint.id, draggableId, {
        sprintStatus: newStatus
      });
      toast.showSuccess(`Task moved to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update task status:', err);
      toast.showError('Failed to update task status');
      // Revert on error
      if (selectedSprintId) loadSprintDetails(selectedSprintId);
    }
  };

  // Handle Create Sprint
  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!sprintForm.name || !sprintForm.project || !sprintForm.startDate || !sprintForm.endDate) {
      toast.showError('Please fill in all required sprint fields.');
      return;
    }

    try {
      const res = await createSprint(sprintForm);
      if (res?.success) {
        toast.showSuccess('Sprint created successfully!');
        setShowCreateSprintModal(false);
        setSprintForm({ name: '', project: '', goal: '', startDate: '', endDate: '' });
        await loadProjectsAndSprints();
        if (res.data?._id || res.data?.id) {
          setSelectedSprintId(res.data._id || res.data.id);
        }
      }
    } catch (err) {
      console.error('Create sprint error:', err);
      toast.showError(err.response?.data?.message || 'Failed to create sprint');
    }
  };

  // Handle Add Task to Sprint
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title) {
      toast.showError('Task title is required');
      return;
    }

    try {
      const sprintId = currentSprint._id || currentSprint.id;
      const res = await addTaskToSprint(sprintId, taskForm);
      if (res?.success) {
        toast.showSuccess('Task added to sprint!');
        setShowAddTaskModal(false);
        setTaskForm({
          title: '',
          description: '',
          storyPoints: 2,
          priority: 'medium',
          taskType: 'Story',
          sprintStatus: 'To Do'
        });
        loadSprintDetails(sprintId);
      }
    } catch (err) {
      console.error('Add task error:', err);
      toast.showError(err.response?.data?.message || 'Failed to add task');
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!currentSprint?.tasks) return [];
    return currentSprint.tasks.filter(t => {
      const matchesSearch = !searchTerm ||
        t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.taskKey?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  }, [currentSprint?.tasks, searchTerm, filterPriority]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <FolderKanban size={16} /> Module 9 — Agile Sprint Board
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Sprint Management & Kanban
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Plan sprints, track user stories, story points, and drag-and-drop tasks across delivery stages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sprint Selector */}
          <div className="relative">
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm font-semibold rounded-xl px-4 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sprints.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name} ({s.project?.projectCode || 'PRJ'}) — {s.status}
                </option>
              ))}
              {sprints.length === 0 && <option value="">No Sprints Created</option>}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={() => setShowCreateSprintModal(true)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-sm"
          >
            <Plus size={15} /> New Sprint
          </button>

          <button
            disabled={!currentSprint}
            onClick={() => setShowAddTaskModal(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-sm shadow-indigo-600/25 disabled:opacity-50"
          >
            <Plus size={15} /> Add Task
          </button>
        </div>
      </div>

      {/* Sprint Metrics & Goal Bar */}
      {currentSprint && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Sprint Progress</span>
              <span className="font-bold text-slate-900 dark:text-white">{currentSprint.progress || 0}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${currentSprint.progress || 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
              <span>{currentSprint.completedPoints || 0} pts done</span>
              <span>{currentSprint.totalPoints || 0} pts total</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <Award size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Story Points</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {currentSprint.totalPoints || 0}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Completed</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {currentSprint.tasks?.filter(t => t.sprintStatus === 'Done').length || 0} / {currentSprint.tasks?.length || 0}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
              <Calendar size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Duration & Deadline</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {new Date(currentSprint.startDate).toLocaleDateString()} - {new Date(currentSprint.endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Goal Banner if set */}
      {currentSprint?.goal && (
        <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
          <Sparkles size={16} className="text-indigo-600 shrink-0" />
          <span className="font-bold">Sprint Goal:</span>
          <span className="truncate">{currentSprint.goal}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stories, tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-slate-400" />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Board with Drag and Drop */}
      {boardLoading ? (
        <div className="flex justify-center items-center py-24 text-slate-400">
          <Loader2 size={28} className="animate-spin text-indigo-600 mr-2" /> Loading Sprint Board...
        </div>
      ) : !currentSprint ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <FolderKanban size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Sprint Selected</h3>
          <p className="text-xs text-slate-400 mt-1">Create your first sprint to start planning your development cycle.</p>
          <button
            onClick={() => setShowCreateSprintModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            <Plus size={14} /> Create New Sprint
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {SPRINT_COLUMNS.map(col => {
              const colTasks = filteredTasks.filter(t => (t.sprintStatus || 'To Do') === col.id);
              const colPoints = colTasks.reduce((sum, t) => sum + (t.storyPoints || 1), 0);

              return (
                <div key={col.id} className="flex flex-col min-w-[240px]">
                  {/* Column Header */}
                  <div className={`p-3 rounded-xl border-t-2 ${col.color} border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs mb-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">{col.label}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {colTasks.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {colPoints} pts
                    </span>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 min-h-[450px] p-2 rounded-xl border transition-colors ${
                          snapshot.isDraggingOver
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800'
                            : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/60'
                        } space-y-2.5`}
                      >
                        {colTasks.map((task, index) => {
                          const taskId = task._id || task.id;
                          const priorityBadge = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                          const typeMeta = TASK_TYPE_ICONS[task.taskType] || TASK_TYPE_ICONS.Task;

                          return (
                            <Draggable key={taskId} draggableId={taskId} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition-all ${
                                    dragSnapshot.isDragging ? 'shadow-xl rotate-1 scale-102 ring-2 ring-indigo-500' : ''
                                  }`}
                                >
                                  {/* Top Badges */}
                                  <div className="flex items-center justify-between gap-1 mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeMeta.bg}`}>
                                        {typeMeta.label}
                                      </span>
                                      {task.taskKey && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                          #{task.taskKey}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${priorityBadge}`}>
                                        {task.priority || 'medium'}
                                      </span>
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                        {task.storyPoints || 1} pt
                                      </span>
                                    </div>
                                  </div>

                                  {/* Task Title */}
                                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                                    {task.title}
                                  </p>

                                  {/* Assignee & Due Date */}
                                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-400">
                                    <div className="flex items-center gap-1.5 truncate">
                                      {task.assigned_to && task.assigned_to.length > 0 ? (
                                        <div className="flex items-center gap-1">
                                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                                            {task.assigned_to[0].name?.[0] || 'U'}
                                          </div>
                                          <span className="truncate max-w-[80px]">
                                            {task.assigned_to[0].name}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 text-[10px] italic">Unassigned</span>
                                      )}
                                    </div>

                                    {task.dueDate && (
                                      <div className="flex items-center gap-1 text-[10px]">
                                        <Clock size={11} />
                                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}

                        {provided.placeholder}

                        {colTasks.length === 0 && (
                          <div className="h-28 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                            No tasks in this column
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* CREATE SPRINT MODAL */}
      {showCreateSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban size={18} className="text-indigo-600" /> Create New Sprint
              </h3>
              <button onClick={() => setShowCreateSprintModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sprint Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 2 - Core Auth & Payment"
                  value={sprintForm.name}
                  onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Project *
                </label>
                <select
                  required
                  value={sprintForm.project}
                  onChange={(e) => setSprintForm({ ...sprintForm, project: e.target.value })}
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
                  Sprint Goal
                </label>
                <textarea
                  rows={2}
                  placeholder="Deliver client review prototype and stable API release..."
                  value={sprintForm.goal}
                  onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={sprintForm.startDate}
                    onChange={(e) => setSprintForm({ ...sprintForm, startDate: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={sprintForm.endDate}
                    onChange={(e) => setSprintForm({ ...sprintForm, endDate: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSprintModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TASK TO SPRINT MODAL */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" /> Add Story / Task to Sprint
              </h3>
              <button onClick={() => setShowAddTaskModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement JWT Refresh Token Rotation"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Technical details, acceptance criteria..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Story Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={taskForm.storyPoints}
                    onChange={(e) => setTaskForm({ ...taskForm, storyPoints: parseInt(e.target.value) || 1 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={taskForm.taskType}
                    onChange={(e) => setTaskForm({ ...taskForm, taskType: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="Story">Story</option>
                    <option value="Bug">Bug</option>
                    <option value="Task">Task</option>
                    <option value="Epic">Epic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Column
                </label>
                <select
                  value={taskForm.sprintStatus}
                  onChange={(e) => setTaskForm({ ...taskForm, sprintStatus: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Code Review">Code Review</option>
                  <option value="QA">QA / Testing</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Add to Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
