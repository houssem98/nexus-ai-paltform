import React from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Breadcrumbs, BreadcrumbEntity } from './Breadcrumbs';
import { NavTab } from './Sidebar';
import { SimulatedBadge } from './SimulatedBadge';

interface HeaderProps {
  currentOrg: any;
  currentWorkspace: any;
  currentUser: any;
  availableWorkspaces: any[];
  availableUsers: any[];
  onSwitchWorkspace: (wsId: string) => void;
  onSwitchUser: (userId: string) => void;
  onOpenCommandPalette: () => void;
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  activeEntityName?: string;
  availableEntities?: BreadcrumbEntity[];
  onSelectEntity?: (id: string) => void;
  onOpenRoadmap?: () => void;
  onOpenVerifier?: () => void;
  demoMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentOrg,
  currentWorkspace,
  currentUser,
  availableWorkspaces,
  availableUsers,
  onSwitchWorkspace,
  onSwitchUser,
  onOpenCommandPalette,
  currentTab,
  onNavigate,
  activeEntityName,
  availableEntities,
  onSelectEntity,
  onOpenRoadmap,
  onOpenVerifier,
  demoMode,
}) => {
  return (
    <header className="h-14 border-b border-white/[0.08] bg-[#0A0D14]/75 backdrop-blur-md px-5 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Brand Monogram & Global Interactive Breadcrumb Trail */}
      <div className="flex items-center gap-3.5 overflow-hidden">
        {/* Minimalist Monogram */}
        <button
          onClick={() => onNavigate('command_center')}
          className="flex items-center gap-2 shrink-0 group focus:outline-none"
          title="Nexus AI Platform"
        >
          <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-slate-100 shadow-inner group-hover:border-white/[0.2] transition-colors">
            <span className="font-bold text-xs tracking-tighter">NX</span>
          </div>
        </button>

        <span className="text-white/20 text-xs shrink-0" aria-hidden="true">/</span>

        {/* Global Breadcrumbs component */}
        <div className="overflow-hidden">
          <Breadcrumbs
            currentOrg={currentOrg}
            currentWorkspace={currentWorkspace}
            availableWorkspaces={availableWorkspaces}
            onSwitchWorkspace={onSwitchWorkspace}
            currentTab={currentTab}
            onNavigate={onNavigate}
            activeEntityName={activeEntityName}
            availableEntities={availableEntities}
            onSelectEntity={onSelectEntity}
          />
        </div>

        {demoMode && <SimulatedBadge label="Demo mode · sample data" />}
      </div>

      {/* Center: Clean Command Search Input */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden xl:flex items-center justify-between w-72 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] text-xs text-slate-400 hover:text-slate-300 transition shrink-0 ml-4 mr-4"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400 font-normal truncate">Search agents, workflows, docs...</span>
        </div>
        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[11px] font-mono text-slate-400 border border-white/[0.08] shrink-0">
          ⌘K
        </kbd>
      </button>

      {/* Right: Self-Test Verifier, Roadmap Audit, Engine Indicator & Role Context */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onOpenVerifier && (
          <button
            onClick={onOpenVerifier}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 hover:text-emerald-200 transition"
            title="Open the simulated platform self-test"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium">Verify Platform</span>
          </button>
        )}

        {onOpenRoadmap && (
          <button
            onClick={onOpenRoadmap}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 hover:text-white transition"
            title="Inspect 10-Phase Roadmap & Prototype Acceptance Criteria"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="font-medium">Roadmap</span>
          </button>
        )}

        {/* Quiet Reasoning Badge (Unboxed Text with Separator) */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="text-slate-300 font-medium">Gemini 4 Argon</span>
          <span className="text-white/20" aria-hidden="true">·</span>
          <span className="text-blue-400 font-medium">High Thinking</span>
        </div>

        <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

        {/* User Role Switcher */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-semibold text-blue-300">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>

          <div className="relative">
            <select aria-label="Switch user"
              value={currentUser?.id || ''}
              onChange={(e) => onSwitchUser(e.target.value)}
              title="Sign out and sign in as another user of this organization"
              className="bg-white/[0.04] text-slate-300 hover:text-white text-xs rounded-lg px-2.5 py-1 border border-white/[0.08] hover:border-white/[0.16] focus:outline-none cursor-pointer pr-6 appearance-none"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id} className="bg-[#0F131D] text-slate-200">
                  {u.name.split(' ')[0]} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-2 top-2" />
          </div>
        </div>
      </div>
    </header>
  );
};
