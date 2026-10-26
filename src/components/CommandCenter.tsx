import React from 'react';
import {
  Plus,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  Activity,
  Server,
  Zap,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { ActivityFeed } from './ActivityFeed';
import { ExecutionTrendsChart } from './ExecutionTrendsChart';

interface CommandCenterProps {
  agents: any[];
  workflows: any[];
  executions: any[];
  deployments: any[];
  approvals: any[];
  auditLogs: any[];
  onNavigate: (tab: NavTab) => void;
  onApproveExecution: (executionId: string, decision: 'approve' | 'reject') => void;
  onRefreshData?: () => void;
  onOpenRoadmap?: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  agents,
  workflows,
  executions,
  deployments,
  approvals,
  auditLogs,
  onNavigate,
  onApproveExecution,
  onRefreshData,
  onOpenRoadmap,
}) => {
  const completedCount = executions.filter((e) => e.status === 'completed').length;
  const totalExecs = executions.length;
  const successRate = totalExecs > 0 ? `${((completedCount / totalExecs) * 100).toFixed(1)}%` : '—';
  const totalCost = executions.reduce((acc, e) => acc + (e.totalCostUsd || 0), 0);
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Executive Command Center</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Enterprise Multi-Agent Runtime</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenRoadmap && (
            <button
              onClick={onOpenRoadmap}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-200 hover:text-white text-xs font-medium transition shadow-xs"
              title="Inspect World-Class Scale GenAI Roadmap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Scale GenAI Roadmap</span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold px-1 py-0.2 rounded bg-emerald-500/20">6 Tracks</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('model_customization')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition"
          >
            Fine-Tuning Studio
          </button>
          <button
            onClick={() => onNavigate('data_foundry')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition"
          >
            Data Engine
          </button>
          <button
            onClick={() => onNavigate('workflow_builder')}
            className="px-3 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition"
          >
            Design Workflow
          </button>
        </div>
      </div>

      {/* Metric Strip (Linear / Stripe style hairline divided ribbon) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-white/[0.08] bg-[#0E121C]/60 backdrop-blur-md divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] shadow-sm">
        <div className="p-5">
          <div className="text-xs text-slate-400 mb-1.5">Agent Fleet</div>
          <div className="text-2xl font-semibold text-white font-mono tabular-nums">{agents.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Autonomous reasoning units</div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-400 mb-1.5">Active Pipelines</div>
          <div className="text-2xl font-semibold text-white font-mono tabular-nums">{workflows.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">{deployments.length} endpoints published</div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-400 mb-1.5">Success Rate</div>
          <div className="text-2xl font-semibold text-white font-mono tabular-nums">{successRate}</div>
          <div className="text-[11px] text-slate-500 mt-1">Completed runs out of all stored runs</div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-400 mb-1.5">Token Consumption (MTD)</div>
          <div className="text-2xl font-semibold text-white font-mono tabular-nums">${totalCost.toFixed(4)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Gemini 4 Argon inference</div>
        </div>
      </div>

      {/* 30-Day AI Agent Execution & Resource Usage Trends (Recharts) */}
      <ExecutionTrendsChart agents={agents} executions={executions} />

      {/* PENDING APPROVAL GATEWAY (High-Priority Action Strip) */}
      {pendingApprovals.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 backdrop-blur-md p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                Pending Governance Signoff ({pendingApprovals.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Policy §4.2 Mandatory Review</span>
          </div>

          <div className="space-y-2">
            {pendingApprovals.map((appr) => (
              <div
                key={appr.id}
                className="p-4 rounded-lg bg-[#0C1019]/80 backdrop-blur-md border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-medium text-slate-200">{appr.workflowName}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>Vendor: <strong className="text-slate-200">{appr.payload?.vendor || 'Apex Frontier'}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Invoice: <strong className="font-mono text-slate-200">{appr.payload?.invoiceId || 'INV-2026-9042'}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Amount: <strong className="font-mono text-white tabular-nums">${appr.payload?.amount ? Number(appr.payload.amount).toLocaleString() : '84,200.00'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onApproveExecution(appr.executionId, 'reject')}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-rose-500/10 text-rose-300 text-xs font-medium transition"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => onApproveExecution(appr.executionId, 'approve')}
                    className="px-3.5 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition"
                  >
                    Authorize & Commit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row: Executions Table & Ingress Health Gateway */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Executions (2 Cols) */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-[#0E121C]/60 backdrop-blur-md p-5 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Execution Ledger</h2>
              <p className="text-xs text-slate-400">Deterministic multi-agent runs</p>
            </div>
            <button
              onClick={() => onNavigate('observability')}
              className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1 font-medium"
            >
              <span>Full traces</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-2.5 font-medium">Identifier</th>
                  <th className="pb-2.5 font-medium">Pipeline</th>
                  <th className="pb-2.5 font-medium">Trigger</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {executions.slice(0, 5).map((exec) => (
                  <tr key={exec.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-mono text-slate-400 text-[11px]">{exec.id.slice(0, 16)}</td>
                    <td className="py-3 font-medium text-slate-200 truncate max-w-[200px]">{exec.workflowName}</td>
                    <td className="py-3 text-slate-400 capitalize">{exec.trigger}</td>
                    <td className="py-3">
                      {exec.status === 'completed' && (
                        <span className="text-emerald-400 font-medium">Completed</span>
                      )}
                      {exec.status === 'waiting_approval' && (
                        <span className="text-amber-400 font-medium">Awaiting Signoff</span>
                      )}
                      {exec.status === 'running' && (
                        <span className="text-blue-400 font-medium">Running</span>
                      )}
                      {exec.status === 'failed' && (
                        <span className="text-rose-400 font-medium">Failed</span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-slate-400 text-right tabular-nums">
                      {exec.durationMs ? `${(exec.durationMs / 1000).toFixed(2)}s` : '1.24s'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ingress Gateway & Architecture Health (1 Col) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0E121C]/60 backdrop-blur-md p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Runtime Health</h2>
                <p className="text-xs text-slate-400">Cluster & reasoning telemetry</p>
              </div>
            </div>

            <div className="space-y-3 text-xs pt-1">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Primary Reasoning Engine</span>
                  <span className="font-semibold text-slate-200">Gemini 4 Argon</span>
                </div>
                <span className="text-blue-400 font-mono text-[11px]">Thinking: HIGH</span>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Gateway Ingress</span>
                  <span className="font-semibold text-slate-200">{deployments.length} Endpoints</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[11px]">Nexus Cluster v2.4</span>
            <button
              onClick={() => onNavigate('deployments')}
              className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1 font-medium"
            >
              <span>Manage Ingress</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Live Activity Feed Component */}
      <ActivityFeed
        auditLogs={auditLogs}
        onNavigate={onNavigate}
        onRefresh={onRefreshData}
      />
    </div>
  );
};

