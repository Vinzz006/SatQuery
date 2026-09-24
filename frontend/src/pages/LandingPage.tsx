import React from 'react';
import { Link } from 'react-router-dom';
import {
  Satellite,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  ScanEye,
  GitCompare,
  Cpu,
  BarChart3,
  CheckCircle2,
  Radar,
  FileCheck
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const capabilities = [
    {
      title: 'Single-Image VQA',
      icon: Search,
      tag: 'CALIBRATED RS-VLM',
      desc: 'Answer natural questions regarding land-use, terrain categories, infrastructure counts, and environmental patterns on satellite imagery.'
    },
    {
      title: 'Text-Guided Grounding',
      icon: ScanEye,
      tag: 'SPATIAL HUD',
      desc: 'Localize referred features such as water bodies, runways, industrial complexes, and agricultural zones with bounding boxes and masks.'
    },
    {
      title: 'Remote-Sensing Captioning',
      icon: FileCheck,
      tag: 'SCENE SYNTHESIS',
      desc: 'Generate comprehensive, technically precise LULC descriptive summaries describing spatial, spectral, and textural compositions.'
    },
    {
      title: 'Bi-Temporal Change AI',
      icon: GitCompare,
      tag: 'CHANGE CVA',
      desc: 'Quantify surface modifications between observation epochs, delineating built-up expansion, deforestation, and water alterations.'
    },
    {
      title: 'Optical + SAR Fusion',
      icon: Radar,
      tag: 'CROSS-MODAL',
      desc: 'Synergize optical multispectral reflectance with cloud-penetrating microwave backscatter to detect structures under atmospheric haze.'
    },
    {
      title: 'Agentic Controller',
      icon: Cpu,
      tag: 'AUDITABLE TRACE',
      desc: 'Automatically classifies query intent and sensor modalities, selecting specialist AI workflows with a complete observable trace.'
    }
  ];

  return (
    <div className="space-grid-bg min-h-[calc(100vh-64px)] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto pt-6 pb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-mono mb-6">
          <Satellite className="w-3.5 h-3.5" />
          <span>ISRO Problem Statement 26167 Compliant Prototype</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          SATQUERY <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
        </h1>

        <p className="mt-4 text-xl sm:text-2xl text-slate-300 font-light max-w-3xl mx-auto">
          Ask questions. Understand Earth. Multimodal Vision-Language Assistant for Remote-Sensing Imagery.
        </p>

        <p className="mt-3 text-sm text-slate-400 font-sans max-w-2xl mx-auto">
          An autonomous agentic remote-sensing architecture routing natural language queries to specialist AI models for optical, SAR, and bi-temporal earth observation analysis.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/workspace"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/25 group"
          >
            Launch Analysis Workspace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/benchmarks"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono text-sm border border-slate-700 transition-all"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            View Benchmarks
          </Link>
        </div>
      </div>

      {/* Interactive Agent Architecture Diagram Card */}
      <div className="my-10 glass-panel rounded-2xl p-6 sm:p-8 border border-cyan-900/40">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Agentic Vision-Language Architecture
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Dynamic multi-specialist routing pipeline converting unstructured geospatial questions into evidence-backed physical insights.
            </p>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-slate-900 text-cyan-300 font-mono text-xs border border-slate-800">
            ZERO HALLUCINATION PIPELINE
          </span>
        </div>

        {/* Pipeline Visual Stepper Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] text-cyan-400 font-bold">STAGE 01</span>
            <span className="font-semibold text-white">Natural Query & Imagery</span>
            <span className="text-slate-400 text-[11px] font-sans">Optical, SAR, or Bi-temporal Pairs</span>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-700/50 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] text-cyan-300 font-bold">STAGE 02</span>
            <span className="font-semibold text-cyan-200">Agent Controller</span>
            <span className="text-slate-400 text-[11px] font-sans">Intent Classification & Modality Check</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] text-indigo-400 font-bold">STAGE 03</span>
            <span className="font-semibold text-white">Specialist Dispatch</span>
            <span className="text-slate-400 text-[11px] font-sans">VQA • Grounding • Change • SAR</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] text-emerald-400 font-bold">STAGE 04</span>
            <span className="font-semibold text-white">Evidence & Stats</span>
            <span className="text-slate-400 text-[11px] font-sans">Change Maps, Masks, Bounding Boxes</span>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/60 border border-cyan-500/60 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] text-cyan-300 font-bold">STAGE 05</span>
            <span className="font-semibold text-cyan-300">Grounded Answer</span>
            <span className="text-slate-400 text-[11px] font-sans">Calibrated Conf. & Downloadable PDF</span>
          </div>
        </div>
      </div>

      {/* 6 Core Capabilities Grid */}
      <div className="my-8">
        <h2 className="text-xl font-bold font-mono text-center text-slate-100 uppercase tracking-wider mb-8">
          Specialist Remote-Sensing Capabilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={idx}
                className="glass-panel p-5 rounded-xl border border-slate-800/80 hover:border-cyan-500/40 transition-all hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950 flex items-center justify-center border border-cyan-800/60 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {c.tag}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white mb-1.5">{c.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
        <div>SatQuery AI • Built for ISRO Problem Statement 26167</div>
        <div className="flex items-center gap-4">
          <Link to="/about" className="hover:text-cyan-400">Methodology</Link>
          <Link to="/benchmarks" className="hover:text-cyan-400">Benchmarks</Link>
          <Link to="/workspace" className="hover:text-cyan-400">Workspace</Link>
        </div>
      </footer>

    </div>
  );
};
