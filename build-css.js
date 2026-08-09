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
    srcDir: 'node_modules/@milkdown/kit/lib',
    files: [
      'prose/gapcursor/style/gapcursor.css',
      'prose/view/style/prosemirror.css',
      'prose/tables/style/tables.css',
    ],
  },
  {
    srcDir: 'node_modules/prosemirror-virtual-cursor',
    files: ['style/virtual-cursor.css'],
  },
  {
    srcDir: 'node_modules/katex/dist',
    files: ['katex.min.css'],
  },
];

const proseDestDir = 'dist';

for (const { srcDir, files } of proseFiles) {
  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(proseDestDir, file);

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  }
}

console.log('CSS build finished.');