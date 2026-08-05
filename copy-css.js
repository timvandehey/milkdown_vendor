import fs from 'node:fs';
import path from 'node:path';

// Helper to recursively copy directories
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy milkdown kit prose css files
const files = [
  'prose/gapcursor/style/gapcursor.css',
  'prose/view/style/prosemirror.css',
  'prose/tables/style/tables.css'
];

const srcDir = 'node_modules/@milkdown/kit/lib';
const destDir = 'dist';

for (const file of files) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
}

// Copy @milkdown/crepe themes recursively
const crepeThemeSrc = 'node_modules/@milkdown/crepe/lib/theme';
const crepeThemeDest = 'dist/theme';
if (fs.existsSync(crepeThemeSrc)) {
  copyDir(crepeThemeSrc, crepeThemeDest);
  console.log(`Copied Crepe themes recursively from ${crepeThemeSrc} -> ${crepeThemeDest}`);
}
