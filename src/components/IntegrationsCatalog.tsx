import React, { useState } from 'react';
import { Blocks, CheckCircle2, RefreshCw, Shield, Plus, Trash2, Globe, Key, Lock, ArrowUpDown } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface IntegrationsCatalogProps {
  integrations: any[];
  onRefreshIntegrations: () => void;
}

export const IntegrationsCatalog: React.FC<IntegrationsCatalogProps> = ({
  integrations,
  onRefreshIntegrations,
}) => {
  const toast = useToast();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // New Connector modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'api' | 'communication' | 'crm' | 'database' | 'finance' | 'security' | 'mcp'>('api');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [authType, setAuthType] = useState<'bearer' | 'api_key' | 'oauth2' | 'none'>('bearer');
  const [permissionsRequired, setPermissionsRequired] = useState('network.egress, read, write');

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.post<any>(`/api/v1/integrations/${id}/test`);
      setTestResults((prev) => ({ ...prev, [id]: res }));
      toast.success('Connection Verified', `Responded with HTTP ${res.statusCode} (${res.latencyMs}ms)`);
      onRefreshIntegrations();
    } catch (e: any) {
      setTestResults((prev) => ({ ...prev, [id]: { success: false, error: e?.message } }));
      toast.error('Connection Test Failed', e?.message || 'Gateway unreachable');
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncConnector = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await api.post<any>(`/api/v1/integrations/${id}/sync`);
      toast.success('Connector Synced', `Cached schemas and credentials in ${res.latencyMs}ms.`);
      onRefreshIntegrations();
    } catch (e: any) {
      toast.error('Sync Failed', e?.message || 'Sync error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleCreateConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !baseUrl) return;
    try {
      await api.post('/api/v1/integrations', {
        name,
        category,
        description,
        baseUrl,
        authType,
        permissionsRequired: permissionsRequired.split(',').map((p) => p.trim()),
      });
      setShowAddModal(false);
      setName('');
      setDescription('');
      setBaseUrl('');
      toast.success('Connector Registered', `Created adapter "${name}".`);
      onRefreshIntegrations();
    } catch (err: any) {
      toast.error('Registration Failed', err?.message || 'Could not register connector');
    }
  };

  const handleDeleteConnector = async (id: string) => {
    try {
      await api.delete(`/api/v1/integrations/${id}`);
      toast.info('Connector Removed', 'Deleted adapter from tool registry.');
      onRefreshIntegrations();
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || 'Failed to remove connector');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Tools & Connectors Catalog</h1>
          <p className="text-xs text-slate-400 mt-1">
            Least-privilege enterprise adapters with server-side credential isolation and SSRF blocklists.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Connector</span>
        </button>
      </div>

      {/* Security Banner (Understated) */}
      <div className="p-4 rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] text-xs flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-slate-300">
            <strong className="text-white">Zero-Trust Egress Guard:</strong> Egress requests block local loopbacks (127.0.0.1, 169.254.169.254). Secrets remain strictly isolated on the backend server.
          </div>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 shrink-0">SSRF Guard Nominal</span>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => {
          const testRes = testResults[item.id];
          const isTesting = testingId === item.id;

          return (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] flex flex-col justify-between space-y-3 shadow-sm hover:border-white/[0.14] transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Blocks className="w-4 h-4 text-slate-300" />
                    <h3 className="text-sm font-semibold text-white truncate">{item.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-emerald-400 font-medium">Connected</span>
                    <button
                      onClick={() => handleDeleteConnector(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Remove connector"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{item.description}</p>

                {item.baseUrl && (
                  <div className="mt-3 text-[11px] font-mono text-slate-400 bg-white/[0.02] p-2 rounded-lg border border-white/[0.05] truncate">
                    Endpoint: {item.baseUrl}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 uppercase">
                    {item.authType || 'BEARER'}
                  </span>
                  {item.permissionsRequired?.map((p: string) => (
                    <span
                      key={p}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  {item.lastTestedAt ? `Verified ${new Date(item.lastTestedAt).toLocaleDateString()}` : 'Ready for test'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSyncConnector(item.id)}
                    disabled={syncingId === item.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-medium transition"
                    title="Synchronize schema definitions and auth tokens"
                  >
                    <ArrowUpDown className={`w-3 h-3 ${syncingId === item.id ? 'animate-spin text-blue-400' : ''}`} />
                    <span>{syncingId === item.id ? 'Syncing...' : 'Sync'}</span>
                  </button>
                  <button
                    onClick={() => handleTestConnection(item.id)}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white text-slate-300 hover:text-slate-950 text-xs font-medium transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Gateway'}</span>
                  </button>
                </div>
              </div>

              {testRes && (
                <div
                  className={`p-2 rounded-lg text-xs font-mono ${
                    testRes.success
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}
                >
                  {testRes.success ? (
                    <span>✓ HTTP {testRes.statusCode} Verified (Latency: {testRes.latencyMs}ms)</span>
                  ) : (
                    <span>✗ Failed: {testRes.error}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Register Connector Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-lg bg-[#0E121C] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">Register Enterprise Connector</h3>
                <p className="text-xs text-slate-400 mt-0.5">Custom REST API or Model Context Protocol (MCP) gateway</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateConnector} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Connector Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Workday HCM Compensation Gateway"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="api" className="bg-slate-900 text-white">REST API</option>
                    <option value="mcp" className="bg-slate-900 text-white">MCP Adapter</option>
                    <option value="database" className="bg-slate-900 text-white">Database / Data Warehouse</option>
                    <option value="finance" className="bg-slate-900 text-white">ERP & Finance</option>
                    <option value="security" className="bg-slate-900 text-white">SecOps & SIEM</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Authentication Scheme</label>
                  <select
                    value={authType}
                    onChange={(e: any) => setAuthType(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                  >
                    <option value="bearer" className="bg-slate-900 text-white">Bearer Token (TLS)</option>
                    <option value="api_key" className="bg-slate-900 text-white">API Key Header</option>
                    <option value="oauth2" className="bg-slate-900 text-white">mTLS / Service Account</option>
                    <option value="none" className="bg-slate-900 text-white">None (Internal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Base Target URL</label>
                <input
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://workday.api.enterprise.internal/v1"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Queries employee grade bands and authorization limits for invoice approvals."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Required Permissions (Comma-Separated)</label>
                <input
                  type="text"
                  value={permissionsRequired}
                  onChange={(e) => setPermissionsRequired(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-slate-300 text-xs font-medium hover:bg-white/[0.04] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-semibold hover:bg-slate-200 transition"
                >
                  Save Connector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
