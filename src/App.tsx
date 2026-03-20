import React, { useState, useEffect, useRef } from 'react';
import { GraphState, generateDot, createNode, createEdge, createSubgraph, GraphElement, NodeElement, EdgeElement, SubgraphElement } from './lib/graph';
import { renderDot } from './lib/render';
import { MousePointer2, Plus, ArrowRight, Settings, Code, LayoutTemplate, Download, Trash2, X, Check } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const SHAPES = [
  'box', 'polygon', 'ellipse', 'oval', 'circle', 'point', 'egg', 'triangle', 'plaintext', 'plain', 'diamond', 
  'trapezium', 'parallelogram', 'house', 'pentagon', 'hexagon', 'septagon', 'octagon', 'doublecircle', 
  'doubleoctagon', 'tripleoctagon', 'invtriangle', 'invtrapezium', 'invhouse', 'mdiamond', 'msquare', 
  'mcircle', 'rect', 'rectangle', 'square', 'star', 'cylinder', 'note', 'tab', 'folder', 'box3d', 
  'component', 'promite', 'cds', 'record', 'mrecord', 'underline', 'none'
];

const STYLES = ['solid', 'dashed', 'dotted', 'bold', 'rounded', 'filled', 'striped', 'wedged', 'invis', 'diagonals'];

const ARROWS = [
  'normal', 'inv', 'dot', 'invdot', 'odot', 'invodot', 'none', 'tee', 'empty', 'invempty', 
  'diamond', 'odiamond', 'box', 'obox', 'open', 'halfopen', 'vee', 'crow', 'box', 'box', 'box'
];

const RANKDIRS = ['TB', 'BT', 'LR', 'RL'];

const ENGINES = [
  { id: 'dot', name: 'dot (Hierarchical)' },
  { id: 'neato', name: 'neato (Spring)' },
  { id: 'fdp', name: 'fdp (Spring)' },
  { id: 'sfdp', name: 'sfdp (Large Spring)' },
  { id: 'circo', name: 'circo (Circular)' },
  { id: 'twopi', name: 'twopi (Radial)' },
  { id: 'osage', name: 'osage (Array)' },
  { id: 'patchwork', name: 'patchwork (Squarified)' },
  { id: 'nop', name: 'nop (Pre-laid out)' },
  { id: 'nop1', name: 'nop1' },
  { id: 'nop2', name: 'nop2' },
];

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b'
];

const startNode = createNode({ label: 'Start' });
const endNode = createNode({ label: 'End' });

const initialGraph: GraphState = {
  type: 'digraph',
  id: 'G',
  strict: false,
  attributes: { rankdir: 'TB' },
  nodeAttributes: { shape: 'box', style: 'rounded' },
  edgeAttributes: {},
  elements: [
    startNode,
    endNode,
    createEdge(startNode.id, endNode.id)
  ]
};

export default function App() {
  const [graph, setGraph] = useState<GraphState>(initialGraph);
  const [svg, setSvg] = useState<string>('');
  const [engine, setEngine] = useState<string>('dot');
  const [tool, setTool] = useState<'select' | 'add_node' | 'add_edge'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edgeSourceId, setEdgeSourceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [showElementDefaults, setShowElementDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showClearModal, setShowClearModal] = useState(false);

  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = generateDot(graph);
    renderDot(dot, engine)
      .then(res => {
        setSvg(res);
        setError(null);
      })
      .catch(err => {
        setError(err.message);
      });
  }, [graph, engine]);

  const handleSvgClick = (e: React.MouseEvent) => {
    if (viewMode !== 'visual') return;

    const target = e.target as Element;
    const g = target.closest('g.node, g.edge, g.cluster');
    
    if (!g) {
      if (tool === 'select') {
        setSelectedId(null);
      }
      return;
    }

    const id = g.id;

    if (tool === 'select') {
      setSelectedId(id);
      setShowElementDefaults(false);
    } else if (tool === 'add_edge') {
      if (g.classList.contains('node') || g.classList.contains('cluster')) {
        if (!edgeSourceId) {
          setEdgeSourceId(id);
        } else {
          if (edgeSourceId !== id) {
            const newEdge = createEdge(edgeSourceId, id);
            setGraph(prev => ({ ...prev, elements: [...prev.elements, newEdge] }));
          }
          setEdgeSourceId(null);
          setTool('select');
        }
      }
    }
  };

  const handleAddNode = () => {
    // Count total nodes to generate a label
    let nodeCount = 0;
    const countNodes = (elements: GraphElement[]) => {
      for (const el of elements) {
        if (el.type === 'node') nodeCount++;
        if (el.type === 'subgraph') countNodes((el as SubgraphElement).elements);
      }
    };
    countNodes(graph.elements);

    const newNode = createNode({ label: `Node ${nodeCount + 1}` });
    
    if (selectedElement?.type === 'subgraph') {
      setGraph(prev => ({
        ...prev,
        elements: updateElement(prev.elements, selectedId!, el => ({
          ...el,
          elements: [...(el as SubgraphElement).elements, newNode]
        }))
      }));
    } else {
      setGraph(prev => ({ ...prev, elements: [...prev.elements, newNode] }));
    }
    setSelectedId(newNode.id);
    setShowElementDefaults(false);
  };

  const handleAddSubgraph = () => {
    let subCount = 0;
    const countSubs = (elements: GraphElement[]) => {
      for (const el of elements) {
        if (el.type === 'subgraph') {
          subCount++;
          countSubs((el as SubgraphElement).elements);
        }
      }
    };
    countSubs(graph.elements);

    const newSub = createSubgraph({ label: `Cluster ${subCount + 1}` });
    
    if (selectedElement?.type === 'subgraph') {
      setGraph(prev => ({
        ...prev,
        elements: updateElement(prev.elements, selectedId!, el => ({
          ...el,
          elements: [...(el as SubgraphElement).elements, newSub]
        }))
      }));
    } else {
      setGraph(prev => ({ ...prev, elements: [...prev.elements, newSub] }));
    }
    setSelectedId(newSub.id);
    setShowElementDefaults(false);
  };

  const findElement = (elements: GraphElement[], id: string): GraphElement | null => {
    for (const el of elements) {
      if (el.id === id) return el;
      if (el.type === 'subgraph') {
        const found = findElement((el as SubgraphElement).elements, id);
        if (found) return found;
      }
    }
    return null;
  };

  const updateElement = (elements: GraphElement[], id: string, updater: (el: GraphElement) => GraphElement): GraphElement[] => {
    return elements.map(el => {
      if (el.id === id) return updater(el);
      if (el.type === 'subgraph') {
        return { ...el, elements: updateElement((el as SubgraphElement).elements, id, updater) };
      }
      return el;
    });
  };

  const deleteElement = (elements: GraphElement[], id: string): GraphElement[] => {
    return elements.filter(el => {
      if (el.id === id) return false;
      if (el.type === 'subgraph') {
        (el as SubgraphElement).elements = deleteElement((el as SubgraphElement).elements, id);
      }
      return true;
    });
  };

  const selectedElement = selectedId ? findElement(graph.elements, selectedId) : null;

  const handleAttributeChange = (key: string, value: string) => {
    if (!selectedId) return;
    setGraph(prev => ({
      ...prev,
      elements: updateElement(prev.elements, selectedId, el => ({
        ...el,
        attributes: { ...el.attributes, [key]: value }
      }))
    }));
  };

  const handleRemoveAttribute = (key: string) => {
    if (!selectedId) return;
    setGraph(prev => ({
      ...prev,
      elements: updateElement(prev.elements, selectedId, el => {
        const newAttrs = { ...el.attributes };
        delete newAttrs[key];
        return { ...el, attributes: newAttrs };
      })
    }));
  };

  const handleGraphAttributeChange = (key: string, value: string) => {
    setGraph(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value }
    }));
  };

  const handleRemoveGraphAttribute = (key: string) => {
    setGraph(prev => {
      const newAttrs = { ...prev.attributes };
      delete newAttrs[key];
      return { ...prev, attributes: newAttrs };
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setGraph(prev => {
      let newElements = deleteElement(prev.elements, selectedId);
      if (selectedElement?.type === 'node' || selectedElement?.type === 'subgraph') {
        newElements = newElements.filter(el => {
          if (el.type === 'edge') {
            const edge = el as EdgeElement;
            return edge.source !== selectedId && edge.target !== selectedId;
          }
          return true;
        });
      }
      return { ...prev, elements: newElements };
    });
    setSelectedId(null);
  };

  const getElementLabel = (id: string) => {
    const el = findElement(graph.elements, id);
    return el?.attributes.label || id;
  };

  const AttributePicker = ({ label, value, options, onChange, onRemove }: { label: string, value: string, options: string[], onChange: (v: string) => void, onRemove: () => void }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  const ColorPicker = ({ label, value, onChange, onRemove }: { label: string, value: string, onChange: (v: string) => void, onRemove: () => void }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-md border border-slate-200 transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="relative w-6 h-6 rounded-md border border-slate-200 overflow-hidden hover:scale-110 transition-transform">
          <input
            type="color"
            value={value.startsWith('#') ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[10px] font-bold text-slate-400 pointer-events-none">
            +
          </div>
        </div>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#hex or color name"
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );

  const renderAttributeInput = (key: string, value: string, onChange: (v: string) => void, onRemove: () => void) => {
    if (key === 'shape') return <AttributePicker label={key} value={value} options={SHAPES} onChange={onChange} onRemove={onRemove} />;
    if (key === 'style') return <AttributePicker label={key} value={value} options={STYLES} onChange={onChange} onRemove={onRemove} />;
    if (key === 'arrowhead' || key === 'arrowtail') return <AttributePicker label={key} value={value} options={ARROWS} onChange={onChange} onRemove={onRemove} />;
    if (key === 'rankdir') return <AttributePicker label={key} value={value} options={RANKDIRS} onChange={onChange} onRemove={onRemove} />;
    if (key === 'color' || key === 'fillcolor' || key === 'fontcolor' || key === 'bgcolor') return <ColorPicker label={key} value={value} onChange={onChange} onRemove={onRemove} />;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-700">{key}</label>
          <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={key === 'label' ? 'e.g., { a | b | c } for records' : ''}
        />
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans">
      {/* Toolbar */}
      <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4 z-10">
        <button
          className={`p-3 rounded-xl transition-colors ${tool === 'select' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
          onClick={() => { setTool('select'); setEdgeSourceId(null); }}
          title="Select"
        >
          <MousePointer2 size={24} />
        </button>
        <button
          className={`p-3 rounded-xl transition-colors text-slate-500 hover:bg-slate-100`}
          onClick={handleAddNode}
          title="Add Node"
        >
          <Plus size={24} />
        </button>
        <button
          className={`p-3 rounded-xl transition-colors text-slate-500 hover:bg-slate-100`}
          onClick={handleAddSubgraph}
          title="Add Subgraph"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M8 8h8v8H8z"/></svg>
        </button>
        <button
          className={`p-3 rounded-xl transition-colors ${tool === 'add_edge' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
          onClick={() => { setTool('add_edge'); setSelectedId(null); }}
          title="Add Edge"
        >
          <ArrowRight size={24} />
        </button>
        <div className="flex-1" />
        <button
          className={`p-3 rounded-xl transition-colors ${viewMode === 'visual' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
          onClick={() => setViewMode('visual')}
          title="Visual Editor"
        >
          <LayoutTemplate size={24} />
        </button>
        <button
          className={`p-3 rounded-xl transition-colors ${viewMode === 'code' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
          onClick={() => setViewMode('code')}
          title="DOT Code"
        >
          <Code size={24} />
        </button>
        <div className="w-8 h-px bg-slate-200" />
        <button
          className={`p-3 rounded-xl transition-colors text-red-500 hover:bg-red-50`}
          onClick={() => setShowClearModal(true)}
          title="Clear Graph"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between z-10">
          <div className="flex items-baseline gap-2">
            <h1 className="font-semibold text-lg text-slate-800">PanGraphic</h1>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Alabaster</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowElementDefaults(false); setSelectedId(null); }}
              className="text-sm font-medium flex items-center gap-1 text-slate-600 hover:text-slate-900"
            >
              <Settings size={14} />
              Graph Properties
            </button>
            <button
              onClick={() => setShowElementDefaults(!showElementDefaults)}
              className={`text-sm font-medium flex items-center gap-1 ${showElementDefaults ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Settings size={14} />
              Element Defaults
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateDot(graph));
              }}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
            <button
              onClick={() => {
                const blob = new Blob([generateDot(graph)], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'graph.dot';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
            >
              <Download size={14} />
              DOT
            </button>
            <button
              onClick={() => {
                const blob = new Blob([svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'graph.svg';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
            >
              <Download size={14} />
              SVG
            </button>
            <button
              onClick={() => {
                const canvas = document.createElement('canvas');
                const img = new Image();
                const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                
                img.onload = () => {
                  canvas.width = img.width * 2; // High res
                  canvas.height = img.height * 2;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const pngUrl = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = pngUrl;
                    a.download = 'graph.png';
                    a.click();
                  }
                  URL.revokeObjectURL(url);
                };
                img.src = url;
              }}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
            >
              <Download size={14} />
              PNG
            </button>
            <button
              onClick={() => {
                const canvas = document.createElement('canvas');
                const img = new Image();
                const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                
                img.onload = () => {
                  canvas.width = img.width * 2;
                  canvas.height = img.height * 2;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const jpgUrl = canvas.toDataURL('image/jpeg', 0.9);
                    const a = document.createElement('a');
                    a.href = jpgUrl;
                    a.download = 'graph.jpg';
                    a.click();
                  }
                  URL.revokeObjectURL(url);
                };
                img.src = url;
              }}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
            >
              <Download size={14} />
              JPG
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            <span className="text-sm text-slate-500">Layout Engine:</span>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ENGINES.map(eng => (
                <option key={eng.id} value={eng.id}>{eng.name}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Canvas / Code */}
        <div className="flex-1 overflow-auto relative bg-slate-50">
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 z-20 shadow-sm">
              <p className="font-medium">Graphviz Error</p>
              <pre className="text-sm mt-1 whitespace-pre-wrap">{error}</pre>
            </div>
          )}
          
          {viewMode === 'visual' ? (
            <div className="w-full h-full cursor-crosshair" onClick={handleSvgClick} ref={svgContainerRef}>
              <TransformWrapper
                initialScale={1}
                minScale={0.1}
                maxScale={10}
                centerOnInit
                limitToBounds={false}
              >
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                  <div className="svg-container w-full h-full flex items-center justify-center bg-grid bg-white">
                    <style>
                      {`
                        .svg-container g { transition: opacity 0.2s; }
                        ${selectedId ? `
                          .svg-container g.node, .svg-container g.edge, .svg-container g.cluster { opacity: 0.3; }
                          .svg-container g#${selectedId} { opacity: 1; }
                          .svg-container g#${selectedId} polygon, .svg-container g#${selectedId} ellipse, .svg-container g#${selectedId} path { stroke: #4f46e5 !important; stroke-width: 2px !important; }
                        ` : ''}
                      `}
                    </style>
                    <div dangerouslySetInnerHTML={{ __html: svg }} />
                  </div>
                </TransformComponent>
              </TransformWrapper>
            </div>
          ) : (
            <div className="w-full h-full p-6">
              <textarea
                className="w-full h-full font-mono text-sm p-4 bg-slate-900 text-slate-50 rounded-xl shadow-inner focus:outline-none"
                value={generateDot(graph)}
                readOnly
              />
            </div>
          )}

          {/* Edge Source Indicator */}
          {tool === 'add_edge' && edgeSourceId && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select target node for edge
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <div className={`w-80 bg-white border-l border-slate-200 flex flex-col z-10 ${showElementDefaults ? 'hidden' : ''}`}>
        <div className="h-14 border-b border-slate-200 flex items-center px-6 justify-between">
          <div className="flex items-center">
            <Settings size={20} className="text-slate-400 mr-2" />
            <h2 className="font-semibold text-slate-800">Properties</h2>
          </div>
          {selectedId && (
            <button 
              onClick={() => setSelectedId(null)}
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear Selection"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {selectedElement ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Element Type</h3>
                <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-medium capitalize">
                  {selectedElement.type}
                </div>
              </div>

              {selectedElement.type === 'edge' && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Connection</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="truncate flex-1 font-mono text-xs" title={(selectedElement as EdgeElement).source}>{getElementLabel((selectedElement as EdgeElement).source)}</span>
                    <ArrowRight size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate flex-1 font-mono text-xs" title={(selectedElement as EdgeElement).target}>{getElementLabel((selectedElement as EdgeElement).target)}</span>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Attributes</h3>
                <div className="space-y-4">
                  {Object.entries(selectedElement.attributes).map(([key, value]) => (
                    <div key={key}>
                      {renderAttributeInput(
                        key, 
                        value as string, 
                        (v: string) => handleAttributeChange(key, v), 
                        () => handleRemoveAttribute(key)
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Add Attributes</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'label', label: 'Label' },
                    { key: 'shape', label: 'Shape' },
                    { key: 'color', label: 'Color' },
                    { key: 'fillcolor', label: 'Fill' },
                    { key: 'style', label: 'Style' },
                    { key: 'fontname', label: 'Font Name' },
                    { key: 'fontcolor', label: 'Font Color' },
                    { key: 'fontsize', label: 'Font Size' },
                    { key: 'width', label: 'Width' },
                    { key: 'height', label: 'Height' },
                    { key: 'penwidth', label: 'Pen Width' },
                    { key: 'margin', label: 'Margin' },
                    { key: 'tooltip', label: 'Tooltip' },
                    ...(selectedElement.type === 'node' ? [
                      { key: 'fixedsize', label: 'Fixed Size' },
                      { key: 'imagescale', label: 'Image Scale' },
                      { key: 'image', label: 'Image URL' },
                    ] : []),
                    ...(selectedElement.type === 'edge' ? [
                      { key: 'arrowhead', label: 'Arrow Head' },
                      { key: 'arrowtail', label: 'Arrow Tail' },
                      { key: 'dir', label: 'Direction' },
                      { key: 'weight', label: 'Weight' },
                      { key: 'len', label: 'Length' },
                      { key: 'headlabel', label: 'Head Label' },
                      { key: 'taillabel', label: 'Tail Label' },
                      { key: 'constraint', label: 'Constraint' },
                    ] : [])
                  ].filter(attr => !selectedElement.attributes[attr.key]).map(attr => (
                    <button
                      key={attr.key}
                      onClick={() => handleAttributeChange(attr.key, '')}
                      className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                    >
                      + {attr.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const keyInput = form.elements.namedItem('key') as HTMLInputElement;
                    const valInput = form.elements.namedItem('value') as HTMLInputElement;
                    if (keyInput.value && valInput.value) {
                      handleAttributeChange(keyInput.value, valInput.value);
                      keyInput.value = '';
                      valInput.value = '';
                    }
                  }}
                  className="flex flex-col gap-2"
                >
                  <input name="key" placeholder="Key (e.g., color)" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input name="value" placeholder="Value (e.g., red)" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="submit" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors mt-1">
                    Add
                  </button>
                </form>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Entity Cheat Sheet</h3>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">HTML Label</span>
                    <span className="text-indigo-600">{'<TABLE>...</TABLE>'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Line Break</span>
                    <span className="text-indigo-600">\n or \l or \r</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Space</span>
                    <span className="text-indigo-600">&amp;nbsp;</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Quotes</span>
                    <span className="text-indigo-600">&amp;quot;</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Ampersand</span>
                    <span className="text-indigo-600">&amp;amp;</span>
                  </div>
                  <p className="text-[9px] text-slate-400 pt-1 border-t border-slate-200">
                    Use &lt; &gt; around labels for HTML support.
                  </p>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={handleDeleteSelected}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Delete Element
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Graph Type</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                  <button
                    className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${graph.type === 'digraph' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    onClick={() => setGraph(prev => ({ ...prev, type: 'digraph' }))}
                  >
                    Directed
                  </button>
                  <button
                    className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${graph.type === 'graph' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    onClick={() => setGraph(prev => ({ ...prev, type: 'graph' }))}
                  >
                    Undirected
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={graph.strict} 
                    onChange={(e) => setGraph(prev => ({ ...prev, strict: e.target.checked }))}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Strict (No multi-edges)
                </label>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Graph Attributes</h3>
                <div className="space-y-4">
                  {Object.entries(graph.attributes).map(([key, value]) => (
                    <div key={key}>
                      {renderAttributeInput(
                        key, 
                        value as string, 
                        (v: string) => handleGraphAttributeChange(key, v), 
                        () => handleRemoveGraphAttribute(key)
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Add Global Attributes</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'rankdir', label: 'Rank Direction', target: 'graph' },
                    { key: 'nodesep', label: 'Node Sep', target: 'graph' },
                    { key: 'ranksep', label: 'Rank Sep', target: 'graph' },
                    { key: 'splines', label: 'Splines', target: 'graph' },
                    { key: 'bgcolor', label: 'BG Color', target: 'graph' },
                    { key: 'fontname', label: 'Global Font', target: 'graph' },
                    { key: 'labelloc', label: 'Label Loc', target: 'graph' },
                    { key: 'labeljust', label: 'Label Just', target: 'graph' },
                    { key: 'overlap', label: 'Overlap', target: 'graph' },
                    { key: 'sep', label: 'Sep', target: 'graph' },
                    { key: 'concentrate', label: 'Concentrate', target: 'graph' },
                    { key: 'ratio', label: 'Ratio', target: 'graph' },
                  ].map(attr => (
                    <button
                      key={`${attr.target}-${attr.key}`}
                      onClick={() => {
                        setGraph(prev => {
                          if (attr.target === 'graph') return { ...prev, attributes: { ...prev.attributes, [attr.key]: '' } };
                          if (attr.target === 'node') return { ...prev, nodeAttributes: { ...prev.nodeAttributes, [attr.key]: '' } };
                          return { ...prev, edgeAttributes: { ...prev.edgeAttributes, [attr.key]: '' } };
                        });
                      }}
                      className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                    >
                      + {attr.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Element Defaults Panel */}
      <div className={`w-80 bg-white border-l border-slate-200 flex flex-col z-10 ${showElementDefaults ? '' : 'hidden'}`}>
        <div className="h-14 border-b border-slate-200 flex items-center px-6 justify-between">
          <div className="flex items-center">
            <Settings size={20} className="text-slate-400 mr-2" />
            <h2 className="font-semibold text-slate-800">Element Defaults</h2>
          </div>
          <button 
            onClick={() => setShowElementDefaults(false)}
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Node Attributes */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Node Attributes</h3>
              <div className="space-y-4">
                {Object.entries(graph.nodeAttributes).map(([key, value]) => (
                  <div key={key}>
                    {renderAttributeInput(
                      key, 
                      value as string, 
                      (v: string) => setGraph(prev => ({ ...prev, nodeAttributes: { ...prev.nodeAttributes, [key]: v } })), 
                      () => setGraph(prev => {
                        const next = { ...prev.nodeAttributes };
                        delete next[key];
                        return { ...prev, nodeAttributes: next };
                      })
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Add Node Attributes</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'shape', label: 'Shape' },
                    { key: 'style', label: 'Style' },
                    { key: 'color', label: 'Color' },
                    { key: 'fillcolor', label: 'Fill Color' },
                    { key: 'fontname', label: 'Font' },
                    { key: 'fontsize', label: 'Size' },
                    { key: 'fontcolor', label: 'Font Color' },
                    { key: 'penwidth', label: 'Pen Width' },
                    { key: 'margin', label: 'Margin' },
                    { key: 'width', label: 'Width' },
                    { key: 'height', label: 'Height' },
                  ].map(attr => (
                    <button
                      key={`node-${attr.key}`}
                      onClick={() => setGraph(prev => ({ ...prev, nodeAttributes: { ...prev.nodeAttributes, [attr.key]: '' } }))}
                      className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                    >
                      + {attr.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Edge Attributes */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Edge Attributes</h3>
              <div className="space-y-4">
                {Object.entries(graph.edgeAttributes).map(([key, value]) => (
                  <div key={key}>
                    {renderAttributeInput(
                      key, 
                      value as string, 
                      (v: string) => setGraph(prev => ({ ...prev, edgeAttributes: { ...prev.edgeAttributes, [key]: v } })), 
                      () => setGraph(prev => {
                        const next = { ...prev.edgeAttributes };
                        delete next[key];
                        return { ...prev, edgeAttributes: next };
                      })
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Add Edge Attributes</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'style', label: 'Style' },
                    { key: 'color', label: 'Color' },
                    { key: 'fontname', label: 'Font' },
                    { key: 'fontsize', label: 'Size' },
                    { key: 'fontcolor', label: 'Font Color' },
                    { key: 'penwidth', label: 'Pen Width' },
                    { key: 'arrowhead', label: 'Arrow Head' },
                    { key: 'arrowtail', label: 'Arrow Tail' },
                    { key: 'dir', label: 'Direction' },
                    { key: 'label', label: 'Label' },
                  ].map(attr => (
                    <button
                      key={`edge-${attr.key}`}
                      onClick={() => setGraph(prev => ({ ...prev, edgeAttributes: { ...prev.edgeAttributes, [attr.key]: '' } }))}
                      className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                    >
                      + {attr.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Clear Graph</h3>
            <p className="text-slate-500 text-sm mb-6">Are you sure you want to clear the graph? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setGraph({
                    type: 'digraph',
                    id: 'G',
                    strict: false,
                    attributes: { rankdir: 'TB' },
                    nodeAttributes: { shape: 'box', style: 'rounded' },
                    edgeAttributes: {},
                    elements: []
                  });
                  setSelectedId(null);
                  setShowClearModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Clear Graph
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
