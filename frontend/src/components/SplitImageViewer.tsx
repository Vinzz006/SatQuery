import React, { useState, useRef } from 'react';
import { ImageMetadata, EvidenceArtifact } from '../types';
import { api } from '../services/api';
import { Eye, Layers, ZoomIn, ZoomOut, RotateCcw, Sliders, Maximize2, SplitSquareVertical } from 'lucide-react';

interface Props {
  images: ImageMetadata[];
  evidence?: EvidenceArtifact[];
}

export const SplitImageViewer: React.FC<Props> = ({ images, evidence = [] }) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'split' | 'sideBySide'>('split');
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState<number>(0);
  const [evidenceOpacity, setEvidenceOpacity] = useState<number>(80);
  const [showEvidence, setShowEvidence] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  if (!images || images.length === 0) {
    return (
      <div className="h-96 glass-panel rounded-xl flex items-center justify-center text-slate-500 font-mono text-sm border border-slate-800">
        No satellite imagery loaded in active viewport.
      </div>
    );
  }

  const primaryImage = images[0];
  const secondaryImage = images.length > 1 ? images[1] : null;
  const activeEvidence = evidence.length > 0 ? evidence[activeEvidenceIndex] : null;

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  const resetViewport = () => {
    setZoom(1);
    setSliderPosition(50);
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-cyan-900/30 flex flex-col">
      {/* Top Toolbar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 font-semibold">VIEWPORT HUD</span>
          <span className="text-slate-400">|</span>
          <span className="text-cyan-300 font-medium">
            {images.length} Scene(s) • {primaryImage.width}x{primaryImage.height}px
          </span>
          {primaryImage.crs && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px] border border-cyan-800">
              {primaryImage.crs}
            </span>
          )}
        </div>

        {/* Controls: Mode, Zoom, Layers */}
        <div className="flex items-center gap-3">
          {secondaryImage && (
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
              <button
                onClick={() => setViewMode('split')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  viewMode === 'split' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Split Slider
              </button>
              <button
                onClick={() => setViewMode('sideBySide')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  viewMode === 'sideBySide' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Side-by-Side
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setZoom(Math.max(0.6, zoom - 0.2))}
              className="p-1 text-slate-400 hover:text-cyan-300 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-slate-300 min-w-[34px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.2))}
              className="p-1 text-slate-400 hover:text-cyan-300 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetViewport}
              className="p-1 text-slate-400 hover:text-cyan-300 rounded"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Layer selector bar if evidence available */}
      {evidence.length > 0 && (
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-mono">Evidence Layer:</span>
            <div className="flex items-center gap-1.5">
              {evidence.map((art, idx) => (
                <button
                  key={art.id}
                  onClick={() => {
                    setActiveEvidenceIndex(idx);
                    setShowEvidence(true);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                    activeEvidenceIndex === idx && showEvidence
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {art.title}
                </button>
              ))}
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className={`px-2 py-1 rounded text-[11px] font-mono ${
                  !showEvidence ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {showEvidence ? 'Hide Layer' : 'Show Layer'}
              </button>
            </div>
          </div>

          {/* Opacity slider */}
          {showEvidence && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <Sliders className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">Opacity: {evidenceOpacity}%</span>
              <input
                type="range"
                min="10"
                max="100"
                value={evidenceOpacity}
                onChange={(e) => setEvidenceOpacity(Number(e.target.value))}
                className="w-20 accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Main Visual Display Area */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative h-[480px] bg-slate-950 select-none overflow-hidden flex items-center justify-center cursor-crosshair"
      >
        {/* VIEW 1: Dual Image Split Slider Mode */}
        {secondaryImage && viewMode === 'split' && (
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.1s ease-out' }}
          >
            {/* Base Image 2 (Right/Underneath) */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src={api.getArtifactUrl(secondaryImage.preview_url || '')}
                alt="Observation B"
                className="max-h-full max-w-full object-contain pointer-events-none rounded"
              />
              <div className="absolute top-6 right-6 px-2.5 py-1 rounded bg-slate-950/80 border border-slate-700 text-xs font-mono text-cyan-300">
                EPOCH B / SAR ({secondaryImage.modality.toUpperCase()})
              </div>
            </div>

            {/* Overlaid Image 1 (Left/Clipped) */}
            <div
              className="absolute inset-0 overflow-hidden flex items-center justify-center p-4"
              style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
            >
              <img
                src={api.getArtifactUrl(primaryImage.preview_url || '')}
                alt="Observation A"
                className="max-h-full max-w-full object-contain pointer-events-none rounded"
              />
              <div className="absolute top-6 left-6 px-2.5 py-1 rounded bg-slate-950/80 border border-slate-700 text-xs font-mono text-cyan-300">
                EPOCH A / OPTICAL ({primaryImage.modality.toUpperCase()})
              </div>
            </div>

            {/* Evidence Layer (if toggled) */}
            {activeEvidence && showEvidence && (
              <div
                className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
                style={{ opacity: evidenceOpacity / 100 }}
              >
                <img
                  src={api.getArtifactUrl(activeEvidence.url)}
                  alt={activeEvidence.title}
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>
            )}

            {/* Interactive Slider Divider Handle */}
            <div
              onMouseDown={handleMouseDown}
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.8)] cursor-ew-resize z-30"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg font-bold">
                <SplitSquareVertical className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Dual Image Side-by-Side Mode */}
        {secondaryImage && viewMode === 'sideBySide' && (
          <div
            className="w-full h-full grid grid-cols-2 gap-2 p-3"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            {/* Panel 1 */}
            <div className="relative glass-panel rounded-lg overflow-hidden flex items-center justify-center p-2">
              <img
                src={api.getArtifactUrl(primaryImage.preview_url || '')}
                alt="Image 1"
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-cyan-400 border border-cyan-800">
                A: {primaryImage.original_name} ({primaryImage.modality.toUpperCase()})
              </div>
            </div>

            {/* Panel 2 */}
            <div className="relative glass-panel rounded-lg overflow-hidden flex items-center justify-center p-2">
              <img
                src={api.getArtifactUrl(secondaryImage.preview_url || '')}
                alt="Image 2"
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-cyan-400 border border-cyan-800">
                B: {secondaryImage.original_name} ({secondaryImage.modality.toUpperCase()})
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Single Image Mode */}
        {!secondaryImage && (
          <div
            className="relative w-full h-full flex items-center justify-center p-4"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.1s ease-out' }}
          >
            {/* Base Image */}
            <img
              src={api.getArtifactUrl(primaryImage.preview_url || '')}
              alt="Primary Observation"
              className="max-h-full max-w-full object-contain rounded"
            />

            {/* Active Evidence Layer */}
            {activeEvidence && showEvidence && (
              <div
                className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none"
                style={{ opacity: evidenceOpacity / 100 }}
              >
                <img
                  src={api.getArtifactUrl(activeEvidence.url)}
                  alt={activeEvidence.title}
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>
            )}

            <div className="absolute top-4 left-4 px-2.5 py-1 rounded bg-slate-950/80 border border-slate-700 text-xs font-mono text-cyan-300">
              {primaryImage.original_name} ({primaryImage.modality.toUpperCase()})
            </div>
          </div>
        )}

        {/* HUD Geospatial Footprint Tag */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-slate-950/85 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-3">
          <span>COORDS: LAT/LON EXTENT</span>
          <span>PIXELS: {primaryImage.width}x{primaryImage.height}</span>
          <span>BANDS: {primaryImage.bands}</span>
        </div>
      </div>
    </div>
  );
};
