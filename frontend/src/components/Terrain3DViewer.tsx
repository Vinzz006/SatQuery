import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ImageMetadata, EvidenceArtifact } from '../types';
import { api } from '../services/api';
import { Box, RotateCcw, Play, Pause, Grid, Layers, Mountain } from 'lucide-react';

interface Props {
  images: ImageMetadata[];
  evidence?: EvidenceArtifact[];
}

export const Terrain3DViewer: React.FC<Props> = ({ images, evidence = [] }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [elevationScale, setElevationScale] = useState(2.0);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Interaction refs
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const rotAngleRef = useRef({ x: 0.6, y: 0.4 });
  const distanceRef = useRef(18);

  const primaryImage = images.length > 0 ? images[0] : null;

  useEffect(() => {
    if (!mountRef.current || !primaryImage) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 480;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b13);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(12, 20, 15);
    scene.add(dirLight);

    const sunLight = new THREE.DirectionalLight(0xf59e0b, 0.7);
    sunLight.position.set(-15, -10, 10);
    scene.add(sunLight);

    // 4. Terrain Geometry & Material
    const gridRes = 96;
    const geometry = new THREE.PlaneGeometry(14, 14, gridRes, gridRes);

    // Procedural Elevation Displacer based on synthetic topography
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) + 7) / 14;
      const v = (pos.getY(i) + 7) / 14;

      // Realistic coastal elevation: water on right/east, coastal barrier in middle, lagoon on west
      const coastalRidge = Math.sin(u * Math.PI) * Math.cos(v * Math.PI * 0.8);
      const structuralPeaks = (Math.sin(u * 14) * Math.cos(v * 14) > 0.6) ? 0.35 : 0;
      const oceanDepression = u > 0.7 ? -0.2 : 0.05;

      const z = (coastalRidge * 0.7 + structuralPeaks + oceanDepression) * elevationScale;
      pos.setZ(i, z);
    }
    geometry.computeVertexNormals();

    // Texture loading
    const imgUrl = api.getArtifactUrl(primaryImage.preview_url || '');
    const loader = new THREE.TextureLoader();
    const texture = loader.load(imgUrl);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.65,
      metalness: 0.15,
      wireframe: wireframe,
      side: THREE.DoubleSide
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMeshRef.current = terrainMesh;
    scene.add(terrainMesh);

    // 5. Ocean Water Horizon Plane
    const waterGeom = new THREE.PlaneGeometry(18, 18);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.8
    });
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.position.z = -0.15;
    scene.add(waterMesh);

    // 6. Animation Loop
    const animate = () => {
      if (isRotating && !isDraggingRef.current) {
        rotAngleRef.current.y += 0.003;
      }

      const camX = distanceRef.current * Math.sin(rotAngleRef.current.y) * Math.cos(rotAngleRef.current.x);
      const camY = distanceRef.current * Math.sin(rotAngleRef.current.x);
      const camZ = distanceRef.current * Math.cos(rotAngleRef.current.y) * Math.cos(rotAngleRef.current.x);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // 7. Mouse Orbit Controls
    const dom = renderer.domElement;
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMousePosRef.current.x;
      const dy = e.clientY - prevMousePosRef.current.y;

      rotAngleRef.current.y += dx * 0.006;
      rotAngleRef.current.x = Math.max(0.1, Math.min(Math.PI / 2.2, rotAngleRef.current.x + dy * 0.006));

      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distanceRef.current = Math.max(7, Math.min(35, distanceRef.current + e.deltaY * 0.02));
    };

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Handle Resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 480;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      waterGeom.dispose();
      waterMat.dispose();
    };
  }, [primaryImage, elevationScale, wireframe, isRotating]);

  const resetView = () => {
    rotAngleRef.current = { x: 0.6, y: 0.4 };
    distanceRef.current = 18;
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-cyan-900/30 flex flex-col">
      {/* 3D HUD Toolbar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 font-semibold uppercase">3D ORBITAL TOPOGRAPHY ENGINE</span>
          <span className="text-slate-400">|</span>
          <span className="text-cyan-300">WebGL Mesh Elevation Extrusion</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Wireframe toggle */}
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all border ${
              wireframe
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
            title="Toggle Topographic Wireframe Grid"
          >
            <Grid className="w-3 h-3" />
            Wireframe
          </button>

          {/* Auto-Rotation toggle */}
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all border ${
              isRotating
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
            title={isRotating ? 'Pause Orbital Spin' : 'Resume Orbital Spin'}
          >
            {isRotating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isRotating ? 'Orbiting' : 'Paused'}
          </button>

          {/* Elevation Slider */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px]">
            <Mountain className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-400">Relief: {elevationScale.toFixed(1)}x</span>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.5"
              value={elevationScale}
              onChange={(e) => setElevationScale(parseFloat(e.target.value))}
              className="w-16 accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Reset Camera */}
          <button
            onClick={resetView}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-[11px]"
            title="Reset Camera Angle and Distance"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div className="relative h-[480px] w-full bg-slate-950 cursor-grab active:cursor-grabbing">
        <div ref={mountRef} className="h-full w-full" />

        {/* Orbit Control Tip Overlay */}
        <div className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs font-mono text-cyan-300 flex items-center gap-2 backdrop-blur-sm shadow-lg pointer-events-none">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">INTERACTIVE:</span>
          <span>Click & Drag to Orbit | Scroll to Zoom</span>
        </div>
      </div>
    </div>
  );
};
