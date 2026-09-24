import React, { useState } from 'react';
import { ExecutionTraceStep } from '../types';
import { CheckCircle2, Clock, ChevronDown, ChevronUp, Terminal, ShieldCheck } from 'lucide-react';

interface Props {
  trace: ExecutionTraceStep[];
  totalTimeMs?: number;
}

export const ExecutionTraceViewer: React.FC<Props> = ({ trace, totalTimeMs }) => {
  const [expanded, setExpanded] = useState<boolean>(true);

  if (!trace || trace.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-cyan-900/30">
      {/* Header */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="px-5 py-3.5 bg-slate-900/80 flex items-center justify-between cursor-pointer hover:bg-slate-900 transition-colors border-b border-slate-800/80"
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100 tracking-wide uppercase font-mono">
            Observable Execution Trace
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
            {trace.length} Verifiable Milestones
          </span>
        </div>

        <div className="flex items-center gap-3">
          {totalTimeMs !== undefined && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{totalTimeMs.toFixed(1)} ms</span>
            </div>
          )}
          <button className="text-slate-400 hover:text-slate-200">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Stepper */}
      {expanded && (
        <div className="p-5 space-y-4 font-mono text-xs">
          {trace.map((step, idx) => {
            return (
              <div key={idx} className="relative flex items-start gap-3 group">
                {/* Vertical connector line */}
                {idx < trace.length - 1 && (
                  <div className="absolute left-3.5 top-6 bottom-0 w-0.5 bg-slate-800 group-hover:bg-cyan-900/50 transition-colors" />
                )}

                {/* Step indicator circle */}
                <div className="w-7 h-7 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0 z-10 text-cyan-300 font-bold">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <span>{step.step}</span>
                  )}
                </div>

                {/* Step details */}
                <div className="flex-1 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 hover:border-cyan-900/40 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      {step.name}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{step.timestamp}</span>
                      {step.duration_ms > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                          +{step.duration_ms.toFixed(1)}ms
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-300 text-xs font-sans leading-relaxed">
                    {step.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
