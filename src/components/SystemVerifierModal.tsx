import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { SimulatedBadge } from './SimulatedBadge';
import {
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  X,
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  Link2,
  FlaskConical,
  Activity,
  Globe,
  Sliders,
  FileCheck2,
  Terminal,
} from 'lucide-react';

interface TestSuiteResult {
  id: string;
  studio: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'idle';
  latencyMs: number;
  details: string;
}

interface SystemVerifierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemVerifierModal: React.FC<SystemVerifierModalProps> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'passed' | 'failed'>('all');
  const [suites, setSuites] = useState<TestSuiteResult[]>([
    {
      id: 'suite_command_center',
      studio: 'Command Center',
      name: 'Fleet Metrics, Approvals & Time-Range Aggregator',
      status: 'idle',
      latencyMs: 0,
      details: 'Inspects global fleet execution counts, 30-day resource trends, and signoff queues.',
    },
    {
      id: 'suite_agent_studio',
      studio: 'Agent Studio',
      name: 'Agent Runtime Sandbox & Prompt Compilation',
      status: 'idle',
      latencyMs: 0,
      details: 'Tests multi-step autonomous agent compilation with schema validation and tool dispatch.',
    },
    {
      id: 'suite_workflow_builder',
      studio: 'Workflow Builder',
      name: 'Directed Graph DAG Validation & Step Execution',
      status: 'idle',
      latencyMs: 0,
      details: 'Validates node connection topology, topological sort, and end-to-end graph traversal.',
    },
    {
      id: 'suite_knowledge_rag',
      studio: 'Knowledge Center',
      name: 'Hybrid Semantic Corpus, Vector Chunks & Search',
      status: 'idle',
      latencyMs: 0,
      details: 'Tests embedding retrieval and vector partition matching across grounding documents.',
    },
    {
      id: 'suite_integrations',
      studio: 'Integrations Catalog',
      name: 'mTLS Edge Connectors & Zero-Trust Egress Gateways',
      status: 'idle',
      latencyMs: 0,
      details: 'Sends TLS ping handshake and schema synchronization checks to active enterprise connectors.',
    },
    {
      id: 'suite_eval_lab',
      studio: 'Evaluation Lab',
      name: 'Ground-Truth Benchmark Scoring & Rubrics',
      status: 'idle',
      latencyMs: 0,
      details: 'Executes benchmark test suite comparing predicted outputs against ground-truth keywords.',
    },
    {
      id: 'suite_observability',
      studio: 'Observability Explorer',
      name: 'OpenTelemetry Distributed Spans & Latency Tracking',
      status: 'idle',
      latencyMs: 0,
      details: 'Queries span waterfall traces, token consumption histograms, and P95 latency distributions.',
    },
    {
      id: 'suite_deployments',
      studio: 'Deployment Gateway',
      name: 'Authenticated Ingress Webhooks & Rate-Limiter',
      status: 'idle',
      latencyMs: 0,
      details: 'Invokes active deployment endpoint with payload validation and token bucket throttling.',
    },
    {
      id: 'suite_governance',
      studio: 'Governance & Security',
      name: 'Zero-Trust RBAC & Immutable Ledger Compliance',
      status: 'idle',
      latencyMs: 0,
      details: 'Reports on roles, approvals and the audit log.',
    },
    {
      id: 'suite_model_customization',
      studio: 'Model Customization Studio',
      name: 'PEFT / LoRA Hyperparameter Fine-Tuning Pipeline',
      status: 'idle',
      latencyMs: 0,
      details: 'Validates LoRA rank/alpha hyperparameter configurations, loss curves, and gateway deployment.',
    },
    {
      id: 'suite_data_foundry',
      studio: 'Data Foundry & RLHF',
      name: 'Synthetic Self-Instruct & Pairwise Rubric Lab',
      status: 'idle',
      latencyMs: 0,
      details: 'Generates synthetic candidate pairs, verifies 5-star rubric scoring, and validates JSONL export.',
    },
    {
      id: 'suite_seal_red_teaming',
      studio: 'SEAL Red-Teaming & Safety',
      name: 'OWASP LLM Top 10 Adversarial Refusal Sandbox',
      status: 'idle',
      latencyMs: 0,
      details: 'Fires adversarial jailbreak probes against live refusal engine with semantic firewall checks.',
    },
  ]);

  const runAllTests = async () => {
    setIsRunning(true);
    try {
      const res = await api.get<any>('/api/v1/system/self-test');
      if (res && res.suites) {
        setSuites(res.suites);
        toast.info('Simulated Self-Test', `${res.passedCount} of ${res.totalSuites} suites report passed. These are fixed demo answers, not checks.`);
      }
    } catch (err: any) {
      toast.error('Self-Test Runner Error', err?.message || 'Failed to complete test sweep');
    } finally {
      setIsRunning(false);
    }
  };

  // A single suite reads the server's self-test, so it obeys the same demo-mode rule as the full run.
  const runSingleTest = async (suiteId: string) => {
    setSuites((prev) =>
      prev.map((s) => (s.id === suiteId ? { ...s, status: 'running' as const } : s))
    );

    try {
      const res = await api.get<any>('/api/v1/system/self-test');
      const suite: TestSuiteResult | undefined = res.suites.find((s: TestSuiteResult) => s.id === suiteId);
      setSuites((prev) =>
        prev.map((s) =>
          s.id === suiteId ? suite ?? { ...s, status: 'failed' as const, details: 'Not in the self-test response.' } : s
        )
      );
    } catch (err: any) {
      setSuites((prev) =>
        prev.map((s) =>
          s.id === suiteId
            ? { ...s, status: 'failed' as const, details: err?.message || 'Execution error' }
            : s
        )
      );
      toast.error('Test Failed', err?.message || 'Feature verification failed');
    }
  };

  useEffect(() => {
    if (isOpen && suites.every((s) => s.status === 'idle')) {
      runAllTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const passedCount = suites.filter((s) => s.status === 'passed').length;
  const failedCount = suites.filter((s) => s.status === 'failed').length;
  const avgLatency = Math.round(
    suites.filter((s) => s.latencyMs > 0).reduce((acc, s) => acc + s.latencyMs, 0) /
      Math.max(1, suites.filter((s) => s.latencyMs > 0).length)
  );

  const filteredSuites = suites.filter((s) => {
    if (activeTab === 'passed') return s.status === 'passed';
    if (activeTab === 'failed') return s.status === 'failed';
    return true;
  });

  const getStudioIcon = (id: string) => {
    switch (id) {
      case 'suite_command_center':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'suite_agent_studio':
        return <Cpu className="w-4 h-4 text-blue-400" />;
      case 'suite_workflow_builder':
        return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'suite_knowledge_rag':
        return <Database className="w-4 h-4 text-purple-400" />;
      case 'suite_integrations':
        return <Link2 className="w-4 h-4 text-amber-400" />;
      case 'suite_eval_lab':
        return <FlaskConical className="w-4 h-4 text-cyan-400" />;
      case 'suite_observability':
        return <Terminal className="w-4 h-4 text-slate-300" />;
      case 'suite_deployments':
        return <Globe className="w-4 h-4 text-rose-400" />;
      case 'suite_governance':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'suite_model_customization':
        return <Sliders className="w-4 h-4 text-violet-400" />;
      case 'suite_data_foundry':
        return <FileCheck2 className="w-4 h-4 text-teal-400" />;
      case 'suite_seal_red_teaming':
        return <ShieldCheck className="w-4 h-4 text-red-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[#0D111A] border border-white/[0.1] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Platform Feature Verifier
                <SimulatedBadge />
                <span className="text-[11px] font-mono text-slate-400 font-semibold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                  {passedCount}/{suites.length} report passed
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Fixed demo answers, not checks. Real verification is the test suite in the repository.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition disabled:opacity-50"
            >
              {isRunning ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{isRunning ? 'Auditing Platform...' : 'Re-run All Checks'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition"
              aria-label="Close self-test runner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-white/[0.08] bg-[#0A0E17]">
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">Passed Suites</span>
            <p className="text-base font-bold text-emerald-400 font-mono tabular-nums">{passedCount} / {suites.length}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">Failed Suites</span>
            <p className={`text-base font-bold font-mono tabular-nums ${failedCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {failedCount}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">Coverage</span>
            <p className="text-base font-bold text-slate-200 font-mono tabular-nums">
              {Math.round((passedCount / suites.length) * 100)}%
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono">Avg Latency</span>
            <p className="text-base font-bold text-slate-200 font-mono tabular-nums">{avgLatency ? `${avgLatency} ms` : '—'}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-2.5 border-b border-white/[0.08] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                activeTab === 'all'
                  ? 'bg-white/[0.1] text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              All Studios ({suites.length})
            </button>
            <button
              onClick={() => setActiveTab('passed')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                activeTab === 'passed'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              Passed ({passedCount})
            </button>
            {failedCount > 0 && (
              <button
                onClick={() => setActiveTab('failed')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  activeTab === 'failed'
                    ? 'bg-red-500/20 text-red-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                Failed ({failedCount})
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Demo mode only
          </div>
        </div>

        {/* Test Suites List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06] p-2">
          {filteredSuites.map((s) => (
            <div
              key={s.id}
              className="p-3.5 hover:bg-white/[0.02] rounded-lg transition flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5">{getStudioIcon(s.id)}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{s.studio}</span>
                    <span className="text-white/20 text-xs" aria-hidden="true">·</span>
                    <h3 className="text-xs font-semibold text-slate-200 truncate">{s.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{s.details}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {s.latencyMs > 0 && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {s.latencyMs} ms
                  </span>
                )}

                {s.status === 'passed' && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> PASS
                  </span>
                )}

                {s.status === 'failed' && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-red-400 font-medium px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-3 h-3" /> FAIL
                  </span>
                )}

                {s.status === 'running' && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 font-medium px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    <RotateCw className="w-3 h-3 animate-spin" /> RUNNING
                  </span>
                )}

                {s.status === 'idle' && (
                  <span className="text-[11px] font-mono text-slate-500 px-2 py-0.5 rounded bg-white/[0.04]">
                    IDLE
                  </span>
                )}

                <button
                  onClick={() => runSingleTest(s.id)}
                  disabled={s.status === 'running' || isRunning}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white transition disabled:opacity-40"
                  title="Re-run single studio verification"
                >
                  Test
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#0A0E17] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">Enterprise Engine:</span>
            <span>Gemini 4 Argon High-Thinking & Express State Kernel</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
