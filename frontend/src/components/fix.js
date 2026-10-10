const fs = require('fs');
let code = fs.readFileSync('BenchmarkPanel.jsx', 'utf8');
if (!code.includes('onBack,')) {
    code = code.replace('export default function BenchmarkPanel({', 'export default function BenchmarkPanel({ onBack,');
}
code = code.replace('<div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">', 
<div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full relative">
      {onBack && (
        <button onClick={onBack} className="absolute top-8 right-8 bg-black/80 hover:bg-white hover:text-black border border-white/20 text-white px-4 py-1.5 rounded-full text-[10px] font-bold transition-all shadow-[0_0_16px_rgba(0,0,0,0.5)] tracking-widest uppercase flex items-center gap-2 z-50">
          <ArrowLeft size={14} /> Go Back to Configuration
        </button>
      )});
fs.writeFileSync('BenchmarkPanel.jsx', code);
