export interface AttributeDefinition {
  key: string;
  label: string;
  description: string;
  type: 'node' | 'edge' | 'graph' | 'all';
  valueType: 'text' | 'color' | 'number' | 'select' | 'boolean';
  defaultValue?: string;
  options?: string[];
}

export const GRAPHVIZ_ATTRIBUTES: AttributeDefinition[] = [
  // Common Attributes
  { key: 'label', label: 'Label', description: 'Text label attached to objects', type: 'all', valueType: 'text' },
  { key: 'color', label: 'Color', description: 'Color of node or edge', type: 'all', valueType: 'color' },
  { key: 'style', label: 'Style', description: 'Style of node or edge', type: 'all', valueType: 'select', options: ['solid', 'dashed', 'dotted', 'bold', 'filled', 'rounded', 'diagonals', 'invis'] },
  { key: 'fontname', label: 'Font Name', description: 'Font used for text', type: 'all', valueType: 'text' },
  { key: 'fontsize', label: 'Font Size', description: 'Font size in points', type: 'all', valueType: 'number' },
  { key: 'fontcolor', label: 'Font Color', description: 'Color used for text', type: 'all', valueType: 'color' },
  { key: 'penwidth', label: 'Pen Width', description: 'Width of the line used for the object', type: 'all', valueType: 'number' },
  { key: 'tooltip', label: 'Tooltip', description: 'Tooltip text for the object', type: 'all', valueType: 'text' },
  { key: 'URL', label: 'URL', description: 'Hyperlink for the object', type: 'all', valueType: 'text' },

  // Node Attributes
  { key: 'shape', label: 'Shape', description: 'The shape of the node', type: 'node', valueType: 'select', options: ['box', 'circle', 'ellipse', 'diamond', 'none', 'plaintext', 'record', 'polygon', 'cylinder', 'note', 'tab', 'folder', 'box3d', 'component'] },
  { key: 'fillcolor', label: 'Fill Color', description: 'Color used to fill the background of a node or cluster', type: 'node', valueType: 'color' },
  { key: 'width', label: 'Width', description: 'Width of node in inches', type: 'node', valueType: 'number' },
  { key: 'height', label: 'Height', description: 'Height of node in inches', type: 'node', valueType: 'number' },
  { key: 'fixedsize', label: 'Fixed Size', description: 'If true, node size is fixed and not determined by label', type: 'node', valueType: 'select', options: ['true', 'false', 'shape'] },
  { key: 'imagescale', label: 'Image Scale', description: 'How to scale images within nodes', type: 'node', valueType: 'select', options: ['true', 'false', 'width', 'height', 'both'] },
  { key: 'image', label: 'Image', description: 'Path to image file to be used in node', type: 'node', valueType: 'text' },
  { key: 'margin', label: 'Margin', description: 'Space between node content and boundary', type: 'node', valueType: 'text' },
  { key: 'pos', label: 'Position', description: 'Position of node (x,y)', type: 'node', valueType: 'text' },
  { key: 'xlabel', label: 'External Label', description: 'Label placed outside the node', type: 'node', valueType: 'text' },
  { key: 'distortion', label: 'Distortion', description: 'Distortion factor for polygon shapes', type: 'node', valueType: 'number' },
  { key: 'skew', label: 'Skew', description: 'Skew factor for polygon shapes', type: 'node', valueType: 'number' },
  { key: 'sides', label: 'Sides', description: 'Number of sides for polygon shapes', type: 'node', valueType: 'number' },
  { key: 'peripheries', label: 'Peripheries', description: 'Number of boundary outlines', type: 'node', valueType: 'number' },
  { key: 'orientation', label: 'Orientation', description: 'Node rotation angle', type: 'node', valueType: 'number' },
  { key: 'regular', label: 'Regular', description: 'Force polygon to be regular', type: 'node', valueType: 'boolean' },
  
  // Edge Attributes
  { key: 'arrowhead', label: 'Arrow Head', description: 'Style of the arrow head', type: 'edge', valueType: 'select', options: ['normal', 'dot', 'odot', 'inv', 'invdot', 'invodot', 'none', 'tee', 'empty', 'diamond', 'odiamond'] },
  { key: 'arrowtail', label: 'Arrow Tail', description: 'Style of the arrow tail', type: 'edge', valueType: 'select', options: ['normal', 'dot', 'odot', 'inv', 'invdot', 'invodot', 'none', 'tee', 'empty', 'diamond', 'odiamond'] },
  { key: 'dir', label: 'Direction', description: 'Direction of edge', type: 'edge', valueType: 'select', options: ['forward', 'back', 'both', 'none'] },
  { key: 'weight', label: 'Weight', description: 'Weight of the edge (stiffness)', type: 'edge', valueType: 'number' },
  { key: 'len', label: 'Length', description: 'Preferred length of the edge', type: 'edge', valueType: 'number' },
  { key: 'headlabel', label: 'Head Label', description: 'Label placed near the head of the edge', type: 'edge', valueType: 'text' },
  { key: 'taillabel', label: 'Tail Label', description: 'Label placed near the tail of the edge', type: 'edge', valueType: 'text' },
  { key: 'constraint', label: 'Constraint', description: 'If false, edge is not used in rank assignment', type: 'edge', valueType: 'boolean' },
  { key: 'minlen', label: 'Min Length', description: 'Minimum distance between nodes', type: 'edge', valueType: 'number' },
  { key: 'labeldistance', label: 'Label Distance', description: 'Distance of labels from nodes', type: 'edge', valueType: 'number' },
  { key: 'labelangle', label: 'Label Angle', description: 'Angle of labels from edge', type: 'edge', valueType: 'number' },
  { key: 'arrowsize', label: 'Arrow Size', description: 'Multiplicative factor for arrow heads', type: 'edge', valueType: 'number' },
  { key: 'lhead', label: 'Logical Head', description: 'Cluster to use as logical head of edge', type: 'edge', valueType: 'text' },
  { key: 'ltail', label: 'Logical Tail', description: 'Cluster to use as logical tail of edge', type: 'edge', valueType: 'text' },
  { key: 'decorate', label: 'Decorate', description: 'Draw line connecting label to edge', type: 'edge', valueType: 'boolean' },
  { key: 'labelfontcolor', label: 'Label Font Color', description: 'Color for head/tail labels', type: 'edge', valueType: 'color' },
  { key: 'labelfontname', label: 'Label Font Name', description: 'Font for head/tail labels', type: 'edge', valueType: 'text' },
  { key: 'labelfontsize', label: 'Label Font Size', description: 'Font size for head/tail labels', type: 'edge', valueType: 'number' },
  { key: 'headport', label: 'Head Port', description: 'Where on the node the edge attaches', type: 'edge', valueType: 'text' },
  { key: 'tailport', label: 'Tail Port', description: 'Where on the node the edge starts', type: 'edge', valueType: 'text' },
  
  // Graph Attributes
  { key: 'rankdir', label: 'Rank Direction', description: 'Direction of layout', type: 'graph', valueType: 'select', options: ['TB', 'BT', 'LR', 'RL'] },
  { key: 'nodesep', label: 'Node Separation', description: 'Minimum space between nodes in same rank', type: 'graph', valueType: 'number' },
  { key: 'ranksep', label: 'Rank Separation', description: 'Minimum space between ranks', type: 'graph', valueType: 'number' },
  { key: 'splines', label: 'Splines', description: 'How to draw edges', type: 'graph', valueType: 'select', options: ['none', 'line', 'polyline', 'curved', 'ortho', 'spline'] },
  { key: 'overlap', label: 'Overlap', description: 'How to handle node overlaps', type: 'graph', valueType: 'select', options: ['true', 'false', 'scale', 'prism'] },
  { key: 'bgcolor', label: 'Background Color', description: 'Background color of the graph', type: 'graph', valueType: 'color' },
  { key: 'layout', label: 'Layout Engine', description: 'Graphviz layout engine to use', type: 'graph', valueType: 'select', options: ['dot', 'neato', 'fdp', 'sfdp', 'twopi', 'circo'] },
  { key: 'compound', label: 'Compound', description: 'Allow edges between clusters', type: 'graph', valueType: 'boolean' },
  { key: 'concentrate', label: 'Concentrate', description: 'Merge multi-edges', type: 'graph', valueType: 'boolean' },
  { key: 'ratio', label: 'Ratio', description: 'Aspect ratio of the graph', type: 'graph', valueType: 'text' },
  { key: 'labelloc', label: 'Label Location', description: 'Vertical placement of graph label', type: 'graph', valueType: 'select', options: ['t', 'b'] },
  { key: 'labeljust', label: 'Label Justification', description: 'Horizontal placement of graph label', type: 'graph', valueType: 'select', options: ['l', 'r', 'c'] },
  { key: 'center', label: 'Center', description: 'Center graph on page', type: 'graph', valueType: 'boolean' },
  { key: 'ordering', label: 'Ordering', description: 'Order of edges out of a node', type: 'graph', valueType: 'select', options: ['out'] },
  { key: 'rank', label: 'Rank', description: 'Rank constraints on nodes', type: 'graph', valueType: 'select', options: ['same', 'min', 'source', 'max', 'sink'] },
  { key: 'newrank', label: 'New Rank', description: 'Use new rank algorithm', type: 'graph', valueType: 'boolean' },
  { key: 'pagedir', label: 'Page Direction', description: 'Direction of page layout', type: 'graph', valueType: 'select', options: ['BL', 'BR', 'TL', 'TR', 'RB', 'RT', 'LB', 'LT'] },
  { key: 'page', label: 'Page Size', description: 'Size of page for output', type: 'graph', valueType: 'text' },
  { key: 'size', label: 'Size', description: 'Maximum width and height of graph', type: 'graph', valueType: 'text' },
];
