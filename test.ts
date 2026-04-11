import { Graphviz } from "@hpcc-js/wasm/graphviz";
import * as fs from "fs";

async function run() {
  const gv = await Graphviz.load();
  const ps = fs.readFileSync("sdl.ps", "utf8");
  const dot = `digraph G {
    node [shape=sdl_task, shapefile="sdl.ps", peripheries=0];
    a [label="test"];
  }`;
  const svg = gv.layout(dot, "svg", "dot", {
    files: [{ path: "sdl.ps", data: ps }]
  });
  fs.writeFileSync("test.svg", svg);
  const ps_out = gv.layout(dot, "ps" as any, "dot", {
    files: [{ path: "sdl.ps", data: ps }]
  });
  fs.writeFileSync("test.ps", ps_out);
}
run();
