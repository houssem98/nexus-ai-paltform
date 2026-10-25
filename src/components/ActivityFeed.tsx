import React, { useState, useMemo } from 'react';
import {
  Activity,
  Bot,
  User,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Search,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Cpu,
  Key,
  Database,
  ArrowRight,
  SlidersHorizontal,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { api } from '../lib/api';

export interface AuditEventItem {
  id: string;
  orgId: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: 'agent' | 'workflow' | 'execution' | 'knowledge' | 'integration' | 'deployment' | 'security' | 'approval';
  resourceId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

interface ActivityFeedProps {
  auditLogs: AuditEventItem[];
  onNavigate: (tab: NavTab) => void;
  onRefresh?: () => void;
  className?: string;
  maxDisplay?: number;
}

type CategoryFilter = 'all' | 'agent' | 'user' | 'system';

interface EventClassification {
  category: 'agent' | 'user' | 'system';
  statusType: 'success' | 'warning' | 'reasoning' | 'security' | 'info';
  categoryLabel: string;
  statusLabel: string;
  displayAction: string;
  icon: React.ElementType;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  auditLogs,
  onNavigate,
  onRefresh,
  className = '',
  maxDisplay,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(true);

  // Formatter for relative timestamps
  const formatRelativeTime = (timestamp: string) => {
    try {
      const now = Date.now();
      const eventTime = new Date(timestamp).getTime();
      const diffMs = now - eventTime;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHour / 24);

      if (diffSec < 45) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  // Classify audit event into Category & Semantic Status Indicator
  const classifyEvent = (log: AuditEventItem): EventClassification => {
    const actionUpper = (log.action || '').toUpperCase();
    const resType = log.resourceType;
    const isUserActor = log.userId?.startsWith('usr_');

    // 1. Agent Decisions
    if (
      resType === 'agent' ||
      actionUpper.includes('AGENT') ||
      actionUpper.includes('DECISION') ||
      actionUpper.includes('FORENSIC') ||
      actionUpper.includes('REASONING') ||
      actionUpper.includes('QUARANTINE')
    ) {
      if (actionUpper.includes('QUARANTINE') || actionUpper.includes('ANOMALY')) {
        return {
          category: 'agent',
          statusType: 'security',
          categoryLabel: 'Agent Decision',
          statusLabel: 'Host Quarantined',
          displayAction: 'Autonomous Host Isolation',
          icon: ShieldAlert,
        };
      }
      if (actionUpper.includes('ESCALAT') || actionUpper.includes('REVIEW')) {
        return {
          category: 'agent',
          statusType: 'warning',
          categoryLabel: 'Agent Decision',
          statusLabel: 'Policy Escalation',
          displayAction: 'Forensic Review Escalation',
          icon: AlertTriangle,
        };
      }
      if (actionUpper.includes('REASONING') || actionUpper.includes('THINKING')) {
        return {
          category: 'agent',
          statusType: 'reasoning',
          categoryLabel: 'Agent Decision',
          statusLabel: 'High Thinking',
          displayAction: 'Gemini 4 Argon Synthesis',
          icon: Bot,
        };
      }
      return {
        category: 'agent',
        statusType: 'reasoning',
        categoryLabel: 'Agent Decision',
        statusLabel: 'Autonomous Decision',
        displayAction: log.action.replace(/_/g, ' '),
        icon: Bot,
      };
    }

    // 2. User Actions
    if (
      isUserActor ||
      actionUpper.includes('APPROVAL') ||
      actionUpper.includes('PUBLISHED') ||
      actionUpper.includes('USER') ||
      actionUpper.includes('ROTATED') ||
      actionUpper.includes('OVERRIDE')
    ) {
      if (actionUpper.includes('APPROVED') || actionUpper.includes('AUTHORIZED')) {
        return {
          category: 'user',
          statusType: 'success',
          categoryLabel: 'User Action',
          statusLabel: 'Executive Signoff',
          displayAction: 'Expenditure Authorized',
          icon: CheckCircle2,
        };
      }
      if (actionUpper.includes('REJECTED') || actionUpper.includes('DECLINED')) {
        return {
          category: 'user',
          statusType: 'security',
          categoryLabel: 'User Action',
          statusLabel: 'Signoff Declined',
          displayAction: 'Execution Rejected',
          icon: XCircle,
        };
      }
      if (actionUpper.includes('ROTATED') || actionUpper.includes('KEY') || actionUpper.includes('TOKEN')) {
        return {
          category: 'user',
          statusType: 'info',
          categoryLabel: 'User Action',
          statusLabel: 'Creds Rotated',
          displayAction: 'Security Token Rotation',
          icon: Key,
        };
      }
      return {
        category: 'user',
        statusType: 'success',
        categoryLabel: 'User Action',
        statusLabel: 'Configuration Update',
        displayAction: log.action.replace(/_/g, ' '),
        icon: User,
      };
    }

    // 3. System & Infra Events
    if (actionUpper.includes('TRAFFIC') || actionUpper.includes('CANARY') || actionUpper.includes('DEPLOYMENT')) {
      return {
        category: 'system',
        statusType: 'info',
        categoryLabel: 'System & Infra',
        statusLabel: 'Canary Shift',
        displayAction: 'Traffic Route Updated',
        icon: Activity,
      };
    }
    if (actionUpper.includes('INDEX') || actionUpper.includes('VECTOR') || actionUpper.includes('KNOWLEDGE')) {
      return {
        category: 'system',
        statusType: 'success',
        categoryLabel: 'System & Infra',
        statusLabel: 'Index Optimized',
        displayAction: 'Vector Corpus Defrag',
        icon: Database,
      };
    }
    if (actionUpper.includes('SCALE') || actionUpper.includes('WORKER') || actionUpper.includes('AUTOSCALE')) {
      return {
        category: 'system',
        statusType: 'info',
        categoryLabel: 'System & Infra',
        statusLabel: 'Cluster Scaled',
        displayAction: 'Worker Pool Rebalance',
        icon: Cpu,
      };
    }

    return {
      category: 'system',
      statusType: 'info',
      categoryLabel: 'System & Infra',
      statusLabel: 'Nominal Health',
      displayAction: log.action.replace(/_/g, ' '),
      icon: Radio,
    };
  };

  // Filtered entries
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const classification = classifyEvent(log);
      const matchesCategory = activeCategory === 'all' || classification.category === activeCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.action?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.userEmail?.toLowerCase().includes(q) ||
        log.userId?.toLowerCase().includes(q) ||
        log.ipAddress?.includes(q) ||
        classification.statusLabel.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, activeCategory, searchQuery]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts = { all: auditLogs.length, agent: 0, user: 0, system: 0 };
    for (const log of auditLogs) {
      const c = classifyEvent(log).category;
      counts[c]++;
    }
    return counts;
  }, [auditLogs]);

  // Trigger live event simulation
  const handleSimulate = async (type: 'agent' | 'user' | 'system') => {
    setSimulating(true);
    try {
      await api.post('/api/v1/audit-events/simulate', { eventType: type });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Simulation failed:', e);
    } finally {
      setSimulating(false);
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const displayedList = maxDisplay ? filteredLogs.slice(0, maxDisplay) : filteredLogs;

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[#0E121C]/60 backdrop-blur-md flex flex-col shadow-sm overflow-hidden ${className}`}
    >
      {/* Header with Live Status & Controls */}
      <div className="p-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white tracking-tight">Live Activity Feed</h2>
            {isLiveActive ? (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-500">Paused</span>
            )}
          </div>
          <span className="text-white/20" aria-hidden="true">·</span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">{auditLogs.length} events logged</span>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Simulate Action Dropdown / Quick Button */}
          <div className="relative group">
            <button
              disabled={simulating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-medium transition disabled:opacity-50"
              title="Inject a real-time event into the live stream"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Simulate</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#0F131D]/95 backdrop-blur-md border border-white/[0.1] rounded-lg shadow-xl p-1 z-30 hidden group-hover:block text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Simulate Live Event
              </div>
              <button
                onClick={() => handleSimulate('agent')}
                className="w-full text-left px-2.5 py-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 transition"
              >
                <Bot className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Agent Decision</span>
              </button>
              <button
                onClick={() => handleSimulate('user')}
                className="w-full text-left px-2.5 py-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 transition"
              >
                <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>User Signoff</span>
              </button>
              <button
                onClick={() => handleSimulate('system')}
                className="w-full text-left px-2.5 py-1.5 rounded text-slate-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2 transition"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>System Ingress</span>
              </button>
            </div>
          </div>

          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/[0.08] transition"
              title="Refresh ledger feed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Hub Deep-link */}
          <button
            onClick={() => onNavigate('governance')}
            className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1 font-medium pl-1"
          >
            <span>Audit Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar Strip */}
      <div className="px-4 py-2.5 bg-white/[0.015] border-b border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Category Pills (Subtle zero-pill discipline) */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition ${
              activeCategory === 'all'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            All Events <span className="font-mono text-[11px] text-slate-500 ml-1">({categoryCounts.all})</span>
          </button>

          <button
            onClick={() => setActiveCategory('agent')}
            className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeCategory === 'agent'
                ? 'bg-white/[0.1] text-blue-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Bot className="w-3 h-3 text-blue-400" />
            <span>Agent Decisions</span>
            <span className="font-mono text-[11px] text-slate-500">({categoryCounts.agent})</span>
          </button>

          <button
            onClick={() => setActiveCategory('user')}
            className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeCategory === 'user'
                ? 'bg-white/[0.1] text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <User className="w-3 h-3 text-emerald-400" />
            <span>User Actions</span>
            <span className="font-mono text-[11px] text-slate-500">({categoryCounts.user})</span>
          </button>

          <button
            onClick={() => setActiveCategory('system')}
            className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 ${
              activeCategory === 'system'
                ? 'bg-white/[0.1] text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>System & Infra</span>
            <span className="font-mono text-[11px] text-slate-500">({categoryCounts.system})</span>
          </button>
        </div>

        {/* Quick Query Filter */}
        <div className="relative w-full md:w-56 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter live activity..."
            className="w-full pl-8 pr-3 py-1 bg-white/[0.03] border border-white/[0.06] rounded-md text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-white/[0.2] transition"
          />
        </div>
      </div>

      {/* Activity Stream Entries */}
      <div className="divide-y divide-white/[0.04] overflow-y-auto max-h-[380px]">
        {displayedList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <Radio className="w-5 h-5 text-slate-600 mx-auto" />
            <div className="text-slate-400 font-medium">No activity matching criteria</div>
            <p className="text-[11px]">Clear search or select another category filter</p>
          </div>
        ) : (
          displayedList.map((log) => {
            const cl = classifyEvent(log);
            const Icon = cl.icon;
            const isExpanded = expandedId === log.id;

            // Subtle Status Indicator Style
            let statusPipColor = 'bg-slate-400';
            let statusTextColor = 'text-slate-400';
            let iconBg = 'bg-slate-800/40 text-slate-300 border-white/[0.06]';

            if (cl.statusType === 'reasoning') {
              statusPipColor = 'bg-blue-400';
              statusTextColor = 'text-blue-400';
              iconBg = 'bg-blue-950/40 text-blue-400 border-blue-500/20';
            } else if (cl.statusType === 'success') {
              statusPipColor = 'bg-emerald-400';
              statusTextColor = 'text-emerald-400';
              iconBg = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20';
            } else if (cl.statusType === 'warning') {
              statusPipColor = 'bg-amber-400';
              statusTextColor = 'text-amber-400';
              iconBg = 'bg-amber-950/40 text-amber-400 border-amber-500/20';
            } else if (cl.statusType === 'security') {
              statusPipColor = 'bg-rose-400';
              statusTextColor = 'text-rose-400';
              iconBg = 'bg-rose-950/40 text-rose-400 border-rose-500/20';
            } else if (cl.statusType === 'info') {
              statusPipColor = 'bg-cyan-400';
              statusTextColor = 'text-cyan-400';
              iconBg = 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20';
            }

            return (
              <div
                key={log.id}
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                className={`p-3.5 hover:bg-white/[0.02] transition cursor-pointer select-none group ${
                  isExpanded ? 'bg-white/[0.03]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Icon & Core Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Top Action Title & Subtle Status Indicator */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
                          {cl.displayAction}
                        </span>

                        {/* Subtle Status Indicator */}
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusPipColor}`} />
                          <span className={statusTextColor}>{cl.statusLabel}</span>
                        </div>

                        <span className="text-white/20 text-xs hidden sm:inline" aria-hidden="true">
                          ·
                        </span>

                        {/* Actor Identity */}
                        <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {log.userEmail || log.userId}
                        </span>
                      </div>

                      {/* Detail preview text */}
                      <p className={`text-xs text-slate-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-1'}`}>
                        {log.details}
                      </p>
                    </div>
                  </div>

                  {/* Right: Timestamp & Expand Caret */}
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <span
                      title={new Date(log.timestamp).toLocaleString()}
                      className="text-[11px] font-mono text-slate-500 tabular-nums"
                    >
                      {formatRelativeTime(log.timestamp)}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition transform ${
                        isExpanded ? 'rotate-90 text-slate-300' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Inspection Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs space-y-2.5 animate-in fade-in duration-100">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded bg-black/30 border border-white/[0.04]">
                        <span className="text-slate-500 block text-[10px] uppercase">Resource Type</span>
                        <span className="text-slate-300 font-medium capitalize">{log.resourceType}</span>
                      </div>

                      <div className="p-2 rounded bg-black/30 border border-white/[0.04]">
                        <span className="text-slate-500 block text-[10px] uppercase">Resource ID</span>
                        <div className="flex items-center justify-between text-slate-300 truncate">
                          <span className="truncate">{log.resourceId}</span>
                          <button
                            onClick={(e) => handleCopyId(log.resourceId, e)}
                            className="text-slate-500 hover:text-slate-300 ml-1 shrink-0"
                            title="Copy Resource ID"
                          >
                            {copiedId === log.resourceId ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="p-2 rounded bg-black/30 border border-white/[0.04]">
                        <span className="text-slate-500 block text-[10px] uppercase">Origin IP</span>
                        <span className="text-slate-300 tabular-nums">{log.ipAddress || 'Internal Mesh'}</span>
                      </div>

                      <div className="p-2 rounded bg-black/30 border border-white/[0.04]">
                        <span className="text-slate-500 block text-[10px] uppercase">Exact UTC</span>
                        <span className="text-slate-300 tabular-nums">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Navigation Context Action */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500 font-mono">Ledger ID: {log.id}</span>

                      <div className="flex items-center gap-2">
                        {log.resourceType === 'agent' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('agent_studio');
                            }}
                            className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-blue-300 text-[11px] font-medium transition flex items-center gap-1"
                          >
                            <span>Open in Studio</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}

                        {log.resourceType === 'workflow' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('workflow_builder');
                            }}
                            className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-emerald-300 text-[11px] font-medium transition flex items-center gap-1"
                          >
                            <span>Open in Builder</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}

                        {log.resourceType === 'approval' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('governance');
                            }}
                            className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 text-[11px] font-medium transition flex items-center gap-1"
                          >
                            <span>Open Signoff Gate</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="p-2.5 px-4 bg-[#0A0D14]/80 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          <span>Multi-tenant immutable SHA-256 state ledger</span>
        </div>
        <span>Click entry to inspect provenance metadata</span>
      </div>
    </div>
  );
};
