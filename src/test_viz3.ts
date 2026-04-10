import { Graphviz } from '@hpcc-js/wasm-graphviz';
Graphviz.load().then(viz => {
  const svg = viz.layout('digraph G { a -> b; }', 'svg', 'dot');
  console.log(svg.substring(300, 600));
});
