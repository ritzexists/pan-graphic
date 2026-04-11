const { instance } = require('@viz-js/viz');
instance().then(viz => {
  const svg = viz.renderString('digraph G { a -> b; }');
  console.log(svg.substring(0, 200));
});
