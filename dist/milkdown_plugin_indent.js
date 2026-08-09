import { $ctx, $shortcut } from './milkdown_utils.js';
import { TextSelection, AllSelection } from './milkdown_prose_state.js';
import './shared-B6E9QbLK.js';
import './milkdown_ctx.js';
import './shared-CFXWASEb.js';
import './milkdown_prose.js';
import './milkdown_prose_inputrules.js';
import './milkdown_prose_transform.js';
import './milkdown_prose_model.js';
import './milkdown_transformer.js';
import './shared-Dx24TPyA.js';
import './milkdown_prose_view.js';
import './milkdown_prose_commands.js';

//#region src/index.ts
function updateIndent(tr, options) {
	const { doc, selection } = tr;
	if (!doc || !selection) return tr;
	if (!(selection instanceof TextSelection || selection instanceof AllSelection)) return tr;
	const { to } = selection;
	const text = options.type === "space" ? Array(options.size).fill(" ").join("") : "	";
	return tr.insertText(text, to);
}
var indentConfig = $ctx({
	type: "space",
	size: 2
}, "indentConfig");
indentConfig.meta = {
	package: "@milkdown/plugin-indent",
	displayName: "Ctx<indentConfig>"
};
var indentPlugin = $shortcut((ctx) => ({ Tab: (state, dispatch) => {
	const config = ctx.get(indentConfig.key);
	const { tr } = state;
	const _tr = updateIndent(tr, config);
	if (_tr.docChanged) {
		dispatch?.(_tr);
		return true;
	}
	return false;
} }));
indentPlugin.meta = {
	package: "@milkdown/plugin-indent",
	displayName: "Shortcut<indent>"
};
var indent = [indentConfig, indentPlugin];

export { indent, indentConfig, indentPlugin };
//# sourceMappingURL=milkdown_plugin_indent.js.map
