import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

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

  const hasOutbreak = useMemo(() => Object.values(colors).includes('#ef4444'), [colors]);

  // High-performance Canvas 2D drawing for nodes
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const colorStr = colors[node.id] || '#3b82f6';
    const isSelected = selectedNodeId === node.id;
    const isNeighbor = selectedNodeId && neighborMap[selectedNodeId]?.has(node.id);
    
    // In High-Density 2D mode, we don't need aggressive dimming, 
    // but we can slightly fade non-relevant nodes.
    const isDimmed = selectedNodeId && !isSelected && !isNeighbor;
    
    const size = isSelected ? 8 : 4;
    
    // Draw glowing aura for infected/intervened nodes
    if (!isDimmed && (colorStr === '#ef4444' || colorStr === '#22c55e' || isSelected)) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 2.5, 0, 2 * Math.PI, false);
      ctx.fillStyle = colorStr;
      ctx.globalAlpha = 0.15;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw core node
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = colorStr;
    ctx.globalAlpha = isDimmed ? 0.2 : 1;
    ctx.fill();
    
    // Draw border
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = isDimmed ? 0.1 : (isSelected ? 1 : 0.5);
    ctx.stroke();
    
    // Draw text label only if zoomed in enough OR if selected/infected
    const showText = globalScale > 1.5 || isSelected || colorStr === '#ef4444' || colorStr === '#22c55e';
    
    if (showText && !isDimmed) {
      const label = node.id;
      const fontSize = isSelected ? 14/globalScale : 10/globalScale;
      ctx.font = `bold ${fontSize}px Consolas, monospace`;
      
      // Draw background pill
      const textWidth = ctx.measureText(label).width;
      const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + size + 2, bckgDimensions[0], bckgDimensions[1]);
      
      // Draw text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 1;
      ctx.fillText(label, node.x, node.y + size + 2 + bckgDimensions[1]/2);
    }
    
    ctx.globalAlpha = 1; // Reset
  }, [colors, selectedNodeId, neighborMap]);

  const handleNodeClick = useCallback((node) => {
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(4, 1000); // zoom in tight on 2D
    }
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

  // Cinematic Auto-Tracking in 2D
  useEffect(() => {
    if (!graphRef.current || !network?.nodes) return;
    
    const infectedIds = new Set(
      Object.entries(colors).filter(([id, color]) => color === '#ef4444').map(([id]) => id)
    );
    
    if (infectedIds.size === 0) return;
    
    const nodes = network.nodes;
    const infectedNodes = nodes.filter(n => infectedIds.has(n.id) && n.x !== undefined);
    
    if (infectedNodes.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      
      infectedNodes.forEach(n => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      });
      
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      
      const maxSpread = Math.max(maxX - minX, maxY - minY, 20); 
      // Calculate optimal zoom level based on spread
      const optimalZoom = Math.min(400 / maxSpread, 3);
      
      graphRef.current.centerAt(centerX, centerY, 800);
      graphRef.current.zoom(optimalZoom, 800);
    }
  }, [colors, network]);

  // Initial fit
  useEffect(() => {
    if (graphRef.current && network?.nodes?.length > 0) {
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(1000, 50);
        }
      }, 500); // Give the 2D layout engine half a second to push nodes apart
    }
  }, [network]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#050505] relative rounded-lg overflow-hidden border border-gray-800/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={network}
        nodeId="id"
        nodeCanvasObject={nodeCanvasObject}
        linkColor={link => {
          if (!selectedNodeId) return 'rgba(148, 163, 184, 0.4)';
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          if (sourceId === selectedNodeId || targetId === selectedNodeId) {
            return 'rgba(96, 165, 250, 0.9)'; 
          }
          return 'rgba(30, 41, 59, 0.2)'; 
        }}
        linkWidth={link => {
          if (!selectedNodeId) return 0.5;
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          if (sourceId === selectedNodeId || targetId === selectedNodeId) return 2;
          return 0.2;
        }}
        linkDirectionalParticles={link => {
          if (!selectedNodeId) return 0;
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          if (sourceId === selectedNodeId || targetId === selectedNodeId) return 2;
          return 0;
        }}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleColor={() => '#60a5fa'}
        onNodeClick={handleNodeClick}
        backgroundColor="#050505"
        d3VelocityDecay={0.3} // Make physics settle faster in 2D
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
