import React, { useState, useMemo } from 'react';
import { Search, Plus, Info } from 'lucide-react';
import { GRAPHVIZ_ATTRIBUTES, AttributeDefinition } from '../lib/attributes';

interface AttributeSelectorProps {
  type: 'node' | 'edge' | 'subgraph' | 'graph';
  onSelect: (key: string) => void;
  existingAttributes: Record<string, any>;
  engine?: string;
}

export const AttributeSelector: React.FC<AttributeSelectorProps> = ({ type, onSelect, existingAttributes, engine }) => {
  const [search, setSearch] = useState('');

  const filteredAttributes = useMemo(() => {
    return GRAPHVIZ_ATTRIBUTES.filter(attr => {
      // Filter by type
      const matchesType = attr.type === 'all' || 
                          (type === 'node' && attr.type === 'node') || 
                          (type === 'edge' && attr.type === 'edge') ||
                          (type === 'graph' && attr.type === 'graph') ||
                          (type === 'subgraph' && attr.type === 'graph');
      
      // Filter by engine
      const matchesEngine = !attr.engines || !engine || attr.engines.includes(engine);

      // Filter by search
      const matchesSearch = attr.key.toLowerCase().includes(search.toLowerCase()) || 
                            attr.label.toLowerCase().includes(search.toLowerCase()) ||
                            attr.description.toLowerCase().includes(search.toLowerCase());
      
      // Filter out existing attributes
      const isNew = !existingAttributes[attr.key];

      return matchesType && matchesEngine && matchesSearch && isNew;
    });
  }, [type, search, existingAttributes, engine]);

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          type="text"
          placeholder="Search attributes..."
          value={search ?? ''}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex-1 min-h-[150px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {filteredAttributes.length > 0 ? (
          filteredAttributes.map((attr) => (
            <button
              key={attr.key}
              onClick={() => onSelect(attr.key)}
              className="w-full text-left p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {attr.key}
                </span>
                <Plus size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
              <div className="text-sm font-semibold text-slate-800 mb-1">{attr.label}</div>
              <div className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                {attr.description}
              </div>
              
              {/* Subtle accent line */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform" />
            </button>
          ))
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Info className="mx-auto text-slate-300 mb-2" size={20} />
            <p className="text-xs text-slate-400">No matching attributes found</p>
          </div>
        )}
      </div>
      
      {/* Manual Add Fallback */}
      {search && !filteredAttributes.some(a => a.key === search.toLowerCase()) && (
        <button
          onClick={() => onSelect(search.toLowerCase())}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors border border-slate-200 border-dashed"
        >
          <Plus size={12} />
          Add attribute "{search}"
        </button>
      )}
    </div>
  );
};
