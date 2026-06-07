const fs = require('fs');

let content = fs.readFileSync('src/lib/api.js', 'utf8');

// Inject console telemetry
content = content.replace(
  '    console.warn("API Error, utilizing fallback protocol:", error.message);',
  '    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);\n    console.warn("API Error, utilizing fallback protocol:", error.message);'
);

content = content.replace(
  '    console.warn("API Error, utilizing fallback protocol for post:", error.message);',
  '    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);\n    console.warn("API Error, utilizing fallback protocol for post:", error.message);'
);

content = content.replace(
  '    console.warn("API Error, utilizing fallback protocol for social:", error.message);',
  '    console.error("[AXiM Core: Routing Error] Failed to fetch article payload:", error);\n    console.warn("API Error, utilizing fallback protocol for social:", error.message);'
);

fs.writeFileSync('src/lib/api.js', content);
