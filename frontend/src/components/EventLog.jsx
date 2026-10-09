import React, { useRef, useEffect } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

const EventLog = ({ simData, currentTick, isOptimized }) => {
  const scrollRef = useRef(null);
  
  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentTick]);

  const targetData = isOptimized ? simData?.optimized : simData?.baseline;
  
  const events = [];
  
  // Pre-tick interventions
  if (isOptimized && targetData?.intervened_nodes?.length > 0) {
    targetData.intervened_nodes.forEach(id => {
      events.push({ tick: 0, type: 'intervene', node: id, msg: `Node ${id} secured by optimization algorithm.` });
    });
  }

  // Ticks
  if (targetData?.ticks) {
    targetData.ticks.forEach(tick => {
      if (tick.step <= currentTick) {
        (tick.newly_infected || []).forEach(id => {
          events.push({ tick: tick.step, type: 'infect', node: id, msg: `Node ${id} compromised by contagion.` });
        });
      }
    });
  }
  
  // Sort by tick
  events.sort((a, b) => a.tick - b.tick);

  return (
    <div className="absolute top-6 right-6 z-10 w-80 max-h-[60%] flex flex-col bg-black/80 rounded-2xl border border-gray-800/60 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden">
      <div className="bg-gray-900/80 px-4 py-3 border-b border-gray-800/60 flex items-center justify-between">
        <h3 className="font-bold text-gray-200 text-sm tracking-wide uppercase">Simulation Feed</h3>
        <span className="text-xs font-mono text-blue-400 bg-blue-900/30 px-2 py-1 rounded">TICK {currentTick}</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {events.map((ev, i) => (
          <div key={i} className="flex gap-3 items-start animate-fade-in-up">
            <div className={`mt-0.5 shrink-0 p-1.5 rounded-full ${ev.type === 'intervene' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {ev.type === 'intervene' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-300 leading-relaxed">{ev.msg}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">T={ev.tick}.00</p>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center text-gray-500 text-xs py-4">No events logged yet.</div>
        )}
      </div>
    </div>
  );
};

export default EventLog;
