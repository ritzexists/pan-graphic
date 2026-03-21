import { Graphviz } from "@hpcc-js/wasm/graphviz";

let graphvizInstance: Graphviz | null = null;

export interface VFSFile {
  path: string;
  data: string | Uint8Array;
}

export async function renderDot(dot: string, engine: string = 'dot', vfs: VFSFile[] = []): Promise<string> {
  if (!graphvizInstance) {
    graphvizInstance = await Graphviz.load();
  }
  
  // Clear and populate VFS
  // Note: hpcc-js/wasm doesn't have a clear VFS method, but we can overwrite files
  for (const file of vfs) {
    (graphvizInstance as any).writeFile(file.path, file.data);
  }
  
  return graphvizInstance.layout(dot, "svg", engine as any);
}
