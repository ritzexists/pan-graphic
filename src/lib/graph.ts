import { v4 as uuid } from 'uuid';

export type ElementType = 'node' | 'edge' | 'subgraph';

export interface GraphElement {
  id: string;
  type: ElementType;
  attributes: Record<string, string>;
}

export interface NodeElement extends GraphElement {
  type: 'node';
}

export interface EdgeElement extends GraphElement {
  type: 'edge';
  source: string;
  target: string;
}

export interface SubgraphElement extends GraphElement {
  type: 'subgraph';
  elements: GraphElement[];
  nodeAttributes: Record<string, string>;
  edgeAttributes: Record<string, string>;
}

export interface GraphState {
  type: 'graph' | 'digraph';
  id: string;
  strict: boolean;
  attributes: Record<string, string>;
  nodeAttributes: Record<string, string>;
  edgeAttributes: Record<string, string>;
  elements: GraphElement[];
}

export function createNode(attributes: Record<string, string> = {}): NodeElement {
  return { id: `node_${uuid().replace(/-/g, '')}`, type: 'node', attributes };
}

export function createEdge(source: string, target: string, attributes: Record<string, string> = {}): EdgeElement {
  return { id: `edge_${uuid().replace(/-/g, '')}`, type: 'edge', source, target, attributes };
}

export function createSubgraph(attributes: Record<string, string> = {}): SubgraphElement {
  return { id: `cluster_${uuid().replace(/-/g, '')}`, type: 'subgraph', attributes, nodeAttributes: {}, edgeAttributes: {}, elements: [] };
}

export function generateDot(state: GraphState): string {
  const edgeOp = state.type === 'digraph' ? '->' : '--';
  
  function formatValue(v: string): string {
    if (v.startsWith('<') && v.endsWith('>')) {
      return v;
    }
    return JSON.stringify(v);
  }

  function generateAttrs(attrs: Record<string, string>, extra: Record<string, string> = {}): string {
    const all = { ...attrs, ...extra };
    const entries = Object.entries(all).filter(([k, v]) => v !== undefined && v !== '');
    if (entries.length === 0) return '';
    return ` [${entries.map(([k, v]) => `${k}=${formatValue(v)}`).join(', ')}]`;
  }

  function generateElements(elements: GraphElement[], indent: number): string {
    const pad = '  '.repeat(indent);
    return elements.map(el => {
      if (el.type === 'node') {
        return `${pad}"${el.id}"${generateAttrs(el.attributes, { id: el.id })};`;
      } else if (el.type === 'edge') {
        const edge = el as EdgeElement;
        return `${pad}"${edge.source}" ${edgeOp} "${edge.target}"${generateAttrs(edge.attributes, { id: edge.id })};`;
      } else if (el.type === 'subgraph') {
        const sub = el as SubgraphElement;
        let s = `${pad}subgraph "${sub.id}" {\n`;
        for (const [k, v] of Object.entries(sub.attributes)) {
          if (v) s += `${pad}  ${k}=${formatValue(v)};\n`;
        }
        if (Object.keys(sub.nodeAttributes).length > 0) {
          s += `${pad}  node${generateAttrs(sub.nodeAttributes)};\n`;
        }
        if (Object.keys(sub.edgeAttributes).length > 0) {
          s += `${pad}  edge${generateAttrs(sub.edgeAttributes)};\n`;
        }
        s += generateElements(sub.elements, indent + 1);
        s += `\n${pad}}`;
        return s;
      }
      return '';
    }).join('\n');
  }

  let dot = `${state.strict ? 'strict ' : ''}${state.type} "${state.id}" {\n`;
  for (const [k, v] of Object.entries(state.attributes)) {
    if (v) dot += `  ${k}=${formatValue(v)};\n`;
  }
  if (Object.keys(state.nodeAttributes).length > 0) {
    dot += `  node${generateAttrs(state.nodeAttributes)};\n`;
  }
  if (Object.keys(state.edgeAttributes).length > 0) {
    dot += `  edge${generateAttrs(state.edgeAttributes)};\n`;
  }
  dot += generateElements(state.elements, 1);
  dot += '\n}';
  return dot;
}
