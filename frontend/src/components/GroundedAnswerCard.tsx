import React, { useState, useEffect } from 'react';
import { AnalyzeResponse } from '../types';
import { api } from '../services/api';
import {
  Sparkles,
  Download,
  FileText,
  Activity,
  BarChart2,
  Volume2,
  VolumeX,
  Radio
} from 'lucide-react';

interface Props {
  analysis: AnalyzeResponse;
  onFollowUpQuery?: (query: string) => void;
  onSelectFeature?: (feature: any) => void;
}

export const GroundedAnswerCard: React.FC<Props> = ({ analysis, onFollowUpQuery, onSelectFeature }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const confValue = analysis.confidence ? Math.round(analysis.confidence * 100) : 0;

  // Determine badge color based on calibrated confidence
  const confColor = confValue >= 85
    ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
    : confValue >= 70
    ? 'text-cyan-400 bg-cyan-950 border-cyan-800'
    : 'text-amber-400 bg-amber-950 border-amber-800';

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(analysis.answer);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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

        {/* Confidence chip & Audio Briefing Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleSpeech}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all border ${
              isSpeaking
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/70 animate-pulse shadow-sm shadow-rose-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-800 hover:border-cyan-700'
            }`}
            title={isSpeaking ? 'Stop Audio Briefing' : 'Listen to Mission Assessment via Text-to-Speech'}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audio Briefing</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">Confidence:</span>
            <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border flex items-center gap-1.5 ${confColor}`}>
              <Activity className="w-3.5 h-3.5" />
              <span>{confValue > 0 ? `${confValue}%` : 'Not Available'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grounded Natural Language Answer */}
      <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 text-slate-100 font-sans leading-relaxed text-sm">
        {isSpeaking && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/80 text-xs font-mono text-cyan-400">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span className="tracking-wider uppercase font-semibold">Broadcasting Mission Control Briefing...</span>
          </div>
        )}
        <p className="font-medium text-cyan-50 mb-1">
          {analysis.answer}
        </p>
        <p className="text-[11px] text-slate-400 font-mono mt-2">
          Confidence Derivation: {analysis.confidence_label}
        </p>
      </div>

      {/* Physical & Remote-Sensing Statistics */}
      {analysis.statistics && Object.keys(analysis.statistics).length > 0 && (
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 font-semibold">
            <div className="flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>EXTRACTED SCENE TELEMETRY</span>
            </div>
            {analysis.statistics.total_area_hectares && (
              <span className="text-[11px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                Total Target Footprint: {analysis.statistics.total_area_hectares} ha ({analysis.statistics.total_area_km2} km²)
              </span>
            )}
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

          {/* Detected Vector Polygons Table (Phase 14) */}
          {Array.isArray(analysis.statistics.detected_features) && analysis.statistics.detected_features.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-2 font-semibold flex items-center justify-between">
                <span>Delineated Vector Polygons ({analysis.statistics.detected_features.length} features)</span>
                <span className="text-[10px] text-slate-400 normal-case font-normal">WGS84 EPSG:4326</span>
              </div>
              <div className="overflow-x-auto rounded border border-slate-800">
                <table className="w-full text-[11px] font-mono text-left">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2">Target Feature</th>
                      <th className="p-2">Area (ha)</th>
                      <th className="p-2">Area (km²)</th>
                      <th className="p-2">Perimeter</th>
                      <th className="p-2">Centroid [Lat, Lon]</th>
                      <th className="p-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {analysis.statistics.detected_features.map((feat: any, idx: number) => (
                      <tr
                        key={idx}
                        onClick={() => onSelectFeature?.(feat)}
                        className="hover:bg-cyan-950/40 cursor-pointer transition-colors group"
                        title="Click to zoom and inspect vector polygon on GIS satellite map"
                      >
                        <td className="p-2 font-semibold text-cyan-300 flex items-center gap-1.5 group-hover:text-cyan-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping"></span>
                          {feat.label}
                        </td>
                        <td className="p-2 text-emerald-300">{feat.area_hectares} ha</td>
                        <td className="p-2 text-slate-300">{feat.area_km2} km²</td>
                        <td className="p-2 text-slate-400">{feat.perimeter_m} m</td>
                        <td className="p-2 text-slate-300 font-mono text-[10px]">
                          {feat.centroid ? `${feat.centroid[0]}°, ${feat.centroid[1]}°` : '—'}
                        </td>
                        <td className="p-2 text-right">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50 text-[10px]">
                            {Math.round((feat.score || 0.85) * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Follow-up Dialogue Quick Suggestions */}
      {onFollowUpQuery && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-mono text-slate-400">Follow-up:</span>
          {[
            "Compute vegetation health (NDVI)",
            "Highlight water bodies & canal",
            "What type of land cover dominates?",
            "Detect infrastructure changes"
          ].map((suggestion, sIdx) => (
            <button
              key={sIdx}
              onClick={() => onFollowUpQuery(suggestion)}
              className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all cursor-pointer"
            >
              + {suggestion}
            </button>
          ))}
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
