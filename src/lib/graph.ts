import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import dotparser from 'dotparser';

export type ElementType = 'node' | 'edge' | 'subgraph';

function generateHumanId(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    separator: '_',
    style: 'lowerCase',
  });
}

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
  return { id: `node_${generateHumanId()}`, type: 'node', attributes };
}

export function createEdge(source: string, target: string, attributes: Record<string, string> = {}): EdgeElement {
  return { id: `edge_${generateHumanId()}`, type: 'edge', source, target, attributes };
}

export function createSubgraph(attributes: Record<string, string> = {}): SubgraphElement {
  return { id: `cluster_${generateHumanId()}`, type: 'subgraph', attributes, nodeAttributes: {}, edgeAttributes: {}, elements: [] };
}

export function getFirstNodeId(element: GraphElement): string | null {
  if (element.type === 'node') return element.id;
  if (element.type === 'subgraph') {
    const sub = element as SubgraphElement;
    for (const el of sub.elements) {
      const id = getFirstNodeId(el);
      if (id) return id;
    }
  }
  return null;
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
        const attrsWithId = { ...sub.attributes, id: sub.id };
        for (const [k, v] of Object.entries(attrsWithId)) {
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

export function parseDot(dot: string): GraphState {
  const ast = dotparser(dot);
  if (!ast || ast.length === 0) throw new Error('Invalid DOT code');
  
  const root = ast[0];
  const state: GraphState = {
    type: root.type as 'graph' | 'digraph',
    id: root.id ? String(root.id) : 'G',
    strict: !!root.strict,
    attributes: {},
    nodeAttributes: {},
    edgeAttributes: {},
    elements: []
  };

  function parseAttributes(attrList: any[]): Record<string, string> {
    const attrs: Record<string, string> = {};
    if (!attrList) return attrs;
    for (const attr of attrList) {
      if (attr.type === 'attr') {
        let val = attr.eq;
        if (typeof val === 'object' && val !== null) {
          if (val.html) {
            attrs[String(attr.id)] = `<${val.value}>`;
          } else if (val.value !== undefined) {
            attrs[String(attr.id)] = String(val.value);
          } else {
            attrs[String(attr.id)] = String(val);
          }
        } else {
          attrs[String(attr.id)] = String(val);
        }
      }
    }
    return attrs;
  }

  function processChildren(children: any[], targetElements: GraphElement[], targetNodeAttrs: Record<string, string>, targetEdgeAttrs: Record<string, string>, targetGraphAttrs: Record<string, string>) {
    if (!children) return;
    for (const child of children) {
      if (child.type === 'attr_stmt') {
        const attrs = parseAttributes(child.attr_list);
        if (child.target === 'node') Object.assign(targetNodeAttrs, attrs);
        else if (child.target === 'edge') Object.assign(targetEdgeAttrs, attrs);
        else if (child.target === 'graph') Object.assign(targetGraphAttrs, attrs);
      } else if (child.type === 'node_stmt') {
        const attrs = parseAttributes(child.attr_list);
        const id = String(child.node_id.id);
        targetElements.push({
          id: attrs.id || id,
          type: 'node',
          attributes: attrs
        } as NodeElement);
      } else if (child.type === 'edge_stmt') {
        const attrs = parseAttributes(child.attr_list);
        const edgeList = child.edge_list;
        for (let i = 0; i < edgeList.length - 1; i++) {
          const source = String(edgeList[i].id);
          const target = String(edgeList[i+1].id);
          targetElements.push({
            id: attrs.id || `edge_${generateHumanId()}`,
            type: 'edge',
            source,
            target,
            attributes: attrs
          } as EdgeElement);
        }
      } else if (child.type === 'subgraph') {
        const attrs = parseAttributes(child.attr_list || []);
        const sub: SubgraphElement = {
          id: child.id ? String(child.id) : `cluster_${generateHumanId()}`,
          type: 'subgraph',
          attributes: attrs,
          nodeAttributes: {},
          edgeAttributes: {},
          elements: []
        };
        processChildren(child.children || [], sub.elements, sub.nodeAttributes, sub.edgeAttributes, sub.attributes);
        targetElements.push(sub);
      }
    }
  }

  processChildren(root.children || [], state.elements, state.nodeAttributes, state.edgeAttributes, state.attributes);
  return state;
}
