import { Graphviz } from "@hpcc-js/wasm/graphviz";

let graphvizInstance: Graphviz | null = null;

export async function renderDot(dot: string, engine: string = 'dot'): Promise<string> {
  if (!graphvizInstance) {
    graphvizInstance = await Graphviz.load();
  }
  return graphvizInstance.layout(dot, "svg", engine as any);
}
