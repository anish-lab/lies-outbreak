import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

const GraphCanvas = ({ network, colors, onNodeClick, selectedNodeId }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const graphRef = useRef();

  // Pre-calculate neighbor map for fast lookup
  const neighborMap = useMemo(() => {
    const map = {};
    if (network?.links) {
      network.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (!map[sourceId]) map[sourceId] = new Set();
        if (!map[targetId]) map[targetId] = new Set();
        map[sourceId].add(targetId);
        map[targetId].add(sourceId);
      });
    }
    return map;
  }, [network]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Zoom in on load
  useEffect(() => {
    if (graphRef.current) {
      // Set camera distance closer
      graphRef.current.cameraPosition({ z: 250 }, null, 2000);
    }
  }, [network]);
  
  // Custom Node Object for aggressive glowing and text labels
  const nodeThreeObject = useCallback((node) => {
    const colorStr = colors[node.id] || '#3b82f6';
    const isSelected = selectedNodeId === node.id;
    const isNeighbor = selectedNodeId && neighborMap[selectedNodeId]?.has(node.id);
    const isDimmed = selectedNodeId && !isSelected && !isNeighbor;
    
    const group = new THREE.Group();

    // Core sphere
    const geometry = new THREE.SphereGeometry(isSelected ? 7 : 4, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: colorStr,
      transparent: true,
      opacity: isDimmed ? 0.15 : 1,
      emissive: colorStr,
      emissiveIntensity: isDimmed ? 0 : 0.8
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // Node label (number)
    const sprite = new SpriteText(node.id);
    sprite.color = '#ffffff';
    sprite.textHeight = 4;
    sprite.position.y = 8;
    if (isDimmed) sprite.material.opacity = 0.2;
    group.add(sprite);

    // Aggressive Glow (Halo) for infected (red) or intervened (green) or selected
    if (!isDimmed && (colorStr === '#ef4444' || colorStr === '#22c55e' || isSelected)) {
      const haloGeometry = new THREE.SphereGeometry(isSelected ? 14 : 9, 16, 16);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: colorStr,
        transparent: true,
        opacity: isSelected ? 0.3 : 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      group.add(halo);

      // Add a PointLight for extra aggressive glow
      const light = new THREE.PointLight(colorStr, 2, 50);
      group.add(light);
    }

    return group;
  }, [colors, selectedNodeId, neighborMap]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#050505] relative rounded-lg overflow-hidden border border-gray-800/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
      <ForceGraph3D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={network}
        nodeId="id"
        nodeThreeObject={nodeThreeObject}
        linkColor={link => {
          if (!selectedNodeId) return 'rgba(148, 163, 184, 0.6)'; // bright enough to see
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          if (sourceId === selectedNodeId || targetId === selectedNodeId) {
            return 'rgba(96, 165, 250, 0.9)'; // highlight connected edges
          }
          return 'rgba(30, 41, 59, 0.2)'; // dim other edges
        }}
        linkWidth={link => {
          if (!selectedNodeId) return 0.8;
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          if (sourceId === selectedNodeId || targetId === selectedNodeId) return 1.5;
          return 0.2;
        }}
        linkDirectionalParticles={link => {
          // Send particles over connections that are highlighted
          if (!selectedNodeId) return 0;
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          if (sourceId === selectedNodeId || targetId === selectedNodeId) return 2;
          return 0;
        }}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => '#60a5fa'}
        onNodeClick={onNodeClick}
        backgroundColor="#050505" // Deep cyber space
        showNavInfo={false}
      />
      
      {/* Premium Cyber Legend */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 border border-gray-700/50 rounded-xl px-8 py-3 flex gap-8 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_#3b82f6]"></div>
          <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-widest">Safe</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_15px_#ef4444]"></div>
          <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-widest">Infected</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_15px_#22c55e] border border-green-400"></div>
          <span className="text-xs font-mono font-bold text-gray-300 uppercase tracking-widest">Intervened</span>
        </div>
      </div>
    </div>
  );
};

export default GraphCanvas;
