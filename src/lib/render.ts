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
  
  return graphvizInstance.layout(dot, "svg", engine as any, {
    files: vfs.map(f => ({
      path: f.path,
      data: f.data as any // CGraphviz.createFile supports string | Uint8Array
    }))
  });
}
