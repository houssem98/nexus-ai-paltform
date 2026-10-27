import React, { useState, useEffect } from 'react';
import { Search, X, Bot, GitBranch, BookOpen, Rocket, ShieldCheck, ArrowRight, Cpu, Database, ShieldAlert } from 'lucide-react';
import { NavTab } from './Sidebar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  agents: any[];
  workflows: any[];
  onSelectAgent?: (id: string) => void;
  onSelectWorkflow?: (id: string) => void;
  onOpenVerifier?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  agents,
  workflows,
  onSelectAgent,
  onSelectWorkflow,
  onOpenVerifier,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNav = [
    { label: 'Executive Command Center', tab: 'command_center' as NavTab, icon: Rocket },
    { label: 'Fine-Tuning Studio (PEFT & DPO)', tab: 'model_customization' as NavTab, icon: Cpu },
    { label: 'Data Engine & RLHF Foundry', tab: 'data_foundry' as NavTab, icon: Database },
    { label: 'SEAL Red-Teaming & Safety', tab: 'red_teaming' as NavTab, icon: ShieldAlert },
    { label: 'Agent Studio', tab: 'agent_studio' as NavTab, icon: Bot },
    { label: 'Workflow Builder', tab: 'workflow_builder' as NavTab, icon: GitBranch },
    { label: 'Knowledge Base', tab: 'knowledge' as NavTab, icon: BookOpen },
    { label: 'Governance & Audit', tab: 'governance' as NavTab, icon: ShieldCheck },
  ];

  const filteredNav = quickNav.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  const filteredAgents = agents.filter(
    (a) => a.name.toLowerCase().includes(query.toLowerCase()) || a.department.toLowerCase().includes(query.toLowerCase())
  );
  const filteredWorkflows = workflows.filter(
    (w) => w.name.toLowerCase().includes(query.toLowerCase()) || w.department.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#0F131D]/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="p-4 border-b border-white/[0.08] flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input aria-label="Type a command, agent, or workflow"
            autoFocus
            type="text"
            placeholder="Type a command, agent, or workflow..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          <button aria-label="Close command palette" onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-4">
          {/* Diagnostic Action */}
          {onOpenVerifier && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                System Diagnostics
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenVerifier();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition group border border-emerald-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">Verify Platform (simulated self-test)</span>
                </div>
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  DEMO
                </span>
              </button>
            </div>
          )}

          {/* Quick Navigation */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Navigation
            </div>
            {filteredNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tab}
                  onClick={() => {
                    onNavigate(item.tab);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-blue-400" />
                    <span>{item.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition" />
                </button>
              );
            })}
          </div>

          {/* Agents */}
          {filteredAgents.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Configured Agents
              </div>
              {filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    if (onSelectAgent) onSelectAgent(agent.id);
                    onNavigate('agent_studio');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition group text-left"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Bot className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate">{agent.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-slate-300">{agent.department}</span>
                </button>
              ))}
            </div>
          )}

          {/* Workflows */}
          {filteredWorkflows.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Workflows
              </div>
              {filteredWorkflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => {
                    if (onSelectWorkflow) onSelectWorkflow(wf.id);
                    onNavigate('workflow_builder');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition group text-left"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate">{wf.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-slate-300">{wf.department}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 px-4 bg-[#0A0D14] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with ↵ or click</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
