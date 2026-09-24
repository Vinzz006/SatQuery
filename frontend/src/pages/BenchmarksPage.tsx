import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EvaluationResultItem } from '../types';
import { BarChart3, CheckCircle2, ShieldCheck, Database, Award, ExternalLink } from 'lucide-react';

export const BenchmarksPage: React.FC = () => {
  const [evaluations, setEvaluations] = useState<EvaluationResultItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getEvaluations()
      .then((data) => {
        setEvaluations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load evaluations:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-grid-bg min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-5 rounded-xl border border-cyan-900/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-mono font-bold text-white uppercase tracking-wider">
              Remote-Sensing Benchmark Evaluation Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Verified performance metrics measured across standardized public remote sensing benchmarks (RSVQA, CDVQA, LEVIR-CD, VRSBench).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>VERIFIED EMPIRICAL RESULTS</span>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Benchmark Dataset</th>
                <th className="py-3.5 px-4 font-semibold">Specialist Task</th>
                <th className="py-3.5 px-4 font-semibold">Model Lineage</th>
                <th className="py-3.5 px-4 font-semibold">Metric</th>
                <th className="py-3.5 px-4 font-semibold">Measured Value</th>
                <th className="py-3.5 px-4 font-semibold">Evaluation Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {evaluations.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{item.dataset}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-700">
                      {item.task}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-indigo-300">
                    {item.model}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {item.metric}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      {item.value}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {item.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Benchmark Standards Explanatory Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1.5">
          <div className="font-mono font-bold text-cyan-400 uppercase">RSVQA Protocol</div>
          <p className="text-slate-400 leading-relaxed font-sans">
            Visual Question Answering protocol on Sentinel-2 and high-resolution aerial imagery assessing presence, count, and multi-class land cover classifications.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1.5">
          <div className="font-mono font-bold text-indigo-400 uppercase">CDVQA & LEVIR-CD</div>
          <p className="text-slate-400 leading-relaxed font-sans">
            Change Detection VQA and structural difference protocols evaluating bi-temporal change awareness, building growth, and land reclamation.
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1.5">
          <div className="font-mono font-bold text-emerald-400 uppercase">VRSBench Grounding</div>
          <p className="text-slate-400 leading-relaxed font-sans">
            Text-guided visual grounding benchmark measuring spatial IoU and bounding box accuracy for referred geospatial features.
          </p>
        </div>
      </div>

    </div>
  );
};
