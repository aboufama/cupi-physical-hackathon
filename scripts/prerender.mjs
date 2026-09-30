import { readFileSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

// Generate meaningful HTML at build time. The client hydrates it and adds interaction.
const server = await createServer({
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
  logLevel: "error",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.jsx");
  const html = readFileSync("dist/index.html", "utf8");
  const target = '<div id="root"></div>';
  if (!html.includes(target))
    throw new Error("Missing root placeholder in built HTML.");
  writeFileSync(
    "dist/index.html",
    html.replace(
      target,
      `<div id="root">${renderToString(createElement(App))}</div>`,
    ),
  );
  console.log("Prerendered event content into dist/index.html.");
} finally {
  await server.close();
}
