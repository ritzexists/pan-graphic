const dotparser = require('dotparser');
const ast = dotparser('digraph G { node [label="regular string"]; }');
console.log(JSON.stringify(ast, null, 2));
