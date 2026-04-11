import { Graphviz } from "@hpcc-js/wasm/graphviz";

let graphvizInstance: Graphviz | null = null;

export interface GraphvizImage {
  path: string;
  width: string;
  height: string;
}

export async function renderDot(dot: string, engine: string = 'dot', images: GraphvizImage[] = []): Promise<string> {
  if (!graphvizInstance) {
    graphvizInstance = await Graphviz.load();
  }
  
  return graphvizInstance.layout(dot, "svg", engine as any, {
    images: images
  });
}
