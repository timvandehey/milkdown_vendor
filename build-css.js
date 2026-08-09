import fs from 'node:fs';
import path from 'node:path';

// Helper to recursively copy directories while applying transformations
function copyAndTransformDir(src, dest, transform) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyAndTransformDir(srcPath, destPath, transform);
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      const content = fs.readFileSync(srcPath, 'utf8');
      const newContent = transform(content);
      fs.writeFileSync(destPath, newContent, 'utf8');
    }
  }
}

// --- Main script ---

// 1. Copy and transform @milkdown/crepe themes
const crepeThemeSrc = 'node_modules/@milkdown/crepe/lib/theme';
const crepeThemeDest = 'dist/theme';

if (fs.existsSync(crepeThemeSrc)) {
  copyAndTransformDir(crepeThemeSrc, crepeThemeDest, (content) => {
    // This regex looks for imports of prose styles inside the theme files
    // and replaces them with the correct relative path.
    return content
      .replace(
        /@import ['"]@milkdown\/kit\/prose\/(.*?)\/style\/(.*?.css)['"];/g,
        "@import '../../prose/$1/style/$2';"
      )
      .replace(
        /@import ['"]prosemirror-virtual-cursor\/style\/(.*?.css)['"];/g,
        "@import '../../style/$1';"
      )
      .replace(
        /@import ['"]katex\/dist\/(.*?.css)['"];/g,
        "@import '../../$1';"
      );
  });
  console.log(`Copied and transformed Crepe themes from ${crepeThemeSrc} -> ${crepeThemeDest}`);
}

// 2. Copy individual CSS files (no transformation needed)
const proseFiles = [
  {
    src: 'node_modules/@milkdown/prose/lib/style/gapcursor.css',
    dest: 'dist/prose/gapcursor/style/gapcursor.css',
  },
  {
    src: 'node_modules/@milkdown/prose/lib/style/prosemirror.css',
    dest: 'dist/prose/view/style/prosemirror.css',
  },
  {
    src: 'node_modules/@milkdown/prose/lib/style/tables.css',
    dest: 'dist/prose/tables/style/tables.css',
  },
  {
    src: 'node_modules/prosemirror-virtual-cursor/style/virtual-cursor.css',
    dest: 'dist/style/virtual-cursor.css',
  },
  {
    src: 'node_modules/katex/dist/katex.min.css',
    dest: 'dist/katex.min.css',
  },
];

for (const { src, dest } of proseFiles) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
}

console.log('CSS build finished.');