import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

const replaceConfig = replace({
  preventAssignment: true,
  delimiters: ['', ''],
  values: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});

export default {
  input: {
    // Core & Ctx
    'milkdown_core': '@milkdown/kit/core',
    'milkdown_ctx': '@milkdown/kit/ctx',
    'milkdown_transformer': '@milkdown/kit/transformer',
    'milkdown_utils': '@milkdown/kit/utils',

    // Presets
    'milkdown_preset_commonmark': '@milkdown/kit/preset/commonmark',
    'milkdown_preset_gfm': '@milkdown/kit/preset/gfm',

    // Plugins
    'milkdown_plugin_block': '@milkdown/kit/plugin/block',
    'milkdown_plugin_clipboard': '@milkdown/kit/plugin/clipboard',
    'milkdown_plugin_cursor': '@milkdown/kit/plugin/cursor',
    'milkdown_plugin_history': '@milkdown/kit/plugin/history',
    'milkdown_plugin_indent': '@milkdown/kit/plugin/indent',
    'milkdown_plugin_listener': '@milkdown/kit/plugin/listener',
    'milkdown_plugin_slash': '@milkdown/kit/plugin/slash',
    'milkdown_plugin_tooltip': '@milkdown/kit/plugin/tooltip',
    'milkdown_plugin_trailing': '@milkdown/kit/plugin/trailing',
    'milkdown_plugin_upload': '@milkdown/kit/plugin/upload',
    'milkdown_plugin_diff': '@milkdown/kit/plugin/diff',
    'milkdown_plugin_streaming': '@milkdown/kit/plugin/streaming',

    // Component
    'milkdown_component': '@milkdown/kit/component',

    // ProseMirror exports
    'milkdown_prose': '@milkdown/kit/prose',
    'milkdown_prose_state': '@milkdown/kit/prose/state',
    'milkdown_prose_view': '@milkdown/kit/prose/view',
    'milkdown_prose_model': '@milkdown/kit/prose/model',
    'milkdown_prose_transform': '@milkdown/kit/prose/transform',
    'milkdown_prose_commands': '@milkdown/kit/prose/commands',
    'milkdown_prose_keymap': '@milkdown/kit/prose/keymap',
    'milkdown_prose_history': '@milkdown/kit/prose/history',
    'milkdown_prose_inputrules': '@milkdown/kit/prose/inputrules',
    'milkdown_prose_dropcursor': '@milkdown/kit/prose/dropcursor',
    'milkdown_prose_gapcursor': '@milkdown/kit/prose/gapcursor',
    'milkdown_prose_schema_list': '@milkdown/kit/prose/schema-list',
    'milkdown_prose_tables': '@milkdown/kit/prose/tables',

    // Crepe Editor
    'milkdown_crepe': '@milkdown/crepe',
  },
  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: true,
    chunkFileNames: 'shared-[hash].js',
    plugins: [
      replaceConfig
    ]
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    replaceConfig
  ]
};
