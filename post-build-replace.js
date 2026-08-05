import fs from 'node:fs';
import path from 'node:path';

const distDir = 'dist';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('process.env.NODE_ENV')) {
    // Replace all occurrences of process.env.NODE_ENV with 'production'
    content = content.replace(/process\.env\.NODE_ENV/g, "'production'");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced process.env.NODE_ENV in ${filePath}`);
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

scanDir(distDir);
console.log('Post-build replacement finished.');
