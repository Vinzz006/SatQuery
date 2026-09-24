import React from 'react';
import { AnalyzeResponse } from '../types';
import { api } from '../services/api';
import { Sparkles, Download, FileText, CheckCircle, ShieldAlert, Activity, BarChart2 } from 'lucide-react';

interface Props {
  analysis: AnalyzeResponse;
}

export const GroundedAnswerCard: React.FC<Props> = ({ analysis }) => {
  const confValue = analysis.confidence ? Math.round(analysis.confidence * 100) : 0;

  // Determine badge color based on calibrated confidence
  const confColor = confValue >= 85
    ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
    : confValue >= 70
    ? 'text-cyan-400 bg-cyan-950 border-cyan-800'
    : 'text-amber-400 bg-amber-950 border-amber-800';

  return (
    <div className="glass-panel-glow rounded-xl p-5 border border-cyan-500/30 flex flex-col gap-4">
      
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono uppercase tracking-wider text-slate-100 font-semibold">
            Grounded Mission Assessment
          </h2>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-cyan-950 text-cyan-300 border border-cyan-800">
            {analysis.task.replace('_', ' ')}
          </span>
        </div>

        {/* Confidence chip */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Calibrated Confidence:</span>
          <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border flex items-center gap-1.5 ${confColor}`}>
            <Activity className="w-3.5 h-3.5" />
            <span>{confValue > 0 ? `${confValue}%` : 'Not Available'}</span>
          </div>
        </div>
      </div>

      {/* Grounded Natural Language Answer */}
      <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 text-slate-100 font-sans leading-relaxed text-sm">
        <p className="font-medium text-cyan-50 mb-1">
          {analysis.answer}
        </p>
        <p className="text-[11px] text-slate-400 font-mono mt-2">
          Confidence Derivation: {analysis.confidence_label}
        </p>
      </div>

      {/* Physical & Remote-Sensing Statistics */}
      {analysis.statistics && Object.keys(analysis.statistics).length > 0 && (
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 mb-2 font-semibold">
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXTRACTED SCENE TELEMETRY</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {Object.entries(analysis.statistics).map(([key, val]) => {
              if (typeof val === 'object' || Array.isArray(val)) return null;
              return (
                <div key={key} className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase truncate">{key.replace('_', ' ')}</div>
                  <div className="text-cyan-300 font-bold mt-0.5 truncate">{String(val)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer: Models Used & Report Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2 font-mono text-slate-400">
          <span>Specialist Pipeline:</span>
          <div className="flex flex-wrap gap-1">
            {analysis.models.map((m, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-indigo-900/50 text-[11px]">
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={api.getPdfReportUrl(analysis.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold font-mono text-xs transition-all shadow-sm shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF Report
          </a>

          <a
            href={api.getGeoJsonReportUrl(analysis.id)}
            download={`SatQuery_Vectors_${analysis.id}.geojson`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900/80 text-emerald-300 font-mono text-xs border border-emerald-700/60 transition-all shadow-sm shadow-emerald-900/20"
            title="Download WGS84 GeoJSON Polygon Vectors for QGIS / ArcGIS"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export GeoJSON
          </a>

          <a
            href={api.getJsonReportUrl(analysis.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            JSON Trace
          </a>
        </div>
      </div>

    </div>
  );
};
