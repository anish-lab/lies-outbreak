import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const GraphCanvas = ({ network, colors, onNodeClick, selectedNodeId }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const graphRef = useRef();
  
  // Pre-calculate neighbor map for fast lookup
  const [neighborMap, setNeighborMap] = useState({});

  useEffect(() => {
    if (network?.links) {
      const map = {};
      network.links.forEach(link => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;
        if (!map[sourceId]) map[sourceId] = new Set();
        if (!map[targetId]) map[targetId] = new Set();
        map[sourceId].add(targetId);
        map[targetId].add(sourceId);
      });
      setNeighborMap(map);
    }
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
  
  useEffect(() => {
    if (graphRef.current && network?.nodes?.length > 0) {
      graphRef.current.d3Force('charge').strength(-150);
      graphRef.current.d3Force('link').distance(40);
      graphRef.current.d3ReheatSimulation();
    }
  }, [network]);

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-950">
      <ForceGraph2D
        ref={graphRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={network}
        nodeId="id"
        nodeColor={node => colors[node.id] || '#3b82f6'}
        nodeRelSize={6}
        linkColor={link => {
          if (!selectedNodeId) return '#334155';
          const sourceId = link.source.id || link.source;
          const targetId = link.target.id || link.target;
          if (sourceId === selectedNodeId || targetId === selectedNodeId) {
            return '#60a5fa'; // highlight connected edges
          }
          return '#1e293b'; // dim other edges
        }}
        linkWidth={link => {
          if (!selectedNodeId) return 1.5;
          const sourceId = link.source.id || link.source;
          const targetId = link.target.id || link.target;
          if (sourceId === selectedNodeId || targetId === selectedNodeId) return 2.5;
          return 0.5;
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          if (node.x === undefined || node.y === undefined) return;

          const label = node.id;
          const fontSize = 12/globalScale;
          const color = colors[node.id] || '#3b82f6';
          
          let opacity = 1;
          const isSelected = selectedNodeId === node.id;
          const isNeighbor = selectedNodeId && neighborMap[selectedNodeId]?.has(node.id);
          
          if (selectedNodeId && !isSelected && !isNeighbor) {
            opacity = 0.2; // Dim non-neighbors
          }

          ctx.globalAlpha = opacity;
          
          // Outer glow for selected or intervened
          if (color === '#22c55e' || isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6 + 2, 0, 2 * Math.PI, false);
            ctx.fillStyle = isSelected ? 'rgba(96, 165, 250, 0.4)' : 'rgba(34, 197, 94, 0.3)';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = isSelected ? '#60a5fa' : '#22c55e';
            ctx.stroke();
          }

          // Draw node
          ctx.beginPath();
          ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();

          // Draw label
          if (globalScale > 1.5 || isSelected) {
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isSelected ? '#ffffff' : '#d1d5db';
            ctx.fillText(label, node.x, node.y);
          }
          
          ctx.globalAlpha = 1; // reset
        }}
        onNodeClick={onNodeClick}
        enableNodeDrag={true}
        enableZoomPanInteraction={true}
        cooldownTicks={100}
      />
      
      {/* Legend */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 border border-gray-800 rounded-full px-6 py-3 flex gap-6 shadow-2xl backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
          <span className="text-xs font-medium text-gray-300">Safe</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
          <span className="text-xs font-medium text-gray-300">Infected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] border border-green-400"></div>
          <span className="text-xs font-medium text-gray-300">Intervened</span>
        </div>
      </div>
    </div>
  );
};

export default GraphCanvas;
