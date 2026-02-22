const fs = require('fs');
const path = require('path');

const DIRECTORIES = ['hub', 'libs/ui', 'tools/astrogram', 'tools/starwizz', 'e2e'];
const ROOT = '/Users/dineshbalajiv/DB/projects/db-astro-suite';

// Maps old prefixes to new ones
// Added word boundaries \b to ensure we don't partially replace within words.
// For 'db-', we make sure we don't accidentally replace 'db-astro-'
const REPLACEMENTS = [
  // UI lib
  { regex: /selector:\s*'db-/g, replacement: "selector: 'dba-ui-" },
  { regex: /<db-/g, replacement: "<dba-ui-" },
  { regex: /<\/db-/g, replacement: "</dba-ui-" },
  { regex: /(?<!-)\bdb-(accordion|accordion-item|card|checkbox|footer|header|input|neon-button|select|slider|space-button|textarea)\b/g, replacement: "dba-ui-$1" },

  // Astrogram
  { regex: /selector:\s*'ac-/g, replacement: "selector: 'dba-ag-" },
  { regex: /<ac-/g, replacement: "<dba-ag-" },
  { regex: /<\/ac-/g, replacement: "</dba-ag-" },
  { regex: /(?<!-)\bac-(root|card-preview|card-form|card-settings|image-details|integration-settings|equipment-settings|software-settings|bortle-scale|bortle-settings|caption-section|filter-ring)\b/g, replacement: "dba-ag-$1" },

  // Starwizz
  { regex: /selector:\s*'sw-/g, replacement: "selector: 'dba-sw-" },
  { regex: /<sw-/g, replacement: "<dba-sw-" },
  { regex: /<\/sw-/g, replacement: "</dba-sw-" },
  { regex: /(?<!-)\bsw-(root|control-panel|simulator|clear-image-button|hud-overlay|image-upload-overlay|loading-overlay)\b/g, replacement: "dba-sw-$1" },

  // Hub
  { regex: /selector:\s*'(app|hub)-/g, replacement: "selector: 'dba-hub-" },
  { regex: /<(app|hub)-/g, replacement: "<dba-hub-" },
  { regex: /<\/(app|hub)-/g, replacement: "</dba-hub-" },
  { regex: /(?<!-)\b(app|hub)-(root|about-page|home-page|starwizz-dossier|file-grouper-dossier|astrogram-dossier)\b/g, replacement: "dba-hub-$2" }
];

function processFile(filePath) {
  if (filePath.includes('node_modules') || filePath.includes('dist') || filePath.includes('.git')) {
    return;
  }
  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(filePath);
    files.forEach(file => processFile(path.join(filePath, file)));
  } else if (stat.isFile() && /\.(ts|html|css|scss|spec\.ts)$/.test(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    REPLACEMENTS.forEach(({ regex, replacement }) => {
      newContent = newContent.replace(regex, replacement);
    });
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath.replace(ROOT + '/', '')}`);
    }
  }
}

DIRECTORIES.forEach(dir => {
  processFile(path.join(ROOT, dir));
});
