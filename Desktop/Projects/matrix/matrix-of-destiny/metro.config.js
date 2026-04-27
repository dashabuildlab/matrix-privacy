const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Enable web support
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Redirect .mjs (ESM) → .js (CJS) to avoid `import.meta` in Metro bundles.
// Zustand v5 ESM files use import.meta.env.MODE, which Metro can't handle.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (resolved.type === 'sourceFile' && resolved.filePath.endsWith('.mjs')) {
    const fp = resolved.filePath;
    // e.g.  .../zustand/esm/middleware.mjs  →  .../zustand/middleware.js
    const candidates = [
      path.normalize(fp.replace(/[/\\]esm[/\\]([^/\\]+)\.mjs$/, path.sep + '$1.js')),
      path.normalize(fp.replace(/\.mjs$/, '.js')),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return { ...resolved, filePath: candidate };
      }
    }
  }
  return resolved;
};

// Use port 8083 to avoid conflicts
config.server = { ...config.server, port: 8083 };

module.exports = config;
