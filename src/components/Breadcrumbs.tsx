import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Layers, Bot, GitBranch, Home } from 'lucide-react';
import { NavTab } from './Sidebar';

export interface BreadcrumbEntity {
  id: string;
  name: string;
}

interface BreadcrumbsProps {
  currentOrg: any;
  currentWorkspace: any;
  availableWorkspaces: any[];
  onSwitchWorkspace: (wsId: string) => void;
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  activeEntityName?: string;
  availableEntities?: BreadcrumbEntity[];
  onSelectEntity?: (id: string) => void;
}

const TAB_LABELS: Record<NavTab, { label: string; icon?: React.ElementType }> = {
  command_center: { label: 'Command Center', icon: Home },
  model_customization: { label: 'Fine-Tuning Studio' },
  workflow_builder: { label: 'Workflow Builder', icon: GitBranch },
  agent_studio: { label: 'Agent Studio', icon: Bot },
  workflow_library: { label: 'Pipeline Blueprints' },
  data_foundry: { label: 'Data Engine & RLHF' },
  knowledge: { label: 'Knowledge & Context' },
  integrations: { label: 'Tools & Connectors' },
  evaluations: { label: 'Evaluation Lab' },
  red_teaming: { label: 'SEAL Red-Teaming' },
  observability: { label: 'Execution Traces' },
  deployments: { label: 'Deployment Ingress' },
  governance: { label: 'Governance & Audit' },
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  currentOrg,
  currentWorkspace,
  availableWorkspaces,
  onSwitchWorkspace,
  currentTab,
  onNavigate,
  activeEntityName,
  availableEntities,
  onSelectEntity,
}) => {
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);

  const wsRef = useRef<HTMLDivElement>(null);
  const entityRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false);
      }
      if (entityRef.current && !entityRef.current.contains(e.target as Node)) {
        setEntityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const tabInfo = TAB_LABELS[currentTab] || { label: 'Dashboard' };

  return (
    <nav aria-label="Global Breadcrumbs" className="flex items-center gap-1.5 text-xs select-none">
      {/* 1. Organization (Root Level) */}
      <button
        onClick={() => onNavigate('command_center')}
        title="Go to Organization Command Center"
        className="text-slate-400 hover:text-white transition font-medium flex items-center gap-1.5 focus:outline-none"
      >
        <span className="truncate max-w-[140px] sm:max-w-[180px] font-semibold text-slate-200 hover:text-white">
          {currentOrg?.name || 'Nexus Global'}
        </span>
      </button>

      <span className="text-white/20 px-0.5" aria-hidden="true">/</span>

      {/* 2. Workspace Selector with Interactive Dropdown */}
      <div className="relative" ref={wsRef}>
        <button
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          className="flex items-center gap-1 text-slate-300 hover:text-white font-medium transition py-0.5 px-1 rounded hover:bg-white/[0.04] focus:outline-none"
          title="Switch active workspace"
        >
          <Layers className="w-3 h-3 text-blue-400/80" />
          <span className="truncate max-w-[120px] sm:max-w-[160px]">{currentWorkspace?.name || 'Operations'}</span>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </button>

        {wsDropdownOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-60 bg-[#0F131D]/95 backdrop-blur-md border border-white/[0.1] rounded-lg shadow-xl p-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Switch Workspace
            </div>
            {availableWorkspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  onSwitchWorkspace(w.id);
                  setWsDropdownOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between transition ${
                  w.id === currentWorkspace?.id
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span className="truncate">{w.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{w.department}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="text-white/20 px-0.5" aria-hidden="true">/</span>

      {/* 3. Section / Active Tab */}
      <button
        onClick={() => onNavigate(currentTab)}
        className={`font-medium transition py-0.5 px-1 rounded hover:bg-white/[0.04] focus:outline-none ${
          !activeEntityName ? 'text-white' : 'text-slate-300 hover:text-white'
        }`}
      >
        <span className="truncate">{tabInfo.label}</span>
      </button>

      {/* 4. Optional Leaf Entity (e.g. Active Workflow or Agent) */}
      {activeEntityName && (
        <>
          <span className="text-white/20 px-0.5" aria-hidden="true">/</span>

          {availableEntities && availableEntities.length > 0 && onSelectEntity ? (
            <div className="relative" ref={entityRef}>
              <button
                onClick={() => setEntityDropdownOpen(!entityDropdownOpen)}
                className="flex items-center gap-1 text-white font-medium py-0.5 px-1 rounded hover:bg-white/[0.04] transition focus:outline-none"
              >
                <span className="truncate max-w-[140px] sm:max-w-[220px]">{activeEntityName}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {entityDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#0F131D]/95 backdrop-blur-md border border-white/[0.1] rounded-lg shadow-xl p-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Switch Active Pipeline / Item
                  </div>
                  {availableEntities.map((ent) => (
                    <button
                      key={ent.id}
                      onClick={() => {
                        onSelectEntity(ent.id);
                        setEntityDropdownOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.04] transition truncate block"
                    >
                      {ent.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="text-white font-medium truncate max-w-[140px] sm:max-w-[220px]">
              {activeEntityName}
            </span>
          )}
        </>
      )}
    </nav>
  );
};
