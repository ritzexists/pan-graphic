import { Graphviz } from "@hpcc-js/wasm/graphviz";
Graphviz.load().then(g => {
  console.log(g.layout('digraph { subgraph cluster_0 { bgcolor=lightblue; a -> b; } }', 'svg', 'dot'));
});
