import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock, Download, Settings, Sliders, Check, RotateCw } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { SimulatedBadge } from './SimulatedBadge';

interface GovernanceSecurityProps {
  approvals: any[];
  auditLogs: any[];
  onApproveExecution: (executionId: string, decision: 'approve' | 'reject') => void;
}

export const GovernanceSecurity: React.FC<GovernanceSecurityProps> = ({
  approvals,
  auditLogs,
  onApproveExecution,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'approvals' | 'audit' | 'rbac' | 'policies'>('approvals');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [settings, setSettings] = useState<any>({
    demoMode: true,
    allowedModels: ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'],
    requireHumanApprovalForDeploy: true,
    dataRetentionDays: 90,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    api.get<any>('/api/v1/settings')
      .then((res) => {
        if (res.settings) setSettings(res.settings);
      })
      .catch(console.error);
  }, []);

  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const filteredAudit =
    auditFilter === 'all' ? auditLogs : auditLogs.filter((l) => l.resourceType === auditFilter);

  const handleExportAudit = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/v1/audit-events/export?format=${format}`);
      const text = await res.text();
      const blob = new Blob([text], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-audit-ledger.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit Log Exported', `Downloaded audit events as .${format.toUpperCase()}`);
    } catch (e: any) {
      toast.error('Export Failed', e?.message || 'Error exporting audit logs');
    }
  };

  // Demo only: the server returns a fixed sample result and checks nothing.
  const handleRunComplianceScan = async () => {
    setIsScanning(true);
    try {
      const res = await api.post<any>('/api/v1/governance/compliance-scan', {});
      toast.info('Simulated Compliance Scan', `Demo mode: fixed sample result (${res.score}%). Nothing was checked.`);
    } catch (e: any) {
      toast.error('Compliance Scan Error', e?.message || 'Failed to execute audit scan');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const res = await api.patch<any>('/api/v1/settings', settings);
      if (res.settings) setSettings(res.settings);
      setSettingsSaved(true);
      toast.success('Settings Saved', 'Stored. Nothing enforces these settings yet.');
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (e: any) {
      toast.error('Policy Update Failed', e?.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const rbacRoles = [
    {
      role: 'Organization Administrator (org_admin)',
      desc: 'Superuser access. Can manage billing, enforce model allowlists, rotate secrets, and override policy gates.',
      permissions: ['Manage Workspaces', 'Production Deploy', 'Override Gate', 'Audit Retention'],
    },
    {
      role: 'Workspace Administrator (workspace_admin)',
      desc: 'Controls workspace pipelines, manages document access, reviews high-value financial & operational approvals.',
      permissions: ['CFO Signoff', 'Publish Workflows', 'Ingest Knowledge', 'View Traces'],
    },
    {
      role: 'Platform Builder (builder)',
      desc: 'Builds agents, designs graph workflows, writes prompts, and configures tool integrations.',
      permissions: ['Create Agents', 'Design Graphs', 'Test Sandboxes', 'Run Evaluations'],
    },
    {
      role: 'SecOps Operator (operator)',
      desc: 'Monitors runtime execution traces, handles security incident alerts, and triggers scheduled jobs.',
      permissions: ['Execute Workflows', 'View Traces', 'SecOps Actions'],
    },
    {
      role: 'Evaluator (evaluator)',
      desc: 'Curates benchmark datasets, runs regression test suites, and audits model outputs for hallucinations.',
      permissions: ['Manage Datasets', 'Run Evaluations', 'Export Reports'],
    },
    {
      role: 'Viewer (viewer)',
      desc: 'Auditor and read-only user.',
      permissions: ['Read-only View', 'Inspect Traces'],
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Governance, RBAC & Audit</h1>
          <p className="text-xs text-slate-400 mt-1">
            Tenant policy gates, human signoff queues, role-based access matrix, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunComplianceScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition disabled:opacity-50"
            title="Demo mode only: returns a fixed sample result; nothing is checked"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : 'text-emerald-400'}`} />
            <span>{isScanning ? 'Scanning...' : 'Run Compliance Scan'}</span>
            <SimulatedBadge label="Demo" />
          </button>

          {/* Tab Buttons */}
          <div className="flex items-center gap-1 bg-[#0E121C] p-1 rounded-lg border border-white/[0.08] text-xs">
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                activeTab === 'approvals' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Approvals Queue</span>
              {pendingApprovals.length > 0 && (
                <span className="font-mono text-[11px] font-bold text-amber-400">
                  ({pendingApprovals.length})
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                activeTab === 'audit' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Audit Log Stream
            </button>
            <button
              onClick={() => setActiveTab('rbac')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                activeTab === 'rbac' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              RBAC Matrix
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`px-3 py-1 rounded-md transition font-medium ${
                activeTab === 'policies' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Security Policies
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'approvals' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Human-in-the-Loop Signoff Decisions ({approvals.length})
            </h2>
            <span className="text-xs text-slate-400">Autonomous flows pause until an authorized reviewer signs off</span>
          </div>

          <div className="space-y-3">
            {approvals.map((appr) => {
              const isPending = appr.status === 'pending';
              return (
                <div
                  key={appr.id}
                  className={`p-5 rounded-xl border transition backdrop-blur-md shadow-sm ${
                    isPending
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-[#0E121C]/60 border-white/[0.08]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{appr.workflowName}</h3>
                      <div className="text-xs text-slate-400 mt-0.5">Node: {appr.nodeLabel}</div>
                    </div>

                    <span
                      className={`text-xs font-mono font-medium ${
                        isPending
                          ? 'text-amber-400'
                          : appr.status === 'approved'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {appr.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Payload Details */}
                  <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.06] font-mono text-xs text-slate-300 space-y-1 mb-3">
                    <div>
                      Invoice ID: <span className="text-white font-semibold">{appr.payload?.invoiceId ?? '—'}</span>
                    </div>
                    <div>
                      Vendor: <span className="text-white">{appr.payload?.vendor ?? '—'}</span>
                    </div>
                    <div>
                      Amount:{' '}
                      <span className="text-white font-bold tabular-nums">
                        {appr.payload?.amount != null ? `$${Number(appr.payload.amount).toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] pt-1 border-t border-white/[0.06]">
                      Policy: {appr.payload?.reason ?? '—'}
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApproveExecution(appr.executionId, 'reject')}
                        className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-rose-500/10 text-rose-300 text-xs font-medium transition"
                      >
                        Decline & Abort
                      </button>
                      <button
                        onClick={() => onApproveExecution(appr.executionId, 'approve')}
                        className="px-3.5 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition"
                      >
                        Authorize & Commit Ledger
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-white">Audit Log ({filteredAudit.length})</h2>
              <p className="text-xs text-slate-400">Stored as editable JSON, with no tamper evidence yet</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportAudit('csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white text-slate-300 hover:text-slate-950 text-xs font-medium border border-white/[0.08] transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleExportAudit('json')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white text-slate-300 hover:text-slate-950 text-xs font-medium border border-white/[0.08] transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['all', 'agent', 'workflow', 'execution', 'knowledge', 'integration', 'deployment', 'approval'].map((f) => (
              <button
                key={f}
                onClick={() => setAuditFilter(f)}
                className={`px-2.5 py-1 rounded-md capitalize transition font-medium ${
                  auditFilter === f ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white bg-white/[0.02]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-2.5 font-medium">Timestamp</th>
                  <th className="pb-2.5 font-medium">Action</th>
                  <th className="pb-2.5 font-medium">Resource</th>
                  <th className="pb-2.5 font-medium">Details</th>
                  <th className="pb-2.5 font-medium">Actor</th>
                  <th className="pb-2.5 font-medium text-right">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {filteredAudit.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 text-slate-400 font-mono text-[11px] tabular-nums whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 font-mono text-slate-200 font-medium">
                      {log.action} {log.simulated && <SimulatedBadge label="Simulated" />}
                    </td>
                    <td className="py-3 capitalize text-slate-400">{log.resourceType}</td>
                    <td className="py-3 text-slate-300 max-w-xs truncate">{log.details}</td>
                    <td className="py-3 text-slate-400">{log.userEmail.split('@')[0]}</td>
                    <td className="py-3 text-right font-mono text-slate-400 tabular-nums">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Role-Based Access Control (RBAC) Specification</h2>
            <span className="text-xs text-slate-400">Defined roles, not enforced yet</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rbacRoles.map((r, i) => (
              <div key={i} className="p-5 rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{r.role}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.06]">
                  {r.permissions.map((p, j) => (
                    <span
                      key={j}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.03] text-slate-300 border border-white/[0.06]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] p-6 shadow-sm space-y-6">
          <div className="pb-3 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-white">Enterprise Governance & Security Controls</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Phase 9 roadmap compliance parameters: model allowlists, audit retention, and deployment signoff requirements.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5 max-w-xl">
            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1">
                Model Allowlist (Approved Enterprise Engines)
              </label>
              <div className="space-y-2 text-xs">
                {['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'].map((m) => {
                  const isChecked = settings.allowedModels?.includes(m);
                  return (
                    <label key={m} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSettings({ ...settings, allowedModels: [...(settings.allowedModels || []), m] });
                          } else {
                            setSettings({
                              ...settings,
                              allowedModels: settings.allowedModels.filter((item: string) => item !== m),
                            });
                          }
                        }}
                        className="rounded border-white/20 bg-white/5 text-blue-500"
                      />
                      <span className="font-mono">{m}</span>
                      {m === 'gemini-4-argon' && (
                        <span className="text-[11px] text-blue-400 font-mono font-medium">(High Thinking Default)</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1">
                Audit Log Retention Window (Days)
              </label>
              <input aria-label="Audit Log Retention Window (Days)"
                type="number"
                min={30}
                max={365}
                value={settings.dataRetentionDays || 90}
                onChange={(e) => setSettings({ ...settings, dataRetentionDays: Number(e.target.value) })}
                className="w-48 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20 font-mono"
              />
              <span className="text-[11px] text-slate-400 block mt-1">Stored setting; nothing deletes old records yet</span>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireHumanApprovalForDeploy}
                  onChange={(e) => setSettings({ ...settings, requireHumanApprovalForDeploy: e.target.checked })}
                  className="rounded border-white/20 bg-white/5 text-blue-500"
                />
                <span className="font-medium">Require Org Admin approval before publishing production ingress endpoints</span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-semibold hover:bg-slate-200 transition shadow-sm"
              >
                {savingSettings ? 'Saving...' : 'Apply Security Policies'}
              </button>
              {settingsSaved && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <Check className="w-3.5 h-3.5" />
                  <span>Settings Saved</span>
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
