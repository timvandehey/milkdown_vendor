# 🌌 milkdown-vendor

Pre-bundled, browser-ready ES Modules for [Milkdown v7](https://milkdown.dev/) and [ProseMirror](https://prosemirror.net/). Designed for **"no-build" web applications** using native browser ES Modules, CSS custom properties, and Import Maps.

## 💡 Why does this exist?
In a zero-dependency, no-build environment, directly importing NPM subpaths (like `@milkdown/kit/core` or `@milkdown/kit/utils`) natively in the browser fails because:
1. The browser doesn't know how to resolve bare specifiers.
2. If you try to resolve them via separate, un-split ESM bundles (e.g. from generic CDNs), the bundler duplicates shared modules (such as ProseMirror key singletons).
3. Duplicating ProseMirror state key instances causes editor crashes at runtime.

This repository uses **Rollup Code-Splitting** to build all subpaths together. Shared dependencies are extracted into a single set of shared chunks (e.g. `shared-[hash].js`). At runtime, the browser resolves the shared singletons correctly, keeping ProseMirror state intact.

---

## 🚀 Getting Started

### 1. Install & Build
If you want to clone this repository, update dependencies, and re-bundle the vendor packages:

```bash
# Install dependencies using Bun (recommended) or NPM
bun install

# Run Rollup and helper scripts to build assets inside dist/
bun run build

# Start the local demonstration server
bun run start
```
The server will boot up at `http://localhost:3000`. Open it to explore the premium editor showcase!

---

## 📦 Consuming via Import Maps

You can serve these files directly from your own server, or reference them in a public Git repository via a CDN like **jsDelivr**.

Add the following `<script type="importmap">` to the `<head>` of your HTML document:

```html
<script type="importmap">
{
  "imports": {
    "@milkdown/crepe": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_crepe.js",
    "@milkdown/kit/core": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_core.js",
    "@milkdown/kit/ctx": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_ctx.js",
    "@milkdown/kit/transformer": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_transformer.js",
    "@milkdown/kit/utils": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_utils.js",
    "@milkdown/kit/preset/commonmark": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_preset_commonmark.js",
    "@milkdown/kit/preset/gfm": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_preset_gfm.js",
    "@milkdown/kit/plugin/block": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_plugin_block.js",
    "@milkdown/kit/plugin/clipboard": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_plugin_clipboard.js",
    "@milkdown/kit/plugin/cursor": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_plugin_cursor.js",
    "@milkdown/kit/plugin/history": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_plugin_history.js",
    "@milkdown/kit/plugin/indent": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_plugin_indent.js",
    "@milkdown/kit/plugin/listener": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_plugin_listener.js",
    "@milkdown/kit/plugin/slash": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_plugin_slash.js",
    "@milkdown/kit/plugin/tooltip": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_plugin_tooltip.js",
    "@milkdown/kit/plugin/trailing": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_plugin_trailing.js",
    "@milkdown/kit/plugin/upload": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_upload.js",
    "@milkdown/kit/prose": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_prose.js",
    "@milkdown/kit/prose/state": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_prose_state.js",
    "@milkdown/kit/prose/view": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_prose_view.js",
    "@milkdown/kit/prose/model": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_prose_model.js",
    "@milkdown/kit/prose/transform": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_prose_transform.js",
    "@milkdown/kit/prose/commands": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_prose_commands.js",
    "@milkdown/kit/prose/keymap": "https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/milkdown_prose_keymap.js"
  }
}
</script>
```

> [!IMPORTANT]
> Change `your-username` in the URLs above to match your actual GitHub username and repository name. It is recommended to pin to a release tag (e.g. `@v1.0.0`) in production instead of `@main` to prevent unexpected updates.

### 2. Include Stylesheets
Milkdown v7 styles are externalized. Load the pre-bundled CSS files inside your HTML:

```html
<!-- ProseMirror styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/prose/view/style/prosemirror.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/prose/gapcursor/style/gapcursor.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/prose/tables/style/tables.css">

<!-- Crepe styles (Core layout + Color theme variables) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/theme/common/style.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/timvandehey/milkdown_vendor@v1.0.2/dist/theme/crepe-dark/style.css">

```

### 3. Usage Example
Once import maps are loaded, you can write native ES module scripts matching official Milkdown examples verbatim:

```html
<div id="editor"></div>

<script type="module">
  import { Editor, rootCtx } from '@milkdown/kit/core';
  import { gfm } from '@milkdown/kit/preset/gfm';
  import { history } from '@milkdown/kit/plugin/history';

  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, document.getElementById('editor'));
    })
    .use(gfm)
    .use(history)
    .create();
</script>
```

#### Crepe Editor
```html
<div id="crepe-editor"></div>

<script type="module">
  import { Crepe } from '@milkdown/crepe';

  const crepe = new Crepe({
    root: document.getElementById('crepe-editor'),
    defaultValue: '# Hello from Crepe!'
  });

  await crepe.create();
</script>
```

---

## 🛠️ Repository Architecture

- **`rollup.config.mjs`**: Contains the mapping of all input entrypoints (including `@milkdown/crepe`) to the bundled files. Includes plugins for resolving node packages and commonjs conversions.
- **`copy-css.js`**: Automatically copies structural stylesheets from node_modules into the `dist/` directory, including copying all Crepe CSS themes recursively.
- **`server.js`**: A zero-dependency static server running on Bun's fast HTTP server to serve the workspace.
- **`example/`**: Full workspace dashboard featuring:
  - **`index.html`**: Native ESM Milkdown Kit demo with live outline TOC scroll updates, word stats, raw sync preview, and themes.
  - **`crepe.html`**: Dynamic WYSIWYG editor demo supporting swap-on-the-fly crepe themes (Classic, Nord, Frame) in light/dark variants.


---

## 📝 License
MIT
