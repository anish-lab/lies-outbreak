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

  const zoomedRef = useRef(false);

  useEffect(() => {
    zoomedRef.current = false;
  }, [network]);
  
  const hasOutbreak = useMemo(() => Object.values(colors).includes('#ef4444'), [colors]);

  // Custom Node Object for aggressive glowing and text labels
  const nodeThreeObject = useCallback((node) => {
    const colorStr = colors[node.id] || '#3b82f6';
    const isSelected = selectedNodeId === node.id;
    const isNeighbor = selectedNodeId && neighborMap[selectedNodeId]?.has(node.id);
    const isSafe = colorStr === '#3b82f6';
    
    // Dim if another node is selected, OR if there's an active outbreak and this node is safe
    const isDimmed = (selectedNodeId && !isSelected && !isNeighbor) || (!selectedNodeId && hasOutbreak && isSafe);
    
    const group = new THREE.Group();

    // Core sphere (shrink safe nodes during outbreak so they don't block view)
    const size = isSelected ? 7 : (isDimmed && isSafe && hasOutbreak ? 1.5 : 4);
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshPhongMaterial({
      color: colorStr,
      transparent: true,
      opacity: isDimmed ? (hasOutbreak && isSafe ? 0.05 : 0.15) : 1,
      emissive: colorStr,
      emissiveIntensity: isDimmed ? 0 : 0.8
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // Node label (number)
    const sprite = new SpriteText(node.id);
    sprite.color = '#ffffff';
    sprite.textHeight = isSelected ? 6 : (isDimmed && isSafe && hasOutbreak ? 2 : 4);
    sprite.position.y = 10; 
    sprite.backgroundColor = 'rgba(0,0,0,0.6)'; 
    sprite.padding = 1; 
    sprite.borderRadius = 2; 
    sprite.material.depthTest = false;
    if (isDimmed) sprite.material.opacity = hasOutbreak && isSafe ? 0.05 : 0.2;
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
  }, [colors, selectedNodeId, neighborMap, hasOutbreak]);

  const handleNodeClick = useCallback((node) => {
    // Aim at node from outside it
    const distance = 60;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    if (graphRef.current) {
      graphRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
        node, // lookAt ({ x, y, z })
        1000  // ms transition duration
      );
    }
    
    // Call the parent's onNodeClick to update the sidebar state
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

  // Cinematic Auto-Tracking: When infection spreads, fly camera to the centroid of infected nodes
  useEffect(() => {
    if (!graphRef.current || !network?.nodes) return;
    
    // Find all currently infected nodes (red color)
    const infectedIds = new Set(
      Object.entries(colors)
        .filter(([id, color]) => color === '#ef4444')
        .map(([id]) => id)
    );
    
    if (infectedIds.size === 0) return;
    
    // Extract the 3D position of these nodes from the mutated network array
    const nodes = network.nodes;
    const infectedNodes = nodes.filter(n => infectedIds.has(n.id) && n.x !== undefined);
    
    if (infectedNodes.length > 0) {
      // Calculate bounding box of infected nodes
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      
      infectedNodes.forEach(n => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
        if (n.z < minZ) minZ = n.z;
        if (n.z > maxZ) maxZ = n.z;
      });
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      
      // Fly extremely close to the outbreak cluster to see the changes perfectly
      const maxSpread = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 20); 
      const distance = Math.max(maxSpread * 1.1, 50);
      
      graphRef.current.cameraPosition(
        { x: centerX, y: centerY, z: centerZ + distance }, 
        { x: centerX, y: centerY, z: centerZ }, 
        800 // smooth transition tracking
      );
    }
  }, [colors, network]);

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
          if (!selectedNodeId) return hasOutbreak ? 'rgba(30, 41, 59, 0.05)' : 'rgba(148, 163, 184, 0.6)';
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
        onNodeClick={handleNodeClick}
        onEngineStop={() => {
          if (graphRef.current && !zoomedRef.current) {
            graphRef.current.zoomToFit(1500, 60);
            zoomedRef.current = true;
          }
        }}
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
