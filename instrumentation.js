/**
 * Fix for Next.js dev server: app route pages load the webpack runtime from their
 * own directory, so require("./vendor-chunks/next.js") or require("./682.js") etc.
 * resolve relative to the route (e.g. .next/server/app/.../page.js) and fail.
 * Patch resolution so any relative request (./...) from an app route resolves from .next/server.
 */
async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Use eval so Next's bundler doesn't try to resolve Node built-ins
  const path = eval("require('path')");
  const Module = eval("require('module')");
  const originalResolve = Module._resolveFilename;
  const serverDir = path.join(process.cwd(), ".next", "server");
  const fakeParent = { filename: path.join(serverDir, "_"), id: path.join(serverDir, "_") };

  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request.startsWith("./") && parent) {
      const parentPath = typeof parent === "string" ? parent : parent.filename;
      if (parentPath && parentPath.includes(".next/server/app")) {
        return originalResolve.call(this, request, fakeParent, isMain, options);
      }
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };
}

module.exports = { register };
