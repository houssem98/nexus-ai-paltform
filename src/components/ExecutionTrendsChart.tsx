import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Activity,
  Zap,
  DollarSign,
  Clock,
  Filter,
  TrendingUp,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import { SimulatedBadge } from './SimulatedBadge';

export type TrendMetric = 'volume' | 'tokens' | 'cost' | 'latency';
export type TimeRange = 7 | 14 | 30;

export interface DailyTrendPoint {
  date: string;
  displayDate: string;
  executions: number;
  completed: number;
  failed: number;
  tokens: number;
  costUsd: number;
  // null when the day has no execution with a recorded duration
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
}

export interface TrendsSummary {
  totalExecutions: number;
  totalCompleted: number;
  totalFailed: number;
  successRate: number | null;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number | null;
  peakDay: {
    date: string;
    displayDate: string;
    executions: number;
  };
}

interface ExecutionTrendsChartProps {
  agents: any[];
  executions?: any[];
}

export const ExecutionTrendsChart: React.FC<ExecutionTrendsChartProps> = ({ agents }) => {
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>('volume');
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [dataPoints, setDataPoints] = useState<DailyTrendPoint[]>([]);
  const [summary, setSummary] = useState<TrendsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [simulated, setSimulated] = useState<boolean>(false);

  // Fetch trend analytics from API; on failure show no numbers rather than invented ones.
  const fetchTrends = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const res = await api.getAnalyticsTrends(timeRange, selectedAgentId);
      if (res && res.points) {
        setDataPoints(res.points);
        setSummary(res.summary);
        setSimulated(!!res.simulated);
      }
    } catch {
      setDataPoints([]);
      setSummary(null);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [timeRange, selectedAgentId]);

  // Metric configuration tokens and color palettes
  const metricConfig = useMemo(() => {
    switch (selectedMetric) {
      case 'volume':
        return {
          title: 'Daily Executions',
          subtitle: 'Multi-agent workflow invocations and completions',
          dataKey: 'executions',
          strokeColor: '#3B82F6',
          gradientId: 'colorVolume',
          gradientColor: '#3B82F6',
          unitLabel: 'runs',
          formatValue: (val: number) => val.toLocaleString(),
          summaryLabel: 'Period Invocations',
          summaryValue: summary ? summary.totalExecutions.toLocaleString() : '—',
          secondaryLabel: 'Success Rate',
          secondaryValue: summary?.successRate != null ? `${summary.successRate}%` : '—',
        };
      case 'tokens':
        return {
          title: 'Token Consumption',
          subtitle: 'Combined prompt reasoning and generation tokens',
          dataKey: 'tokens',
          strokeColor: '#8B5CF6',
          gradientId: 'colorTokens',
          gradientColor: '#8B5CF6',
          unitLabel: 'tokens',
          formatValue: (val: number) => {
            if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
            if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
            return val.toString();
          },
          summaryLabel: 'Total Tokens Consumed',
          summaryValue: summary ? `${(summary.totalTokens / 1000000).toFixed(2)}M` : '—',
          secondaryLabel: 'Avg / Execution',
          secondaryValue:
            summary && summary.totalExecutions > 0
              ? `${Math.round(summary.totalTokens / summary.totalExecutions).toLocaleString()} tok`
              : '—',
        };
      case 'cost':
        return {
          title: 'Inference Cost ($ USD)',
          subtitle: 'Gemini reasoning compute and token billing',
          dataKey: 'costUsd',
          strokeColor: '#10B981',
          gradientId: 'colorCost',
          gradientColor: '#10B981',
          unitLabel: 'USD',
          formatValue: (val: number) => `$${val.toFixed(4)}`,
          summaryLabel: 'Net Period Spend',
          summaryValue: summary ? `$${summary.totalCostUsd.toFixed(4)}` : '—',
          secondaryLabel: 'Daily Avg Spend',
          secondaryValue:
            summary && dataPoints.length > 0
              ? `$${(summary.totalCostUsd / dataPoints.length).toFixed(4)}`
              : '—',
        };
      case 'latency':
        return {
          title: 'Execution Latency (ms)',
          subtitle: 'Average round-trip response and reasoning latency',
          dataKey: 'avgLatencyMs',
          strokeColor: '#F59E0B',
          gradientId: 'colorLatency',
          gradientColor: '#F59E0B',
          unitLabel: 'ms',
          formatValue: (val: number) => `${Math.round(val)}ms`,
          summaryLabel: 'Average Response Time',
          summaryValue: summary?.avgLatencyMs != null ? `${summary.avgLatencyMs}ms` : '—',
          secondaryLabel: 'Peak Day',
          secondaryValue: summary?.peakDay.displayDate || 'N/A',
        };
    }
  }, [selectedMetric, summary, dataPoints.length]);

  // Selected agent display name
  const currentAgentName = useMemo(() => {
    if (selectedAgentId === 'all') return 'All Agents (Fleet Aggregate)';
    const found = agents.find((a) => a.id === selectedAgentId);
    return found ? found.name : 'Selected Agent';
  }, [selectedAgentId, agents]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0E121C]/60 backdrop-blur-md p-6 shadow-sm space-y-6">
      {/* Top Header & Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white tracking-tight">Agent Execution & Resource Trends</h2>
            <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
              {timeRange}D Window
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>{currentAgentName}</span>
            <span aria-hidden="true">·</span>
            {simulated ? (
              <>
                <SimulatedBadge />
                <span>Generated volume blended with stored runs</span>
              </>
            ) : (
              <span>Computed from stored executions</span>
            )}
          </div>
        </div>

        {/* Filter Controls (Metric Tabs + Time Range + Agent Selector) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Agent filter: executions record no agent, so per-agent numbers exist only in the demo blend */}
          {simulated && (
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              aria-label="Filter trends by agent"
              className="pl-8 pr-7 py-1.5 bg-[#0A0D14] border border-white/[0.08] rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:border-blue-500/60 appearance-none cursor-pointer"
            >
              <option value="all">Fleet Aggregate (All Agents)</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
              ▼
            </div>
          </div>
          )}

          {/* Time Range Preset Toggles */}
          <div className="flex items-center bg-[#0A0D14] border border-white/[0.08] rounded-lg p-0.5">
            {([7, 14, 30] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  timeRange === range
                    ? 'bg-white/[0.12] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}D
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button aria-label="Refresh time-series metrics"
            onClick={() => fetchTrends(true)}
            disabled={isRefreshing}
            title="Refresh time-series metrics"
            className="p-1.5 rounded-lg border border-white/[0.08] bg-[#0A0D14] hover:bg-white/[0.04] text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Tabs (Volume, Tokens, Cost, Latency) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-white/[0.06] pb-4">
        <button
          onClick={() => setSelectedMetric('volume')}
          className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
            selectedMetric === 'volume'
              ? 'bg-blue-950/20 border-blue-500/40 text-white'
              : 'bg-white/[0.02] border-white/[0.05] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Volume</span>
            </div>
            <div className="text-base font-semibold font-mono tabular-nums text-white mt-1">
              {summary ? summary.totalExecutions.toLocaleString() : '—'}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">runs</span>
        </button>

        <button
          onClick={() => setSelectedMetric('tokens')}
          className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
            selectedMetric === 'tokens'
              ? 'bg-purple-950/20 border-purple-500/40 text-white'
              : 'bg-white/[0.02] border-white/[0.05] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>Tokens</span>
            </div>
            <div className="text-base font-semibold font-mono tabular-nums text-white mt-1">
              {summary ? `${(summary.totalTokens / 1000000).toFixed(2)}M` : '—'}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">total</span>
        </button>

        <button
          onClick={() => setSelectedMetric('cost')}
          className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
            selectedMetric === 'cost'
              ? 'bg-emerald-950/20 border-emerald-500/40 text-white'
              : 'bg-white/[0.02] border-white/[0.05] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cost</span>
            </div>
            <div className="text-base font-semibold font-mono tabular-nums text-white mt-1">
              {summary ? `$${summary.totalCostUsd.toFixed(3)}` : '—'}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">USD</span>
        </button>

        <button
          onClick={() => setSelectedMetric('latency')}
          className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
            selectedMetric === 'latency'
              ? 'bg-amber-950/20 border-amber-500/40 text-white'
              : 'bg-white/[0.02] border-white/[0.05] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Latency</span>
            </div>
            <div className="text-base font-semibold font-mono tabular-nums text-white mt-1">
              {summary?.avgLatencyMs != null ? `${summary.avgLatencyMs}ms` : '—'}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">avg</span>
        </button>
      </div>

      {/* Primary Recharts Visualization Area */}
      <div className="relative pt-1">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-mono">
            Loading 30-day time-series telemetry...
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={metricConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricConfig.gradientColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={metricConfig.gradientColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                  interval={timeRange === 30 ? 4 : timeRange === 14 ? 2 : 0}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                  tickFormatter={metricConfig.formatValue}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DailyTrendPoint;
                      return (
                        <div className="rounded-lg border border-white/[0.12] bg-[#090D16]/95 backdrop-blur-md p-3 shadow-2xl text-xs space-y-2 min-w-[200px]">
                          <div className="font-semibold text-white border-b border-white/[0.08] pb-1 flex items-center justify-between">
                            <span>{data.displayDate}</span>
                            <span className="text-[11px] font-mono text-slate-400">{data.date}</span>
                          </div>
                          <div className="space-y-1.5 text-slate-300">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Total Executions:</span>
                              <span className="font-mono font-medium text-white tabular-nums">
                                {data.executions} runs
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Completed / Failed:</span>
                              <span className="font-mono tabular-nums text-emerald-400">
                                {data.completed}{' '}
                                <span className="text-slate-400">/</span>{' '}
                                <span className={data.failed > 0 ? 'text-rose-400' : 'text-slate-400'}>
                                  {data.failed}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Tokens:</span>
                              <span className="font-mono text-purple-300 tabular-nums">
                                {data.tokens.toLocaleString()} tok
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Inference Cost:</span>
                              <span className="font-mono text-emerald-300 tabular-nums">
                                ${data.costUsd.toFixed(4)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/[0.06] pt-1">
                              <span className="text-slate-400">Avg / P95 Latency:</span>
                              <span className="font-mono text-amber-300 tabular-nums">
                                {data.avgLatencyMs != null ? `${data.avgLatencyMs}ms / ${data.p95LatencyMs}ms` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={metricConfig.dataKey}
                  stroke={metricConfig.strokeColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#${metricConfig.gradientId})`}
                  activeDot={{
                    r: 5,
                    fill: metricConfig.strokeColor,
                    stroke: '#080B11',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sub-Metric Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-white/[0.06] text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">{metricConfig.summaryLabel}</span>
          <span className="font-mono font-semibold text-slate-200 text-sm tabular-nums">
            {metricConfig.summaryValue}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">{metricConfig.secondaryLabel}</span>
          <span className="font-mono font-semibold text-slate-200 text-sm tabular-nums">
            {metricConfig.secondaryValue}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Peak Load Day</span>
          <span className="font-mono font-semibold text-slate-200 text-sm tabular-nums">
            {summary?.peakDay ? `${summary.peakDay.displayDate} (${summary.peakDay.executions} runs)` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
