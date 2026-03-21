import Editor, { useMonaco } from '@monaco-editor/react';
import React, { useState, useEffect, useRef } from 'react';
import { GraphState, generateDot, parseDot, createNode, createEdge, createSubgraph, GraphElement, NodeElement, EdgeElement, SubgraphElement } from './lib/graph';
import { renderDot, VFSFile } from './lib/render';
import { MousePointer2, Plus, ArrowRight, Settings, Code, LayoutTemplate, Download, Trash2, X, Check, Wrench, Share2, Link, Image as ImageIcon, AlertCircle, Loader2, Copy, PanelRight, PanelRightClose, HelpCircle, Github, FolderOpen, PlusCircle, Globe, FileUp, ExternalLink, FileDown, Ban, Move, Palette, LogOut } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { db, MediaItem } from './lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

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
  const [tool, setTool] = useState<'select' | 'multi_select' | 'add_edge'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [edgeSourceId, setEdgeSourceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code' | 'help' | 'media'>('visual');
  const [showElementDefaults, setShowElementDefaults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showClearModal, setShowClearModal] = useState(false);
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaNameInput, setMediaNameInput] = useState('');
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };
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
  const [mouseState, setMouseState] = useState<{
    button: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    targetId: string | null;
    startTime: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const shareFlyoutRef = useRef<HTMLDivElement>(null);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

  const [isPropertiesPaneOpen, setIsPropertiesPaneOpen] = useState(true);
  const [ringMenu, setRingMenu] = useState<{
    id?: string;
    type: 'node' | 'subgraph' | 'canvas' | 'edge' | 'multi_select';
    x: number;
    y: number;
  } | null>(null);
  const [isMovingElement, setIsMovingElement] = useState<string | null>(null);
  const [isRebasingEdge, setIsRebasingEdge] = useState<string | null>(null);
  const [isRetargetingEdge, setIsRetargetingEdge] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, currentX: number, currentY: number} | null>(null);
  const selectionBoxRef = useRef<typeof selectionBox>(null);

  useEffect(() => {
    selectionBoxRef.current = selectionBox;
  }, [selectionBox]);
  const longPressTimer = useRef<any>(null);

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

  const mediaItems = useLiveQuery(() => db.media.toArray());

  const handleDownloadToLocal = async (item: MediaItem) => {
    if (item.type !== 'url' || !item.url || !item.id) return;
    
    setDownloadingIds(prev => new Set(prev).add(item.id!));
    try {
      let response;
      try {
        // Try direct fetch first
        response = await fetch(item.url);
      } catch (e) {
        // If direct fetch fails (likely CORS), try a proxy
        console.warn('Direct fetch failed, trying CORS proxy...', e);
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(item.url)}`;
        response = await fetch(proxyUrl);
      }

      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onload = async () => {
        await db.media.update(item.id!, {
          type: 'local',
          blob: blob,
          url: reader.result as string
        });
        setDownloadingIds(prev => {
          const next = new Set(prev);
          next.delete(item.id!);
          return next;
        });
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error downloading media:', err);
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id!);
        return next;
      });
      alert('Failed to download media. This URL might be protected by security restrictions (CORS) that prevent direct downloading. Try downloading the image manually and uploading it as a file.');
    }
  };

  useEffect(() => {
    const updateGraph = async () => {
      const dot = generateDot(graph);
      
      // Prepare VFS from media items
      const vfs: VFSFile[] = [];
      if (mediaItems) {
        for (const item of mediaItems) {
          if (item.type === 'local' && item.blob) {
            const buffer = await item.blob.arrayBuffer();
            vfs.push({
              path: item.name,
              data: new Uint8Array(buffer)
            });
          }
          // For URL types, we don't put them in VFS as Graphviz can fetch them if allowed,
          // but usually it's better to use the URL directly in the DOT.
          // However, if the user wants to use a short name, we could fetch and put in VFS.
          // For now, we assume local files are in VFS and URLs are used directly.
        }
      }

      renderDot(dot, engine, vfs)
        .then(res => {
          setSvg(res);
          setError(null);
        })
        .catch(err => {
          setError(err.message);
        });
    };

    updateGraph();
  }, [graph, engine, mediaItems]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== 'visual') return;
    
    if (!svgContainerRef.current?.contains(e.target as Node)) return;

    const target = e.target as Element;
    const g = target.closest('g.node, g.edge, g.cluster');
    const targetId = g ? g.id : null;

    if (e.button === 0 && targetId) {
      e.stopPropagation();
      const el = findElement(graph.elements, targetId);
      if (el && (el.type === 'node' || el.type === 'subgraph' || el.type === 'edge')) {
        longPressTimer.current = setTimeout(() => {
          if (selectedIds.includes(targetId)) {
            setRingMenu({ type: 'multi_select', x: e.clientX, y: e.clientY });
          } else {
            setRingMenu({ id: targetId, type: el.type as any, x: e.clientX, y: e.clientY });
          }
          setMouseState(null);
        }, 500);
      }
    } else if (e.button === 0 && !targetId) {
      longPressTimer.current = setTimeout(() => {
        setRingMenu({ type: 'canvas', x: e.clientX, y: e.clientY });
        setMouseState(null);
      }, 500);
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
      targetId,
      startTime: Date.now()
    });
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

  const focusLabelInput = () => {
    setTimeout(() => {
      const input = document.getElementById('attr-input-label') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 150);
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
    if (window.innerWidth >= 1024) setIsPropertiesPaneOpen(true);
    if (newEl.type === 'node') {
      focusLabelInput();
    }
  };

  useEffect(() => {
    if (!mouseState) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - mouseState.startX;
      const dy = e.clientY - mouseState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5 && !mouseState.isDragging) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        setMouseState(prev => prev ? { ...prev, isDragging: true, currentX: e.clientX, currentY: e.clientY } : null);
        
        if (tool === 'multi_select') {
          setSelectionBox({ startX: mouseState.startX, startY: mouseState.startY, currentX: e.clientX, currentY: e.clientY });
        }
      } else if (mouseState.isDragging) {
        if (tool !== 'multi_select') {
          setMouseState(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
        }
        
        if (tool === 'multi_select') {
          setSelectionBox(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
        }
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      const currentSelectionBox = selectionBoxRef.current;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (currentSelectionBox) {
        const box = {
          left: Math.min(currentSelectionBox.startX, currentSelectionBox.currentX),
          top: Math.min(currentSelectionBox.startY, currentSelectionBox.currentY),
          right: Math.max(currentSelectionBox.startX, currentSelectionBox.currentX),
          bottom: Math.max(currentSelectionBox.startY, currentSelectionBox.currentY)
        };
        
        const elements = document.querySelectorAll('g.node, g.cluster');
        const newSelectedIds: string[] = [];
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (!(rect.right < box.left || rect.left > box.right || rect.bottom < box.top || rect.top > box.bottom)) {
            newSelectedIds.push(el.id);
          }
        });
        
        setSelectedIds(prev => [...new Set([...prev, ...newSelectedIds])]);
        setSelectionBox(null);
      }

      if (isMovingElement) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const g = target?.closest('g.cluster');
        const targetSubgraphId = g ? g.id : null;
        
        handleMoveElement(isMovingElement, targetSubgraphId);
        setIsMovingElement(null);
        return;
      }

      if (isRebasingEdge) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const g = target?.closest('g.node');
        const targetNodeId = g ? g.id : null;
        if (targetNodeId) {
          handleRebaseEdge(isRebasingEdge, targetNodeId);
        }
        setIsRebasingEdge(null);
        return;
      }

      if (isRetargetingEdge) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const g = target?.closest('g.node');
        const targetNodeId = g ? g.id : null;
        if (targetNodeId) {
          handleRetargetEdge(isRetargetingEdge, targetNodeId);
        }
        setIsRetargetingEdge(null);
        return;
      }

    const state = mouseState;
    setMouseState(null);
    if (!state) return;

    const { button, isDragging, targetId, startX, startY } = state;

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
    const isLabelClick = target?.tagName.toLowerCase() === 'text' || target?.tagName.toLowerCase() === 'tspan';

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
            if (isLabelClick && (g?.classList.contains('node') || g?.classList.contains('cluster'))) {
              focusLabelInput();
            }
          }
        } else {
          if (tool === 'multi_select') {
            setSelectedIds([]);
          } else {
            setSelectedId(null);
            setSelectedIds([]);
          }
        }
      } else {
        if (tool === 'multi_select') return;
        if (targetId) {
          const sourceNode = findElement(graph.elements, targetId);
          if (sourceNode?.type === 'node') {
            if (endTargetId && targetId !== endTargetId) {
              const targetNode = findElement(graph.elements, endTargetId);
              if (targetNode?.type === 'node') {
                const newEdge = createEdge(targetId, endTargetId);
                const activePal = palettes.find(p => p.id === activeEdgePaletteId);
                if (activePal && activePal.type === 'edge') {
                  const { id, type, ...attrs } = activePal;
                  newEdge.attributes = { ...newEdge.attributes, ...attrs };
                }
                setGraph(prev => ({ ...prev, elements: [...prev.elements, newEdge] }));
                setSelectedId(newEdge.id);
                setSelectedIds([]);
              } else if (targetNode?.type === 'subgraph') {
                // Create new node in subgraph and edge from source
                const newNode = createNode({ label: `Node ${getTotalNodeCount(graph.elements) + 1}` });
                const activeNodePal = palettes.find(p => p.id === activeNodePaletteId);
                if (activeNodePal && activeNodePal.type === 'node') {
                  const { id, type, ...attrs } = activeNodePal;
                  newNode.attributes = { ...newNode.attributes, ...attrs };
                }
                
                const newEdge = createEdge(targetId, newNode.id);
                const activeEdgePal = palettes.find(p => p.id === activeEdgePaletteId);
                if (activeEdgePal && activeEdgePal.type === 'edge') {
                  const { id, type, ...attrs } = activeEdgePal;
                  newEdge.attributes = { ...newEdge.attributes, ...attrs };
                }

                setGraph(prev => {
                  let newElements = updateElement(prev.elements, endTargetId, (el) => {
                    const sub = el as SubgraphElement;
                    return {
                      ...sub,
                      elements: [...sub.elements, newNode]
                    };
                  });
                  newElements = [...newElements, newEdge];
                  return { ...prev, elements: newElements };
                });
                setSelectedId(newNode.id);
                setSelectedIds([]);
                focusLabelInput();
              }
            } else if (!endTargetId) {
              // Dragged to empty area - create new node and edge
              const newNode = createNode({ label: `Node ${getTotalNodeCount(graph.elements) + 1}` });
              const activeNodePal = palettes.find(p => p.id === activeNodePaletteId);
              if (activeNodePal && activeNodePal.type === 'node') {
                const { id, type, ...attrs } = activeNodePal;
                newNode.attributes = { ...newNode.attributes, ...attrs };
              }
              
              const newEdge = createEdge(targetId, newNode.id);
              const activeEdgePal = palettes.find(p => p.id === activeEdgePaletteId);
              if (activeEdgePal && activeEdgePal.type === 'edge') {
                const { id, type, ...attrs } = activeEdgePal;
                newEdge.attributes = { ...newEdge.attributes, ...attrs };
              }
              
              setGraph(prev => ({ ...prev, elements: [...prev.elements, newNode, newEdge] }));
              setSelectedId(newNode.id);
              setSelectedIds([]);
              if (window.innerWidth >= 1024) setIsPropertiesPaneOpen(true);
              focusLabelInput();
            }
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
      return true;
    }).map(el => {
      if (el.type === 'subgraph') {
        return { ...el, elements: deleteElement((el as SubgraphElement).elements, id) };
      }
      return el;
    });
  };

  const removeElement = (elements: GraphElement[], id: string): GraphElement[] => {
    let newElements = deleteElement(elements, id);
    newElements = deleteEdgesPointingTo(newElements, id);
    return newElements;
  };

  const handleMoveElement = (elementId: string, targetContainerId: string | null) => {
    const el = findElement(graph.elements, elementId);
    if (!el) return;

    // Don't move into self
    if (elementId === targetContainerId) return;

    setGraph(prev => {
      // 1. Remove from current location
      let newElements = removeElement(prev.elements, elementId);
      
      // 2. Add to new location
      if (targetContainerId) {
        newElements = updateElement(newElements, targetContainerId, (container) => ({
          ...container,
          elements: [...(container as SubgraphElement).elements, el]
        }));
      } else {
        newElements = [...newElements, el];
      }
      
      return { ...prev, elements: newElements };
    });
  };

  const handleRebaseEdge = (edgeId: string, newSourceId: string) => {
    setGraph(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === edgeId && el.type === 'edge' ? { ...el, source: newSourceId } : el
      )
    }));
  };

  const handleRetargetEdge = (edgeId: string, newTargetId: string) => {
    setGraph(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === edgeId && el.type === 'edge' ? { ...el, target: newTargetId } : el
      )
    }));
  };

  const handleRestyleElement = (elementId: string) => {
    const el = findElement(graph.elements, elementId);
    if (!el) return;

    const paletteId = el.type === 'node' ? activeNodePaletteId : 
                     el.type === 'edge' ? activeEdgePaletteId : 
                     activeSubgraphPaletteId;
    
    const palette = palettes.find(p => p.id === paletteId);
    if (!palette) return;

    const { id, type, ...attrs } = palette;
    
    setGraph(prev => ({
      ...prev,
      elements: updateElement(prev.elements, elementId, (item) => ({
        ...item,
        attributes: { ...item.attributes, ...attrs }
      }))
    }));
  };

  const handleKickOut = (subgraphId: string) => {
    const subgraph = findElement(graph.elements, subgraphId) as SubgraphElement;
    if (!subgraph || subgraph.type !== 'subgraph') return;

    const children = subgraph.elements;
    if (children.length === 0) return;

    setGraph(prev => {
      const getParentId = (elements: GraphElement[], targetId: string, currentParentId: string | null = null): string | null | undefined => {
        for (const el of elements) {
          if (el.id === targetId) return currentParentId;
          if (el.type === 'subgraph') {
            const res = getParentId((el as SubgraphElement).elements, targetId, el.id);
            if (res !== undefined) return res;
          }
        }
        return undefined;
      };

      const targetParentId = getParentId(prev.elements, subgraphId);
      if (targetParentId === undefined) return prev;

      // 1. Remove children from subgraph
      let newElements = updateElement(prev.elements, subgraphId, (el) => ({
        ...el,
        elements: []
      }));

      // 2. Add children to parent
      if (targetParentId === null) {
        newElements = [...newElements, ...children];
      } else {
        newElements = updateElement(newElements, targetParentId, (parent) => ({
          ...parent,
          elements: [...(parent as SubgraphElement).elements, ...children]
        }));
      }

      return { ...prev, elements: newElements };
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
      
      // Enforce at least 1 node
      if (getTotalNodeCount(newState.elements) === 0) {
        newState.elements = [createNode({ label: 'Node' })];
      }
      
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
      
      // Enforce at least 1 node
      if (getTotalNodeCount(newElements) === 0) {
        newElements = [createNode({ label: 'Node' })];
      }
      
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
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => {
                  const nextTool = tool === 'multi_select' ? 'select' : 'multi_select';
                  setTool(nextTool);
                  if (nextTool === 'select') setSelectedIds([]);
                  else setSelectedId(null);
                }}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${tool === 'multi_select' ? 'bg-indigo-600' : 'bg-slate-200'}`}
                title="Toggle Multi-Select"
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${tool === 'multi_select' ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Multi</span>
            </div>
          </>
        )}
        
        {/* Palette Tiles */}
        {viewMode === 'visual' && (
          <div className="flex flex-col gap-2 w-full px-2 mt-2">
            {palettes.map((palette) => {
              const isActive = (palette.type === 'node' && activeNodePaletteId === palette.id) ||
                              (palette.type === 'edge' && activeEdgePaletteId === palette.id) ||
                              (palette.type === 'subgraph' && activeSubgraphPaletteId === palette.id) ||
                              (selectedElement && isPaletteMatch(selectedElement, palette));

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
        {deferredPrompt && (
          <button
            className={`p-3 rounded-xl transition-colors text-slate-500 hover:bg-slate-100`}
            onClick={handleInstall}
            title="Install App"
          >
            <Download size={24} />
          </button>
        )}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => {
              const nextMode = viewMode === 'code' ? 'visual' : 'code';
              isCodeChangeRef.current = false;
              setLocalCode(generateDot(graph));
              setViewMode(nextMode);
            }}
            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${viewMode === 'code' ? 'bg-indigo-600' : 'bg-slate-200'}`}
            title="Toggle Code/Visual"
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${viewMode === 'code' ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Code</span>
        </div>
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
              onClick={() => { 
                setShowElementDefaults(false); 
                setSelectedId(null); 
                setIsPropertiesPaneOpen(true);
              }}
              className="text-sm font-medium flex items-center gap-1 text-slate-600 hover:text-slate-900"
              title="Properties"
            >
              <Settings size={14} />
              <span className="hidden lg:inline">Properties</span>
            </button>
            <button
              onClick={() => setShowElementDefaults(!showElementDefaults)}
              className={`text-sm font-medium flex items-center gap-1 ${showElementDefaults ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
              title="Defaults"
            >
              <Wrench size={14} />
              <span className="hidden lg:inline">Defaults</span>
            </button>
            <button
              onClick={() => setViewMode('media')}
              className={`text-sm font-medium flex items-center gap-1 ${viewMode === 'media' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}
              title="Media Manager"
            >
              <FolderOpen size={14} />
              <span className="hidden lg:inline">Media</span>
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
                disabled={tool === 'multi_select'}
                panning={{ disabled: tool === 'multi_select' }}
                pinch={{ disabled: tool === 'multi_select' }}
              >
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                  <div className="svg-container w-full h-full flex items-center justify-center bg-grid bg-white">
                    <style>
                      {`
                        .svg-container g { transition: stroke 0.2s, stroke-width 0.2s; }
                        ${selectedId ? `
                          .svg-container g#${selectedId} polygon, .svg-container g#${selectedId} ellipse, .svg-container g#${selectedId} path { stroke: #4f46e5 !important; stroke-width: 2px !important; }
                        ` : ''}
                        ${selectedIds.map(id => `
                          .svg-container g#${id} polygon, .svg-container g#${id} ellipse, .svg-container g#${id} path { stroke: #4f46e5 !important; stroke-width: 2px !important; }
                        `).join('\n')}
                      `}
                    </style>
                    <div dangerouslySetInnerHTML={{ __html: svg }} />
                  </div>
                </TransformComponent>
              </TransformWrapper>
            </div>
          ) : viewMode === 'code' ? (
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
          ) : viewMode === 'media' ? (
            <div className="w-full h-full p-4 sm:p-8 overflow-y-auto bg-slate-50">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Media Manager</h1>
                    <p className="text-slate-500 mt-1">Manage images and assets for your graphs.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        setMediaUrlInput('');
                        setMediaNameInput('');
                        setShowAddMediaModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      <Globe size={16} />
                      Add URL
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer">
                      <FileUp size={16} />
                      Upload File
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async () => {
                              await db.media.add({
                                name: file.name,
                                type: 'local',
                                url: reader.result as string,
                                blob: file,
                                createdAt: Date.now()
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {mediaItems?.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:border-indigo-300 transition-all">
                      <div className="aspect-video bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        <img 
                          src={item.url} 
                          alt={item.name} 
                          className="max-w-full max-h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {item.type === 'url' && (
                            <button 
                              onClick={() => handleDownloadToLocal(item)}
                              disabled={downloadingIds.has(item.id!)}
                              className="p-2 bg-white rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                              title={downloadingIds.has(item.id!) ? "Downloading..." : "Download to Local"}
                            >
                              <FileDown size={16} className={downloadingIds.has(item.id!) ? "animate-bounce" : ""} />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(item.name);
                              const btn = document.activeElement as HTMLButtonElement;
                              const originalTitle = btn.title;
                              btn.title = 'Copied!';
                              setTimeout(() => btn.title = originalTitle, 2000);
                            }}
                            className="p-2 bg-white rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                            title="Copy Name"
                          >
                            <Copy size={16} />
                          </button>
                          <button 
                            onClick={() => db.media.delete(item.id!)}
                            className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="absolute top-2 right-2">
                          {item.type === 'url' ? (
                            <div className="bg-blue-100 text-blue-600 p-1 rounded-md" title="External URL">
                              <Globe size={12} />
                            </div>
                          ) : (
                            <div className="bg-amber-100 text-amber-600 p-1 rounded-md" title="Local Storage">
                              <FileUp size={12} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-slate-900 truncate" title={item.name}>{item.name}</h3>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={() => window.open(item.url, '_blank')}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                          >
                            View <ExternalLink size={10} />
                          </button>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            <span>Usage in DOT:</span>
                          </div>
                          <code className="block mt-1 p-2 bg-slate-50 rounded text-[10px] font-mono text-slate-600 break-all">
                            image="{item.name}"
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {mediaItems?.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon size={32} />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">No media yet</h3>
                      <p className="text-slate-500 max-w-xs mt-1">Upload images or add URLs to use them as node icons in your graphs.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full p-8 overflow-y-auto bg-slate-50">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-slate-900">Help & Resources</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <a 
                    href="https://github.com/ritzexists/pan-graphic" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <Github size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">GitHub Repository</h3>
                    <p className="text-sm text-slate-500">View the source code, report issues, or contribute to the project.</p>
                  </a>

                  <a 
                    href="https://modelcontextprotocol.io/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <Link size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">MCP Protocol</h3>
                    <p className="text-sm text-slate-500">Learn about the Model Context Protocol used for AI integration.</p>
                  </a>

                  {deferredPrompt ? (
                    <button 
                      onClick={handleInstall}
                      className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer"
                    >
                      <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Download size={24} />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Install App</h3>
                      <p className="text-sm text-slate-500">Install PanGraphic as a Progressive Web App on your device.</p>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-200 opacity-70">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                        <Check size={24} />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">App Installed</h3>
                      <p className="text-sm text-slate-500">PanGraphic is already installed or running as a PWA.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-10">
                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800">Getting Started</h2>
                    <p className="text-slate-600 mb-4">
                      PanGraphic is a visual graph editor that allows you to create and edit Graphviz DOT graphs. 
                      You can use the visual editor to drag and drop elements, or switch to the code editor to write DOT code directly.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-slate-600">
                      <li><strong>Add Nodes:</strong> Click the "+" button in the sidebar or right-click on the canvas to add a new node.</li>
                      <li><strong>Add Edges:</strong> Select the "Add Edge" tool (arrow icon), click a source node, then click a target node.</li>
                      <li><strong>Select Elements:</strong> Use the pointer tool to click on nodes or edges to select them and edit their properties.</li>
                      <li><strong>Multi-select:</strong> Use the multi-select tool (dashed box icon) to select multiple elements by clicking them.</li>
                      <li><strong>Delete:</strong> Select elements and press the Delete key or click the trash icon in the properties pane.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800">FAQ</h2>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">How do I change the shape or color of a node?</h3>
                        <p className="text-slate-600">Select the node and use the properties pane on the right. You can also use the palette in the sidebar to quickly apply styles.</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">Can I export my graph?</h3>
                        <p className="text-slate-600">Yes, you can export your graph as an SVG or PNG image using the share/export menu in the top right.</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">How do I use subgraphs (clusters)?</h3>
                        <p className="text-slate-600">Click the "Add Subgraph" button in the sidebar. This will create a new cluster with a default node inside it.</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* Edge Source Indicator */}
          {tool === 'add_edge' && edgeSourceId && !ringMenu && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select target node for edge
            </div>
          )}

          {/* Move Element Indicator */}
          {isMovingElement && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select target subgraph or background to move element
            </div>
          )}

          {/* Rebase Edge Indicator */}
          {isRebasingEdge && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select new source node for edge
            </div>
          )}

          {/* Retarget Edge Indicator */}
          {isRetargetingEdge && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select new target node for edge
            </div>
          )}

          {/* Ring Menu */}
          {ringMenu && (
            <div className="fixed inset-0 z-[200] bg-black/5 backdrop-blur-[1px]" onClick={() => setRingMenu(null)}>
              <div 
                className="absolute" 
                style={{ left: ringMenu.x, top: ringMenu.y, transform: 'translate(-50%, -50%)' }}
                onClick={e => e.stopPropagation()}
              >
                <svg width="180" height="180" viewBox="-90 -90 180 180" className="drop-shadow-2xl animate-in zoom-in duration-200">
                  {/* Background Circle */}
                  <circle cx="0" cy="0" r="75" fill="white" fillOpacity="0.95" stroke="#e2e8f0" strokeWidth="1" />
                  
                  {/* Segments */}
                  {(() => {
                    const actions = [
                      { id: 'delete', icon: Trash2, color: '#ef4444', label: 'Delete' },
                      { id: 'restyle', icon: Palette, color: '#6366f1', label: 'Restyle' },
                      { id: 'move', icon: Move, color: '#f59e0b', label: 'Move' },
                    ];
                    if (ringMenu.type === 'subgraph') {
                      actions.push({ id: 'kickout', icon: LogOut, color: '#10b981', label: 'Kick Out' });
                    } else if (ringMenu.type === 'edge') {
                      actions.length = 0;
                      actions.push({ id: 'delete', icon: Trash2, color: '#ef4444', label: 'Delete' });
                      actions.push({ id: 'restyle', icon: Palette, color: '#6366f1', label: 'Restyle' });
                      actions.push({ id: 'rebase', icon: ArrowRight, color: '#f59e0b', label: 'Rebase' });
                      actions.push({ id: 'retarget', icon: ArrowRight, color: '#10b981', label: 'Retarget' });
                    } else if (ringMenu.type === 'canvas') {
                      actions.length = 0;
                      actions.push({ id: 'add_node', icon: Plus, color: '#3b82f6', label: 'Add Node' });
                      actions.push({ id: 'add_subgraph', icon: PlusCircle, color: '#10b981', label: 'Add Subgraph' });
                    } else if (ringMenu.type === 'multi_select') {
                      actions.length = 0;
                      actions.push({ id: 'group_move', icon: Move, color: '#f59e0b', label: 'Group Move' });
                      actions.push({ id: 'group_delete', icon: Trash2, color: '#ef4444', label: 'Group Delete' });
                      actions.push({ id: 'group_restyle', icon: Palette, color: '#6366f1', label: 'Group Restyle' });
                      actions.push({ id: 'group_rebase', icon: ArrowRight, color: '#f59e0b', label: 'Group Rebase' });
                      actions.push({ id: 'group_retarget', icon: ArrowRight, color: '#10b981', label: 'Group Retarget' });
                    }
                    
                    const segmentCount = actions.length;
                    const segmentAngle = 360 / segmentCount;

                    return actions.map((action, i) => {
                      const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
                      const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
                      const x1 = Math.cos(startAngle) * 75;
                      const y1 = Math.sin(startAngle) * 75;
                      const x2 = Math.cos(endAngle) * 75;
                      const y2 = Math.sin(endAngle) * 75;
                      const midAngle = (startAngle + endAngle) / 2;
                      const iconX = Math.cos(midAngle) * 48;
                      const iconY = Math.sin(midAngle) * 48;

                      return (
                        <g 
                          key={action.id} 
                          className="cursor-pointer group"
                          onClick={() => {
                            if (action.id === 'delete') {
                              setGraph(prev => ({ ...prev, elements: removeElement(prev.elements, ringMenu.id!) }));
                              setSelectedId(null);
                            } else if (action.id === 'restyle') {
                              handleRestyleElement(ringMenu.id!);
                            } else if (action.id === 'move') {
                              setIsMovingElement(ringMenu.id!);
                            } else if (action.id === 'kickout') {
                              handleKickOut(ringMenu.id!);
                            } else if (action.id === 'add_node') {
                              handleAddNode();
                            } else if (action.id === 'add_subgraph') {
                              handleAddSubgraph();
                            } else if (action.id === 'rebase') {
                              setIsRebasingEdge(ringMenu.id!);
                            } else if (action.id === 'retarget') {
                              setIsRetargetingEdge(ringMenu.id!);
                            } else if (action.id === 'group_move') {
                              console.log('Group Move', selectedIds);
                            } else if (action.id === 'group_delete') {
                              setGraph(prev => ({ ...prev, elements: prev.elements.filter(el => !selectedIds.includes(el.id)) }));
                              setSelectedIds([]);
                            } else if (action.id === 'group_restyle') {
                              console.log('Group Restyle', selectedIds);
                            } else if (action.id === 'group_rebase') {
                              console.log('Group Rebase', selectedIds);
                            } else if (action.id === 'group_retarget') {
                              console.log('Group Retarget', selectedIds);
                            }
                            setRingMenu(null);
                          }}
                        >
                          <path 
                            d={`M 0 0 L ${x1} ${y1} A 75 75 0 0 1 ${x2} ${y2} Z`} 
                            fill="transparent"
                            className="hover:fill-slate-50 transition-colors"
                          />
                          <line x1="0" y1="0" x2={x1} y2={y1} stroke="#e2e8f0" strokeWidth="1" />
                          <foreignObject x={iconX - 14} y={iconY - 14} width="28" height="28">
                            <div className="flex items-center justify-center w-full h-full transition-transform group-hover:scale-125">
                              <action.icon size={20} style={{ color: action.color }} />
                            </div>
                          </foreignObject>
                          <text 
                            x={iconX} 
                            y={iconY + 22} 
                            textAnchor="middle" 
                            className="text-[9px] font-bold fill-slate-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                          >
                            {action.label}
                          </text>
                        </g>
                      );
                    });
                  })()}

                  {/* Center Ban Icon */}
                  <circle cx="0" cy="0" r="24" fill="white" stroke="#e2e8f0" strokeWidth="1" className="shadow-inner" onClick={() => setRingMenu(null)} />
                  <foreignObject x="-12" y="-12" width="24" height="24" onClick={() => setRingMenu(null)}>
                    <div className="flex items-center justify-center w-full h-full cursor-pointer">
                      <Ban size={18} className="text-slate-300" />
                    </div>
                  </foreignObject>
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      {(viewMode === 'visual' || viewMode === 'code') && (
        <React.Fragment>
          <div className={`${isPropertiesPaneOpen ? 'w-80' : 'w-0'} bg-white border-l border-slate-200 flex flex-col z-10 transition-all duration-300 overflow-hidden ${showElementDefaults ? 'hidden' : ''}`}>
          <div className="h-14 border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0 min-w-[320px]">
            <div className="flex items-center">
              <Settings size={20} className="text-slate-400 mr-2" />
              <h2 className="font-semibold text-slate-800">Properties</h2>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setViewMode('help')}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                title="Help & Tutorial"
              >
                <HelpCircle size={16} />
              </button>
              <button 
                onClick={() => { 
                  if (selectedId || selectedIds.length > 0) {
                    setSelectedId(null); 
                    setSelectedIds([]); 
                  } else {
                    setIsPropertiesPaneOpen(false);
                  }
                }}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
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
                      { key: 'image', label: 'Image' },
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
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setViewMode('help')}
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
              title="Help & Tutorial"
            >
              <HelpCircle size={16} />
            </button>
            <button 
              onClick={() => setShowElementDefaults(false)}
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
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
      </React.Fragment>
      )}

      {/* Selection Box */}
      {selectionBox && (
        <div 
          className="fixed z-[100] border-2 border-indigo-500 bg-indigo-500/20 pointer-events-none"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.startX - selectionBox.currentX),
            height: Math.abs(selectionBox.startY - selectionBox.currentY),
          }}
        />
      )}

      {viewMode === 'visual' && mouseState?.isDragging && mouseState.targetId && mouseState.button === 0 && !isMovingElement && (() => {
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Clear Graph?</h3>
            <p className="text-slate-600 mb-6">This will permanently delete all nodes and edges. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
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
                    elements: [createNode({ label: 'Node' })]
                  });
                  setSelectedId(null);
                  setShowClearModal(false);
                }}
                className="px-4 py-2 bg-red-500 text-white font-medium hover:bg-red-600 rounded-xl transition-colors shadow-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMediaModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Add Media URL</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">URL</label>
                <input 
                  type="text"
                  value={mediaUrlInput}
                  onChange={(e) => {
                    setMediaUrlInput(e.target.value);
                    if (!mediaNameInput) {
                      const fileName = e.target.value.split('/').pop() || '';
                      if (fileName) setMediaNameInput(fileName);
                    }
                  }}
                  placeholder="https://example.com/image.png"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label>
                <input 
                  type="text"
                  value={mediaNameInput}
                  onChange={(e) => setMediaNameInput(e.target.value)}
                  placeholder="my-image"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-8">
              <button 
                onClick={() => setShowAddMediaModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (mediaUrlInput && mediaNameInput) {
                    db.media.add({
                      name: mediaNameInput,
                      type: 'url',
                      url: mediaUrlInput,
                      createdAt: Date.now()
                    });
                    setShowAddMediaModal(false);
                  }
                }}
                disabled={!mediaUrlInput || !mediaNameInput}
                className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Media
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
