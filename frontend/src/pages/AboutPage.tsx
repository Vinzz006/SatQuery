import React from 'react';
import { Satellite, ShieldCheck, CheckCircle2, Cpu, Database, Award, Info, GitCommit } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const complianceItems = [
    { req: "Single-Image VQA (Visual Question Answering)", status: "Completed", note: "Calibrated remote-sensing VQA specialist with softmax confidence." },
    { req: "Remote-Sensing Captioning", status: "Completed", note: "Holistic scene LULC synthesis describing composition, terrain, and infrastructure." },
    { req: "Text-Guided Visual Grounding", status: "Completed", note: "Delineates referring expressions into bounding boxes, masks, and overlays." },
    { req: "Bi-Temporal Change Detection & Change-VQA", status: "Completed", note: "Change Vector Analysis with quantified pixel percentages and anti-hallucination VQA." },
    { req: "Optical + SAR Cross-Modal Fusion", status: "Completed", note: "Synergistic feature fusion combining optical reflectance and SAR microwave backscatter." },
    { req: "Agentic Tool/Model Orchestration", status: "Completed", note: "Deterministic priority router + ModelRegistry with lazy loading and device fallback." },
    { req: "Remote-Sensing Adaptation / Fine-Tuning", status: "Completed", note: "Dedicated training & evaluation pipeline on EuroSAT multispectral benchmark." },
    { req: "Evidence-Grounded Visual Artifacts", status: "Completed", note: "Color-coded change maps, alpha-blended overlays, and bounding box HUDs." },
    { req: "Auditable Execution Trace", status: "Completed", note: "Observable, step-by-step event logging with millisecond latencies." },
    { req: "Downloadable Analysis Reports", status: "Completed", note: "Downloadable aerospace-styled PDF and structured JSON reports." }
  ];

  return (
    <div className="space-grid-bg min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-900/40">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono mb-3 border border-cyan-800">
          <Satellite className="w-3.5 h-3.5" />
          <span>ISRO Problem Statement 26167</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white">
          SatQuery AI — System Architecture & Methodology
        </h1>
        <p className="text-sm text-slate-300 font-sans mt-2 leading-relaxed">
          An interactive vision-language assistant for multimodal remote sensing image analysis through text queries. Built specifically to eliminate LLM hallucination in earth observation by pairing agentic routing with physical specialist models.
        </p>
      </div>

      {/* Engineering Principles */}
      <div className="space-y-4">
        <h2 className="text-base font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          Core Engineering Principles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-mono font-bold text-white uppercase">1. Zero Hallucination Pipeline</h3>
            <p className="text-slate-300 leading-relaxed">
              Large language models are never allowed to invent remote-sensing statistics independently. Instead, specialized computer vision and radiometric models compute exact numerical metrics (e.g., +14.7% change, 8 prominent clusters, low SAR backscatter) which strictly condition the natural language answer generator.
            </p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-mono font-bold text-white uppercase">2. Decoupled Specialist Architecture</h3>
            <p className="text-slate-300 leading-relaxed">
              Rather than forcing one monolithic model to handle all multimodal tasks, SatQuery AI isolates VQA, Captioning, Grounding, Change CVA, and Optical-SAR fusion behind a uniform BaseSpecialistModel contract. Models can be independently upgraded or swapped without touching the application core.
            </p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-mono font-bold text-white uppercase">3. Full Geospatial Integrity</h3>
            <p className="text-slate-300 leading-relaxed">
              Powered by Rasterio and Shapely, the backend extracts and preserves Coordinate Reference Systems (CRS), affine transformations, geographic bounds, and multi-band profiles throughout processing rather than treating satellite rasters as ordinary photos.
            </p>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
            <h3 className="font-mono font-bold text-white uppercase">4. Observable Execution Auditing</h3>
            <p className="text-slate-300 leading-relaxed">
              In mission-critical aerospace and defense operations, opacity is unacceptable. Every query produces an observable execution trace documenting query classification, input validation, specialist selection, and inference latencies.
            </p>
          </div>
        </div>
      </div>

      {/* ISRO Compliance Matrix */}
      <div className="space-y-4">
        <h2 className="text-base font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          ISRO Problem Statement 26167 Compliance Matrix
        </h2>

        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Problem Statement Requirement</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4">Implementation Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {complianceItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {item.req}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-sans">
                    {item.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
