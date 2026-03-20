import Editor, { useMonaco } from '@monaco-editor/react';
import React, { useState, useEffect, useRef } from 'react';
import { GraphState, generateDot, parseDot, createNode, createEdge, createSubgraph, GraphElement, NodeElement, EdgeElement, SubgraphElement } from './lib/graph';
import { renderDot } from './lib/render';
import { MousePointer2, Plus, ArrowRight, Settings, Code, LayoutTemplate, Download, Trash2, X, Check, Wrench, Share2, Link, Image as ImageIcon, AlertCircle, Loader2, Copy, Ban, PanelRight, PanelRightClose } from 'lucide-react';
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

const DEFAULT_PALETTES = [
  // 6 Nodes
  { id: 'p1', type: 'node', color: '#ffffff', shape: 'box', style: 'rounded', fontcolor: 'black' },
  { id: 'p2', type: 'node', color: '#3b82f6', shape: 'ellipse', style: 'filled', fontcolor: 'white' },
  { id: 'p3', type: 'node', color: '#10b981', shape: 'diamond', style: 'filled', fontcolor: 'white' },
  { id: 'p4', type: 'node', color: '#f59e0b', shape: 'cylinder', style: 'filled', fontcolor: 'black' },
  { id: 'p5', type: 'node', color: '#8b5cf6', shape: 'octagon', style: 'filled', fontcolor: 'white' },
  { id: 'p6', type: 'node', color: '#d946ef', shape: 'doublecircle', style: 'filled', fontcolor: 'white' },
  // 3 Edges
  { id: 'p7', type: 'edge', color: '#ef4444', style: 'solid', arrowhead: 'normal', fontcolor: 'white' },
  { id: 'p8', type: 'edge', color: '#10b981', style: 'dotted', arrowhead: 'diamond', fontcolor: 'white' },
  { id: 'p9', type: 'edge', color: '#3b82f6', style: 'dashed', arrowhead: 'vee', fontcolor: 'white' },
  // 1 Subgraph
  { id: 'p10', type: 'subgraph', color: '#f5f5f5', style: 'filled', bgcolor: '#f1f5f9', fontcolor: 'black' },
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
  const [tool, setTool] = useState<'select' | 'multi_select'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [edgeSourceId, setEdgeSourceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [showElementDefaults, setShowElementDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showClearModal, setShowClearModal] = useState(false);
  const [localCode, setLocalCode] = useState<string>('');
  const isCodeChangeRef = useRef(false);
  const [showShareFlyout, setShowShareFlyout] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string>('');

  const [palettes, setPalettes] = useState(DEFAULT_PALETTES);
  const [activeNodePaletteId, setActiveNodePaletteId] = useState<string | null>('p1');
  const [activeEdgePaletteId, setActiveEdgePaletteId] = useState<string | null>('p7');
  const [activeSubgraphPaletteId, setActiveSubgraphPaletteId] = useState<string | null>('p10');
  const [hoveredPaletteId, setHoveredPaletteId] = useState<string | null>(null);
  const [showRingMenu, setShowRingMenu] = useState(false);
  const [ringMenuPos, setRingMenuPos] = useState({ x: 0, y: 0 });
  const [mouseState, setMouseState] = useState<{
    button: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    isHolding: boolean;
    targetId: string | null;
    startTime: number;
  } | null>(null);

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const shareFlyoutRef = useRef<HTMLDivElement>(null);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPropertiesPaneOpen, setIsPropertiesPaneOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsPropertiesPaneOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareFlyoutRef.current && !shareFlyoutRef.current.contains(event.target as Node)) {
        setShowShareFlyout(false);
        setTimeout(() => setShareStatus('idle'), 200);
      }
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setShowDownloadDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShare = async (type: 'dot' | 'svg') => {
    setShareStatus('loading');
    try {
      const content = type === 'dot' ? generateDot(graph) : svg;
      const contentType = type === 'dot' ? 'text/plain' : 'image/svg+xml';
      
      const response = await fetch('https://bytebin.lucko.me/post', {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: content,
      });
      
      if (!response.ok) throw new Error('Failed to share');
      
      const data = await response.json();
      const url = `https://bytebin.lucko.me/${data.key}`;
      setShareUrl(url);
      setShareStatus('success');
    } catch (err) {
      console.error(err);
      setShareStatus('error');
    }
  };

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'visual') return;
    
    if (!svgContainerRef.current?.contains(e.target as Node)) return;

    const target = e.target as Element;
    const g = target.closest('g.node, g.edge, g.cluster');
    const targetId = g ? g.id : null;

    if (e.button === 0 && targetId) {
      e.stopPropagation();
    }

    const startX = e.clientX;
    const startY = e.clientY;

    setMouseState({
      button: e.button,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
      isDragging: false,
      isHolding: false,
      targetId,
      startTime: Date.now()
    });

    if (e.button === 0) {
      holdTimeoutRef.current = setTimeout(() => {
        setMouseState(prev => prev ? { ...prev, isHolding: true } : null);
        setShowRingMenu(true);
        setRingMenuPos({ x: startX, y: startY });
      }, 500);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (viewMode !== 'visual') return;
    // Allow default context menu
  };

  const getTotalNodeCount = (elements: GraphElement[]): number => {
    let count = 0;
    for (const el of elements) {
      if (el.type === 'node') count++;
      if (el.type === 'subgraph') count += getTotalNodeCount((el as SubgraphElement).elements);
    }
    return count;
  };

  const addElementToGraph = (newEl: GraphElement) => {
    if (selectedElement?.type === 'subgraph') {
      setGraph(prev => ({
        ...prev,
        elements: updateElement(prev.elements, selectedId!, el => ({
          ...el,
          elements: [...(el as SubgraphElement).elements, newEl]
        }))
      }));
    } else {
      setGraph(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    }
    setSelectedId(newEl.id);
    setShowElementDefaults(false);
  };

  useEffect(() => {
    if (!mouseState) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - mouseState.startX;
      const dy = e.clientY - mouseState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5 && !mouseState.isDragging) {
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
        setMouseState(prev => prev ? { ...prev, isDragging: true, currentX: e.clientX, currentY: e.clientY } : null);
      } else if (mouseState.isDragging) {
        setMouseState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    
    const state = mouseState;
    setMouseState(null);
    if (!state) return;

    const { button, isDragging, isHolding, targetId, startX, startY } = state;

    if (isHolding) return;

    // Check for drop on palette button
    if (isDragging && hoveredPaletteId && targetId) {
      const el = findElement(graph.elements, targetId);
      if (el) {
        setPalettes(prev => prev.map(p => {
          if (p.id !== hoveredPaletteId || p.type !== el.type) return p;
          const base = el.type === 'node' ? { color: '#ffffff', shape: 'box', style: 'rounded', fontcolor: 'black' } :
                       el.type === 'edge' ? { color: '#000000', style: 'solid', arrowhead: 'normal', fontcolor: 'white' } :
                       { color: '#f5f5f5', style: 'filled', bgcolor: '#f1f5f9', fontcolor: 'black' };
          return { 
            id: p.id, 
            type: p.type,
            ...base,
            ...el.attributes,
            color: el.attributes.color || el.attributes.fillcolor || el.attributes.bgcolor || base.color
          };
        }));
        return;
      }
    }

    const target = document.elementFromPoint(e.clientX, e.clientY);
    const g = target?.closest('g.node, g.edge, g.cluster');
    const endTargetId = g ? g.id : null;
    const isLabelClick = target?.tagName.toLowerCase() === 'text';

    if (button === 0) {
      if (!isDragging) {
        if (targetId) {
          if (tool === 'multi_select') {
            setSelectedIds(prev => {
              const newIds = prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId];
              if (newIds.length > 0 && window.innerWidth >= 1024) setIsPropertiesPaneOpen(true);
              return newIds;
            });
          } else {
            setSelectedId(targetId);
            setSelectedIds([]);
            setShowElementDefaults(false);
            if (window.innerWidth >= 1024) setIsPropertiesPaneOpen(true);
            
            // Focus label input if label was clicked
            if (isLabelClick && g?.classList.contains('node')) {
              setTimeout(() => {
                const input = document.getElementById('attr-input-label') as HTMLInputElement;
                if (input) {
                  input.focus();
                  input.select();
                }
              }, 150);
            }
          }
        } else {
          if (tool === 'multi_select') {
            setSelectedIds([]);
          } else {
            setSelectedId(null);
            setSelectedIds([]);
            const newNode = createNode({ label: `Node ${getTotalNodeCount(graph.elements) + 1}` });
            const activePal = palettes.find(p => p.id === activeNodePaletteId);
            if (activePal && activePal.type === 'node') {
              const { id, type, ...attrs } = activePal;
              newNode.attributes = { ...newNode.attributes, ...attrs };
            }
            addElementToGraph(newNode);
            if (window.innerWidth >= 1024) setIsPropertiesPaneOpen(true);
          }
        }
      } else {
        if (targetId && endTargetId && targetId !== endTargetId) {
          const sourceNode = findElement(graph.elements, targetId);
          const targetNode = findElement(graph.elements, endTargetId);
          if (sourceNode?.type !== 'edge' && targetNode?.type !== 'edge') {
            const newEdge = createEdge(targetId, endTargetId);
            const activePal = palettes.find(p => p.id === activeEdgePaletteId);
            if (activePal && activePal.type === 'edge') {
              const { id, type, ...attrs } = activePal;
              newEdge.attributes = { ...newEdge.attributes, ...attrs };
            }
            setGraph(prev => ({ ...prev, elements: [...prev.elements, newEdge] }));
            setSelectedId(newEdge.id);
            setSelectedIds([]);
          }
        }
      }
    }
  };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [mouseState, graph, activeNodePaletteId, activeEdgePaletteId, activeSubgraphPaletteId, tool, edgeSourceId]);

  const handleAddNode = () => {
    const newNode = createNode({ label: `Node ${getTotalNodeCount(graph.elements) + 1}` });
    addElementToGraph(newNode);
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

    const newNode = createNode({ label: 'Node' });
    const activePal = palettes.find(p => p.id === activeNodePaletteId);
    if (activePal && activePal.type === 'node') {
      const { id, type, ...attrs } = activePal;
      newNode.attributes = { ...newNode.attributes, ...attrs };
    }
    const newSub = createSubgraph({ label: `Cluster ${subCount + 1}` });
    const subPal = palettes.find(p => p.id === activeSubgraphPaletteId);
    if (subPal && subPal.type === 'subgraph') {
      const { id, type, ...attrs } = subPal;
      newSub.attributes = { ...newSub.attributes, ...attrs };
    }
    newSub.elements = [newNode];
    
    addElementToGraph(newSub);
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

  const isPaletteMatch = (el: GraphElement, palette: any) => {
    if (el.type !== palette.type) return false;
    const { id, type, color, ...attrs } = palette;
    return Object.entries(attrs).every(([k, v]) => el.attributes[k] === v);
  };

  useEffect(() => {
    if (!isCodeChangeRef.current) {
      setLocalCode(generateDot(graph));
    }
    isCodeChangeRef.current = false;
  }, [graph]);

  const handleCodeChange = (value: string | undefined) => {
    if (!value) return;
    isCodeChangeRef.current = true;
    setLocalCode(value);
    try {
      const newState = parseDot(value);
      setGraph(newState);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse DOT code');
    }
  };

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

  const deleteEdgesPointingTo = (elements: GraphElement[], targetId: string): GraphElement[] => {
    return elements.filter(el => {
      if (el.type === 'edge') {
        const edge = el as EdgeElement;
        return edge.source !== targetId && edge.target !== targetId;
      }
      if (el.type === 'subgraph') {
        (el as SubgraphElement).elements = deleteEdgesPointingTo((el as SubgraphElement).elements, targetId);
      }
      return true;
    });
  };

  const deleteElements = (elements: GraphElement[], ids: string[]): GraphElement[] => {
    return elements.filter(el => {
      if (ids.includes(el.id)) return false;
      if (el.type === 'subgraph') {
        (el as SubgraphElement).elements = deleteElements((el as SubgraphElement).elements, ids);
      }
      return true;
    });
  };

  const deleteEdgesPointingToMultiple = (elements: GraphElement[], ids: string[]): GraphElement[] => {
    return elements.filter(el => {
      if (el.type === 'edge') {
        const edge = el as EdgeElement;
        return !ids.includes(edge.source) && !ids.includes(edge.target);
      }
      if (el.type === 'subgraph') {
        (el as SubgraphElement).elements = deleteEdgesPointingToMultiple((el as SubgraphElement).elements, ids);
      }
      return true;
    });
  };

  const handleDeleteSelected = () => {
    const idsToDelete = selectedId ? [selectedId] : selectedIds;
    if (idsToDelete.length === 0) return;
    
    setGraph(prev => {
      let newElements = deleteElements(prev.elements, idsToDelete);
      newElements = deleteEdgesPointingToMultiple(newElements, idsToDelete);
      return { ...prev, elements: newElements };
    });
    setSelectedId(null);
    setSelectedIds([]);
  };

  const handleMultiAttributeChange = (key: string, value: string) => {
    setGraph(prev => {
      let newElements = prev.elements;
      for (const id of selectedIds) {
        newElements = updateElement(newElements, id, el => ({
          ...el,
          attributes: { ...el.attributes, [key]: value }
        }));
      }
      return { ...prev, elements: newElements };
    });
  };

  const handleMultiRemoveAttribute = (key: string) => {
    setGraph(prev => {
      let newElements = prev.elements;
      for (const id of selectedIds) {
        newElements = updateElement(newElements, id, el => {
          const newAttrs = { ...el.attributes };
          delete newAttrs[key];
          return { ...el, attributes: newAttrs };
        });
      }
      return { ...prev, elements: newElements };
    });
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
          id={`attr-input-${key}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={key === 'label' ? 'e.g., { a | b | c } for records' : ''}
        />
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Toolbar */}
      <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-4 z-10 overflow-y-auto flex-shrink-0">
        {viewMode === 'visual' && (
          <>
            <button
              className={`p-3 rounded-xl transition-colors ${tool === 'select' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
              onClick={() => { setTool('select'); setEdgeSourceId(null); }}
              title="Select"
            >
              <MousePointer2 size={24} />
            </button>
            <button
              className={`p-3 rounded-xl transition-colors ${tool === 'multi_select' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
              onClick={() => { setTool('multi_select'); setSelectedId(null); }}
              title="Multi-Select"
            >
              <div className="relative">
                <MousePointer2 size={24} />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white" />
              </div>
            </button>
            <button
              className={`p-3 rounded-xl transition-colors text-slate-500 hover:bg-slate-100`}
              onClick={handleAddSubgraph}
              title="Add Subgraph"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M8 8h8v8H8z"/></svg>
            </button>
          </>
        )}
        
        {/* Palette Tiles */}
        {viewMode === 'visual' && (
          <div className="flex flex-col gap-2 w-full px-2 mt-2">
            {palettes.map((palette) => {
              const isActive = (palette.type === 'node' && activeNodePaletteId === palette.id) ||
                              (palette.type === 'edge' && activeEdgePaletteId === palette.id) ||
                              (palette.type === 'subgraph' && activeSubgraphPaletteId === palette.id);

              const handlePaletteClick = () => {
                if (isActive) {
                  if (palette.type === 'node') setActiveNodePaletteId(null);
                  else if (palette.type === 'edge') setActiveEdgePaletteId(null);
                  else if (palette.type === 'subgraph') setActiveSubgraphPaletteId(null);
                } else {
                  if (palette.type === 'node') setActiveNodePaletteId(palette.id);
                  else if (palette.type === 'edge') setActiveEdgePaletteId(palette.id);
                  else if (palette.type === 'subgraph') setActiveSubgraphPaletteId(palette.id);
                }
              };

              return (
                <button
                  key={palette.id}
                  data-palette-id={palette.id}
                  onClick={handlePaletteClick}
                  onMouseEnter={() => setHoveredPaletteId(palette.id)}
                  onMouseLeave={() => setHoveredPaletteId(null)}
                  className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center relative ${
                    isActive ? 'border-indigo-500 shadow-md scale-105' : 'border-transparent hover:border-slate-300'
                  } ${hoveredPaletteId === palette.id ? 'bg-indigo-50 border-indigo-300' : ''}`}
                  style={{ backgroundColor: palette.color }}
                  title={`Select Palette ${palette.id} (Drag element here to save style)`}
                >
                  {/* Visual representation of the shape */}
                  {palette.type === 'node' && (
                    <>
                      {(palette.shape === 'box' || !palette.shape) && <div className="w-1/2 h-1/2 border-2" style={{ borderColor: palette.fontcolor || 'black', borderStyle: palette.style === 'dashed' ? 'dashed' : 'solid' }} />}
                      {palette.shape === 'ellipse' && <div className="w-1/2 h-1/2 rounded-full border-2" style={{ borderColor: palette.fontcolor || 'black', borderStyle: palette.style === 'dashed' ? 'dashed' : 'solid' }} />}
                      {palette.shape === 'diamond' && <div className="w-1/2 h-1/2 border-2 rotate-45" style={{ borderColor: palette.fontcolor || 'black', borderStyle: palette.style === 'dashed' ? 'dashed' : 'solid' }} />}
                      {palette.shape === 'cylinder' && <div className="w-1/2 h-1/2 border-2 rounded-t-full rounded-b-full" style={{ borderColor: palette.fontcolor || 'black', borderStyle: palette.style === 'dashed' ? 'dashed' : 'solid' }} />}
                      {palette.shape === 'octagon' && <div className="w-1/2 h-1/2 border-2" style={{ borderColor: palette.fontcolor || 'black', clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }} />}
                      {palette.shape === 'doublecircle' && <div className="w-1/2 h-1/2 rounded-full border-4" style={{ borderColor: palette.fontcolor || 'black' }} />}
                      {palette.shape === 'parallelogram' && <div className="w-1/2 h-1/2 border-2 -skew-x-12" style={{ borderColor: palette.fontcolor || 'black' }} />}
                      {palette.shape === 'star' && <div className="w-1/2 h-1/2 bg-current" style={{ color: palette.fontcolor || 'black', clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />}
                      {palette.shape === 'note' && <div className="w-1/2 h-1/2 border-2 relative" style={{ borderColor: palette.fontcolor || 'black' }}><div className="absolute top-0 right-0 w-2 h-2 border-l border-b" style={{ borderColor: palette.fontcolor || 'black' }} /></div>}
                      {palette.shape === 'component' && <div className="w-1/2 h-1/2 border-2 relative" style={{ borderColor: palette.fontcolor || 'black' }}><div className="absolute -left-1 top-1 w-2 h-1 border" style={{ borderColor: palette.fontcolor || 'black' }} /><div className="absolute -left-1 bottom-1 w-2 h-1 border" style={{ borderColor: palette.fontcolor || 'black' }} /></div>}
                    </>
                  )}
                  {palette.type === 'edge' && (
                    <div className="w-full h-full flex items-center justify-center p-1">
                      <svg width="100%" height="100%" viewBox="0 0 40 40">
                        <line 
                          x1="5" y1="20" x2="30" y2="20" 
                          stroke={palette.fontcolor || 'white'} 
                          strokeWidth="3" 
                          strokeDasharray={palette.style === 'dashed' ? '5 3' : palette.style === 'dotted' ? '1 3' : 'none'}
                        />
                        <path 
                          d="M 30 12 L 38 20 L 30 28 Z" 
                          fill={palette.fontcolor || 'white'} 
                        />
                      </svg>
                    </div>
                  )}
                  {palette.type === 'subgraph' && (
                    <div className="w-1/2 h-1/2 border-2 border-dashed" style={{ borderColor: palette.fontcolor || 'black' }} />
                  )}
                  
                  {/* Type indicator */}
                  <div className="absolute bottom-0.5 right-0.5 text-[8px] font-bold uppercase opacity-50">
                    {palette.type[0]}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1" />
        <button
          className={`p-3 rounded-xl transition-colors ${isPropertiesPaneOpen ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
          onClick={() => setIsPropertiesPaneOpen(!isPropertiesPaneOpen)}
          title={isPropertiesPaneOpen ? "Close Properties" : "Open Properties"}
        >
          {isPropertiesPaneOpen ? <PanelRightClose size={24} /> : <PanelRight size={24} />}
        </button>
        <button
          className={`p-3 rounded-xl transition-colors ${viewMode === 'visual' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
          onClick={() => {
            isCodeChangeRef.current = false;
            setLocalCode(generateDot(graph));
            setViewMode('visual');
          }}
          title="Visual Editor"
        >
          <LayoutTemplate size={24} />
        </button>
        <button
          className={`p-3 rounded-xl transition-colors ${viewMode === 'code' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
          onClick={() => {
            isCodeChangeRef.current = false;
            setLocalCode(generateDot(graph));
            setViewMode('code');
          }}
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
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest hidden md:inline">alabaster</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setShowElementDefaults(false); setSelectedId(null); }}
              className="text-sm font-medium flex items-center gap-1 text-slate-600 hover:text-slate-900"
              title="Graph Properties"
            >
              <Settings size={14} />
              <span className="hidden lg:inline">Graph Properties</span>
            </button>
            <button
              onClick={() => setShowElementDefaults(!showElementDefaults)}
              className={`text-sm font-medium flex items-center gap-1 ${showElementDefaults ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
              title="Element Defaults"
            >
              <Wrench size={14} />
              <span className="hidden lg:inline">Element Defaults</span>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2" />
            {viewMode === 'code' && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateDot(graph));
                  // Add a toast or feedback here if needed
                }}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <Code size={14} />
                <span className="hidden lg:inline">Copy</span>
              </button>
            )}
            <div className="relative" ref={shareFlyoutRef}>
              <button
                onClick={() => setShowShareFlyout(!showShareFlyout)}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <Share2 size={14} />
                <span className="hidden lg:inline">Share</span>
              </button>
              
              {showShareFlyout && (
                <div className="fixed lg:absolute top-16 lg:top-full right-4 lg:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-800 text-sm">Share Graph</h3>
                    <p className="text-xs text-slate-500 mt-1">Upload to a secure open-source pastebin (bytebin).</p>
                  </div>
                  
                  <div className="p-2">
                    {shareStatus === 'idle' && (
                      <div className="space-y-1">
                        <button
                          onClick={() => handleShare('dot')}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                        >
                          <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-md">
                            <Code size={16} />
                          </div>
                          <div>
                            <div className="font-medium">Share DOT Code</div>
                            <div className="text-xs text-slate-500">Upload as text/plain</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleShare('svg')}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                        >
                          <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-md">
                            <ImageIcon size={16} />
                          </div>
                          <div>
                            <div className="font-medium">Share SVG Image</div>
                            <div className="text-xs text-slate-500">Upload as image/svg+xml</div>
                          </div>
                        </button>
                      </div>
                    )}

                    {shareStatus === 'loading' && (
                      <div className="py-8 flex flex-col items-center justify-center text-slate-500">
                        <Loader2 size={24} className="animate-spin mb-2 text-indigo-600" />
                        <span className="text-sm">Uploading...</span>
                      </div>
                    )}

                    {shareStatus === 'success' && (
                      <div className="p-3">
                        <div className="flex items-center gap-2 text-emerald-600 mb-3">
                          <Check size={16} />
                          <span className="text-sm font-medium">Upload successful!</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                          <input 
                            type="text" 
                            value={shareUrl} 
                            readOnly 
                            className="bg-transparent text-sm text-slate-600 flex-1 outline-none min-w-0"
                          />
                          <button
                            onClick={() => navigator.clipboard.writeText(shareUrl)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                            title="Copy URL"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <a 
                          href={shareUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Link size={14} />
                          Open Link
                        </a>
                      </div>
                    )}

                    {shareStatus === 'error' && (
                      <div className="py-6 flex flex-col items-center justify-center text-center px-4">
                        <AlertCircle size={24} className="text-red-500 mb-2" />
                        <div className="text-sm font-medium text-slate-800">Upload Failed</div>
                        <div className="text-xs text-slate-500 mt-1">There was an error uploading your graph. Please try again.</div>
                        <button 
                          onClick={() => setShareStatus('idle')}
                          className="mt-4 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative" ref={downloadDropdownRef}>
              <button
                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                title="Download"
              >
                <Download size={14} />
                <span className="hidden lg:inline">Save</span>
              </button>
              
              {showDownloadDropdown && (
                <div className="fixed lg:absolute top-16 lg:top-full right-4 lg:right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        const blob = new Blob([generateDot(graph)], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'graph.dot';
                        a.click();
                        URL.revokeObjectURL(url);
                        setShowDownloadDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                    >
                      <Code size={14} className="text-slate-400" />
                      DOT Code
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
                        setShowDownloadDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                    >
                      <ImageIcon size={14} className="text-slate-400" />
                      SVG Image
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
                          setShowDownloadDropdown(false);
                        };
                        img.src = url;
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                    >
                      <ImageIcon size={14} className="text-slate-400" />
                      PNG Image
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            <div className="w-full h-full cursor-crosshair" onMouseDown={handleMouseDown} onContextMenu={handleContextMenu} ref={svgContainerRef}>
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
                        ${(selectedId || selectedIds.length > 0) ? `
                          .svg-container g.node, .svg-container g.edge, .svg-container g.cluster { opacity: 0.3; }
                          ${selectedId ? `
                            .svg-container g#${selectedId} { opacity: 1; }
                            .svg-container g#${selectedId} polygon, .svg-container g#${selectedId} ellipse, .svg-container g#${selectedId} path { stroke: #4f46e5 !important; stroke-width: 2px !important; }
                          ` : ''}
                          ${selectedIds.map(id => `
                            .svg-container g#${id} { opacity: 1; }
                            .svg-container g#${id} polygon, .svg-container g#${id} ellipse, .svg-container g#${id} path { stroke: #4f46e5 !important; stroke-width: 2px !important; }
                          `).join('\n')}
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
              <Editor
                height="100%"
                defaultLanguage="dot"
                theme="solarized-dark"
                value={localCode}
                onChange={handleCodeChange}
                options={{
                  readOnly: false,
                  folding: true,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  bracketPairColorization: { enabled: true },
                  guides: { bracketPairs: true, indentation: true },
                  automaticLayout: true,
                  fontSize: 14,
                  tabSize: 2,
                  wordWrap: 'on',
                }}
                onMount={(editor, monaco) => {
                  monaco.editor.defineTheme('solarized-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': '#002b36',
                      'editor.foreground': '#839496',
                    },
                  });
                  monaco.editor.setTheme('solarized-dark');

                  import('./lib/dotLanguage').then(({ registerDotLanguage }) => {
                    registerDotLanguage(monaco);
                  });

                  editor.onDidChangeCursorPosition((e) => {
                    const model = editor.getModel();
                    if (!model) return;
                    const position = e.position;
                    const lineContent = model.getLineContent(position.lineNumber);
                    
                    // Try to find a quoted string under the cursor
                    const regex = /"([^"]+)"/g;
                    let match;
                    while ((match = regex.exec(lineContent)) !== null) {
                      const start = match.index + 1;
                      const end = start + match[1].length;
                      if (position.column >= start && position.column <= end + 1) {
                        const id = match[1];
                        const found = findElement(graph.elements, id);
                        if (found) {
                          setSelectedId(id);
                          setShowElementDefaults(false);
                          return;
                        }
                      }
                    }

                    // Try to find a word under the cursor if not in quotes
                    const word = model.getWordAtPosition(position);
                    if (word) {
                      const found = findElement(graph.elements, word.word);
                      if (found) {
                        setSelectedId(word.word);
                        setShowElementDefaults(false);
                      }
                    }
                  });
                }}
              />
            </div>
          )}

          {/* Edge Source Indicator */}
          {tool === 'add_edge' && edgeSourceId && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select target node for edge
            </div>
          )}
          
          {/* Ring Menu */}
          {showRingMenu && (
            <div 
              className="fixed z-50 pointer-events-auto"
              style={{ left: ringMenuPos.x, top: ringMenuPos.y, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative w-64 h-64">
                {/* SVG Segments */}
                <svg width="256" height="256" viewBox="0 0 256 256" className="absolute inset-0 drop-shadow-xl">
                  {palettes.map((palette, index) => {
                    const segmentAngle = 360 / palettes.length;
                    const startAngle = index * segmentAngle;
                    const endAngle = (index + 1) * segmentAngle;
                    const midAngle = startAngle + segmentAngle / 2;
                    
                    const innerRadius = 40;
                    const outerRadius = 110;
                    const center = 128;
                    
                    // Helper to convert polar to cartesian
                    const polarToX = (r: number, angle: number) => center + r * Math.cos((angle - 90) * Math.PI / 180);
                    const polarToY = (r: number, angle: number) => center + r * Math.sin((angle - 90) * Math.PI / 180);
                    
                    const x1 = polarToX(outerRadius, startAngle);
                    const y1 = polarToY(outerRadius, startAngle);
                    const x2 = polarToX(outerRadius, endAngle);
                    const y2 = polarToY(outerRadius, endAngle);
                    const x3 = polarToX(innerRadius, endAngle);
                    const y3 = polarToY(innerRadius, endAngle);
                    const x4 = polarToX(innerRadius, startAngle);
                    const y4 = polarToY(innerRadius, startAngle);
                    
                    const pathData = [
                      `M ${x1} ${y1}`,
                      `A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2}`,
                      `L ${x3} ${y3}`,
                      `A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4}`,
                      'Z'
                    ].join(' ');
                    
                    const isActive = (palette.type === 'node' && activeNodePaletteId === palette.id) ||
                                     (palette.type === 'edge' && activeEdgePaletteId === palette.id) ||
                                     (palette.type === 'subgraph' && activeSubgraphPaletteId === palette.id) || 
                                     (selectedElement && isPaletteMatch(selectedElement, palette));
                    
                    return (
                      <g 
                        key={palette.id} 
                        className="cursor-pointer group"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedId) {
                            // Apply palette to selected element
                            const el = findElement(graph.elements, selectedId);
                            if (el && el.type === palette.type) {
                              const { id, type, color, ...attrs } = palette;
                              setGraph(prev => ({
                                ...prev,
                                elements: updateElement(prev.elements, selectedId, old => ({
                                  ...old,
                                  attributes: { ...old.attributes, ...attrs }
                                }))
                              }));
                            }
                          } else {
                            if (isActive) {
                              if (palette.type === 'node') setActiveNodePaletteId(null);
                              else if (palette.type === 'edge') setActiveEdgePaletteId(null);
                              else if (palette.type === 'subgraph') setActiveSubgraphPaletteId(null);
                            } else {
                              if (palette.type === 'node') setActiveNodePaletteId(palette.id);
                              else if (palette.type === 'edge') setActiveEdgePaletteId(palette.id);
                              else if (palette.type === 'subgraph') setActiveSubgraphPaletteId(palette.id);
                            }
                          }
                          setShowRingMenu(false);
                        }}
                      >
                        <path 
                          d={pathData} 
                          fill={palette.color}
                          stroke="white"
                          strokeWidth="2"
                          className={`transition-all duration-200 ${isActive ? 'opacity-100 scale-[1.02] stroke-indigo-500 stroke-[3px]' : 'opacity-90 hover:opacity-100 hover:scale-[1.02]'}`}
                          style={{ transformOrigin: 'center' }}
                        />
                        {/* Shape Icon in Segment */}
                        <foreignObject 
                          x={polarToX((innerRadius + outerRadius) / 2, midAngle) - 12}
                          y={polarToY((innerRadius + outerRadius) / 2, midAngle) - 12}
                          width="24"
                          height="24"
                          className="pointer-events-none"
                        >
                          <div className="w-full h-full flex items-center justify-center">
                            {palette.type === 'node' && (
                              <>
                                {palette.shape === 'box' && <div className="w-4 h-4 border-2" style={{ borderColor: palette.fontcolor, borderStyle: palette.style === 'dashed' ? 'dashed' : 'solid' }} />}
                                {palette.shape === 'ellipse' && <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: palette.fontcolor, borderStyle: palette.style === 'dashed' ? 'dashed' : 'solid' }} />}
                                {palette.shape === 'diamond' && <div className="w-4 h-4 border-2 rotate-45" style={{ borderColor: palette.fontcolor, borderStyle: palette.style === 'dashed' ? 'dashed' : 'solid' }} />}
                                {palette.shape === 'cylinder' && <div className="w-4 h-4 border-2 rounded-t-full rounded-b-full" style={{ borderColor: palette.fontcolor, borderStyle: palette.style === 'dashed' ? 'dashed' : 'solid' }} />}
                                {palette.shape === 'octagon' && <div className="w-4 h-4 border-2" style={{ borderColor: palette.fontcolor, clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' }} />}
                                {palette.shape === 'doublecircle' && <div className="w-4 h-4 rounded-full border-4" style={{ borderColor: palette.fontcolor }} />}
                                {palette.shape === 'parallelogram' && <div className="w-4 h-4 border-2 -skew-x-12" style={{ borderColor: palette.fontcolor }} />}
                                {palette.shape === 'star' && <div className="w-4 h-4 bg-current" style={{ color: palette.fontcolor, clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />}
                                {palette.shape === 'note' && <div className="w-4 h-4 border-2 relative" style={{ borderColor: palette.fontcolor }}><div className="absolute top-0 right-0 w-1.5 h-1.5 border-l border-b" style={{ borderColor: palette.fontcolor }} /></div>}
                                {palette.shape === 'component' && <div className="w-4 h-4 border-2 relative" style={{ borderColor: palette.fontcolor }}><div className="absolute -left-1 top-0.5 w-1.5 h-1 border" style={{ borderColor: palette.fontcolor }} /><div className="absolute -left-1 bottom-0.5 w-1.5 h-1 border" style={{ borderColor: palette.fontcolor }} /></div>}
                              </>
                            )}
                            {palette.type === 'edge' && <ArrowRight size={16} style={{ color: palette.fontcolor || 'black' }} />}
                            {palette.type === 'subgraph' && <div className="w-4 h-4 border-2 border-dashed" style={{ borderColor: palette.fontcolor || 'black' }} />}
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </svg>

                {/* Center Close Button */}
                <button 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all z-10 border border-slate-200 hover:scale-110"
                  onClick={() => setShowRingMenu(false)}
                >
                  <Ban size={24} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <div className={`${isPropertiesPaneOpen ? 'w-80' : 'w-0'} bg-white border-l border-slate-200 flex flex-col z-10 transition-all duration-300 overflow-hidden ${showElementDefaults ? 'hidden' : ''}`}>
        <div className="h-14 border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0 min-w-[320px]">
          <div className="flex items-center">
            <Settings size={20} className="text-slate-400 mr-2" />
            <h2 className="font-semibold text-slate-800">Properties</h2>
          </div>
          {(selectedId || selectedIds.length > 0 || viewMode === 'code') && (
            <button 
              onClick={() => { setSelectedId(null); setSelectedIds([]); }}
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear Selection"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 min-w-[320px]">
          {selectedIds.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multi-Edit ({selectedIds.length} items)</h3>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Clear All
                </button>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
                  Changes made here will be applied to all {selectedIds.length} selected elements.
                </p>
                
                <div className="space-y-4">
                  <div className="pt-2 border-t border-indigo-100">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Apply Attribute</h4>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const keyInput = form.elements.namedItem('key') as HTMLInputElement;
                        const valInput = form.elements.namedItem('value') as HTMLInputElement;
                        if (keyInput.value && valInput.value) {
                          handleMultiAttributeChange(keyInput.value, valInput.value);
                          keyInput.value = '';
                          valInput.value = '';
                        }
                      }}
                      className="flex flex-col gap-2"
                    >
                      <input name="key" placeholder="Key (e.g., color)" className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <input name="value" placeholder="Value (e.g., red)" className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm">
                        Apply to All
                      </button>
                    </form>
                  </div>

                  <div className="pt-2 border-t border-indigo-100">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {['shape', 'color', 'fillcolor', 'style', 'fontcolor', 'fontsize'].map(attr => (
                        <button
                          key={attr}
                          onClick={() => handleMultiAttributeChange(attr, '')}
                          className="text-[10px] px-2 py-1 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors"
                        >
                          + {attr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleDeleteSelected}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-colors border border-red-100"
              >
                <Trash2 size={16} />
                Delete {selectedIds.length} Elements
              </button>
            </div>
          ) : selectedElement ? (
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
          ) : viewMode === 'code' ? (
            <div className="text-sm text-slate-500">
              Select an element in the DOT code to edit its properties.
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Layout Engine</h3>
                <select
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ENGINES.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name}</option>
                  ))}
                </select>
              </div>
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
            <Wrench size={20} className="text-slate-400 mr-2" />
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

      {viewMode === 'visual' && mouseState?.isDragging && mouseState.targetId && mouseState.button === 0 && (() => {
        const source = findElement(graph.elements, mouseState.targetId);
        if (source) {
          return (
            <svg className="fixed inset-0 pointer-events-none z-[100] w-full h-full">
              <defs>
                <marker id="arrowhead-dummy" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
                </marker>
              </defs>
              <line 
                x1={mouseState.startX} 
                y1={mouseState.startY} 
                x2={mouseState.currentX} 
                y2={mouseState.currentY} 
                stroke="#4f46e5" 
                strokeWidth="2" 
                strokeDasharray="4"
                markerEnd="url(#arrowhead-dummy)"
              />
            </svg>
          );
        }
        return null;
      })()}

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
