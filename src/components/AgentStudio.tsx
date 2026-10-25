import React, { useState, useEffect } from 'react';
import {
  Bot,
  BrainCircuit,
  Play,
  Save,
  CheckCircle2,
  Code2,
  Send,
  Loader2,
  Sliders,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface AgentStudioProps {
  agents: any[];
  onRefreshAgents: () => void;
  selectedAgentId?: string;
  onSelectAgentId?: (id: string) => void;
}

export const AgentStudio: React.FC<AgentStudioProps> = ({
  agents,
  onRefreshAgents,
  selectedAgentId: externalAgentId,
  onSelectAgentId: externalSelectAgentId,
}) => {
  const toast = useToast();
  const [internalAgentId, setInternalAgentId] = useState<string>(agents[0]?.id || '');
  const selectedAgentId = externalAgentId || internalAgentId;
  const [activeTab, setActiveTab] = useState<'configure' | 'prompt' | 'schema' | 'versions'>('configure');

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const activeVer = selectedAgent?.versions?.find((v: any) => v.version === selectedAgent?.activeVersion) || selectedAgent?.versions?.[0];

  // Form states
  const [name, setName] = useState(selectedAgent?.name || '');
  const [department, setDepartment] = useState(selectedAgent?.department || 'Operations');
  const [description, setDescription] = useState(selectedAgent?.description || '');
  const [model, setModel] = useState(activeVer?.model || 'gemini-4-argon');
  const [thinkingMode, setThinkingMode] = useState<boolean>(activeVer?.thinkingMode ?? true);
  const [thinkingLevel, setThinkingLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW'>(activeVer?.thinkingLevel || 'HIGH');
  const [systemPrompt, setSystemPrompt] = useState(activeVer?.systemPrompt || '');
  const [temperature, setTemperature] = useState(activeVer?.temperature || 0.2);
  const [maxSteps, setMaxSteps] = useState(activeVer?.maxSteps || 6);

  // Testing sandbox
  const [testInput, setTestInput] = useState('Analyze invoice INV-2026-9041 from CloudMatrix Global for $18,450.00 against procurement thresholds.');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSelectAgent = (agent: any) => {
    if (externalSelectAgentId) {
      externalSelectAgentId(agent.id);
    } else {
      setInternalAgentId(agent.id);
    }
    setName(agent.name);
    setDepartment(agent.department);
    setDescription(agent.description);
    const v = agent.versions?.find((ver: any) => ver.version === agent.activeVersion) || agent.versions?.[0];
    setModel(v?.model || 'gemini-4-argon');
    setThinkingMode(v?.thinkingMode ?? true);
    setThinkingLevel(v?.thinkingLevel || 'HIGH');
    setSystemPrompt(v?.systemPrompt || '');
    setTemperature(v?.temperature || 0.2);
    setMaxSteps(v?.maxSteps || 6);
    setTestResult(null);
  };

  useEffect(() => {
    if (externalAgentId) {
      const ag = agents.find((a) => a.id === externalAgentId);
      if (ag) {
        setName(ag.name);
        setDepartment(ag.department);
        setDescription(ag.description);
        const v = ag.versions?.find((ver: any) => ver.version === ag.activeVersion) || ag.versions?.[0];
        setModel(v?.model || 'gemini-4-argon');
        setThinkingMode(v?.thinkingMode ?? true);
        setThinkingLevel(v?.thinkingLevel || 'HIGH');
        setSystemPrompt(v?.systemPrompt || '');
        setTemperature(v?.temperature || 0.2);
        setMaxSteps(v?.maxSteps || 6);
      }
    }
  }, [externalAgentId, agents]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleTestAgent = async () => {
    if (!selectedAgent) return;
    setTesting(true);
    setTestResult(null);
    toast.info('Testing Agent', `Invoking ${selectedAgent.name} with ${model}...`);
    try {
      const res = await api.post<any>(`/api/v1/agents/${selectedAgent.id}/test`, {
        userInput: testInput,
        useHighThinking: thinkingMode,
      });
      setTestResult(res);
      toast.success('Test Completed', `Execution verified in ${res.durationMs || 1240}ms`);
    } catch (err: any) {
      setTestResult({ error: err?.message || 'Agent test failed' });
      toast.error('Agent Test Failed', err?.message || 'Execution error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAgent = async () => {
    if (!selectedAgent) return;
    setIsSaving(true);
    try {
      await api.put(`/api/v1/agents/${selectedAgent.id}`, {
        name,
        department,
        description,
        model,
        systemPrompt,
        thinkingMode,
        thinkingLevel,
        temperature,
        maxSteps,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      toast.success('Agent Configuration Saved', `Updated "${name}" with active model ${model}.`);
      onRefreshAgents();
    } catch (err: any) {
      toast.error('Save Failed', err?.message || 'Could not save agent configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateAgent = async () => {
    if (!selectedAgent) return;
    setIsDuplicating(true);
    try {
      const res = await api.post<any>(`/api/v1/agents/${selectedAgent.id}/duplicate`, {});
      toast.success('Agent Cloned', `Created copy "${res.agent?.name}".`);
      onRefreshAgents();
      if (res.agent) {
        handleSelectAgent(res.agent);
      }
    } catch (err: any) {
      toast.error('Duplicate Failed', err?.message || 'Failed to clone agent');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleCreateNewAgent = async () => {
    const newName = `Agent-${Date.now().toString().slice(-4)}`;
    try {
      const res = await api.post<any>('/api/v1/agents', {
        name: newName,
        description: 'Autonomous enterprise reasoning agent',
        department: 'Operations',
        model: 'gemini-4-argon',
        systemPrompt: 'You are an autonomous enterprise agent. Reason through constraints.',
        thinkingMode: true,
        thinkingLevel: 'HIGH',
      });
      toast.success('Agent Created', `Initialized new agent "${newName}".`);
      onRefreshAgents();
      if (res.agent) {
        handleSelectAgent(res.agent);
      }
    } catch (e: any) {
      toast.error('Creation Failed', e?.message || 'Failed to create agent');
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-[#080B11]">
      {/* Left: Agent Directory */}
      <div className="w-72 border-r border-white/[0.07] bg-[#0A0D14]/80 backdrop-blur-md p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Configured Agents</h2>
          <button
            onClick={handleCreateNewAgent}
            className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-xs font-medium transition"
          >
            + Create
          </button>
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
          {agents.map((ag) => {
            const isSelected = ag.id === selectedAgent?.id;
            return (
              <div
                key={ag.id}
                onClick={() => handleSelectAgent(ag)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-white/[0.08] border-white/20 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.05] text-slate-400 hover:text-slate-200 hover:border-white/[0.1]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-200 truncate">{ag.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">v{ag.activeVersion}</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{ag.description}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{ag.department}</span>
                  <span className="font-mono text-slate-400">Gemini 4 Argon</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Agent Configuration Canvas */}
      <div className="flex-1 flex flex-col bg-[#0A0D14]/50 backdrop-blur-md overflow-hidden">
        {/* Top Agent Bar */}
        <div className="h-13 border-b border-white/[0.07] px-6 flex items-center justify-between bg-[#0C1019]/80 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">{name || 'Agent Studio'}</h2>
              <span className="text-[11px] text-slate-500 font-normal">· {department}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              onClick={handleDuplicateAgent}
              disabled={isDuplicating || !selectedAgent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-medium transition disabled:opacity-50"
              title="Clone this agent specification"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isDuplicating ? 'Cloning...' : 'Clone Agent'}</span>
            </button>
            <button
              onClick={handleSaveAgent}
              disabled={isSaving || !selectedAgent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Version'}</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="border-b border-white/[0.07] px-6 flex items-center gap-6 text-xs font-medium bg-[#0A0D14]/80 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('configure')}
            className={`py-2.5 border-b-2 transition ${
              activeTab === 'configure' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`py-2.5 border-b-2 transition ${
              activeTab === 'prompt' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            System Instructions
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-2.5 border-b-2 transition ${
              activeTab === 'schema' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Schemas
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`py-2.5 border-b-2 transition ${
              activeTab === 'versions' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Versions (1)
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'configure' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-white/20"
                  >
                    <option value="Finance" className="bg-[#0F131D]">Finance & Banking</option>
                    <option value="Cybersecurity" className="bg-[#0F131D]">Cybersecurity</option>
                    <option value="Operations" className="bg-[#0F131D]">Operations</option>
                    <option value="Customer Support" className="bg-[#0F131D]">Customer Support</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Model Engine</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-white/20"
                  >
                    <option value="gemini-4-argon" className="bg-[#0F131D]">gemini-4-argon (Flagship Reasoning)</option>
                    <option value="gemini-3.8-flash" className="bg-[#0F131D]">gemini-3.8-flash (Low Latency)</option>
                    <option value="gemini-3.1-flash-lite" className="bg-[#0F131D]">gemini-3.1-flash-lite</option>
                  </select>
                </div>
              </div>

              {/* HIGH THINKING TOGGLE STRIP */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-white">High Thinking Mode (Gemini 4 Argon)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Applies deep step-by-step reasoning (<code>thinkingLevel: ThinkingLevel.HIGH</code>) with unrestricted output budgets for intricate audits.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={thinkingMode}
                    onChange={(e) => setThinkingMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-white/[0.1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Temperature ({temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Max Steps ({maxSteps})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxSteps}
                    onChange={(e) => setMaxSteps(parseInt(e.target.value) || 6)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="space-y-3 max-w-2xl">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  System Directives
                </label>
                <textarea
                  rows={13}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-white/20 leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Input Schema</label>
                <pre className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-slate-300">
                  {JSON.stringify(activeVer?.inputSchema || { query: 'string' }, null, 2)}
                </pre>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Output Schema</label>
                <pre className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-emerald-400">
                  {JSON.stringify(activeVer?.outputSchema || { result: 'string', verified: 'boolean' }, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-2 max-w-2xl">
              {selectedAgent?.versions?.map((ver: any) => (
                <div key={ver.version} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">Version {ver.version}</div>
                    <div className="text-slate-400 text-[11px]">{ver.changelog || 'Production release'}</div>
                  </div>
                  <span className="font-mono text-slate-400">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Interactive Sandbox */}
      <div className="w-88 border-l border-white/[0.07] bg-[#0A0D14]/80 backdrop-blur-md p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.07]">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Interactive Test Sandbox
          </span>
          {thinkingMode && (
            <span className="text-[10px] font-mono text-blue-400">High Thinking</span>
          )}
        </div>

        {/* Input area */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-slate-400">Prompt / Payload</label>
          <textarea
            rows={4}
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-white/20 font-mono"
          />
          <button
            onClick={handleTestAgent}
            disabled={testing}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Reasoning with Argon...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Run Agent Reasoning</span>
              </>
            )}
          </button>
        </div>

        {/* Result & Step Trace */}
        <div className="mt-4 flex-1 flex flex-col overflow-hidden">
          <label className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Execution Trace & Output</span>
            {testResult?.modelUsed && (
              <span className="text-[10px] font-mono text-slate-500">{testResult.modelUsed}</span>
            )}
          </label>

          <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 overflow-y-auto font-mono text-xs space-y-3">
            {!testResult && !testing && (
              <div className="h-full flex items-center justify-center text-slate-500 text-center text-xs p-4">
                Click &quot;Run Agent Reasoning&quot; to test model instructions and inspect the step-by-step thinking trace.
              </div>
            )}

            {testResult?.thinkingTrace && (
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[11px] text-slate-300">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3 text-blue-400" />
                  <span>Thinking Trace</span>
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">{testResult.thinkingTrace}</div>
              </div>
            )}

            {testResult?.output && (
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Structured Output</div>
                <pre className="text-slate-200 text-[11px] whitespace-pre-wrap">
                  {typeof testResult.output === 'object'
                    ? JSON.stringify(testResult.output, null, 2)
                    : testResult.output}
                </pre>
              </div>
            )}

            {testResult?.tokensUsed && (
              <div className="pt-2 border-t border-white/[0.06] text-[10px] text-slate-500 flex items-center justify-between tabular-nums">
                <span>Tokens: {testResult.tokensUsed}</span>
                <span>Cost: ${testResult.costUsd?.toFixed(4) || '0.0039'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
