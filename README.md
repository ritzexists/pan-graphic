# PanGraphic: Alabaster

PanGraphic is a powerful, real-time Graphviz editor built with React and Tailwind CSS. It allows you to visually create and edit complex graphs using the DOT language.

## Features

- **Visual Editor**: Add nodes, edges, and subgraphs with intuitive visual tools.
- **Ring Menu**: Long-press (500ms) on any element or the canvas background to open a quick action ring menu.
- **DOT Code View**: View and edit the underlying DOT source code with a full-featured Monaco editor.
- **Multiple Layout Engines**: Support for `dot`, `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage`, `patchwork`, and `nop`.
- **Rich Attribute Support**: Customize shapes, colors, styles, and more through a detailed properties pane.
- **Export Options**: Export your graphs as DOT, SVG, PNG, or JPG.
- **Zoom & Pan**: Easily navigate large graphs with smooth zoom and pan controls.
- **Media Manager**: Upload local images or add external URLs to use them as node icons.
- **Style Palettes**: Save and apply styles quickly using the sidebar palette tiles.

## Usage

### Visual Interaction

- **Selection**: Left-click on any node, edge, or subgraph to select it.
- **Ring Menu**: Long-press (500ms) on any element or the canvas background to open the ring menu.
- **Add Elements**: Long-press on the canvas background and select "Add Node" or "Add Subgraph".
- **Move/Re-parent**: Open the ring menu on a node or subgraph, select "Move", then click the target subgraph or background.
- **Modify Edges**: Use the ring menu on an edge to "Rebase" (change source) or "Retarget" (change target).
- **Multi-select**: Toggle the multi-select tool in the sidebar. Click elements to select multiple. Long-press on a selection to perform bulk actions.
- **Center View**: Double-click on the canvas background to center the graph and reset zoom level.
- **Save Styles**: Drag an element from the graph and drop it onto a palette tile in the sidebar to save its current style.

### Keyboard Shortcuts

- **Delete**: Press the `Delete` key to remove selected elements.
- **Save**: Press `Ctrl+S` (or `Cmd+S`) to save the current graph to local storage.

## Version

**Alabaster**
