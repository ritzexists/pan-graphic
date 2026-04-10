import Editor, { useMonaco } from '@monaco-editor/react';
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { HexAlphaColorPicker } from 'react-colorful';
import JSZip from 'jszip';
import { GraphState, generateDot, parseDot, createNode, createEdge, createSubgraph, getFirstNodeId, GraphElement, NodeElement, EdgeElement, SubgraphElement } from './lib/graph';
import { renderDot, GraphvizImage } from './lib/render';
import { MousePointer2, Plus, ArrowRight, Settings, Code, LayoutTemplate, Download, Trash2, X, Check, Wrench, Share2, Link, Image as ImageIcon, AlertCircle, Loader2, Copy, PanelRight, PanelRightClose, HelpCircle, Github, FolderOpen, PlusCircle, Globe, FileUp, ExternalLink, FileDown, Ban, Move, Palette, LogOut, Undo2, Redo2 } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { db, MediaItem } from './lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { AttributeSelector } from './components/AttributeSelector';
import { GRAPHVIZ_ATTRIBUTES } from './lib/attributes';
import { Joyride, STATUS, Step, EVENTS } from 'react-joyride';

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
  // 5 Nodes
  { id: 'p1', type: 'node', color: '#ffffff', shape: 'box', style: 'rounded', fontcolor: 'black' },
  { id: 'p2', type: 'node', color: '#ec4899', shape: 'hexagon', style: 'filled', fontcolor: 'white' },
  { id: 'p3', type: 'node', shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/main/dist/Compute/EC2.png' },
  { id: 'p4', type: 'node', color: '#f59e0b', shape: 'Mrecord', style: 'filled', fontcolor: 'black', label: '{ <f0> port0 | <f1> port1 | <f2> port2 }' },
  { id: 'p5', type: 'node', color: '#8b5cf6', shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE>
  <TR>
    <TD>HTML</TD>
  </TR>
</TABLE>>` },
  // 3 Edges
  { id: 'p6', type: 'edge', color: '#38bdf8', style: 'solid', arrowhead: 'normal', fontcolor: 'white' },
  { id: 'p7', type: 'edge', color: '#10b981', style: 'dotted', arrowhead: 'diamond', fontcolor: 'white' },
  { id: 'p8', type: 'edge', color: '#000000', style: 'dashed', arrowhead: 'vee', fontcolor: 'white' },
  // 1 Subgraph
  { id: 'p9', type: 'subgraph', color: '#f5f5f5', style: 'filled', bgcolor: '#f1f5f9', fontcolor: 'black' },
];

const P2_STYLE_TEMPLATES = [
  { shape: 'hexagon', style: 'filled', color: '#ec4899', fontcolor: 'white' },
  { shape: 'triangle', style: 'filled', color: '#8b5cf6', fontcolor: 'white' },
  { shape: 'invtriangle', style: 'filled', color: '#3b82f6', fontcolor: 'white' },
  { shape: 'pentagon', style: 'filled', color: '#10b981', fontcolor: 'white' },
  { shape: 'folder', style: 'filled', color: '#f59e0b', fontcolor: 'black' },
  { shape: 'tab', style: 'filled', color: '#ef4444', fontcolor: 'white' },
  { shape: 'house', style: 'filled', color: '#64748b', fontcolor: 'white' },
  { shape: 'trapezium', style: 'filled', color: '#06b6d4', fontcolor: 'black' },
  { shape: 'invtrapezium', style: 'filled', color: '#f43f5e', fontcolor: 'white' },
];

const P3_STYLE_TEMPLATES = [
  { shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/main/dist/Compute/EC2.png' },
  { shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/main/dist/Storage/SimpleStorageService.png' },
  { shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/main/dist/Compute/Lambda.png' },
  { shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/main/dist/Database/RDS.png' },
  { shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/plantuml-stdlib/Azure-PlantUML/master/dist/Web/AzureWebApp.png' },
  { shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/plantuml-stdlib/Azure-PlantUML/master/dist/Databases/AzureSqlDatabase.png' },
  { shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/plantuml-stdlib/Azure-PlantUML/master/dist/Storage/AzureStorage.png' },
  { shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/plantuml-stdlib/Azure-PlantUML/master/dist/Compute/AzureVirtualMachine.png' },
  { shape: 'none', xlabel: 'Node', label: ' ', image: 'https://raw.githubusercontent.com/plantuml-stdlib/Azure-PlantUML/master/dist/Containers/AzureKubernetesService.png' },
];

const RECORD_STYLE_TEMPLATES = [
  { shape: 'record', style: 'filled', color: '#ffffff', fontcolor: 'black', label: 'a | b' }, // complexity 2
  { shape: 'record', style: 'filled', color: '#3b82f6', fontcolor: 'white', label: '{ <f0> left | <f1> mid | <f2> right }' }, // complexity 3
  { shape: 'record', style: 'filled', color: '#10b981', fontcolor: 'white', label: '{ <t> top | { <l> left | <r> right } | <b> bottom }' }, // complexity 4
  { shape: 'Mrecord', style: 'filled', color: '#f59e0b', fontcolor: 'black', label: '{ <p1> 1 | <p2> 2 | <p3> 3 | <p4> 4 }' }, // complexity 4
  { shape: 'Mrecord', style: 'filled', color: '#8b5cf6', fontcolor: 'white', label: '{ <in> input | <out> output }' }, // complexity 3
  { shape: 'Mrecord', style: 'filled', color: '#f43f5e', fontcolor: 'white', label: '{ <head> header | { <c1> col1 | <c2> col2 } | <foot> footer }' }, // complexity 4
  { shape: 'record', style: 'filled', color: '#06b6d4', fontcolor: 'white', label: '{ <f1> field1 | { <s1> sub1 | { <ss1> a | <ss2> b } | <s3> sub3 } | <f2> field2 }' }, // complexity 5
  { shape: 'Mrecord', style: 'filled', color: '#64748b', fontcolor: 'white', label: '{ <portA> a | <portB> b | <portC> c | <portD> d | <portE> e }' }, // complexity 5
  { shape: 'record', style: 'filled', color: '#ef4444', fontcolor: 'white', label: '{ <head> Header | { <c1> col1 | <c2> col2 } }' }, // complexity 4
];

const HTML_STYLE_TEMPLATES = [
  { shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE>
  <TR>
    <TD>A</TD>
  </TR>
</TABLE>>` },
  { shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE>
  <TR>
    <TD>A</TD>
    <TD>B</TD>
  </TR>
</TABLE>>` },
  { shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE>
  <TR>
    <TD>A</TD>
    <TD>B</TD>
  </TR>
  <TR>
    <TD>C</TD>
    <TD>D</TD>
  </TR>
</TABLE>>` },
  { shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE>
  <TR>
    <TD ROWSPAN="2">A</TD>
    <TD>B</TD>
  </TR>
  <TR>
    <TD>C</TD>
  </TR>
</TABLE>>` },
  { shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE>
  <TR>
    <TD COLSPAN="2">A</TD>
  </TR>
  <TR>
    <TD>B</TD>
    <TD>C</TD>
  </TR>
  <TR>
    <TD COLSPAN="2">D</TD>
  </TR>
</TABLE>>` },
  { shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">
  <TR>
    <TD>1</TD>
    <TD>2</TD>
    <TD>3</TD>
  </TR>
</TABLE>>` },
  { shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">
  <TR>
    <TD ROWSPAN="3">main</TD>
    <TD>a</TD>
  </TR>
  <TR>
    <TD>b</TD>
  </TR>
  <TR>
    <TD>c</TD>
  </TR>
</TABLE>>` },
  { shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">
  <TR>
    <TD>top left</TD>
    <TD PORT="top_right">top right</TD>
  </TR>
  <TR>
    <TD PORT="bottom_left">bottom left</TD>
    <TD>bottom right</TD>
  </TR>
</TABLE>>` },
  { shape: 'plaintext', fontcolor: 'black', label: `<
<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">
  <TR>
    <TD BGCOLOR="lightblue">Header</TD>
  </TR>
  <TR>
    <TD>Content</TD>
  </TR>
</TABLE>>` },
];

const P6_STYLE_TEMPLATES = [
  { style: 'solid', color: '#38bdf8', arrowhead: 'normal' },
  { style: 'solid', color: '#ef4444', arrowhead: 'vee' },
  { style: 'solid', color: '#10b981', arrowhead: 'diamond' },
  { style: 'solid', color: '#f59e0b', arrowhead: 'dot' },
  { style: 'solid', color: '#8b5cf6', arrowhead: 'inv' },
  { style: 'solid', color: '#ec4899', arrowhead: 'none' },
  { style: 'solid', color: '#64748b', arrowhead: 'tee' },
  { style: 'solid', color: '#06b6d4', arrowhead: 'box' },
  { style: 'bold', color: '#0f172a', arrowhead: 'normal', penwidth: '3' },
];

const P7_STYLE_TEMPLATES = [
  { style: 'dotted', color: '#10b981', arrowhead: 'normal' },
  { style: 'dotted', color: '#ef4444', arrowhead: 'vee' },
  { style: 'dotted', color: '#38bdf8', arrowhead: 'diamond' },
  { style: 'dotted', color: '#f59e0b', arrowhead: 'dot' },
  { style: 'dotted', color: '#8b5cf6', arrowhead: 'inv' },
  { style: 'dotted', color: '#ec4899', arrowhead: 'none' },
  { style: 'dotted', color: '#64748b', arrowhead: 'tee' },
  { style: 'dotted', color: '#06b6d4', arrowhead: 'box' },
  { style: 'dotted,bold', color: '#0f172a', arrowhead: 'normal', penwidth: '3' },
];

const P8_STYLE_TEMPLATES = [
  { style: 'dashed', color: '#000000', arrowhead: 'normal' },
  { style: 'dashed', color: '#ef4444', arrowhead: 'vee' },
  { style: 'dashed', color: '#10b981', arrowhead: 'diamond' },
  { style: 'dashed', color: '#f59e0b', arrowhead: 'dot' },
  { style: 'dashed', color: '#8b5cf6', arrowhead: 'inv' },
  { style: 'dashed', color: '#ec4899', arrowhead: 'none' },
  { style: 'dashed', color: '#64748b', arrowhead: 'tee' },
  { style: 'dashed', color: '#06b6d4', arrowhead: 'box' },
  { style: 'dashed,bold', color: '#0f172a', arrowhead: 'normal', penwidth: '3' },
];

const P9_STYLE_TEMPLATES = [
  { style: 'filled', color: '#cbd5e1', bgcolor: '#f8fafc', fontcolor: '#0f172a' },
  { style: 'dashed', color: '#3b82f6', bgcolor: 'transparent', fontcolor: '#1d4ed8' },
  { style: 'dotted', color: '#10b981', bgcolor: 'transparent', fontcolor: '#047857' },
  { style: 'rounded,filled', color: '#f59e0b', bgcolor: '#fef3c7', fontcolor: '#b45309' },
  { style: 'filled', color: '#ef4444', bgcolor: '#fef2f2', fontcolor: '#b91c1c' },
  { style: 'rounded,dashed', color: '#8b5cf6', bgcolor: 'transparent', fontcolor: '#6d28d9' },
  { style: 'bold', color: '#0f172a', bgcolor: 'transparent', fontcolor: '#0f172a', penwidth: '3' },
  { style: 'filled,dotted', color: '#06b6d4', bgcolor: '#ecfeff', fontcolor: '#0e7490' },
  { style: 'rounded,filled,dashed', color: '#ec4899', bgcolor: '#fdf2f8', fontcolor: '#be185d' },
];

const STYLE_TEMPLATES: Record<'node' | 'edge' | 'subgraph', any[]> = {
  node: [
    { shape: 'box', style: 'rounded', color: '#ffffff', fontcolor: 'black' },
    { shape: 'ellipse', style: 'filled', color: '#3b82f6', fontcolor: 'white' },
    { shape: 'diamond', style: 'filled', color: '#10b981', fontcolor: 'white' },
    { shape: 'cylinder', style: 'filled', color: '#f59e0b', fontcolor: 'black' },
    { shape: 'octagon', style: 'filled', color: '#8b5cf6', fontcolor: 'white' },
    { shape: 'star', style: 'filled', color: '#f43f5e', fontcolor: 'white' },
    { shape: 'note', style: 'filled', color: '#fef3c7', fontcolor: 'black' },
    { shape: 'component', style: 'filled', color: '#e2e8f0', fontcolor: 'black' },
    { shape: 'parallelogram', style: 'filled', color: '#06b6d4', fontcolor: 'white' },
  ],
  edge: [
    { style: 'solid', arrowhead: 'normal', color: '#000000', fontcolor: 'black' },
    { style: 'dotted', arrowhead: 'diamond', color: '#10b981', fontcolor: 'black' },
    { style: 'dashed', arrowhead: 'vee', color: '#3b82f6', fontcolor: 'black' },
    { style: 'bold', arrowhead: 'dot', color: '#ef4444', fontcolor: 'black' },
    { style: 'solid', arrowhead: 'none', color: '#64748b', fontcolor: 'black' },
    { style: 'dashed', arrowhead: 'empty', color: '#8b5cf6', fontcolor: 'black' },
    { style: 'dotted', arrowhead: 'open', color: '#f59e0b', fontcolor: 'black' },
    { style: 'solid', arrowhead: 'inv', color: '#d946ef', fontcolor: 'black' },
    { style: 'bold', arrowhead: 'crow', color: '#000000', fontcolor: 'black' },
  ],
  subgraph: [
    { style: 'filled', bgcolor: '#f1f5f9', color: '#f5f5f5', fontcolor: 'black' },
    { style: 'dashed', bgcolor: '#ffffff', color: '#e2e8f0', fontcolor: 'black' },
    { style: 'dotted', bgcolor: '#f8fafc', color: '#cbd5e1', fontcolor: 'black' },
    { style: 'filled', bgcolor: '#ecfdf5', color: '#d1fae5', fontcolor: 'black' },
    { style: 'filled', bgcolor: '#eff6ff', color: '#dbeafe', fontcolor: 'black' },
    { style: 'filled', bgcolor: '#fff7ed', color: '#ffedd5', fontcolor: 'black' },
    { style: 'filled', bgcolor: '#fdf2f8', color: '#fce7f3', fontcolor: 'black' },
    { style: 'bold', bgcolor: '#ffffff', color: '#000000', fontcolor: 'black' },
    { style: 'rounded', bgcolor: '#f1f5f9', color: '#f5f5f5', fontcolor: 'black' },
  ]
};

const getDefaultAdditionalStyles = (palettesToUse = DEFAULT_PALETTES) => {
  const initial: Record<string, any[]> = {};
  palettesToUse.forEach(p => {
    if (p.id === 'p2') {
      initial[p.id] = [...P2_STYLE_TEMPLATES];
    } else if (p.id === 'p3') {
      initial[p.id] = [...P3_STYLE_TEMPLATES];
    } else if (p.id === 'p4') {
      initial[p.id] = [...RECORD_STYLE_TEMPLATES];
    } else if (p.id === 'p5') {
      initial[p.id] = [...HTML_STYLE_TEMPLATES];
    } else if (p.id === 'p6') {
      initial[p.id] = [...P6_STYLE_TEMPLATES];
    } else if (p.id === 'p7') {
      initial[p.id] = [...P7_STYLE_TEMPLATES];
    } else if (p.id === 'p8') {
      initial[p.id] = [...P8_STYLE_TEMPLATES];
    } else if (p.id === 'p9') {
      initial[p.id] = [...P9_STYLE_TEMPLATES];
    } else {
      initial[p.id] = [...STYLE_TEMPLATES[p.type as 'node' | 'edge' | 'subgraph']];
    }
  });
  return initial;
};

const initialGraphDot = `digraph "G" {
  rankdir="TB";
  compound="true";
  node [shape="box", style="rounded"];
  "node_linguistic_aquamarine_mollusk" [label="Hello!", id="node_linguistic_aquamarine_mollusk"];
  "node_frantic_turquoise_moose" [label=<
<table border="0" cellspacing="0" cellborder="1">
     <tr>
      <td width="9" height="9" fixedsize="true" style="invis"></td>
      <td width="9" height="9" fixedsize="true" sides="ltr"></td>
      <td width="9" height="9" fixedsize="true" style="invis"></td>
     </tr>
     <tr>
      <td width="9" height="9" fixedsize="true" sides="tlb"></td>
      <td width="9" height="9" fixedsize="true" sides="b"></td>
      <td width="9" height="9" fixedsize="true" sides="brt"></td>
     </tr>
    </table>>, color="#8b5cf6", shape="plaintext", fontcolor="black", id="node_frantic_turquoise_moose"];
  "node_alleged_scarlet_marten" -> "node_frantic_turquoise_moose" [color="#38bdf8", style="solid", arrowhead="normal", fontcolor="white", tailport="sw", id="edge_homeless_plum_starfish"];
  "node_efficient_indigo_blackbird" [label=<
<TABLE>
			<TR>
        <TD>With</TD>
        <TD BGCOLOR="blue"><FONT COLOR="white">built</FONT></TD>
        <TD BGCOLOR="gray"><FONT POINT-SIZE="24.0">in</FONT></TD>
        <TD BGCOLOR="yellow"><FONT POINT-SIZE="24.0" FACE="consolas">code</FONT></TD>
        <TD>
          <TABLE CELLPADDING="0" BORDER="0" CELLSPACING="0">
						<TR>
							<TD><FONT COLOR="green">editing </FONT></TD>
							<TD><FONT COLOR="red">features</FONT></TD>
						</TR>
          </TABLE>
        </TD>
      </TR>
    </TABLE>>, color="#8b5cf6", shape="plaintext", fontcolor="black", id="node_efficient_indigo_blackbird"];
  "node_civil_indigo_squirrel" -> "node_efficient_indigo_blackbird" [color="#38bdf8", style="solid", arrowhead="normal", fontcolor="white", tailport="e", id="edge_dependent_gray_elk"];
  "node_zany_ivory_marlin" [label=<

<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0">
  <TR><TD ROWSPAN="3" BGCOLOR="yellow">To</TD></TR>
  <TR><TD PORT="here" BGCOLOR="lightblue">PanGraphic!</TD></TR>
</TABLE>>, color="#8b5cf6", shape="plaintext", fontcolor="black", id="node_zany_ivory_marlin"];
  "node_principal_olive_urial" [label="Welcome", shape="parallelogram", style="filled", color="#06b6d4", fontcolor="white", id="node_principal_olive_urial"];
  "node_linguistic_aquamarine_mollusk" -> "node_principal_olive_urial" [tailport="nw", color="#38bdf8", style="solid", arrowhead="normal", fontcolor="white", id="edge_grand_silver_panda"];
  "node_principal_olive_urial" -> "node_zany_ivory_marlin" [tailport="s", headport="w", style="solid", color="#f59e0b", arrowhead="dot", id="edge_chosen_amber_snipe"];
  "node_alleged_scarlet_marten" [label="It's Powerful", shape="house", style="filled", color="#64748b", fontcolor="white", id="node_alleged_scarlet_marten"];
  "node_zany_ivory_marlin" -> "node_alleged_scarlet_marten" [tailport="ne", style="solid", color="#f59e0b", arrowhead="dot", id="edge_soft_tan_jackal"];
  "node_civil_indigo_squirrel" [label="Flexible", shape="tab", style="filled", color="#ef4444", fontcolor="white", id="node_civil_indigo_squirrel"];
  "node_alleged_scarlet_marten" -> "node_civil_indigo_squirrel" [tailport="e", style="solid", color="#64748b", arrowhead="tee", id="edge_vertical_green_blackbird"];
  "node_repulsive_lavender_bobolink" [label="{ <f1> Record| { <s1> Type| { <ss1> Nodes | <ss2> With } | <s3> Configurable} | <f2> Ports}", shape="record", style="filled", color="#06b6d4", fontcolor="white", id="node_repulsive_lavender_bobolink"];
  "node_alleged_scarlet_marten" -> "node_repulsive_lavender_bobolink" [tailport="w", color="#10b981", style="dotted", arrowhead="diamond", fontcolor="white", id="edge_occasional_ivory_owl"];
  "node_very_indigo_salmon" [label="{ <p1> A | <p2> Mobile| <p3>  Graphviz | <p4> Editor }", shape="Mrecord", style="filled", color="#f59e0b", fontcolor="black", id="node_very_indigo_salmon"];
  "node_zany_ivory_marlin" -> "node_very_indigo_salmon" [tailport="n", headport="w", color="#10b981", style="dotted", arrowhead="diamond", fontcolor="white", weight="2", id="edge_adorable_coffee_ostrich"];
  "node_dear_harlequin_opossum" [label="Open Source", shape="component", style="filled", color="#e2e8f0", fontcolor="black", id="node_dear_harlequin_opossum"];
  "node_civil_indigo_squirrel" -> "node_dear_harlequin_opossum" [tailport="w", color="#10b981", style="dotted", arrowhead="diamond", fontcolor="white", id="edge_victorious_ivory_egret"];
  "node_elderly_silver_ladybug" [label="and LLM-produced", shape="note", style="filled", color="#fef3c7", fontcolor="black", id="node_elderly_silver_ladybug"];
  "node_dear_harlequin_opossum" -> "node_elderly_silver_ladybug" [tailport="s", style="dashed", color="#8b5cf6", arrowhead="inv", id="edge_fair_aqua_iguana"];
  "node_salty_black_giraffe" [label=" ", shape="none", xlabel="Images", image="https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/main/dist/Storage/SimpleStorageService.png", id="node_salty_black_giraffe"];
  "node_alleged_scarlet_marten" -> "node_salty_black_giraffe" [style="dashed", color="#8b5cf6", arrowhead="inv", tailport="ne", id="edge_weak_black_lobster"];
  "node_arbitrary_gold_quail" [label=" ", shape="none", xlabel="With", image="https://raw.githubusercontent.com/plantuml-stdlib/Azure-PlantUML/master/dist/Databases/AzureSqlDatabase.png", id="node_arbitrary_gold_quail"];
  "node_alleged_scarlet_marten" -> "node_arbitrary_gold_quail" [style="dashed", color="#8b5cf6", arrowhead="inv", tailport="nw", id="edge_slim_violet_pinniped"];
}`;

const initialGraph: GraphState = parseDot(initialGraphDot);

const AttributePicker = ({ label, value, options, onChange, onRemove }: { label: string, value: string, options: string[], onChange: (v: string) => void, onRemove: () => void }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
    </div>
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">Select...</option>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

const IS_TOUCH = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const ColorPicker = ({ label, value, onChange, onRemove }: { label: string, value: string, onChange: (v: string) => void, onRemove: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1 relative">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`${IS_TOUCH ? 'w-10 h-10' : 'w-8 h-8'} rounded-md border border-slate-200 shadow-sm`}
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      {isOpen && (
        <div ref={popoverRef} className="absolute z-50 mt-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Color Picker</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <HexAlphaColorPicker color={value.startsWith('#') ? value : '#000000'} onChange={onChange} />
          <div className="flex flex-wrap gap-2 mt-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => onChange(c)}
                className={`${IS_TOUCH ? 'w-10 h-10' : 'w-6 h-6'} rounded-md border border-slate-200 transition-transform hover:scale-110`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getImageDimensions = (url: string): Promise<{width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
};

const ImagePicker = ({ label, value, mediaItems, onChange, onRemove }: { label: string, value: string, mediaItems: MediaItem[] | undefined, onChange: (v: string) => void, onRemove: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const url = reader.result as string;
        let width, height;
        try {
          const dims = await getImageDimensions(url);
          width = dims.width;
          height = dims.height;
        } catch (err) {
          console.error("Failed to get image dimensions", err);
        }
        await db.media.add({
          name: file.name,
          type: 'local',
          url: url,
          blob: file,
          width,
          height,
          createdAt: Date.now()
        });
        onChange(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
      </div>
      <div className="flex flex-col gap-2">
        <select
          value={mediaItems?.some(m => m.name === value) ? value : ''}
          onChange={(e) => {
            if (e.target.value === 'upload') {
              fileInputRef.current?.click();
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select from media...</option>
          {mediaItems?.map(item => (
            <option key={item.id} value={item.name}>{item.name}</option>
          ))}
          <option value="upload" className="text-indigo-600 font-medium">+ Upload New File...</option>
        </select>
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or enter URL / media name"
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/*"
          onChange={handleFileUpload}
        />
        <p className="text-[10px] text-slate-400 leading-tight mt-1">
          Tip: For better display, set <code className="bg-slate-100 px-1 rounded">shape="none"</code>, <code className="bg-slate-100 px-1 rounded">imagescale="true"</code> and <code className="bg-slate-100 px-1 rounded">label=""</code>.
        </p>
        <p className="text-[10px] text-slate-400 leading-tight">
          Note: External URLs may fail due to CORS. Use the Media Manager to download them to local storage.
        </p>
      </div>
    </div>
  );
};

const BooleanPicker = ({ label, value, onChange, onRemove }: { label: string, value: string, onChange: (v: string) => void, onRemove: () => void }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(value === 'true' ? 'false' : 'true')}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${value === 'true' ? 'bg-indigo-600' : 'bg-slate-200'}`}
      >
        <span
          className={`${value === 'true' ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-[#ffffff] transition-transform`}
        />
      </button>
      <span className="text-sm text-slate-600">{value === 'true' ? 'True' : 'False'}</span>
    </div>
  </div>
);

const ExpandingTextarea = ({ label, value, onChange, onRemove, placeholder }: { label: string, value: string, onChange: (v: string) => void, onRemove: () => void, placeholder?: string }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
      </div>
      <textarea
        ref={textareaRef}
        id={`attr-input-${label}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none overflow-hidden min-h-[38px]"
        placeholder={placeholder}
        rows={1}
      />
    </div>
  );
};

const SliderPicker = ({ label, value, onChange, onRemove, min = 0, max = 100 }: { label: string, value: string, onChange: (v: string) => void, onRemove: () => void, min?: number, max?: number }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
    </div>
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value ? parseInt(value, 10) : min}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
      <span className="text-sm text-slate-600 w-8 text-right">{value || min}</span>
    </div>
  </div>
);

const NumberPicker = ({ label, value, onChange, onRemove }: { label: string, value: string, onChange: (v: string) => void, onRemove: () => void }) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
    </div>
    <input
      type="number"
      step="any"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);

export default function App() {
  const [graph, setGraph] = useState<GraphState>(initialGraph);
  const [undoStack, setUndoStack] = useState<GraphState[]>([]);
  const [redoStack, setRedoStack] = useState<GraphState[]>([]);

  const undo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, graph]);
    setUndoStack(prev => prev.slice(0, -1));
    setGraph(previous);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, graph]);
    setRedoStack(prev => prev.slice(0, -1));
    setGraph(next);
  };

  const updateGraph = useCallback((updater: GraphState | ((prev: GraphState) => GraphState)) => {
    setGraph(prevGraph => {
      const next = typeof updater === 'function' ? updater(prevGraph) : updater;
      if (next !== prevGraph) {
        setUndoStack(prevUndo => [...prevUndo, prevGraph].slice(-50));
        setRedoStack([]);
        return next;
      }
      return prevGraph;
    });
  }, []);

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
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaNameInput, setMediaNameInput] = useState('');
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const transformRef = useRef<any>(null);
  const hasInitialZoomed = useRef(false);

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    applyTheme();
    
    if (theme === 'system') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
      }
      return prev === 'light' ? 'dark' : 'light';
    });
  };

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const hasVisited = localStorage.getItem('panGraphicHasVisited');
    if (!hasVisited) {
      setShowWelcomeModal(true);
      localStorage.setItem('panGraphicHasVisited', 'true');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoStack, redoStack, graph]);

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
  const [showAddPaletteDropdown, setShowAddPaletteDropdown] = useState(false);
  const addPaletteDropdownRef = useRef<HTMLDivElement>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string>('');

  const [palettes, setPalettes] = useState(() => {
    const saved = localStorage.getItem('panGraphicPalettes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved palettes", e);
      }
    }
    return DEFAULT_PALETTES;
  });

  useEffect(() => {
    localStorage.setItem('panGraphicPalettes', JSON.stringify(palettes));
  }, [palettes]);

  const tourSteps: Step[] = [
    {
      target: '#toolbar-tools',
      content: 'Visual Editor: Use the toolbar on the left to select elements, add nodes, or create edges. Double-click anywhere on the canvas to quickly add a node.',
      skipBeacon: true,
      placement: 'right',
    },
    {
      target: '#toolbar-code',
      content: 'Code Editor: Toggle to the Code view to edit the raw DOT language representation of your graph. Changes are synced automatically.',
      placement: 'right',
    },
    {
      target: '#header-properties',
      content: 'Properties Panel: Select a node or edge to edit its attributes. When nothing is selected, you can change global graph attributes.',
      placement: 'bottom',
    },
    {
      target: '#properties-engine',
      content: 'Layout Engines: Choose from different Graphviz layout engines (dot, neato, circo, etc.) to automatically arrange your graph in different ways.',
      placement: 'left',
    },
    {
      target: '#header-defaults',
      content: 'Element Defaults: Click here to set default attributes for all new nodes and edges.',
      placement: 'bottom',
    },
    {
      target: '#header-media',
      content: 'Media Manager: Upload images or provide URLs to use as node images.',
      placement: 'bottom',
    },
    {
      target: '#header-save',
      content: 'Export & Share: Download your graph as an SVG or PNG image, or generate a shareable link.',
      placement: 'bottom',
    },
    {
      target: '#toolbar-tools',
      content: 'Style Palettes: Hover over any palette icon in the sidebar to reveal a 3x3 grid of style slots. Click a slot to quickly apply that style to the palette. You can also drag elements from the graph onto these slots to save their styles.',
      placement: 'right',
    }
  ];

  const handleJoyrideCallback = (data: any) => {
    const { status, type, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
    }

    if (type === EVENTS.STEP_BEFORE) {
      if (index === 2 || index === 3) {
        setIsPropertiesPaneOpen(true);
        setShowElementDefaults(false);
      } else if (index >= 4) {
        setIsPropertiesPaneOpen(false);
        setShowElementDefaults(false);
      }
    }
  };
  const [activeNodePaletteId, setActiveNodePaletteId] = useState<string | null>(() => localStorage.getItem('panGraphicActiveNodePaletteId') || 'p1');
  const [activeEdgePaletteId, setActiveEdgePaletteId] = useState<string | null>(() => localStorage.getItem('panGraphicActiveEdgePaletteId') || 'p6');
  const [activeSubgraphPaletteId, setActiveSubgraphPaletteId] = useState<string | null>(() => localStorage.getItem('panGraphicActiveSubgraphPaletteId') || 'p9');

  useEffect(() => {
    if (activeNodePaletteId) localStorage.setItem('panGraphicActiveNodePaletteId', activeNodePaletteId);
  }, [activeNodePaletteId]);

  useEffect(() => {
    if (activeEdgePaletteId) localStorage.setItem('panGraphicActiveEdgePaletteId', activeEdgePaletteId);
  }, [activeEdgePaletteId]);

  useEffect(() => {
    if (activeSubgraphPaletteId) localStorage.setItem('panGraphicActiveSubgraphPaletteId', activeSubgraphPaletteId);
  }, [activeSubgraphPaletteId]);

  const [additionalStyles, setAdditionalStyles] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem('panGraphicAdditionalStyles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved additional styles", e);
      }
    }
    return getDefaultAdditionalStyles(palettes);
  });

  useEffect(() => {
    localStorage.setItem('panGraphicAdditionalStyles', JSON.stringify(additionalStyles));
  }, [additionalStyles]);
  const [hoveredPaletteId, setHoveredPaletteId] = useState<string | null>(null);
  const [hoveredBubbleIdx, setHoveredBubbleIdx] = useState<number | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [mouseState, setMouseState] = useState<{
    button: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    targetId: string | null;
    startPort?: string;
    startTime: number;
  } | null>(null);
  const mouseStateRef = useRef<typeof mouseState>(null);

  useEffect(() => {
    mouseStateRef.current = mouseState;
  }, [mouseState]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    const handleDbClick = (e: MouseEvent) => {
      if (tool === 'select') {
        const target = e.target as Element;
        if (!target.closest('g.node, g.edge, g.cluster')) {
          if (transformRef.current) {
            transformRef.current.resetTransform(200);
            // Also center it just in case resetTransform doesn't center
            setTimeout(() => {
              transformRef.current?.centerView(1, 200);
            }, 10);
          }
        }
      }
    };

    container.addEventListener('dblclick', handleDbClick);
    return () => container.removeEventListener('dblclick', handleDbClick);
  }, [tool, viewMode]);

  const shareFlyoutRef = useRef<HTMLDivElement>(null);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

  const [isPropertiesPaneOpen, setIsPropertiesPaneOpen] = useState(false);
  const [ringMenu, setRingMenu] = useState<{
    id?: string;
    type: 'node' | 'subgraph' | 'canvas' | 'edge' | 'multi_select';
    x: number;
    y: number;
  } | null>(null);
  const [isMovingElement, setIsMovingElement] = useState<string | null>(null);
  const [isMovingGroup, setIsMovingGroup] = useState<string[] | null>(null);
  const [isRebasingEdge, setIsRebasingEdge] = useState<string | null>(null);
  const [isRetargetingEdge, setIsRetargetingEdge] = useState<string | null>(null);
  const [isRebasingGroup, setIsRebasingGroup] = useState<string[] | null>(null);
  const [isRetargetingGroup, setIsRetargetingGroup] = useState<string[] | null>(null);
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, currentX: number, currentY: number} | null>(null);
  const selectionBoxRef = useRef<typeof selectionBox>(null);

  useEffect(() => {
    selectionBoxRef.current = selectionBox;
  }, [selectionBox]);
  const [activePaletteBubble, setActivePaletteBubble] = useState<{ id: string, type: 'node' | 'edge' | 'subgraph', x: number, y: number } | null>(null);
  const paletteLongPressTimer = useRef<any>(null);
  const longPressTimer = useRef<any>(null);

  const renderPaletteIcon = (p: any, isSmall = false, mediaItems?: MediaItem[]) => {
    const iconSize = isSmall ? "w-4 h-4" : "w-1/2 h-1/2";
    const borderSize = isSmall ? "border" : "border-2";
    const doubleBorderSize = isSmall ? "border-2" : "border-4";

    if (p.type === 'node') {
      const getComplexity = (label?: string) => {
        if (!label) return 1;
        const isHtml = label.startsWith('<') && label.endsWith('>');
        if (isHtml) {
          const trs = (label.match(/<tr/gi) || []).length;
          const tds = (label.match(/<td/gi) || []).length;
          if (trs >= 4 || tds >= 8) return 5;
          if (trs >= 3 || tds >= 6) return 4;
          if (trs >= 3 || tds >= 4) return 3;
          if (trs >= 2 || tds >= 2) return 2;
          return 1;
        }
        const fields = (label.match(/\|/g) || []).length + 1;
        const nesting = (label.match(/\{/g) || []).length;
        if (nesting >= 3 || fields >= 5) return 5;
        if (nesting >= 2 || fields >= 4) return 4;
        if (nesting >= 1 || fields >= 3) return 3;
        if (fields >= 2) return 2;
        return 1;
      };

      const complexity = getComplexity(p.label);
      const isHtml = p.label?.startsWith('<') && p.label?.endsWith('>');

      const svgProps = {
        width: "100%",
        height: "100%",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: p.fontcolor || 'black',
        strokeWidth: isSmall ? "1.5" : "2",
        strokeDasharray: p.style?.includes('dashed') ? '4 2' : p.style?.includes('dotted') ? '1 2' : 'none',
        className: isSmall ? "p-0.5" : "p-2"
      };

      const renderSvgShape = (shape: string) => {
        switch (shape) {
          case 'box': return <rect x="2" y="4" width="20" height="16" rx={p.style?.includes('rounded') ? 4 : 0} />;
          case 'ellipse': return <ellipse cx="12" cy="12" rx="10" ry="7" />;
          case 'circle': return <circle cx="12" cy="12" r="10" />;
          case 'diamond': return <polygon points="12 2 22 12 12 22 2 12" />;
          case 'cylinder': return <><path d="M2 8v8c0 2.21 4.48 4 10 4s10-1.79 10-4V8" /><ellipse cx="12" cy="8" rx="10" ry="4" /></>;
          case 'doublecircle': return <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="7" /></>;
          case 'hexagon': return <polygon points="12 2 22 7 22 17 12 22 2 17 2 7" />;
          case 'triangle': return <polygon points="12 2 22 20 2 20" />;
          case 'invtriangle': return <polygon points="12 22 2 4 22 4" />;
          case 'pentagon': return <polygon points="12 2 22 9 18 20 6 20 2 9" />;
          case 'folder': return <path d="M2 4h6l2 3h12v13H2z" />;
          case 'tab': return <path d="M2 8h8l2-4h10v16H2z" />;
          case 'house': return <polygon points="12 2 22 10 22 22 2 22 2 10" />;
          case 'trapezium': return <polygon points="6 4 18 4 22 20 2 20" />;
          case 'invtrapezium': return <polygon points="2 4 22 4 18 20 6 20" />;
          case 'star': return <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />;
          case 'note': return <><path d="M4 4h10l6 6v10H4z" /><polyline points="14 4 14 10 20 10" /></>;
          case 'parallelogram': return <polygon points="6 4 22 4 18 20 2 20" />;
          case 'component': return <><path d="M6 6h14v12H6z" /><rect x="2" y="8" width="8" height="3" /><rect x="2" y="13" width="8" height="3" /></>;
          case 'octagon': return <polygon points="7 2 17 2 22 7 22 17 17 22 7 22 2 17 2 7" />;
          case 'Mdiamond': return <><polygon points="12 2 22 12 12 22 2 12" /><line x1="6" y1="8" x2="6" y2="16" /><line x1="18" y1="8" x2="18" y2="16" /></>;
          default: return !shape ? <rect x="2" y="4" width="20" height="16" rx={p.style?.includes('rounded') ? 4 : 0} /> : null;
        }
      };

      const svgContent = renderSvgShape(p.shape);

      return (
        <div className="relative flex items-center justify-center w-full h-full">
          {svgContent && !isHtml && <svg {...svgProps}>{svgContent}</svg>}
          {(p.shape === 'record' || p.shape === 'Mrecord') && !isHtml && !svgContent && (
            <div className={`${iconSize} ${borderSize} flex flex-col ${p.shape === 'Mrecord' ? 'rounded-lg' : ''}`} style={{ borderColor: p.fontcolor || 'black' }}>
              {complexity === 1 && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 border-b last:border-b-0" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                  <div className="flex-1 border-b last:border-b-0" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                </div>
              )}
              {complexity === 2 && (
                <div className="flex-1 flex flex-col">
                  <div className="h-1/3 border-b flex" style={{ borderColor: p.fontcolor || 'black' }}>
                    <div className="flex-1 border-r last:border-r-0" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r last:border-r-0" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                  </div>
                  <div className="flex-1 flex">
                    <div className="w-1/2 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                </div>
              )}
              {complexity === 3 && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black' }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black' }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 flex">
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                </div>
              )}
              {complexity === 4 && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black' }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black' }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 flex">
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                </div>
              )}
              {complexity === 5 && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black' }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black' }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black' }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 flex">
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                </div>
              )}
            </div>
          )}
          {isHtml && (
            <div className={`${iconSize} ${borderSize} flex flex-col`} style={{ borderColor: p.fontcolor || 'black', borderStyle: p.style?.includes('dashed') ? 'dashed' : p.style?.includes('dotted') ? 'dotted' : 'solid' }}>
              {complexity === 1 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-1/2 h-1/2 border" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                </div>
              )}
              {complexity === 2 && (
                <div className="flex-1 flex">
                  <div className="flex-1 border-r last:border-r-0" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                  <div className="flex-1" />
                </div>
              )}
              {complexity === 3 && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }}>
                    <div className="flex-1 border-r last:border-r-0" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 flex">
                    <div className="flex-1 border-r last:border-r-0" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                </div>
              )}
              {complexity === 4 && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 flex">
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                </div>
              )}
              {complexity === 5 && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 border-b flex" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }}>
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                  <div className="flex-1 flex">
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1 border-r" style={{ borderColor: p.fontcolor || 'black', opacity: 0.6 }} />
                    <div className="flex-1" />
                  </div>
                </div>
              )}
            </div>
          )}
          {p.image ? (() => {
            const mediaItem = mediaItems?.find(m => m.name === p.image || m.url === p.image);
            const src = mediaItem ? mediaItem.url : p.image;
            return <img src={src} alt="thumbnail" className={`absolute object-contain opacity-80 ${isSmall ? 'w-4 h-4' : 'w-6 h-6'}`} />;
          })() : null}
        </div>
      );
    }
    if (p.type === 'edge') {
      const isDashed = p.style?.includes('dashed');
      const isDotted = p.style?.includes('dotted');
      const isBold = p.style?.includes('bold') || (p.penwidth && parseInt(p.penwidth) > 1);
      const color = p.color || p.fontcolor || 'black';
      
      const renderArrowhead = (type: string) => {
        switch (type) {
          case 'vee': return <path d="M 28 14 L 38 20 L 28 26" fill="none" stroke={color} strokeWidth={isSmall ? "4" : "2"} />;
          case 'diamond': return <polygon points="30,20 34,16 38,20 34,24" fill={color} />;
          case 'dot': return <circle cx="34" cy="20" r="4" fill={color} />;
          case 'inv': return <polygon points="38,14 28,20 38,26" fill={color} />;
          case 'none': return null;
          case 'tee': return <line x1="36" y1="14" x2="36" y2="26" stroke={color} strokeWidth={isSmall ? "4" : "2"} />;
          case 'box': return <rect x="30" y="16" width="8" height="8" fill={color} />;
          case 'normal':
          default: return <polygon points="28,14 38,20 28,26" fill={color} />;
        }
      };

      return (
        <div className="w-full h-full flex items-center justify-center p-1">
          <svg width="100%" height="100%" viewBox="0 0 40 40">
            <line 
              x1="5" y1="20" x2="34" y2="20" 
              stroke={color} 
              strokeWidth={isBold ? (isSmall ? "6" : "4") : (isSmall ? "4" : "2")} 
              strokeDasharray={isDashed ? '6 4' : isDotted ? '2 4' : 'none'}
            />
            {renderArrowhead(p.arrowhead)}
          </svg>
        </div>
      );
    }
    if (p.type === 'subgraph') {
      const isDashed = p.style?.includes('dashed');
      const isDotted = p.style?.includes('dotted');
      const isRounded = p.style?.includes('rounded');
      const isFilled = p.style?.includes('filled');
      const borderStyle = isDashed ? 'dashed' : isDotted ? 'dotted' : 'solid';
      const borderRadius = isRounded ? '0.5rem' : '0.125rem';
      const bgColor = isFilled ? (p.bgcolor || p.color || '#f1f5f9') : 'transparent';
      const borderColor = p.color || p.fontcolor || 'black';
      
      return (
        <div className="w-full h-full p-1">
          <div className="w-full h-full border-2 flex items-start p-1" style={{ 
            borderColor: borderColor, 
            borderStyle: borderStyle,
            borderRadius: borderRadius,
            backgroundColor: bgColor,
            borderWidth: p.penwidth ? `${p.penwidth}px` : '2px'
          }}>
            <div className="w-3 h-1 rounded-sm" style={{ backgroundColor: p.fontcolor || borderColor, opacity: 0.6 }} />
          </div>
        </div>
      );
    }
    return null;
  };

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
      if (addPaletteDropdownRef.current && !addPaletteDropdownRef.current.contains(event.target as Node)) {
        setShowAddPaletteDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    
    // 1. Add graph DOT file
    zip.file('graph.dot', generateDot(graph));
    
    // 2. Add palettes and additional styles
    const paletteData = {
      palettes,
      additionalStyles,
      activeNodePaletteId,
      activeEdgePaletteId,
      activeSubgraphPaletteId
    };
    zip.file('palettes.json', JSON.stringify(paletteData, null, 2));
    
    // 3. Add media
    if (mediaItems && mediaItems.length > 0) {
      const mediaFolder = zip.folder('media');
      if (mediaFolder) {
        for (const item of mediaItems) {
          if (item.type === 'local' && item.blob) {
            mediaFolder.file(item.name, item.blob);
          } else if (item.type === 'url') {
            // For URLs, we can't easily fetch them due to CORS, so we'll just add a manifest
            // or try to fetch if we want to be thorough. 
            // Let's just add a manifest for URLs for now to keep it simple and reliable.
          }
        }
        // Add a manifest for all media items (including URLs)
        mediaFolder.file('manifest.json', JSON.stringify(mediaItems.map(m => ({
          name: m.name,
          type: m.type,
          url: m.url,
          createdAt: m.createdAt
        })), null, 2));
      }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pangraphic-bundle.zip';
    a.click();
    URL.revokeObjectURL(url);
    setShowShareFlyout(false);
  };

  const handleRestoreBundle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);

      // 1. Restore graph DOT file
      const graphFile = loadedZip.file('graph.dot');
      if (graphFile) {
        const dotContent = await graphFile.async('string');
        try {
          const newState = parseDot(dotContent);
          setGraph(newState);
          setUndoStack([]);
          setRedoStack([]);
        } catch (err) {
          console.error("Failed to parse restored DOT file", err);
        }
      }

      // 2. Restore palettes and additional styles
      const palettesFile = loadedZip.file('palettes.json');
      if (palettesFile) {
        const palettesContent = await palettesFile.async('string');
        const paletteData = JSON.parse(palettesContent);
        if (paletteData.palettes) setPalettes(paletteData.palettes);
        if (paletteData.additionalStyles) setAdditionalStyles(paletteData.additionalStyles);
        if (paletteData.activeNodePaletteId) setActiveNodePaletteId(paletteData.activeNodePaletteId);
        if (paletteData.activeEdgePaletteId) setActiveEdgePaletteId(paletteData.activeEdgePaletteId);
        if (paletteData.activeSubgraphPaletteId) setActiveSubgraphPaletteId(paletteData.activeSubgraphPaletteId);
      }

      // 3. Restore media
      const mediaFolder = loadedZip.folder('media');
      if (mediaFolder) {
        const manifestFile = mediaFolder.file('manifest.json');
        let manifest: any[] = [];
        if (manifestFile) {
          const manifestContent = await manifestFile.async('string');
          manifest = JSON.parse(manifestContent);
        }

        for (const item of manifest) {
          const existing = await db.media.where('name').equals(item.name).first();
          if (existing) continue;

          if (item.type === 'local') {
            const fileData = mediaFolder.file(item.name);
            if (fileData) {
              const blob = await fileData.async('blob');
              const reader = new FileReader();
              reader.onload = async () => {
                const url = reader.result as string;
                let width, height;
                try {
                  const dims = await getImageDimensions(url);
                  width = dims.width;
                  height = dims.height;
                } catch (err) {
                  console.error("Failed to get image dimensions", err);
                }
                await db.media.add({
                  name: item.name,
                  type: 'local',
                  url: url,
                  blob: blob,
                  width,
                  height,
                  createdAt: item.createdAt || Date.now()
                });
              };
              reader.readAsDataURL(blob);
            }
          } else if (item.type === 'url') {
            let width, height;
            try {
              const dims = await getImageDimensions(item.url);
              width = dims.width;
              height = dims.height;
            } catch (err) {
              console.error("Failed to get image dimensions", err);
            }
            await db.media.add({
              name: item.name,
              type: 'url',
              url: item.url,
              width,
              height,
              createdAt: item.createdAt || Date.now()
            });
          }
        }
      }
      
      e.target.value = '';
    } catch (err) {
      console.error("Failed to restore bundle", err);
      alert("Failed to restore bundle. Invalid zip file.");
    }
  };

  const handleExportPalettes = async () => {
    const zip = new JSZip();
    
    const paletteData = {
      palettes,
      additionalStyles,
      activeNodePaletteId,
      activeEdgePaletteId,
      activeSubgraphPaletteId
    };
    zip.file('palettes.json', JSON.stringify(paletteData, null, 2));
    
    if (mediaItems && mediaItems.length > 0) {
      const mediaFolder = zip.folder('media');
      if (mediaFolder) {
        for (const item of mediaItems) {
          if (item.type === 'local' && item.blob) {
            mediaFolder.file(item.name, item.blob);
          }
        }
        mediaFolder.file('manifest.json', JSON.stringify(mediaItems.map(m => ({
          name: m.name,
          type: m.type,
          url: m.url,
          createdAt: m.createdAt
        })), null, 2));
      }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pangraphic-palettes.zip';
    a.click();
    URL.revokeObjectURL(url);
    setShowShareFlyout(false);
  };

  const handleAddPalette = (type: 'node' | 'edge' | 'subgraph') => {
    const newId = `p${Date.now()}`;
    const newPalette = type === 'node' 
      ? { id: newId, type: 'node', color: '#ffffff', shape: 'box', style: 'rounded', fontcolor: 'black' }
      : type === 'edge'
      ? { id: newId, type: 'edge', color: '#000000', style: 'solid', arrowhead: 'normal', fontcolor: 'white' }
      : { id: newId, type: 'subgraph', color: '#f5f5f5', style: 'filled', bgcolor: '#f1f5f9', fontcolor: 'black' };
    
    setPalettes(prev => [...prev, newPalette as any]);
    setAdditionalStyles(prev => ({
      ...prev,
      [newId]: Array(9).fill(null)
    }));
  };

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
      const url = `https://pastes.dev/${data.key}`;
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
      
      // Prepare images for Graphviz
      const images: GraphvizImage[] = [];
      if (mediaItems) {
        for (const item of mediaItems) {
          let width = item.width;
          let height = item.height;
          
          if (!width || !height) {
            try {
              const dims = await getImageDimensions(item.url);
              width = dims.width;
              height = dims.height;
              // Update DB so we don't fetch again
              if (item.id) {
                db.media.update(item.id, { width, height });
              }
            } catch (err) {
              console.error("Failed to get dimensions for", item.name, err);
            }
          }

          if (width && height) {
            images.push({
              path: item.name,
              width: `${width}px`,
              height: `${height}px`
            });
          }
        }
      }

      // Find external images in DOT that aren't in mediaItems
      const imageRegex = /(?:image|SRC)="((?:[^"\\]|\\.)*)"/gi;
      let match;
      while ((match = imageRegex.exec(dot)) !== null) {
        // Unescape any escaped quotes
        const url = match[1].replace(/\\"/g, '"');
        if ((url.startsWith('http') || url.startsWith('data:')) && !images.find(img => img.path === url)) {
          try {
            const dims = await getImageDimensions(url);
            images.push({
              path: url,
              width: `${dims.width}px`,
              height: `${dims.height}px`
            });
          } catch (err) {
            console.error("Failed to get dimensions for external image", url, err);
          }
        }
      }

      renderDot(dot, engine, images)
        .then(res => {
          let updatedSvg = res;
          if (mediaItems) {
            for (const item of mediaItems) {
              // Replace href="item.name" or xlink:href="item.name" with the actual url
              // Note: Graphviz might output xlink:href or href
              // We need to escape item.name for regex
              const escapedName = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`(href|xlink:href)="(${escapedName})"`, 'g');
              updatedSvg = updatedSvg.replace(regex, `$1="${item.url}"`);
            }
          }
          setSvg(updatedSvg);
          setError(null);
          
          if (!hasInitialZoomed.current && transformRef.current) {
            hasInitialZoomed.current = true;
            setTimeout(() => {
              transformRef.current?.zoomToElement('graph0');
            }, 50);
          }
        })
        .catch(err => {
          setError(err.message);
        });
    };

    updateGraph();
  }, [graph, engine, mediaItems]);

  useLayoutEffect(() => {
    const nodesToHandle = new Set<string>();

    // 1) On a selected node whenever a node is selected
    if (selectedId) nodesToHandle.add(selectedId);
    selectedIds.forEach(id => nodesToHandle.add(id));

    // 2) Globally during single-or-multi rebase or retarget operations
    const isRebasingOrRetargeting = isRebasingEdge || isRetargetingEdge || isRebasingGroup || isRetargetingGroup;
    
    const isDraggingFromNode = mouseState?.isDragging && 
                               mouseState?.button === 0 && 
                               tool !== 'multi_select' && 
                               !isMovingElement && 
                               !isMovingGroup && 
                               !!mouseState?.targetId && 
                               (!!svgContainerRef.current?.querySelector(`g.node#${CSS.escape(mouseState.targetId)}`) || 
                                !!svgContainerRef.current?.querySelector(`g.cluster#${CSS.escape(mouseState.targetId)}`) || 
                                !!mouseState?.startPort);

    if (isRebasingOrRetargeting || isDraggingFromNode) {
      const allNodes = svgContainerRef.current?.querySelectorAll('g.node');
      allNodes?.forEach(node => {
        if (node.id) nodesToHandle.add(node.id);
      });
    }

    // Get all current nodes with port handles
    const currentNodesWithPorts = new Set<string>();
    svgContainerRef.current?.querySelectorAll('.port-handle').forEach(el => {
      const nodeGroup = el.closest('g.node');
      if (nodeGroup && nodeGroup.id) {
        currentNodesWithPorts.add(nodeGroup.id);
      }
    });

    // Remove ports from nodes that shouldn't have them
    currentNodesWithPorts.forEach(nodeId => {
      if (!nodesToHandle.has(nodeId)) {
        const nodeGroup = svgContainerRef.current?.querySelector(`g.node#${CSS.escape(nodeId)}`);
        nodeGroup?.querySelectorAll('.port-handle').forEach(el => el.remove());
      }
    });

    nodesToHandle.forEach(nodeId => {
      if (currentNodesWithPorts.has(nodeId)) return; // Already has ports

      const nodeGroup = svgContainerRef.current?.querySelector(`g.node#${CSS.escape(nodeId)}`);
      if (!nodeGroup) return;

      const shapes = Array.from(nodeGroup.querySelectorAll('polygon, ellipse, path, image')) as SVGGraphicsElement[];
      if (shapes.length === 0) return;

      let positions: Record<string, {x: number, y: number}> = {};
      let bbox: { x: number, y: number, width: number, height: number };

      // Calculate total bounding box for standard ports
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      shapes.forEach(s => {
        const b = s.getBBox();
        if (b.width === 0 || b.height === 0) return;
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      });
      
      // Fallback for nodes that might only have text or other elements
      if (minX === Infinity) {
        const allElements = Array.from(nodeGroup.children) as SVGGraphicsElement[];
        allElements.forEach(el => {
          if (typeof el.getBBox !== 'function') return;
          const b = el.getBBox();
          if (b.width === 0 || b.height === 0) return;
          minX = Math.min(minX, b.x);
          minY = Math.min(minY, b.y);
          maxX = Math.max(maxX, b.x + b.width);
          maxY = Math.max(maxY, b.y + b.height);
        });
      }

      if (minX === Infinity) return;

      bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

      if (shapes.length === 1 && shapes[0].tagName === 'ellipse') {
        const shape = shapes[0];
        const rx = parseFloat(shape.getAttribute('rx') || '0');
        const ry = parseFloat(shape.getAttribute('ry') || '0');
        const cx_attr = parseFloat(shape.getAttribute('cx') || '0');
        const cy_attr = parseFloat(shape.getAttribute('cy') || '0');
        const angle = Math.PI / 4; // 45 degrees
        positions = {
          n: { x: cx_attr, y: cy_attr - ry },
          s: { x: cx_attr, y: cy_attr + ry },
          e: { x: cx_attr + rx, y: cy_attr },
          w: { x: cx_attr - rx, y: cy_attr },
          ne: { x: cx_attr + rx * Math.cos(angle), y: cy_attr - ry * Math.sin(angle) },
          nw: { x: cx_attr - rx * Math.cos(angle), y: cy_attr - ry * Math.sin(angle) },
          se: { x: cx_attr + rx * Math.cos(angle), y: cy_attr + ry * Math.sin(angle) },
          sw: { x: cx_attr - rx * Math.cos(angle), y: cy_attr + ry * Math.sin(angle) },
          c: { x: cx_attr, y: cy_attr },
        };
      } else {
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        positions = {
          n: { x: cx, y: bbox.y },
          s: { x: cx, y: bbox.y + bbox.height },
          e: { x: bbox.x + bbox.width, y: cy },
          w: { x: bbox.x, y: cy },
          ne: { x: bbox.x + bbox.width, y: bbox.y },
          nw: { x: bbox.x, y: bbox.y },
          se: { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
          sw: { x: bbox.x, y: bbox.y + bbox.height },
          c: { x: cx, y: cy },
        };
      }

      // Additional ports for records and HTML-like labels
      const node = findElement(graph.elements, nodeId) as NodeElement;
      if (node && node.attributes.label) {
        const label = node.attributes.label;
        const isRecord = node.attributes.shape === 'record' || node.attributes.shape === 'Mrecord';
        const isHtml = label.trim().startsWith('<') && label.trim().endsWith('>');

        if (isRecord || isHtml) {
          const parseRecordLabel = (l: string): { port: string | null, text: string | null }[] => {
            const fields: { port: string | null, text: string | null }[] = [];
            let p = 0;
            const s = l.trim().startsWith('{') && l.trim().endsWith('}') ? l.trim().slice(1, -1) : l.trim();
            const parse = () => {
              while (p < s.length) {
                if (s[p] === '{') { p++; parse(); if (s[p] === '}') p++; }
                else if (s[p] === '}') break;
                else if (s[p] === '|') p++;
                else {
                  let port: string | null = null;
                  let text = "";
                  while (p < s.length && s[p] !== '|' && s[p] !== '}' && s[p] !== '{') {
                    if (s[p] === '<') {
                      p++; let portName = "";
                      while (p < s.length && s[p] !== '>') { portName += s[p]; p++; }
                      if (s[p] === '>') p++; port = portName;
                    } else { text += s[p]; p++; }
                  }
                  if (text.trim() || port) fields.push({ port, text: text.trim() || null });
                }
              }
            };
            parse(); return fields;
          };

          const parseHtmlLabel = (l: string): { port: string | null, text: string | null }[] => {
            const res: { port: string | null, text: string | null }[] = [];
            try {
              const doc = new DOMParser().parseFromString(`<div>${l}</div>`, 'text/html');
              const tds = doc.querySelectorAll('td');
              if (tds.length > 0) {
                tds.forEach(td => res.push({ port: td.getAttribute('port'), text: td.textContent?.trim() || null }));
              } else {
                const walk = (n: Node) => {
                  if (n.nodeType === Node.TEXT_NODE) {
                    const t = n.textContent?.trim();
                    if (t) {
                      let port: string | null = null;
                      let parent = n.parentElement;
                      while (parent && parent.tagName !== 'BODY') {
                        if (parent.hasAttribute('port')) { port = parent.getAttribute('port'); break; }
                        parent = parent.parentElement;
                      }
                      res.push({ port, text: t });
                    }
                  }
                  n.childNodes.forEach(walk);
                };
                walk(doc.body);
              }
            } catch (e) { console.error(e); }
            return res;
          };

          const parsedPorts = isRecord ? parseRecordLabel(label) : parseHtmlLabel(label);
          const textElements = Array.from(nodeGroup.querySelectorAll('text')) as SVGTextElement[];
          
          let textIdx = 0;
          parsedPorts.forEach((portInfo) => {
            if (portInfo.text && textElements[textIdx]) {
              if (portInfo.port) {
                const tBbox = textElements[textIdx].getBBox();
                positions[portInfo.port] = { x: tBbox.x + tBbox.width / 2, y: tBbox.y + tBbox.height / 2 };
              }
              textIdx++;
            }
          });
        }
      }

      Object.entries(positions).forEach(([port, pos]) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pos.x.toString());
        circle.setAttribute('cy', pos.y.toString());
        circle.setAttribute('r', '4');
        circle.setAttribute('class', 'port-handle');
        circle.setAttribute('data-port', port);
        circle.setAttribute('fill', '#4f46e5');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '1.5');
        circle.style.cursor = 'crosshair';
        circle.style.opacity = '0.5';
        circle.style.transition = 'opacity 0.2s, transform 0.2s';
        circle.style.transformOrigin = `${pos.x}px ${pos.y}px`;
        
        circle.addEventListener('pointerover', () => {
          circle.style.opacity = '1';
          circle.style.transform = 'scale(1.5)';
        });
        circle.addEventListener('pointerout', () => {
          circle.style.opacity = '0.5';
          circle.style.transform = 'scale(1)';
        });

        nodeGroup.appendChild(circle);
      });
    });
  }, [
    hoveredNodeId, 
    selectedId, 
    selectedIds,
    svg, 
    mouseState?.isDragging, 
    mouseState?.button, 
    mouseState?.targetId, 
    tool, 
    isMovingElement, 
    isMovingGroup, 
    isRebasingEdge, 
    isRetargetingEdge, 
    isRebasingGroup, 
    isRetargetingGroup,
    graph,
    mouseState,
    hoveredEdgeId,
    selectedId,
    selectedIds
  ]);

  useLayoutEffect(() => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (svgEl) {
      svgEl.style.overflow = 'visible';
      
      // Add hit areas to edges for better hover detection
      svgEl.querySelectorAll('g.edge').forEach(edgeGroup => {
        const path = edgeGroup.querySelector('path');
        if (path && !edgeGroup.querySelector('.edge-hit-area')) {
          const hitArea = path.cloneNode() as SVGPathElement;
          hitArea.classList.add('edge-hit-area');
          hitArea.setAttribute('stroke', 'transparent');
          hitArea.setAttribute('stroke-width', '15');
          hitArea.setAttribute('fill', 'none');
          hitArea.setAttribute('pointer-events', 'stroke');
          edgeGroup.insertBefore(hitArea, path);
        }
      });
    }
  }, [
    selectedId, 
    selectedIds, 
    graph.elements, 
    svg, 
    hoveredEdgeId, 
    hoveredNodeId,
    mouseState?.targetId,
    mouseState?.isDragging,
    isMovingElement,
    isMovingGroup,
    isRebasingEdge,
    isRetargetingEdge,
    isRebasingGroup,
    isRetargetingGroup
  ]);

  const handlePurge = async () => {
    try {
      setPalettes(DEFAULT_PALETTES);
      setAdditionalStyles(getDefaultAdditionalStyles(DEFAULT_PALETTES));
      setActiveNodePaletteId('p1');
      setActiveEdgePaletteId('p6');
      setActiveSubgraphPaletteId('p9');
      await db.media.clear();
      setShowPurgeModal(false);
    } catch (err) {
      console.error("Failed to purge media manager", err);
      alert("Failed to purge media manager.");
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (viewMode !== 'visual') return;
    
    if (!svgContainerRef.current?.contains(e.target as Node)) return;

    const target = e.target as Element;
    const portHandle = target.closest('.port-handle');
    const startPort = portHandle ? portHandle.getAttribute('data-port') || undefined : undefined;
    const g = target.closest('g.node, g.edge, g.cluster');
    const targetId = g ? g.id : null;

    // Only handle primary pointer (left mouse button or touch)
    if (e.isPrimary && e.button === 0) {
      if (targetId) {
        e.stopPropagation();
        const el = findElement(graph.elements, targetId);
        if (el && (el.type === 'node' || el.type === 'subgraph' || el.type === 'edge')) {
          if (!startPort) {
            longPressTimer.current = setTimeout(() => {
              if (selectedIds.includes(targetId)) {
                setRingMenu({ type: 'multi_select', x: e.clientX, y: e.clientY });
              } else {
                setRingMenu({ id: targetId, type: el.type as any, x: e.clientX, y: e.clientY });
              }
              setMouseState(null);
            }, 500);
          }
        }
      } else {
        longPressTimer.current = setTimeout(() => {
          setRingMenu({ type: 'canvas', x: e.clientX, y: e.clientY });
          setMouseState(null);
        }, 500);
      }
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
      startPort,
      startTime: Date.now()
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (viewMode !== 'visual') return;
    // If ring menu is active or about to be active, prevent default context menu
    if (ringMenu || longPressTimer.current) {
      e.preventDefault();
    }
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
    const tryFocus = (attempt = 0) => {
      const input = document.getElementById('attr-input-label') as HTMLInputElement | HTMLTextAreaElement;
      if (input) {
        input.focus();
        input.select();
      } else if (attempt < 10) {
        setTimeout(() => tryFocus(attempt + 1), 100);
      }
    };
    setTimeout(() => tryFocus(), 200);
  };

  const focusXLabelInput = () => {
    const tryFocus = (attempt = 0) => {
      const input = document.getElementById('attr-input-xlabel') as HTMLInputElement | HTMLTextAreaElement;
      if (input) {
        input.focus();
        input.select();
      } else if (attempt < 10) {
        setTimeout(() => tryFocus(attempt + 1), 100);
      }
    };
    setTimeout(() => tryFocus(), 200);
  };

  const focusNodeLabelInput = (node: NodeElement) => {
    if (node.attributes.image && (node.attributes.shape === 'none' || node.attributes.shape === 'plaintext')) {
      focusXLabelInput();
    } else {
      focusLabelInput();
    }
  };

  const addElementToGraph = (newEl: GraphElement) => {
    if (selectedElement?.type === 'subgraph') {
      updateGraph(prev => ({
        ...prev,
        elements: updateElement(prev.elements, selectedId!, el => ({
          ...el,
          elements: [...(el as SubgraphElement).elements, newEl]
        }))
      }));
    } else {
      updateGraph(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    }
    setSelectedId(newEl.id);
    setShowElementDefaults(false);
    if (window.innerWidth >= 1024) setIsPropertiesPaneOpen(true);
    if (newEl.type === 'node') {
      focusNodeLabelInput(newEl as NodeElement);
    } else {
      focusLabelInput();
    }
  };

  const createNodeWithPalette = (label: string) => {
    const newNode = createNode({ label });
    const activePal = palettes.find(p => p.id === activeNodePaletteId);
    if (activePal && activePal.type === 'node') {
      const { id, type, ...attrs } = activePal;
      newNode.attributes = { ...newNode.attributes, ...attrs };
      if (attrs.image && attrs.shape === 'none') {
        newNode.attributes.label = ' ';
        newNode.attributes.xlabel = label;
      }
    }
    return newNode;
  };

  useEffect(() => {
    const handleHover = (e: PointerEvent) => {
      if (mouseState?.isDragging) return;
      
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const nodeGroup = target?.closest('g.node');
      const edgeGroup = target?.closest('g.edge');
      
      const newNodeId = nodeGroup ? nodeGroup.id : null;
      const newEdgeId = edgeGroup ? edgeGroup.id : null;
      
      if (newNodeId !== hoveredNodeId) setHoveredNodeId(newNodeId);
      if (newEdgeId !== hoveredEdgeId) setHoveredEdgeId(newEdgeId);
    };

    window.addEventListener('pointermove', handleHover);
    return () => window.removeEventListener('pointermove', handleHover);
  }, [hoveredNodeId, hoveredEdgeId, mouseState?.isDragging]);

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      if (!mouseState) return;
      const dx = e.clientX - mouseState.startX;
      const dy = e.clientY - mouseState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10 && !mouseState.isDragging) {
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
          
          // Update hovered node during drag using elementFromPoint to bypass pointer capture
          const target = document.elementFromPoint(e.clientX, e.clientY);
          const nodeGroup = target?.closest('g.node');
          const edgeGroup = target?.closest('g.edge');
          const newHoveredNodeId = nodeGroup ? nodeGroup.id : null;
          const newHoveredEdgeId = edgeGroup ? edgeGroup.id : null;
          setHoveredNodeId(prev => prev !== newHoveredNodeId ? newHoveredNodeId : prev);
          setHoveredEdgeId(prev => prev !== newHoveredEdgeId ? newHoveredEdgeId : prev);
        }
        
        if (tool === 'multi_select') {
          setSelectionBox(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
        }
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      const currentSelectionBox = selectionBoxRef.current;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (paletteLongPressTimer.current) {
        clearTimeout(paletteLongPressTimer.current);
        paletteLongPressTimer.current = null;
      }

      if (currentSelectionBox) {
        const box = {
          left: Math.min(currentSelectionBox.startX, currentSelectionBox.currentX),
          top: Math.min(currentSelectionBox.startY, currentSelectionBox.currentY),
          right: Math.max(currentSelectionBox.startX, currentSelectionBox.currentX),
          bottom: Math.max(currentSelectionBox.startY, currentSelectionBox.currentY)
        };
        
        const elements = document.querySelectorAll('g.node, g.cluster, g.edge');
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
        setMouseState(null);
        return;
      }

      if (isMovingGroup) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const g = target?.closest('g.cluster');
        const targetSubgraphId = g ? g.id : null;
        
        handleGroupMove(isMovingGroup, targetSubgraphId);
        setIsMovingGroup(null);
        setMouseState(null);
        return;
      }

      if (isRebasingEdge) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const portHandle = target?.closest('.port-handle');
        const endPort = portHandle ? portHandle.getAttribute('data-port') || undefined : undefined;
        const g = target?.closest('g.node');
        const targetNodeId = g ? g.id : null;
        if (targetNodeId) {
          handleRebaseEdge(isRebasingEdge, targetNodeId, endPort);
        }
        setIsRebasingEdge(null);
        setMouseState(null);
        return;
      }

      if (isRetargetingEdge) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const portHandle = target?.closest('.port-handle');
        const endPort = portHandle ? portHandle.getAttribute('data-port') || undefined : undefined;
        const g = target?.closest('g.node');
        const targetNodeId = g ? g.id : null;
        if (targetNodeId) {
          handleRetargetEdge(isRetargetingEdge, targetNodeId, endPort);
        }
        setIsRetargetingEdge(null);
        setMouseState(null);
        return;
      }

      if (isRebasingGroup) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const portHandle = target?.closest('.port-handle');
        const endPort = portHandle ? portHandle.getAttribute('data-port') || undefined : undefined;
        const g = target?.closest('g.node');
        const targetNodeId = g ? g.id : null;
        if (targetNodeId) {
          handleGroupRebase(isRebasingGroup, targetNodeId, endPort);
        }
        setIsRebasingGroup(null);
        setMouseState(null);
        return;
      }

      if (isRetargetingGroup) {
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const portHandle = target?.closest('.port-handle');
        const endPort = portHandle ? portHandle.getAttribute('data-port') || undefined : undefined;
        const g = target?.closest('g.node');
        const targetNodeId = g ? g.id : null;
        if (targetNodeId) {
          handleGroupRetarget(isRetargetingGroup, targetNodeId, endPort);
        }
        setIsRetargetingGroup(null);
        setMouseState(null);
        return;
      }

    const state = mouseState;
    setMouseState(null);
    if (!state) return;

    const { button, isDragging, targetId, startX, startY } = state;

    // Check for drop on palette bubble slot
    if (isDragging && activePaletteBubble && hoveredBubbleIdx !== null && targetId) {
      const el = findElement(graph.elements, targetId);
      if (el && el.type === activePaletteBubble.type) {
        const base = el.type === 'node' ? { color: '#ffffff', shape: 'box', style: 'rounded', fontcolor: 'black' } :
                     el.type === 'edge' ? { color: '#000000', style: 'solid', arrowhead: 'normal', fontcolor: 'white' } :
                     { color: '#f5f5f5', style: 'filled', bgcolor: '#f1f5f9', fontcolor: 'black' };
        
        const filteredAttrs: any = {};
        const allowedKeys = el.type === 'node' ? ['shape', 'style', 'fontcolor', 'image', 'imagescale', 'label'] :
                            el.type === 'edge' ? ['style', 'arrowhead', 'fontcolor'] :
                            ['style', 'bgcolor', 'fontcolor'];
        
        allowedKeys.forEach(key => {
          if (el.attributes[key]) filteredAttrs[key] = el.attributes[key];
        });

        const newStyle = {
          ...base,
          ...filteredAttrs,
          color: el.attributes.color || el.attributes.fillcolor || el.attributes.bgcolor || base.color
        };

        setAdditionalStyles(prev => {
          const newStyles = { ...prev };
          newStyles[activePaletteBubble.id] = [...(newStyles[activePaletteBubble.id] || Array(9).fill(null))];
          newStyles[activePaletteBubble.id][hoveredBubbleIdx] = newStyle;
          return newStyles;
        });
        
        // Also update the palette button itself
        setPalettes(prev => prev.map(p => {
          if (p.id === activePaletteBubble.id) {
            return { id: p.id, type: p.type, ...newStyle } as any;
          }
          return p;
        }));

        setActivePaletteBubble(null);
        setHoveredBubbleIdx(null);
        return;
      }
    }

    // Check for drop on palette button
    if (isDragging && hoveredPaletteId && targetId) {
      const el = findElement(graph.elements, targetId);
      if (el) {
        setPalettes(prev => prev.map(p => {
          if (p.id !== hoveredPaletteId || p.type !== el.type) return p;
          const base = el.type === 'node' ? { color: '#ffffff', shape: 'box', style: 'rounded', fontcolor: 'black' } :
                       el.type === 'edge' ? { color: '#000000', style: 'solid', arrowhead: 'normal', fontcolor: 'white' } :
                       { color: '#f5f5f5', style: 'filled', bgcolor: '#f1f5f9', fontcolor: 'black' };
          
          const filteredAttrs: any = {};
          const allowedKeys = el.type === 'node' ? ['shape', 'style', 'fontcolor', 'image', 'imagescale', 'label'] :
                              el.type === 'edge' ? ['style', 'arrowhead', 'fontcolor'] :
                              ['style', 'bgcolor', 'fontcolor'];
          
          allowedKeys.forEach(key => {
            if (el.attributes[key]) filteredAttrs[key] = el.attributes[key];
          });

          return { 
            id: p.id, 
            type: p.type,
            ...base,
            ...filteredAttrs,
            color: el.attributes.color || el.attributes.fillcolor || el.attributes.bgcolor || base.color
          } as any;
        }));
        return;
      }
    }

    const target = document.elementFromPoint(e.clientX, e.clientY);
    const portHandle = target?.closest('.port-handle');
    const endPort = portHandle ? portHandle.getAttribute('data-port') || undefined : undefined;
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
              const el = findElement(graph.elements, targetId);
              if (el?.type === 'node') {
                focusNodeLabelInput(el as NodeElement);
              } else {
                focusLabelInput();
              }
            }
          }
        } else {
          if (tool === 'multi_select') {
            setSelectedIds([]);
          } else {
            console.log('setSelectedId(null) at line 2465');
            setSelectedId(null);
            setSelectedIds([]);
          }
        }
      } else {
        if (tool === 'multi_select') return;
        if (targetId) {
          const sourceEl = findElement(graph.elements, targetId);
          const isCompoundDot = engine === 'dot' && graph.attributes.compound === 'true';
          const isValidSource = sourceEl?.type === 'node' || (isCompoundDot && sourceEl?.type === 'subgraph');

          if (isValidSource) {
            if (endTargetId && targetId !== endTargetId) {
              const targetEl = findElement(graph.elements, endTargetId);
              const isValidTarget = targetEl?.type === 'node' || (isCompoundDot && targetEl?.type === 'subgraph');

              if (isValidTarget) {
                let realSourceId = targetId;
                let realTargetId = endTargetId;
                let ltail: string | undefined;
                let lhead: string | undefined;
                let newSourceNode: NodeElement | undefined;
                let newTargetNode: NodeElement | undefined;

                if (sourceEl?.type === 'subgraph') {
                  ltail = targetId;
                  const firstId = getFirstNodeId(sourceEl);
                  if (firstId) {
                    realSourceId = firstId;
                  } else {
                    newSourceNode = createNodeWithPalette(`Node ${getTotalNodeCount(graph.elements) + 1}`);
                    realSourceId = newSourceNode.id;
                  }
                }

                if (targetEl?.type === 'subgraph') {
                  lhead = endTargetId;
                  const firstId = getFirstNodeId(targetEl);
                  if (firstId) {
                    realTargetId = firstId;
                  } else {
                    newTargetNode = createNodeWithPalette(`Node ${getTotalNodeCount(graph.elements) + (newSourceNode ? 2 : 1)}`);
                    realTargetId = newTargetNode.id;
                  }
                }

                const newEdge = createEdge(realSourceId, realTargetId);
                if (state.startPort) newEdge.attributes.tailport = state.startPort;
                if (endPort) newEdge.attributes.headport = endPort;
                if (ltail) newEdge.attributes.ltail = ltail;
                if (lhead) newEdge.attributes.lhead = lhead;

                const activePal = palettes.find(p => p.id === activeEdgePaletteId);
                if (activePal && activePal.type === 'edge') {
                  const { id, type, ...attrs } = activePal;
                  newEdge.attributes = { ...newEdge.attributes, ...attrs };
                }

                updateGraph(prev => {
                  let elements = [...prev.elements];
                  if (newSourceNode) {
                    elements = updateElement(elements, targetId, (el) => ({
                      ...el,
                      elements: [...(el as SubgraphElement).elements, newSourceNode!]
                    } as SubgraphElement));
                  }
                  if (newTargetNode) {
                    elements = updateElement(elements, endTargetId, (el) => ({
                      ...el,
                      elements: [...(el as SubgraphElement).elements, newTargetNode!]
                    } as SubgraphElement));
                  }
                  return { ...prev, elements: [...elements, newEdge] };
                });

                setSelectedId(newTargetNode ? newTargetNode.id : (newSourceNode ? newSourceNode.id : realTargetId));
                setSelectedIds([]);
                if (newSourceNode || newTargetNode) {
                  setIsPropertiesPaneOpen(true);
                  const nodeToFocus = newTargetNode || newSourceNode;
                  if (nodeToFocus) focusNodeLabelInput(nodeToFocus);
                }
              }
            } else if (!endTargetId) {
              // Dragged to empty area - create new node and edge
              const newNode = createNodeWithPalette(`Node ${getTotalNodeCount(graph.elements) + 1}`);
              
              let realSourceId = targetId;
              let ltail: string | undefined;
              let newSourceNode: NodeElement | undefined;

              if (sourceEl?.type === 'subgraph') {
                ltail = targetId;
                const firstId = getFirstNodeId(sourceEl);
                if (firstId) {
                  realSourceId = firstId;
                } else {
                  newSourceNode = createNodeWithPalette(`Node ${getTotalNodeCount(graph.elements) + 2}`);
                  realSourceId = newSourceNode.id;
                }
              }

              const newEdge = createEdge(realSourceId, newNode.id);
              if (state.startPort) newEdge.attributes.tailport = state.startPort;
              if (ltail) newEdge.attributes.ltail = ltail;
              const activeEdgePal = palettes.find(p => p.id === activeEdgePaletteId);
              if (activeEdgePal && activeEdgePal.type === 'edge') {
                const { id, type, ...attrs } = activeEdgePal;
                newEdge.attributes = { ...newEdge.attributes, ...attrs };
              }
              
              updateGraph(prev => {
                let elements = [...prev.elements];
                if (newSourceNode) {
                  elements = updateElement(elements, targetId, (el) => ({
                    ...el,
                    elements: [...(el as SubgraphElement).elements, newSourceNode!]
                  } as SubgraphElement));
                }
                return { ...prev, elements: [...elements, newNode, newEdge] };
              });
              setSelectedId(newNode.id);
              setSelectedIds([]);
              setIsPropertiesPaneOpen(true);
              focusNodeLabelInput(newNode);
            }
          }
        }
      }
    }
  };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [mouseState, graph, activeNodePaletteId, activeEdgePaletteId, activeSubgraphPaletteId, tool, edgeSourceId, isMovingElement, isMovingGroup, isRebasingEdge, isRetargetingEdge, isRebasingGroup, isRetargetingGroup]);

  const handleAddNode = () => {
    const newNode = createNodeWithPalette(`Node ${getTotalNodeCount(graph.elements) + 1}`);
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

    const newNode = createNodeWithPalette('Node');
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

    updateGraph(prev => {
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

  const handleRebaseEdge = (edgeId: string, newSourceId: string, port?: string) => {
    updateGraph(prev => ({
      ...prev,
      elements: updateElement(prev.elements, edgeId, (el) => {
        if (el.type !== 'edge') return el;
        const newAttrs = { ...el.attributes };
        if (port) newAttrs.tailport = port;
        else delete newAttrs.tailport;
        return { ...el, source: newSourceId, attributes: newAttrs };
      })
    }));
  };

  const handleRetargetEdge = (edgeId: string, newTargetId: string, port?: string) => {
    updateGraph(prev => ({
      ...prev,
      elements: updateElement(prev.elements, edgeId, (el) => {
        if (el.type !== 'edge') return el;
        const newAttrs = { ...el.attributes };
        if (port) newAttrs.headport = port;
        else delete newAttrs.headport;
        return { ...el, target: newTargetId, attributes: newAttrs };
      })
    }));
  };

  const updateElements = (elements: GraphElement[], ids: string[], updater: (el: GraphElement) => GraphElement): GraphElement[] => {
    return elements.map(el => {
      if (ids.includes(el.id)) return updater(el);
      if (el.type === 'subgraph') {
        return { ...el, elements: updateElements((el as SubgraphElement).elements, ids, updater) };
      }
      return el;
    });
  };

  const handleGroupRebase = (edgeIds: string[], newSourceId: string, port?: string) => {
    updateGraph(prev => ({
      ...prev,
      elements: updateElements(prev.elements, edgeIds, (el) => {
        if (el.type !== 'edge') return el;
        const newAttrs = { ...el.attributes };
        if (port) newAttrs.tailport = port;
        else delete newAttrs.tailport;
        return { ...el, source: newSourceId, attributes: newAttrs };
      })
    }));
  };

  const handleGroupRetarget = (edgeIds: string[], newTargetId: string, port?: string) => {
    updateGraph(prev => ({
      ...prev,
      elements: updateElements(prev.elements, edgeIds, (el) => {
        if (el.type !== 'edge') return el;
        const newAttrs = { ...el.attributes };
        if (port) newAttrs.headport = port;
        else delete newAttrs.headport;
        return { ...el, target: newTargetId, attributes: newAttrs };
      })
    }));
  };

  const handleGroupMove = (elementIds: string[], targetContainerId: string | null) => {
    const idsToMove = elementIds.filter(id => id !== targetContainerId);
    if (idsToMove.length === 0) return;

    const elementsToMove = idsToMove.map(id => findElement(graph.elements, id)).filter(Boolean) as GraphElement[];

    updateGraph(prev => {
      let newElements = prev.elements;
      for (const id of idsToMove) {
        newElements = removeElement(newElements, id);
      }
      
      if (targetContainerId) {
        newElements = updateElement(newElements, targetContainerId, (container) => ({
          ...container,
          elements: [...(container as SubgraphElement).elements, ...elementsToMove]
        }));
      } else {
        newElements = [...newElements, ...elementsToMove];
      }
      
      return { ...prev, elements: newElements };
    });
  };

  const handleGroupRestyle = (elementIds: string[]) => {
    updateGraph(prev => {
      let newElements = prev.elements;
      for (const id of elementIds) {
        const el = findElement(newElements, id);
        if (!el) continue;

        const paletteId = el.type === 'node' ? activeNodePaletteId : 
                         el.type === 'edge' ? activeEdgePaletteId : 
                         activeSubgraphPaletteId;
        
        const palette = palettes.find(p => p.id === paletteId);
        if (!palette) continue;

        const { id: pId, type, ...attrs } = palette;
        newElements = updateElement(newElements, id, (item) => ({
          ...item,
          attributes: { ...item.attributes, ...attrs }
        }));
      }
      return { ...prev, elements: newElements };
    });
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
    
    updateGraph(prev => ({
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

    updateGraph(prev => {
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
      
      updateGraph(newState);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse DOT code');
    }
  };

  const handleAttributeChange = (key: string, value: string) => {
    if (!selectedId) return;
    updateGraph(prev => ({
      ...prev,
      elements: updateElement(prev.elements, selectedId, el => {
        const newAttrs = { ...el.attributes, [key]: value };
        
        // Mutual exclusivity: HTML Mode vs record/Mrecord shapes
        const isHtml = newAttrs.label?.startsWith('<') && newAttrs.label?.endsWith('>');
        const isRecord = newAttrs.shape === 'record' || newAttrs.shape === 'Mrecord';
        
        if (key === 'shape' && isRecord && isHtml) {
          // If changing to record shape, remove HTML tags from label
          newAttrs.label = newAttrs.label.slice(1, -1);
        } else if (key === 'label' && isHtml && isRecord) {
          // If changing to HTML label, change shape to box
          newAttrs.shape = 'box';
        }

        return {
          ...el,
          attributes: newAttrs
        };
      })
    }));
  };

  const handleAttributesChange = (attrs: Record<string, string>) => {
    if (!selectedId) return;
    updateGraph(prev => ({
      ...prev,
      elements: updateElement(prev.elements, selectedId, el => {
        return {
          ...el,
          attributes: { ...el.attributes, ...attrs }
        };
      })
    }));
  };

  const handleRemoveAttribute = (key: string) => {
    if (!selectedId) return;
    updateGraph(prev => ({
      ...prev,
      elements: updateElement(prev.elements, selectedId, el => {
        const newAttrs = { ...el.attributes };
        delete newAttrs[key];
        return { ...el, attributes: newAttrs };
      })
    }));
  };

  const handleGraphAttributeChange = (key: string, value: string) => {
    updateGraph(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value }
    }));
  };

  const handleRemoveGraphAttribute = (key: string) => {
    updateGraph(prev => {
      const newAttrs = { ...prev.attributes };
      delete newAttrs[key];
      return { ...prev, attributes: newAttrs };
    });
  };

  const handleSubgraphNodeAttributeChange = (subgraphId: string, key: string, value: string) => {
    updateGraph(prev => {
      const newElements = updateElement(prev.elements, subgraphId, el => {
        if (el.type !== 'subgraph') return el;
        const sub = el as SubgraphElement;
        return {
          ...sub,
          nodeAttributes: { ...sub.nodeAttributes, [key]: value }
        };
      });
      return { ...prev, elements: newElements };
    });
  };

  const handleRemoveSubgraphNodeAttribute = (subgraphId: string, key: string) => {
    updateGraph(prev => {
      const newElements = updateElement(prev.elements, subgraphId, el => {
        if (el.type !== 'subgraph') return el;
        const sub = el as SubgraphElement;
        const newAttrs = { ...sub.nodeAttributes };
        delete newAttrs[key];
        return {
          ...sub,
          nodeAttributes: newAttrs
        };
      });
      return { ...prev, elements: newElements };
    });
  };

  const handleSubgraphEdgeAttributeChange = (subgraphId: string, key: string, value: string) => {
    updateGraph(prev => {
      const newElements = updateElement(prev.elements, subgraphId, el => {
        if (el.type !== 'subgraph') return el;
        const sub = el as SubgraphElement;
        return {
          ...sub,
          edgeAttributes: { ...sub.edgeAttributes, [key]: value }
        };
      });
      return { ...prev, elements: newElements };
    });
  };

  const handleRemoveSubgraphEdgeAttribute = (subgraphId: string, key: string) => {
    updateGraph(prev => {
      const newElements = updateElement(prev.elements, subgraphId, el => {
        if (el.type !== 'subgraph') return el;
        const sub = el as SubgraphElement;
        const newAttrs = { ...sub.edgeAttributes };
        delete newAttrs[key];
        return {
          ...sub,
          edgeAttributes: newAttrs
        };
      });
      return { ...prev, elements: newElements };
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
    
    updateGraph(prev => {
      let newElements = deleteElements(prev.elements, idsToDelete);
      newElements = deleteEdgesPointingToMultiple(newElements, idsToDelete);
      
      // Enforce at least 1 node
      if (getTotalNodeCount(newElements) === 0) {
        newElements = [createNode({ label: 'Node' })];
      }
      
      return { ...prev, elements: newElements };
    });
    console.log('setSelectedId(null) at line 3111');
    setSelectedId(null);
    setSelectedIds([]);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName?.toUpperCase();
      
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('.monaco-editor')
      ) {
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (e.key === 'Backspace') {
          e.preventDefault(); // Prevent browser back navigation
        }
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedId, selectedIds]);

  const handleMultiAttributeChange = (key: string, value: string) => {
    updateGraph(prev => {
      let newElements = prev.elements;
      for (const id of selectedIds) {
        newElements = updateElement(newElements, id, el => {
          const newAttrs = { ...el.attributes, [key]: value };
          
          // Mutual exclusivity: HTML Mode vs record/Mrecord shapes
          const isHtml = newAttrs.label?.startsWith('<') && newAttrs.label?.endsWith('>');
          const isRecord = newAttrs.shape === 'record' || newAttrs.shape === 'Mrecord';
          
          if (key === 'shape' && isRecord && isHtml) {
            // If changing to record shape, remove HTML tags from label
            newAttrs.label = newAttrs.label.slice(1, -1);
          } else if (key === 'label' && isHtml && isRecord) {
            // If changing to HTML label, change shape to box
            newAttrs.shape = 'box';
          }

          return {
            ...el,
            attributes: newAttrs
          };
        });
      }
      return { ...prev, elements: newElements };
    });
  };

  const handleMultiRemoveAttribute = (key: string) => {
    updateGraph(prev => {
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



  const renderAttributeInput = (key: string, value: string, onChange: (v: string) => void, onRemove: () => void, currentAttributes?: Record<string, any>) => {
    const attrDef = GRAPHVIZ_ATTRIBUTES.find(a => a.key === key);
    
    if (attrDef) {
      if (key === 'weight') {
        return <SliderPicker label={key} value={value} onChange={onChange} onRemove={onRemove} min={0} max={100} />;
      }
      switch (attrDef.valueType) {
        case 'color':
          return <ColorPicker label={key} value={value} onChange={onChange} onRemove={onRemove} />;
        case 'select':
          return <AttributePicker label={key} value={value} options={attrDef.options || []} onChange={onChange} onRemove={onRemove} />;
        case 'boolean':
          return <BooleanPicker label={key} value={value} onChange={onChange} onRemove={onRemove} />;
        case 'number':
          return <NumberPicker label={key} value={value} onChange={onChange} onRemove={onRemove} />;
      }
    }

    if (key === 'image') return <ImagePicker label={key} value={value} mediaItems={mediaItems} onChange={onChange} onRemove={onRemove} />;

    const isRecord = currentAttributes?.shape === 'record' || currentAttributes?.shape === 'Mrecord';
    const isHtmlLabel = key === 'label' && value.startsWith('<') && value.endsWith('>');
    
    if (key === 'label' && isHtmlLabel) {
      return (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-700">{key}</label>
            <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </div>
          <div className="h-40 border border-slate-200 rounded-lg overflow-hidden">
            <Editor
              language="xml"
              theme="vs-dark"
              value={value}
              onChange={(v) => onChange(v || '')}
              options={{ minimap: { enabled: false }, fontSize: 12, lineNumbersMinChars: 2 }}
            />
          </div>
          <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">HTML Cheat Sheet</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Table</span>
                <span className="text-indigo-600">{'<TABLE>'}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Row/Cell</span>
                <span className="text-indigo-600">{'<TR>/<TD>'}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Port</span>
                <span className="text-indigo-600">PORT="p1"</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Break</span>
                <span className="text-indigo-600">\n \l \r</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Space</span>
                <span className="text-indigo-600">&amp;nbsp;</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Quote</span>
                <span className="text-indigo-600">&amp;quot;</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 pt-1 border-t border-slate-200">
              <a href="https://graphviz.org/doc/info/shapes.html#html" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">Docs</a>
            </p>
          </div>
        </div>
      );
    }
    
    if (key === 'label' && isRecord) {
      return (
        <div className="flex flex-col gap-1">
          <ExpandingTextarea 
            label={key} 
            value={value} 
            onChange={onChange} 
            onRemove={onRemove} 
            placeholder="e.g., { a | b | c } for records"
          />
          <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Record Cheat Sheet</h3>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">Fields</span>
              <span className="text-indigo-600">f1 | f2 | f3</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">Nested</span>
              <span className="text-indigo-600">{'{ a | b }'}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400">Port ID</span>
              <span className="text-indigo-600">&lt;p1&gt; field</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-700">{key}</label>
          <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>
        <input
          type="text"
          id={`attr-input-${key}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={key === 'label' ? 'e.g., { a | b | c } for records' : ''}
        />
      </div>
    );
  };

  const renderHeaderButtons = (inPanel: boolean) => {
    if (!inPanel && (isPropertiesPaneOpen || showElementDefaults)) return null;
    if (inPanel && !isPropertiesPaneOpen && !showElementDefaults) return null;

    return (
      <div className={`flex items-center ${inPanel ? 'gap-2' : 'gap-4'}`}>
        {(!inPanel || !isPropertiesPaneOpen) && (
          <button
            id={inPanel ? undefined : "header-properties"}
            onClick={() => { 
              if (showElementDefaults || !isPropertiesPaneOpen) {
                setShowElementDefaults(false); 
                setIsPropertiesPaneOpen(true);
              }
            }}
            className={`text-sm font-medium flex items-center gap-1 ${isPropertiesPaneOpen ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'} ${inPanel ? 'p-1.5 hover:bg-slate-100 rounded-md' : ''}`}
            title="Properties"
          >
            <Settings size={inPanel ? 16 : 14} />
            {!inPanel && <span className="hidden lg:inline">Properties</span>}
          </button>
        )}
        {(!inPanel || !showElementDefaults) && (
          <button
            id={inPanel ? undefined : "header-defaults"}
            onClick={() => {
              setIsPropertiesPaneOpen(false);
              setShowElementDefaults(true);
            }}
            className={`text-sm font-medium flex items-center gap-1 ${showElementDefaults ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'} ${inPanel ? 'p-1.5 hover:bg-slate-100 rounded-md' : ''}`}
            title="Defaults"
          >
            <Wrench size={inPanel ? 16 : 14} />
            {!inPanel && <span className="hidden lg:inline">Defaults</span>}
          </button>
        )}
        <button
          id={inPanel ? undefined : "header-media"}
          onClick={() => setViewMode('media')}
          className={`text-sm font-medium flex items-center gap-1 ${viewMode === 'media' ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'} ${inPanel ? 'p-1.5 hover:bg-slate-100 rounded-md' : ''}`}
          title="Media Manager"
        >
          <FolderOpen size={inPanel ? 16 : 14} />
          {!inPanel && <span className="hidden lg:inline">Media</span>}
        </button>
        <div className={`w-px ${inPanel ? 'h-4' : 'h-6'} bg-slate-200 mx-1`} />
        <div className="relative" ref={shareFlyoutRef}>
          <button
            onClick={() => setShowShareFlyout(!showShareFlyout)}
            className={`text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 ${inPanel ? 'p-1.5 hover:bg-slate-100 rounded-md' : ''}`}
            title="Share"
          >
            <Share2 size={inPanel ? 16 : 14} />
            {!inPanel && <span className="hidden lg:inline">Share</span>}
          </button>
          
          {showShareFlyout && (
            <div className={`fixed lg:absolute top-16 lg:top-full ${inPanel ? 'right-4' : 'right-4 lg:right-0'} mt-2 w-[calc(100vw-2rem)] sm:w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50`}>
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-800 text-sm">Share and Export</h3>
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
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={handleDownloadZip}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                    >
                      <div className="bg-blue-100 text-blue-600 p-1.5 rounded-md">
                        <FolderOpen size={16} />
                      </div>
                      <div>
                        <div className="font-medium">ZIP Bundle (Full)</div>
                        <div className="text-xs text-slate-500">Save graph, palettes, and media</div>
                      </div>
                    </button>
                    <button
                      onClick={handleExportPalettes}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                    >
                      <div className="bg-amber-100 text-amber-600 p-1.5 rounded-md">
                        <FileDown size={16} />
                      </div>
                      <div>
                        <div className="font-medium">Export Palettes</div>
                        <div className="text-xs text-slate-500">Save palettes and images (.zip)</div>
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
                        value={shareUrl ?? ''} 
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
                      className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-[#ffffff] text-sm font-medium rounded-lg transition-colors"
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
            id={inPanel ? undefined : "header-save"}
            onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
            className={`text-sm text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 ${inPanel ? 'p-1.5 hover:bg-slate-100 rounded-md' : ''}`}
            title="Download"
          >
            <Download size={inPanel ? 16 : 14} />
            {!inPanel && <span className="hidden lg:inline">Save</span>}
          </button>
          
          {showDownloadDropdown && (
            <div className={`fixed lg:absolute top-16 lg:top-full ${inPanel ? 'right-4' : 'right-4 lg:right-0'} mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50`}>
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
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        onEvent={handleJoyrideCallback}
      />

      {showWelcomeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Welcome to PanGraphic!</h3>
            <div className="space-y-4 text-slate-600 text-sm">
              <p>
                <strong>Important Note about Saving:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Your <strong>graphs are NOT auto-saved</strong> to local storage. Please use the "Save" button to download your work or share it via a link.</li>
                <li>Your <strong>uploaded media IS saved</strong> to your browser's local storage and will be available next time you visit.</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end mt-8">
              <button 
                onClick={() => {
                  setShowWelcomeModal(false);
                  setRunTour(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-[#ffffff] font-medium hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
              >
                Start Tour
              </button>
              <button 
                onClick={() => setShowWelcomeModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div id="toolbar-tools" className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-2 gap-2 z-10 overflow-y-auto overflow-x-hidden flex-shrink-0">
        {viewMode === 'visual' && (
          <>
            <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => {
                const nextTool = tool === 'multi_select' ? 'select' : 'multi_select';
                setTool(nextTool);
                if (nextTool === 'select') setSelectedIds([]);
                else {
                  console.log('setSelectedId(null) at line 3606');
                  setSelectedId(null);
                }
              }}
              className={`relative inline-flex ${IS_TOUCH ? 'h-7 w-14' : 'h-5 w-10'} items-center rounded-full transition-colors focus:outline-none ${tool === 'multi_select' ? 'bg-indigo-600' : 'bg-slate-400'}`}
              title="Toggle Multi-Select"
            >
              <span
                className={`inline-block ${IS_TOUCH ? 'h-5 w-5' : 'h-3 w-3'} transform rounded-full bg-[#ffffff] transition-transform ${tool === 'multi_select' ? (IS_TOUCH ? 'translate-x-8' : 'translate-x-6') : 'translate-x-1'}`}
              />
            </button>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Multi</span>
            </div>
          </>
        )}
        
        {/* Palette Tiles */}
        {viewMode === 'visual' && (
          <div className="flex flex-col gap-2 w-full px-2 mt-1">
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
                  onPointerEnter={(e) => {
                    setHoveredPaletteId(palette.id);
                    if (mouseState?.isDragging && mouseState.targetId) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = rect.right + 10;
                      const y = rect.top + rect.height / 2;
                      paletteLongPressTimer.current = setTimeout(() => {
                        setActivePaletteBubble({ id: palette.id, type: palette.type as any, x, y });
                        paletteLongPressTimer.current = null;
                      }, 500);
                    }
                  }}
                  onPointerLeave={() => {
                    setHoveredPaletteId(null);
                    if (paletteLongPressTimer.current) {
                      clearTimeout(paletteLongPressTimer.current);
                      paletteLongPressTimer.current = null;
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = rect.right + 10;
                    const y = rect.top + rect.height / 2;
                    paletteLongPressTimer.current = setTimeout(() => {
                      setActivePaletteBubble({ id: palette.id, type: palette.type as any, x, y });
                      paletteLongPressTimer.current = null;
                    }, 500);
                  }}
                  onPointerUp={() => {
                    if (paletteLongPressTimer.current) {
                      clearTimeout(paletteLongPressTimer.current);
                      paletteLongPressTimer.current = null;
                    }
                  }}
                  className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center relative overflow-hidden dark-checkerboard ${
                    isActive ? 'border-indigo-500 shadow-md scale-105' : 'border-transparent hover:border-slate-300'
                  } ${hoveredPaletteId === palette.id ? 'bg-indigo-50 border-indigo-300' : ''}`}
                  title={`Select Palette ${palette.id} (Long press for more styles)`}
                >
                  <div className="absolute inset-0" style={{ backgroundColor: palette.type === 'node' ? palette.color : 'transparent' }} />
                  <div className="relative z-10 w-full h-full flex items-center justify-center">
                    {renderPaletteIcon(palette, false, mediaItems)}
                  </div>
                  
                  {/* Type indicator */}
                  <div className="absolute bottom-0.5 right-0.5 text-[8px] font-bold uppercase opacity-50 z-10">
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
          <div className="relative" ref={addPaletteDropdownRef}>
            <button
              onClick={() => setShowAddPaletteDropdown(!showAddPaletteDropdown)}
              className="p-2 rounded-lg transition-colors text-slate-500 hover:bg-slate-100 mb-2"
              title="Add Palette"
            >
              <Plus size={20} />
            </button>
            {showAddPaletteDropdown && (
              <div className="fixed left-[88px] bottom-16 mb-2 w-36 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-[100]">
                <div className="p-1">
                  <button
                    onClick={() => { handleAddPalette('node'); setShowAddPaletteDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Node Palette
                  </button>
                  <button
                    onClick={() => { handleAddPalette('edge'); setShowAddPaletteDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Edge Palette
                  </button>
                  <button
                    onClick={() => { handleAddPalette('subgraph'); setShowAddPaletteDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Subgraph Palette
                  </button>
                </div>
              </div>
            )}
          </div>
          <div id="toolbar-code" className="flex flex-col items-center gap-1">
            <button
              onClick={() => {
                const nextMode = viewMode === 'code' ? 'visual' : 'code';
                isCodeChangeRef.current = false;
                setLocalCode(generateDot(graph));
                setViewMode(nextMode);
              }}
              className={`relative inline-flex ${IS_TOUCH ? 'h-7 w-14' : 'h-5 w-10'} items-center rounded-full transition-colors focus:outline-none ${viewMode === 'code' ? 'bg-indigo-600' : 'bg-slate-400'}`}
              title="Toggle Code/Visual"
            >
              <span
                className={`inline-block ${IS_TOUCH ? 'h-5 w-5' : 'h-3 w-3'} transform rounded-full bg-[#ffffff] transition-transform ${viewMode === 'code' ? (IS_TOUCH ? 'translate-x-8' : 'translate-x-6') : 'translate-x-1'}`}
              />
            </button>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Code</span>
          </div>
          <div className="flex gap-0">
            <button
              className={`p-2 rounded-lg transition-colors text-red-500 hover:bg-red-50`}
              onClick={() => setShowClearModal(true)}
              title="Clear Graph"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={IS_TOUCH ? 22 : 18} height={IS_TOUCH ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
            <button
              onClick={() => setViewMode('help')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'help' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Help & Tutorial"
            >
              <HelpCircle size={IS_TOUCH ? 22 : 18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between z-10">
          <div className="flex items-baseline gap-2 cursor-pointer select-none" onClick={toggleTheme}>
            <h1 className="font-semibold text-lg text-slate-800">PanGraphic</h1>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest hidden md:inline">alabaster</span>
          </div>
          {renderHeaderButtons(false)}
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
            <div 
              className="w-full h-full cursor-crosshair touch-none" 
              onPointerDown={handlePointerDown} 
              onContextMenu={handleContextMenu} 
              ref={svgContainerRef}
            >
              <TransformWrapper
                ref={transformRef}
                initialScale={1}
                minScale={0.1}
                maxScale={10}
                centerOnInit
                limitToBounds={false}
                disabled={!!ringMenu}
                panning={{ disabled: tool === 'multi_select' || !!ringMenu || !!isMovingElement || (!!mouseState?.targetId && mouseState?.button === 0) }}
                pinch={{ disabled: !!ringMenu || !!isMovingElement }}
                doubleClick={{ disabled: true }}
              >
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <div 
                    className="svg-container w-full h-full flex items-center justify-center bg-grid bg-white"
                  >
                    <style>
                      {`
                        .svg-container g { transition: stroke 0.2s, stroke-width 0.2s; }
                        .svg-container g.node polygon, .svg-container g.node ellipse, .svg-container g.node path, .svg-container g.node text, .svg-container g.node tspan { pointer-events: all !important; }
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
                    
                    // 1. Try to find id="ID" (most reliable for our generated DOT)
                    const idMatch = lineContent.match(/id="([^"]+)"/);
                    if (idMatch) {
                      const id = idMatch[1];
                      if (findElement(graph.elements, id)) {
                        setSelectedId(id);
                        setShowElementDefaults(false);
                        return;
                      }
                    }

                    // 2. Try to find subgraph "ID"
                    const subgraphMatch = lineContent.match(/subgraph\s+"([^"]+)"/);
                    if (subgraphMatch) {
                      const id = subgraphMatch[1];
                      if (findElement(graph.elements, id)) {
                        setSelectedId(id);
                        setShowElementDefaults(false);
                        return;
                      }
                    }

                    // 3. Try to find a quoted string under the cursor
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

                    // 4. Try to find a word under the cursor if not in quotes
                    const word = model.getWordAtPosition(position);
                    if (word) {
                      const found = findElement(graph.elements, word.word);
                      if (found) {
                        setSelectedId(word.word);
                        setShowElementDefaults(false);
                        return;
                      }
                    }

                    // 5. If nothing found, show graph properties
                    setSelectedId(null);
                  });
                }}
              />
            </div>
          ) : viewMode === 'media' ? (
            <div className="w-full h-full p-4 sm:p-8 overflow-y-auto bg-slate-50 relative">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Media Manager</h1>
                    <p className="text-slate-500 mt-1">Manage images and assets for your graphs.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                    <button 
                      onClick={() => setShowPurgeModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                    >
                      <Trash2 size={16} />
                      Purge All
                    </button>
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
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                      <FolderOpen size={16} />
                      Import Bundle / Palettes
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".zip"
                        onChange={handleRestoreBundle}
                      />
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl text-sm font-medium text-[#ffffff] hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer">
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
                              const url = reader.result as string;
                              let width, height;
                              try {
                                const dims = await getImageDimensions(url);
                                width = dims.width;
                                height = dims.height;
                              } catch (err) {
                                console.error("Failed to get image dimensions", err);
                              }
                              await db.media.add({
                                name: file.name,
                                type: 'local',
                                url: url,
                                blob: file,
                                width,
                                height,
                                createdAt: Date.now()
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <button 
                      onClick={() => setViewMode('visual')}
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                      title="Close Media Manager"
                    >
                      <X size={24} />
                    </button>
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
            <div className="w-full h-full p-8 overflow-y-auto bg-slate-50 relative">
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                  <h1 className="text-3xl font-bold text-slate-900">Help & Resources</h1>
                  <button 
                    onClick={() => setViewMode('visual')}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    title="Close Help"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                  <button 
                    onClick={() => {
                      setViewMode('visual');
                      setRunTour(true);
                    }}
                    className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <HelpCircle size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Interactive Tour</h3>
                    <p className="text-sm text-slate-500">Take a guided tour of the application's features.</p>
                  </button>

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
                    href="https://graphviz.org/documentation/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <Globe size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Graphviz Docs</h3>
                    <p className="text-sm text-slate-500">Official Graphviz documentation for DOT language and attributes.</p>
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
                      <li><strong>Selection:</strong> Click on any node, edge, or subgraph to select it and view its properties.</li>
                      <li><strong>Ring Menu:</strong> Long-press (500ms) on any element or the canvas background to open the quick action ring menu.</li>
                      <li><strong>Add Elements:</strong> Long-press on the canvas background and select "Add Node" or "Add Subgraph".</li>
                      <li><strong>Move/Re-parent:</strong> Open the ring menu on a node or subgraph, select "Move", then click the target subgraph or background.</li>
                      <li><strong>Modify Edges:</strong> Use the ring menu on an edge to "Rebase" (change source) or "Retarget" (change target).</li>
                      <li><strong>Multi-select:</strong> Toggle the multi-select tool in the sidebar. Click elements to select multiple. Long-press on a selection to perform bulk actions.</li>
                      <li><strong>Center View:</strong> Double-click on the canvas background to center the graph and reset zoom level.</li>
                      <li><strong>Style Palettes:</strong> Hover over any palette icon in the sidebar to reveal a 3x3 grid of style slots. Click a slot to quickly apply that style to the palette.</li>
                      <li><strong>Save Styles:</strong> Drag an element from the graph and drop it onto a palette tile or one of its 3x3 style slots in the sidebar to save its current style.</li>
                      <li><strong>Full Bundle Backup:</strong> Use the Save menu to download a complete .zip bundle including your graph, custom palettes, and media. Restore it anytime via the Media Manager.</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800">Advanced Features</h2>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">Image Nodes & Icons</h3>
                        <p className="text-slate-600">
                          Use the <strong>P3 Palette</strong> to add image-based nodes. These nodes use the <code>xlabel</code> attribute for their text, keeping the icon clean. 
                          When you add an image node, the editor automatically focuses the <code>xlabel</code> field for you.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">HTML Labels</h3>
                        <p className="text-slate-600">
                          The <strong>P5 Palette</strong> contains HTML-like labels for complex table layouts. 
                          These labels are pretty-printed in the properties panel, making it easy to build structured data visualizations within your nodes.
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">Compass Ports</h3>
                        <p className="text-slate-600">
                          All nodes support compass point ports (n, s, e, w, etc.). For image nodes and HTML nodes, the editor automatically calculates the correct handle positions 
                          based on the visual bounding box of the element.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-2xl font-semibold mb-4 text-slate-800">FAQ</h2>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">How do I change the shape or color of a node?</h3>
                        <p className="text-slate-600">Select the node and use the properties pane on the right. You can also use the <strong>Palettes</strong> in the sidebar to quickly apply styles or drag-and-drop a node onto a palette to save its style.</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">How do I add images or icons to my nodes?</h3>
                        <p className="text-slate-600">Use the <strong>P3 Palette</strong> for image nodes. You can upload your own images in the <strong>Media Manager</strong> (Folder icon in sidebar) and then apply them to nodes via the <code>image</code> attribute in the properties panel.</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">What are the 3x3 grids next to the palettes?</h3>
                        <p className="text-slate-600">These are <strong>Styleslots</strong>. They allow you to store up to 9 quick-access styles per palette. Click a slot to apply it, or drag a node from the graph onto a slot to save its current style there.</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">How do I backup my entire project?</h3>
                        <p className="text-slate-600">Click the <strong>Download</strong> icon in the top right and select <strong>"Download Bundle (.zip)"</strong>. This saves your graph, all custom palettes, and all uploaded media into a single file that you can restore later.</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">How do I move a node into a different subgraph?</h3>
                        <p className="text-slate-600">Long-press on the node to open the <strong>Ring Menu</strong>, select <strong>"Move"</strong> (Move icon), and then click on the target subgraph or the canvas background to re-parent it.</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">Can I use HTML in my labels?</h3>
                        <p className="text-slate-600">Yes! Use the <strong>P5 Palette</strong> for HTML-like labels. The editor will pretty-print the HTML code in the properties panel, making it much easier to edit complex table structures.</p>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900 text-lg mb-1">How do I export my graph as an image?</h3>
                        <p className="text-slate-600">Use the <strong>Share</strong> menu (Share icon) in the top right to export your current view as an <strong>SVG</strong> or <strong>PNG</strong> image.</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* Edge Source Indicator */}
          {tool === 'add_edge' && edgeSourceId && !ringMenu && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-[#ffffff] px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select target node for edge
            </div>
          )}

          {/* Move Element Indicator */}
          {isMovingElement && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-600 text-[#ffffff] px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select target subgraph or background to move element
            </div>
          )}

          {isMovingGroup && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-600 text-[#ffffff] px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select target subgraph or background to move {isMovingGroup.length} elements
            </div>
          )}

          {/* Rebase Edge Indicator */}
          {isRebasingEdge && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-[#ffffff] px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select new source node for edge
            </div>
          )}

          {/* Retarget Edge Indicator */}
          {isRetargetingEdge && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-[#ffffff] px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select new target node for edge
            </div>
          )}

          {/* Group Rebase Indicator */}
          {isRebasingGroup && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-[#ffffff] px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select new source node for {isRebasingGroup.length} edges
            </div>
          )}

          {/* Group Retarget Indicator */}
          {isRetargetingGroup && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-[#ffffff] px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
              Select new target node for {isRetargetingGroup.length} edges
            </div>
          )}

          {/* Palette Bubble */}
          {activePaletteBubble && (
            <div className="fixed inset-0 z-[300] bg-black/5" onClick={() => setActivePaletteBubble(null)}>
              <div 
                className="absolute bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 flex items-stretch gap-3 animate-in fade-in zoom-in slide-in-from-left-4 duration-200"
                style={{ left: activePaletteBubble.x, top: activePaletteBubble.y, transform: 'translateY(-50%)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="grid grid-cols-3 gap-2">
                  {(additionalStyles[activePaletteBubble.id] || Array(9).fill(null)).map((style, idx) => (
                    <button
                      key={idx}
                      onPointerEnter={() => setHoveredBubbleIdx(idx)}
                      onPointerLeave={() => setHoveredBubbleIdx(null)}
                      onClick={() => {
                        if (!style) return;
                        setPalettes(prev => prev.map(p => {
                          if (p.id === activePaletteBubble.id) {
                            return { id: p.id, type: p.type, ...style };
                          }
                          return p;
                        }));
                        setActivePaletteBubble(null);
                      }}
                      className={`w-12 h-12 rounded-lg border transition-all overflow-hidden flex items-center justify-center relative dark-checkerboard ${
                        hoveredBubbleIdx === idx ? 'border-indigo-500 bg-indigo-50 scale-110 shadow-md' : 'border-slate-200 hover:border-indigo-500 hover:scale-110'
                      }`}
                    >
                      <div className="absolute inset-0" style={{ backgroundColor: style ? (activePaletteBubble.type === 'node' ? (style.color || 'transparent') : (activePaletteBubble.type === 'subgraph' ? (style.bgcolor || 'transparent') : 'transparent')) : 'transparent' }} />
                      <div className="relative z-10 w-full h-full flex items-center justify-center">
                        {style ? renderPaletteIcon({ ...style, type: activePaletteBubble.type }, true, mediaItems) : <span className="text-slate-300 text-xs">+</span>}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="w-px bg-slate-200 my-1" />
                <button
                  onClick={() => {
                    setPalettes(prev => prev.filter(p => p.id !== activePaletteBubble.id));
                    setAdditionalStyles(prev => {
                      const newStyles = { ...prev };
                      delete newStyles[activePaletteBubble.id];
                      return newStyles;
                    });
                    setActivePaletteBubble(null);
                  }}
                  className="px-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex flex-col items-center justify-center"
                  title="Delete Palette"
                >
                  <Trash2 size={20} />
                </button>
              </div>
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
                <svg width="320" height="320" viewBox="-160 -160 320 320" className="drop-shadow-2xl animate-in zoom-in duration-200">
                  {/* Background Circle */}
                  <circle cx="0" cy="0" r="145" fillOpacity="0.95" strokeWidth="1" className="fill-white stroke-slate-200" />
                  
                  {/* Center Ban Icon (Below segments) */}
                  <circle cx="0" cy="0" r={IS_TOUCH ? 30 : 24} strokeWidth="1" className="shadow-inner fill-white stroke-slate-200" onClick={() => setRingMenu(null)} />
                  <foreignObject x={IS_TOUCH ? "-15" : "-12"} y={IS_TOUCH ? "-15" : "-12"} width={IS_TOUCH ? "30" : "24"} height={IS_TOUCH ? "30" : "24"} onClick={() => setRingMenu(null)}>
                    <div className="flex items-center justify-center w-full h-full cursor-pointer">
                      <Ban size={IS_TOUCH ? 22 : 18} className="text-slate-300" />
                    </div>
                  </foreignObject>

                  {/* Segments */}
                  {(() => {
                    const actions = [
                      { id: 'delete', icon: Trash2, color: '#ef4444', label: 'Delete', disabled: false },
                      { id: 'restyle', icon: Palette, color: '#6366f1', label: 'Restyle', disabled: false },
                      { id: 'move', icon: Move, color: '#f59e0b', label: 'Move', disabled: false },
                    ];
                    if (ringMenu.type === 'subgraph') {
                      actions.push({ id: 'kickout', icon: LogOut, color: '#10b981', label: 'Kick Out', disabled: false });
                    } else if (ringMenu.type === 'edge') {
                      actions.length = 0;
                      actions.push({ id: 'delete', icon: Trash2, color: '#ef4444', label: 'Delete', disabled: false });
                      actions.push({ id: 'restyle', icon: Palette, color: '#6366f1', label: 'Restyle', disabled: false });
                      actions.push({ id: 'rebase', icon: ArrowRight, color: '#f59e0b', label: 'Rebase', disabled: false });
                      actions.push({ id: 'retarget', icon: ArrowRight, color: '#10b981', label: 'Retarget', disabled: false });
                    } else if (ringMenu.type === 'canvas') {
                      actions.length = 0;
                      actions.push({ id: 'add_node', icon: Plus, color: '#3b82f6', label: 'Add Node', disabled: false });
                      actions.push({ id: 'add_subgraph', icon: PlusCircle, color: '#10b981', label: 'Add Subgraph', disabled: false });
                      actions.push({ id: 'undo', icon: Undo2, color: '#6366f1', label: 'Undo', disabled: undoStack.length === 0 });
                      actions.push({ id: 'redo', icon: Redo2, color: '#6366f1', label: 'Redo', disabled: redoStack.length === 0 });
                    } else if (ringMenu.type === 'multi_select') {
                      actions.length = 0;
                      const selectedElements = selectedIds.map(id => findElement(graph.elements, id)).filter(Boolean) as GraphElement[];
                      const hasNodesOrSubgraphs = selectedElements.some(el => el.type === 'node' || el.type === 'subgraph');
                      const hasEdges = selectedElements.some(el => el.type === 'edge');

                      if (hasNodesOrSubgraphs) {
                        actions.push({ id: 'group_move', icon: Move, color: '#f59e0b', label: 'Group Move', disabled: false });
                      }
                      actions.push({ id: 'group_delete', icon: Trash2, color: '#ef4444', label: 'Group Delete', disabled: false });
                      actions.push({ id: 'group_restyle', icon: Palette, color: '#6366f1', label: 'Group Restyle', disabled: false });
                      if (hasEdges) {
                        actions.push({ id: 'group_rebase', icon: ArrowRight, color: '#f59e0b', label: 'Group Rebase', disabled: false });
                        actions.push({ id: 'group_retarget', icon: ArrowRight, color: '#10b981', label: 'Group Retarget', disabled: false });
                      }
                    }
                    
                    const segmentCount = actions.length;
                    const segmentAngle = 360 / segmentCount;
                    const innerR = IS_TOUCH ? 30 : 24;
                    const outerR = 145;
                    const iconR = IS_TOUCH ? 80 : 75;
                    const textR = IS_TOUCH ? 115 : 105;

                    return actions.map((action, i) => {
                      const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
                      const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
                      const x1 = Math.cos(startAngle) * outerR;
                      const y1 = Math.sin(startAngle) * outerR;
                      const x2 = Math.cos(endAngle) * outerR;
                      const y2 = Math.sin(endAngle) * outerR;
                      const ix1 = Math.cos(startAngle) * innerR;
                      const iy1 = Math.sin(startAngle) * innerR;
                      const ix2 = Math.cos(endAngle) * innerR;
                      const iy2 = Math.sin(endAngle) * innerR;
                      
                      const midAngle = (startAngle + endAngle) / 2;
                      const iconX = Math.cos(midAngle) * iconR;
                      const iconY = Math.sin(midAngle) * iconR;
                      
                      let normalizedMidAngle = midAngle % (2 * Math.PI);
                      if (normalizedMidAngle < 0) normalizedMidAngle += 2 * Math.PI;
                      const isBottomHalf = normalizedMidAngle > 0 && normalizedMidAngle < Math.PI;
                      
                      const textArcStartAngle = isBottomHalf ? endAngle : startAngle;
                      const textArcEndAngle = isBottomHalf ? startAngle : endAngle;
                      
                      const tx1 = Math.cos(textArcStartAngle) * textR;
                      const ty1 = Math.sin(textArcStartAngle) * textR;
                      const tx2 = Math.cos(textArcEndAngle) * textR;
                      const ty2 = Math.sin(textArcEndAngle) * textR;
                      
                      const sweepFlag = isBottomHalf ? 0 : 1;
                      const textPathData = `M ${tx1} ${ty1} A ${textR} ${textR} 0 0 ${sweepFlag} ${tx2} ${ty2}`;
                      const textPathId = `text-path-${ringMenu.type}-${action.id}`;

                      return (
                        <g 
                          key={action.id} 
                          className={action.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer group'}
                          onClick={() => {
                            if (action.disabled) return;
                            if (action.id === 'delete') {
                              updateGraph(prev => ({ ...prev, elements: removeElement(prev.elements, ringMenu.id!) }));
                              console.log('setSelectedId(null) at line 4498');
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
                            } else if (action.id === 'undo') {
                              undo();
                            } else if (action.id === 'redo') {
                              redo();
                            } else if (action.id === 'rebase') {
                              setIsRebasingEdge(ringMenu.id!);
                            } else if (action.id === 'retarget') {
                              setIsRetargetingEdge(ringMenu.id!);
                            } else if (action.id === 'group_move') {
                              setIsMovingGroup(selectedIds);
                            } else if (action.id === 'group_delete') {
                              updateGraph(prev => {
                                let newElements = prev.elements;
                                for (const id of selectedIds) {
                                  newElements = removeElement(newElements, id);
                                }
                                return { ...prev, elements: newElements };
                              });
                              setSelectedIds([]);
                            } else if (action.id === 'group_restyle') {
                              handleGroupRestyle(selectedIds);
                            } else if (action.id === 'group_rebase') {
                              const edgeIds = selectedIds.filter(id => {
                                const el = findElement(graph.elements, id);
                                return el?.type === 'edge';
                              });
                              if (edgeIds.length > 0) setIsRebasingGroup(edgeIds);
                            } else if (action.id === 'group_retarget') {
                              const edgeIds = selectedIds.filter(id => {
                                const el = findElement(graph.elements, id);
                                return el?.type === 'edge';
                              });
                              if (edgeIds.length > 0) setIsRetargetingGroup(edgeIds);
                            }
                            setRingMenu(null);
                          }}
                        >
                          <path 
                            d={`M ${ix1} ${iy1} L ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1} Z`} 
                            fill="transparent"
                            className="hover:fill-slate-50 transition-colors"
                          />
                          <line x1={ix1} y1={iy1} x2={x1} y2={y1} strokeWidth="1" className="stroke-slate-200" />
                          <foreignObject x={iconX - 20} y={iconY - 20} width="40" height="40">
                            <div className="flex items-center justify-center w-full h-full transition-transform group-hover:scale-125">
                              <action.icon size={IS_TOUCH ? 24 : 20} style={{ color: action.color }} />
                            </div>
                          </foreignObject>
                          <path id={textPathId} d={textPathData} fill="none" stroke="none" />
                          <text 
                            dominantBaseline="middle"
                            className={`text-[10px] font-bold fill-slate-700 transition-opacity pointer-events-none ${IS_TOUCH ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          >
                            <textPath href={`#${textPathId}`} startOffset="50%" textAnchor="middle">
                              {action.label}
                            </textPath>
                          </text>
                        </g>
                      );
                    });
                  })()}

                  {/* Segments loop ends here */}
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      {(viewMode === 'visual' || viewMode === 'code') && (
        <React.Fragment>
          <div className={`${isPropertiesPaneOpen ? 'w-80' : 'w-0'} bg-white border-l border-slate-200 flex flex-col z-20 transition-all duration-300 overflow-hidden ${showElementDefaults ? 'hidden' : ''}`}>
          <div className="h-14 border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0 min-w-[320px]">
            <div className="flex items-center">
              <Settings size={20} className="text-slate-400 mr-2" />
              <h2 id="header-properties" className="font-semibold text-slate-800">Properties</h2>
            </div>
            <div className="flex items-center gap-1">
              {renderHeaderButtons(true)}
              <button 
                onClick={() => { 
                  setIsPropertiesPaneOpen(false);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto min-w-[320px]">
          {selectedIds.length > 0 ? (
            <div className="p-6 space-y-6 flex flex-col min-h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Multi-Edit ({selectedIds.length} items)</h3>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Clear All
                </button>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex-1 flex flex-col">
                <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
                  Changes made here will be applied to all {selectedIds.length} selected elements.
                </p>
                
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="pt-2 border-t border-indigo-100 flex-1 flex flex-col">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Add Attribute</h4>
                    <AttributeSelector 
                      type="node" // Default to node for multi-edit, or maybe 'all'
                      engine={engine}
                      onSelect={(key) => handleMultiAttributeChange(key, '')} 
                      existingAttributes={{}} // We don't know existing for multi-edit easily
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : selectedElement ? (
            <div className="p-6 space-y-6 flex flex-col min-h-full">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Element Type</h3>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-medium capitalize">
                    {selectedElement.type}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer group pt-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-500 transition-colors">HTML Mode</span>
                  <input 
                    type="checkbox" 
                    checked={!!(selectedElement.attributes.label?.startsWith('<') && selectedElement.attributes.label?.endsWith('>'))}
                    onChange={(e) => {
                      const currentLabel = selectedElement.attributes.label || '';
                      
                      if (e.target.checked) {
                        const newLabel = (!currentLabel.startsWith('<') || !currentLabel.endsWith('>')) 
                          ? `<${currentLabel}>` 
                          : currentLabel;
                        const newAttrs: Record<string, string> = { label: newLabel };
                        if (selectedElement.type !== 'edge') newAttrs.shape = 'plain';
                        handleAttributesChange(newAttrs);
                      } else {
                        const newLabel = (currentLabel.startsWith('<') && currentLabel.endsWith('>'))
                          ? currentLabel.slice(1, -1)
                          : currentLabel;
                        const newAttrs: Record<string, string> = { label: newLabel };
                        if (selectedElement.type !== 'edge') newAttrs.shape = 'box';
                        handleAttributesChange(newAttrs);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
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
                  {selectedElement.type === 'edge' && (
                    <div key="weight">
                      {renderAttributeInput(
                        'weight',
                        selectedElement.attributes.weight ?? '1',
                        (v: string) => handleAttributeChange('weight', v),
                        () => handleRemoveAttribute('weight'),
                        selectedElement.attributes
                      )}
                    </div>
                  )}
                  {Object.entries(selectedElement.attributes)
                    .filter(([key]) => !(selectedElement.type === 'edge' && key === 'weight'))
                    .map(([key, value]) => (
                    <div key={key}>
                      {renderAttributeInput(
                        key, 
                        value as string, 
                        (v: string) => handleAttributeChange(key, v), 
                        () => handleRemoveAttribute(key),
                        selectedElement.attributes
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex-1 flex flex-col">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Add Attribute</h3>
                <AttributeSelector 
                  type={selectedElement.type} 
                  engine={engine}
                  onSelect={(key) => handleAttributeChange(key, '')} 
                  existingAttributes={selectedElement.attributes}
                />
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6 flex flex-col min-h-full">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Layout Engine</h3>
                <select
                  id="properties-engine"
                  value={engine ?? ''}
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
                    onClick={() => updateGraph(prev => ({ ...prev, type: 'digraph' }))}
                  >
                    Directed
                  </button>
                  <button
                    className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${graph.type === 'graph' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    onClick={() => updateGraph(prev => ({ ...prev, type: 'graph' }))}
                  >
                    Undirected
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={graph.strict} 
                    onChange={(e) => updateGraph(prev => ({ ...prev, strict: e.target.checked }))}
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
                        () => handleRemoveGraphAttribute(key),
                        graph.attributes
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex-1 flex flex-col">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Add Attribute</h3>
                <AttributeSelector 
                  type="graph" 
                  engine={engine}
                  onSelect={(key) => handleGraphAttributeChange(key, '')} 
                  existingAttributes={graph.attributes}
                />
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
            <h2 id="header-defaults" className="font-semibold text-slate-800">Element Defaults</h2>
          </div>
          <div className="flex items-center gap-1">
            {renderHeaderButtons(true)}
            <button 
              onClick={() => setShowElementDefaults(false)}
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6 flex flex-col min-h-full">
            {/* Node Attributes */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Node Attributes</h3>
              <div className="space-y-4">
                {Object.entries(graph.nodeAttributes).map(([key, value]) => (
                  <div key={key}>
                    {renderAttributeInput(
                      key, 
                      value as string, 
                      (v: string) => updateGraph(prev => ({ ...prev, nodeAttributes: { ...prev.nodeAttributes, [key]: v } })), 
                      () => updateGraph(prev => {
                        const next = { ...prev.nodeAttributes };
                        delete next[key];
                        return { ...prev, nodeAttributes: next };
                      }),
                      graph.nodeAttributes
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <AttributeSelector 
                  type="node" 
                  engine={engine}
                  onSelect={(key) => updateGraph(prev => ({ ...prev, nodeAttributes: { ...prev.nodeAttributes, [key]: '' } }))} 
                  existingAttributes={graph.nodeAttributes}
                />
              </div>
            </div>
            
            {/* Edge Attributes */}
            <div className="pt-4 border-t border-slate-100 flex-1 flex flex-col">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Edge Attributes</h3>
              <div className="space-y-4">
                {Object.entries(graph.edgeAttributes).map(([key, value]) => (
                  <div key={key}>
                    {renderAttributeInput(
                      key, 
                      value as string, 
                      (v: string) => updateGraph(prev => ({ ...prev, edgeAttributes: { ...prev.edgeAttributes, [key]: v } })), 
                      () => updateGraph(prev => {
                        const next = { ...prev.edgeAttributes };
                        delete next[key];
                        return { ...prev, edgeAttributes: next };
                      }),
                      graph.edgeAttributes
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex-1 flex flex-col">
                <AttributeSelector 
                  type="edge" 
                  engine={engine}
                  onSelect={(key) => updateGraph(prev => ({ ...prev, edgeAttributes: { ...prev.edgeAttributes, [key]: '' } }))} 
                  existingAttributes={graph.edgeAttributes}
                />
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

      {viewMode === 'visual' && tool !== 'multi_select' && mouseState?.isDragging && mouseState.targetId && mouseState.button === 0 && !isMovingElement && !isMovingGroup && !isRebasingEdge && !isRetargetingEdge && !isRebasingGroup && !isRetargetingGroup && (() => {
        const source = findElement(graph.elements, mouseState.targetId);
        if (source) {
          return (
            <svg className="fixed inset-0 pointer-events-none z-[100] w-full h-full" style={{ pointerEvents: 'none' }}>
              <defs>
                <marker id="arrowhead-dummy" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" style={{ pointerEvents: 'none' }}>
                  <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" style={{ pointerEvents: 'none' }} />
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
                style={{ pointerEvents: 'none' }}
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
            <p className="text-slate-600 mb-6">This will permanently delete all nodes and edges.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  updateGraph({
                    type: 'digraph',
                    id: 'G',
                    strict: false,
                    attributes: { rankdir: 'TB', compound: 'true' },
                    nodeAttributes: { shape: 'box', style: 'rounded' },
                    edgeAttributes: {},
                    elements: [createNode({ label: 'Node' })]
                  });
                  setSelectedId(null);
                  setShowClearModal(false);
                }}
                className="px-4 py-2 bg-red-500 text-[#ffffff] font-medium hover:bg-red-600 rounded-xl transition-colors shadow-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Purge Media Manager?</h3>
            <p className="text-slate-600 mb-6">This will permanently delete all custom palettes and all media files from storage. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handlePurge}
                className="px-4 py-2 bg-red-500 text-[#ffffff] font-medium hover:bg-red-600 rounded-xl transition-colors shadow-sm"
              >
                Purge Everything
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
                  value={mediaUrlInput ?? ''}
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
                  value={mediaNameInput ?? ''}
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
                onClick={async () => {
                  if (mediaUrlInput && mediaNameInput) {
                    let width, height;
                    try {
                      const dims = await getImageDimensions(mediaUrlInput);
                      width = dims.width;
                      height = dims.height;
                    } catch (err) {
                      console.error("Failed to get image dimensions", err);
                    }
                    db.media.add({
                      name: mediaNameInput,
                      type: 'url',
                      url: mediaUrlInput,
                      width,
                      height,
                      createdAt: Date.now()
                    });
                    setShowAddMediaModal(false);
                  }
                }}
                disabled={!mediaUrlInput || !mediaNameInput}
                className="px-4 py-2 bg-indigo-600 text-[#ffffff] font-medium hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
