import React, { useState } from 'react';
import {
  Key,
  Play,
  Terminal,
  Loader2,
  Plus,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface DeploymentCenterProps {
  deployments: any[];
  workflows?: any[];
  onRefreshDeployments?: () => void;
}

export const DeploymentCenter: React.FC<DeploymentCenterProps> = ({
  deployments,
  workflows = [],
  onRefreshDeployments,
}) => {
  const toast = useToast();
  const [selectedDepId, setSelectedDepId] = useState<string>(deployments[0]?.id || '');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Modal to deploy new workflow
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deployWorkflowId, setDeployWorkflowId] = useState<string>(workflows[0]?.id || '');
  const [deployName, setDeployName] = useState('');
  const [deployEnv, setDeployEnv] = useState<'production' | 'staging' | 'sandbox'>('production');
  const [deployRateLimit, setDeployRateLimit] = useState(120);
  const [isDeploying, setIsDeploying] = useState(false);

  // Live API Tester
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        invoiceId: 'INV-LIVE-API-009',
        vendor: 'Nexus Sovereign Cloud Systems',
        amount: 14200.0,
        poNumber: 'PO-99120',
      },
      null,
      2
    )
  );
  const [isCalling, setIsCalling] = useState(false);
  const [callResponse, setCallResponse] = useState<any>(null);

  const selectedDep = deployments.find((d) => d.id === selectedDepId) || deployments[0];

  const curlCommand = selectedDep
    ? `curl -X POST "${window.location.origin}${selectedDep.endpointUrl}" \\
  -H "Authorization: Bearer ${selectedDep.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${testPayload.replace(/\n\s*/g, '')}'`
    : '';

  const handleCopyKey = () => {
    if (!selectedDep) return;
    navigator.clipboard.writeText(selectedDep.apiKey);
    setCopiedKey(true);
    toast.success('API Key Copied', 'Copied mTLS Bearer token to clipboard.');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    toast.success('cURL Copied', 'Ready to paste into terminal.');
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleExecuteLiveApi = async () => {
    if (!selectedDep) return;
    setIsCalling(true);
    setCallResponse(null);
    toast.info('Invoking Endpoint', `Sending payload to ${selectedDep.name}...`);

    let parsed = {};
    try {
      parsed = JSON.parse(testPayload);
    } catch {
      parsed = { test: true };
    }

    try {
      const res = await fetch(selectedDep.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${selectedDep.apiKey}`,
        },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      setCallResponse({ status: res.status, data });
      if (res.ok) {
        toast.success('Live API Succeeded', `HTTP ${res.status} returned in ${data.durationMs || 140}ms.`);
      } else {
        toast.warning('Invocation Responded with Error', `HTTP ${res.status}`);
      }
      if (onRefreshDeployments) onRefreshDeployments();
    } catch (e: any) {
      setCallResponse({ status: 500, error: e?.message });
      toast.error('Invocation Failed', e?.message || 'Failed to reach endpoint');
    } finally {
      setIsCalling(false);
    }
  };

  const handleCreateDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    try {
      const targetWf = workflows.find((w) => w.id === deployWorkflowId) || workflows[0];
      const res = await api.post<any>('/api/v1/deployments', {
        workflowId: targetWf?.id,
        name: deployName || `${targetWf?.name || 'Pipeline'} Ingress`,
        environment: deployEnv,
        rateLimitPerMinute: deployRateLimit,
      });
      setShowCreateModal(false);
      setDeployName('');
      toast.success('Endpoint Published', `Deployed to ${deployEnv} with token bucket rate limit.`);
      if (res.deployment) {
        setSelectedDepId(res.deployment.id);
      }
      if (onRefreshDeployments) onRefreshDeployments();
    } catch (err: any) {
      toast.error('Deployment Failed', err?.message || 'Could not publish endpoint');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'suspended' | 'rolled_back') => {
    try {
      await api.patch(`/api/v1/deployments/${id}/status`, { status });
      toast.info('Status Updated', `Deployment is now marked as ${status}.`);
      if (onRefreshDeployments) onRefreshDeployments();
    } catch (err: any) {
      toast.error('Status Update Failed', err?.message || 'Error updating deployment status');
    }
  };

  const handleDeleteDeployment = async (id: string) => {
    try {
      await api.delete(`/api/v1/deployments/${id}`);
      toast.info('Endpoint Decommissioned', 'Revoked API keys and removed ingress webhook.');
      if (onRefreshDeployments) onRefreshDeployments();
    } catch (err: any) {
      toast.error('Decommission Failed', err?.message || 'Error decommissioning endpoint');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Deployment & Ingress Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Deploy immutable workflow versions into authenticated REST webhooks with API key authorization.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Publish Ingress Endpoint</span>
        </button>
      </div>

      {/* Deployments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deployments.map((dep) => {
          const isSelected = dep.id === selectedDep?.id;
          const isActive = dep.status === 'active';
          const isSuspended = dep.status === 'suspended';

          return (
            <div
              key={dep.id}
              onClick={() => setSelectedDepId(dep.id)}
              className={`p-5 rounded-xl border cursor-pointer transition shadow-sm backdrop-blur-md flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#0E121C]/90 border-white/20'
                  : 'bg-[#0E121C]/60 border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-emerald-400 uppercase">
                      {dep.environment}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : isSuspended
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}
                    >
                      {dep.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">v{dep.workflowVersion}</span>
                </div>

                <h3 className="text-sm font-semibold text-white mb-1">{dep.name}</h3>
                <p className="text-xs text-slate-400 mb-3">{dep.workflowName}</p>

                <div className="space-y-1 text-xs text-slate-400 pt-3 border-t border-white/[0.06] font-mono">
                  <div className="flex items-center justify-between">
                    <span>Invocations:</span>
                    <span className="text-white tabular-nums">{dep.invocationsTotal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rate Limit:</span>
                    <span className="text-white tabular-nums">{dep.rateLimitPerMinute} req/min</span>
                  </div>
                </div>
              </div>

              {/* Deployment Lifecycle Controls */}
              <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {isActive ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(dep.id, 'suspended');
                      }}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 text-[11px] transition"
                      title="Suspend traffic to endpoint"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(dep.id, 'active');
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] transition"
                      title="Resume traffic"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateStatus(dep.id, 'rolled_back');
                    }}
                    className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 text-[11px] transition"
                    title="Roll back to previous version"
                  >
                    Rollback
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDeployment(dep.id);
                  }}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Decommission endpoint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive API Tester & cURL Snippet */}
      {selectedDep && (
        <div className="p-5 rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.06] gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Live Ingress Gateway</h2>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                  {selectedDep.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{selectedDep.endpointUrl}</p>
            </div>

            <button
              onClick={handleCopyKey}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white text-slate-200 hover:text-slate-950 text-xs font-medium transition"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{copiedKey ? 'Copied Key' : 'Copy API Key'}</span>
            </button>
          </div>

          {/* cURL Display */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>cURL Command</span>
              </span>
              <button onClick={handleCopyCurl} className="text-slate-400 hover:text-white transition">
                {copiedCurl ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-black/40 border border-white/[0.06] font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {curlCommand}
            </pre>
          </div>

          {/* Live Ingress Tester */}
          <div className="space-y-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Live API Execution Sandbox</span>
              <span className="text-slate-500 font-mono text-[11px]">HTTP POST /api/v1/deployments/:id/execute</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-mono">Payload JSON (Body):</label>
                <textarea
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  rows={6}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={handleExecuteLiveApi}
                  disabled={isCalling}
                  className="mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isCalling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching REST Call...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Execute Authenticated API Call</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-mono">Response Output:</label>
                <div className="h-44 bg-black/40 border border-white/[0.08] rounded-lg p-3 font-mono text-xs text-slate-300 overflow-y-auto whitespace-pre-wrap">
                  {callResponse ? (
                    JSON.stringify(callResponse, null, 2)
                  ) : (
                    <span className="text-slate-600">Click &ldquo;Execute Authenticated API Call&rdquo; to test endpoint.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Deployment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div
            className="w-full max-w-lg bg-[#0E121C] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Publish Workflow to Ingress Gateway
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Creates an immutable authenticated REST webhook for the selected workflow.
              </p>
            </div>

            <form onSubmit={handleCreateDeployment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Select Pipeline / Workflow</label>
                <select
                  value={deployWorkflowId}
                  onChange={(e) => setDeployWorkflowId(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                >
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                      {w.name} (v{w.activeVersion} - {w.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Deployment Name</label>
                <input
                  type="text"
                  value={deployName}
                  onChange={(e) => setDeployName(e.target.value)}
                  placeholder="e.g. SOC Incident Response Production Gateway"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Environment</label>
                  <select
                    value={deployEnv}
                    onChange={(e: any) => setDeployEnv(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="production" className="bg-slate-900 text-white">Production</option>
                    <option value="staging" className="bg-slate-900 text-white">Staging</option>
                    <option value="sandbox" className="bg-slate-900 text-white">Sandbox</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Rate Limit (req/min)</label>
                  <input
                    type="number"
                    value={deployRateLimit}
                    onChange={(e) => setDeployRateLimit(Number(e.target.value))}
                    min={10}
                    max={1000}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-400 space-y-1 font-mono">
                <div>Authentication: <span className="text-white">Bearer API Token (Auto-Generated)</span></div>
                <div>SSRF Guard: <span className="text-emerald-400">Strict Host Whitelist</span></div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-slate-300 text-xs font-medium hover:bg-white/[0.04] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeploying}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-semibold hover:bg-slate-200 transition disabled:opacity-50"
                >
                  {isDeploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Publish Ingress</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
