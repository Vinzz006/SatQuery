import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ImageMetadata, AnalyzeResponse } from '../types';
import { SplitImageViewer } from '../components/SplitImageViewer';
import { GroundedAnswerCard } from '../components/GroundedAnswerCard';
import { ExecutionTraceViewer } from '../components/ExecutionTraceViewer';
import {
  Upload,
  Sparkles,
  Play,
  RotateCcw,
  Layers,
  HelpCircle,
  AlertCircle,
  FileQuestion,
  Loader2,
  Bookmark,
  CheckCircle2
} from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [sampleImagery, setSampleImagery] = useState<ImageMetadata[]>([]);
  const [query, setQuery] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useAdaptedModel, setUseAdaptedModel] = useState<boolean>(true);

  // Load sample assets on mount
  useEffect(() => {
    api.getSampleImagery()
      .then((samples) => {
        setSampleImagery(samples);
        // Default to Demo Scenario 4 (Bi-temporal Change) initially
        const t1 = samples.find(s => s.filename.includes('2024_t1'));
        const t2 = samples.find(s => s.filename.includes('2026_t2'));
        if (t1 && t2) {
          setImages([t1, t2]);
          setQuery('What changed between these two images?');
        } else if (samples.length > 0) {
          setImages([samples[0]]);
          setQuery('What type of land cover dominates this region?');
        }
      })
      .catch((err) => console.error("Failed to load sample imagery:", err));
  }, []);

  // Preset demo scenario handlers
  const loadDemoScenario = (scenario: number) => {
    setErrorMessage(null);
    setAnalysisResult(null);

    if (scenario === 1) {
      // Demo 1: Single Image VQA
      const opt = sampleImagery.find(s => s.filename.includes('vqa_optical'));
      if (opt) setImages([opt]);
      setQuery('What type of land cover dominates this region?');
    } else if (scenario === 2) {
      // Demo 2: Text-Guided Grounding
      const ground = sampleImagery.find(s => s.filename.includes('grounding_fields'));
      if (ground) setImages([ground]);
      setQuery('Highlight the water body.');
    } else if (scenario === 3) {
      // Demo 3: Captioning
      const opt = sampleImagery.find(s => s.filename.includes('vqa_optical'));
      if (opt) setImages([opt]);
      setQuery('Describe this satellite image.');
    } else if (scenario === 4) {
      // Demo 4: Bi-temporal Change
      const t1 = sampleImagery.find(s => s.filename.includes('2024_t1'));
      const t2 = sampleImagery.find(s => s.filename.includes('2026_t2'));
      if (t1 && t2) setImages([t1, t2]);
      setQuery('What changed between these two images?');
    } else if (scenario === 5) {
      // Demo 5: Optical + SAR Fusion
      const opt = sampleImagery.find(s => s.filename.includes('optical_cloudy'));
      const sar = sampleImagery.find(s => s.filename.includes('sar_backscatter'));
      if (opt && sar) setImages([opt, sar]);
      setQuery('Use both images to identify built-up regions.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const uploadedMetas = await api.uploadImages(Array.from(e.target.files));
      setImages(uploadedMetas);
      // Auto-suggest query based on upload count
      if (uploadedMetas.length === 2) {
        setQuery('What changed between these two images?');
      } else {
        setQuery('What type of land cover dominates this region?');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Upload failed. Please check the file format.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      setErrorMessage("Please select or upload at least one satellite image.");
      return;
    }
    if (!query.trim()) {
      setErrorMessage("Please enter an analytical question or task.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const imageIds = images.map(img => img.filename);
      const res = await api.analyze(query, imageIds, useAdaptedModel);
      setAnalysisResult(res);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Analysis failed. Please inspect backend logs.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-grid-bg min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header bar with demo presets */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-cyan-900/30">
        <div>
          <h1 className="text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Interactive Remote-Sensing Analysis Workspace
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Automatic multimodal routing across VQA, Captioning, Grounding, Change AI, and Optical+SAR Fusion.
          </p>
        </div>

        {/* Demo Quick Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 mr-1 hidden sm:inline">ISRO Demos:</span>
          <button
            onClick={() => loadDemoScenario(1)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all"
          >
            Demo 1: VQA
          </button>
          <button
            onClick={() => loadDemoScenario(2)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all"
          >
            Demo 2: Grounding
          </button>
          <button
            onClick={() => loadDemoScenario(3)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all"
          >
            Demo 3: Caption
          </button>
          <button
            onClick={() => loadDemoScenario(4)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all font-semibold"
          >
            Demo 4: Change
          </button>
          <button
            onClick={() => loadDemoScenario(5)}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-700 transition-all"
          >
            Demo 5: Opt+SAR
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (Upload & Query) + Right Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Upload & Query Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Image Ingestion Box */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-semibold text-slate-200 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-cyan-400" />
                Imagery Ingestion ({images.length}/2 loaded)
              </span>
              <label className="cursor-pointer text-xs font-mono text-cyan-400 hover:text-cyan-300 underline">
                Browse Files
                <input
                  type="file"
                  multiple
                  accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Drag & Drop Upload Zone */}
            <label className="border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/40 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 animate-bounce" />
              <div className="text-center font-mono text-xs text-slate-300">
                <span>Drop GeoTIFF, TIFF, or Benchmark imagery</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Supports 1 single image or 2 paired images (Temporal / Optical+SAR)</p>
              </div>
              <input
                type="file"
                multiple
                accept=".tif,.tiff,.geotiff,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Loaded Image Badges */}
            {images.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {images.map((img, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900/90 border border-slate-800 text-xs font-mono">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded bg-cyan-950 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200 truncate font-sans text-xs">{img.original_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 text-[10px] border border-cyan-900">
                        {img.modality.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {img.width}x{img.height}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Natural Language Query Box */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <span className="text-xs font-mono uppercase font-semibold text-slate-200 flex items-center gap-1.5">
              <FileQuestion className="w-4 h-4 text-cyan-400" />
              Natural Language Mission Query
            </span>

            <textarea
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., What changed between these two images? or Highlight the water body."
              className="w-full rounded-lg bg-slate-950/80 border border-slate-700 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
            />

            {/* Quick Prompt Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400">Quick Prompts:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "What type of land cover dominates this region?",
                  "Highlight the water body.",
                  "Describe this satellite image.",
                  "What changed between these two images?",
                  "Has the built-up area increased?",
                  "Use both images to identify built-up regions."
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(prompt)}
                    className="text-[11px] font-sans px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-800 transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Adapted Model Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={useAdaptedModel}
                  onChange={(e) => setUseAdaptedModel(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Use Remote-Sensing Adapted Model (EuroSAT Fine-Tuned)</span>
              </label>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || images.length === 0}
              className={`w-full py-3 rounded-lg font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                isAnalyzing || images.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Routing & Synthesizing Multi-Specialist AI...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Execute Analysis & Trace
                </>
              )}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Right Column: Visual HUD & Results (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Main Visualizer */}
          <SplitImageViewer
            images={images}
            evidence={analysisResult?.evidence || []}
          />

          {/* Grounded Result Card */}
          {analysisResult && (
            <GroundedAnswerCard analysis={analysisResult} />
          )}

          {/* Observable Execution Trace */}
          {analysisResult && (
            <ExecutionTraceViewer
              trace={analysisResult.trace}
              totalTimeMs={analysisResult.execution_time_ms}
            />
          )}

        </div>

      </div>

    </div>
  );
};
