import React, { useMemo } from 'react';
import { MappingEntry } from '../types';
import { ArrowRight, AlertCircle, Wand2, Check } from 'lucide-react';

interface MappingInterfaceProps {
  mappings: MappingEntry[];
  sourceHeaders: string[];
  onUpdateMapping: (index: number, newSource: string | null) => void;
}

const MappingInterface: React.FC<MappingInterfaceProps> = ({ mappings, sourceHeaders, onUpdateMapping }) => {
  
  // Group mappings by Sheet name for better organization
  const groupedMappings = useMemo(() => {
    const groups: Record<string, { entry: MappingEntry, index: number }[]> = {};
    mappings.forEach((m, idx) => {
      if (!groups[m.targetSheet]) groups[m.targetSheet] = [];
      groups[m.targetSheet].push({ entry: m, index: idx });
    });
    return groups;
  }, [mappings]);

  const getConfidenceBadge = (confidence: string, reason?: string) => {
    switch (confidence) {
      case 'exact':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700"><Check size={10} /> 精确匹配</span>;
      case 'ai-high':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"><Wand2 size={10} /> AI 推荐</span>;
      case 'ai-low':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700"><AlertCircle size={10} /> 可能匹配 ({reason})</span>;
      case 'manual':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">手动修改</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedMappings).map(([sheetName, items]) => {
        // Explicitly type items to avoid "Property 'length' does not exist on type 'unknown'" error
        const typedItems = items as { entry: MappingEntry, index: number }[];
        return (
          <div key={sheetName} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">目标工作表: {sheetName}</h3>
              <span className="text-xs text-slate-500">共 {typedItems.length} 列</span>
            </div>
            <div className="divide-y divide-slate-100">
              {typedItems.map(({ entry, index }) => (
                <div key={index} className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-slate-50/50 transition-colors">
                  {/* Target Column (Template) */}
                  <div className="col-span-5">
                    <p className="text-sm font-medium text-slate-800 break-words" title={entry.targetHeaderName}>
                      {entry.targetHeaderName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">列 {entry.targetColumnIndex} ({String.fromCharCode(64 + entry.targetColumnIndex)})</p>
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 flex justify-center text-slate-300">
                    <ArrowRight size={16} />
                  </div>

                  {/* Source Column (Dropdown) */}
                  <div className="col-span-6 flex items-center gap-3">
                    <div className="flex-1">
                      <select
                        value={entry.sourceColumn || ''}
                        onChange={(e) => onUpdateMapping(index, e.target.value || null)}
                        style={{ colorScheme: 'light' }}
                        className={`
                          w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 bg-white
                          ${!entry.sourceColumn ? 'text-slate-400 border-dashed' : 'text-slate-900'}
                        `}
                      >
                        <option value="" className="bg-white text-slate-400">(忽略此列 / 留空)</option>
                        {sourceHeaders.map(header => (
                          <option key={header} value={header} className="bg-white text-slate-900">{header}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 flex-shrink-0 flex justify-end">
                      {getConfidenceBadge(entry.confidence, entry.reasoning)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MappingInterface;