import fs from 'node:fs';
import path from 'node:path';

const distDir = 'dist';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // This regex looks for imports of prose styles inside the theme files
  // and replaces them with the correct relative path.
  const newContent = content.replace(
    /@import url\(['"]..\/..\/..\/..\/@milkdown\/kit\/prose\/(.*?)\/style\/(.*?.css)['"]\);/g,
    '@import url("../../prose/$1/style/$2");'
  );

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Replaced CSS import paths in ${filePath}`);
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      processFile(fullPath);
    }
  }
}

scanDir(path.join(distDir, 'theme'));
console.log('Post-build CSS path replacement finished.');

