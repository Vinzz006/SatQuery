import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ImageMetadata } from '../types';
import { SplitImageViewer } from '../components/SplitImageViewer';
import { GitCompare, Calendar, Radar, Sparkles } from 'lucide-react';

export const ComparePage: React.FC = () => {
  const [samples, setSamples] = useState<ImageMetadata[]>([]);
  const [selectedPair, setSelectedPair] = useState<'temporal' | 'opticalSar'>('temporal');
  const [pairImages, setPairImages] = useState<ImageMetadata[]>([]);

  useEffect(() => {
    api.getSampleImagery().then((data) => {
      setSamples(data);
      loadPair('temporal', data);
    });
  }, []);

  const loadPair = (type: 'temporal' | 'opticalSar', data: ImageMetadata[]) => {
    setSelectedPair(type);
    if (type === 'temporal') {
      const t1 = data.find(s => s.filename.includes('2024_t1'));
      const t2 = data.find(s => s.filename.includes('2026_t2'));
      if (t1 && t2) setPairImages([t1, t2]);
    } else {
      const opt = data.find(s => s.filename.includes('optical_cloudy'));
      const sar = data.find(s => s.filename.includes('sar_backscatter'));
      if (opt && sar) setPairImages([opt, sar]);
    }
  };

  return (
    <div className="space-grid-bg min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-5 rounded-xl border border-cyan-900/30 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-cyan-400" />
            Dual-Imagery Comparative Studio
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Synchronized pixel-level comparison across bi-temporal observation epochs and cross-modal optical-SAR sensors.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            onClick={() => loadPair('temporal', samples)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              selectedPair === 'temporal' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Bi-Temporal (2024 vs 2026)
          </button>
          <button
            onClick={() => loadPair('opticalSar', samples)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              selectedPair === 'opticalSar' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            Optical vs SAR Backscatter
          </button>
        </div>
      </div>

      {/* Interactive Split View */}
      <SplitImageViewer images={pairImages} />

      {/* Comparison Guide Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <h3 className="font-mono text-xs font-bold text-cyan-400 uppercase mb-2">
            {selectedPair === 'temporal' ? 'Observation A: 2024 Baseline' : 'Sensor 1: Sentinel-2 Multispectral'}
          </h3>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {selectedPair === 'temporal'
              ? 'Pristine agricultural and sparse rural structures prior to infrastructure expansion. Vegetation reflectance dominant.'
              : 'Visible and Near-Infrared surface reflectance subject to atmospheric cloud and shadow obstruction.'}
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <h3 className="font-mono text-xs font-bold text-indigo-400 uppercase mb-2">
            {selectedPair === 'temporal' ? 'Observation B: 2026 Epoch' : 'Sensor 2: Sentinel-1 Synthetic Aperture Radar'}
          </h3>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            {selectedPair === 'temporal'
              ? 'Post-expansion observation showing prominent ground clearing, new warehouse pads, and connecting road corridors.'
              : 'Microwave C-band radar backscatter (VV/VH polarization). Penetrates atmospheric haze and reflects intensely off metallic structures.'}
          </p>
        </div>
      </div>

    </div>
  );
};
