import { c as commandsCtx } from './shared-B6E9QbLK.js';
import { $useKeymap, $ctx, $prose, $command } from './milkdown_utils.js';
import { history as history$1, undo, redo } from './milkdown_prose_history.js';
import './milkdown_ctx.js';
import './shared-CFXWASEb.js';
import './milkdown_prose.js';
import './milkdown_prose_state.js';
import './milkdown_prose_model.js';
import './milkdown_prose_transform.js';
import './milkdown_prose_inputrules.js';
import './milkdown_transformer.js';
import './shared-Dx24TPyA.js';
import './milkdown_prose_view.js';
import './milkdown_prose_commands.js';

//#region src/index.ts
function withMeta(plugin, meta) {
	Object.assign(plugin, { meta: {
		package: "@milkdown/plugin-history",
		...meta
	} });
	return plugin;
}
var undoCommand = $command("Undo", () => () => undo);
withMeta(undoCommand, { displayName: "Command<undo>" });
var redoCommand = $command("Redo", () => () => redo);
withMeta(redoCommand, { displayName: "Command<redo>" });
var historyProviderConfig = $ctx({}, "historyProviderConfig");
withMeta(historyProviderConfig, { displayName: "Ctx<historyProviderConfig>" });
var historyProviderPlugin = $prose((ctx) => history$1(ctx.get(historyProviderConfig.key)));
withMeta(historyProviderPlugin, { displayName: "Ctx<historyProviderPlugin>" });
var historyKeymap = $useKeymap("historyKeymap", {
	Undo: {
		shortcuts: "Mod-z",
		command: (ctx) => {
			const commands = ctx.get(commandsCtx);
			return () => commands.call(undoCommand.key);
		}
	},
	Redo: {
		shortcuts: ["Mod-y", "Shift-Mod-z"],
		command: (ctx) => {
			const commands = ctx.get(commandsCtx);
			return () => commands.call(redoCommand.key);
		}
	}
});
withMeta(historyKeymap.ctx, { displayName: "KeymapCtx<history>" });
withMeta(historyKeymap.shortcuts, { displayName: "Keymap<history>" });
var history = [
	historyProviderConfig,
	historyProviderPlugin,
	historyKeymap,
	undoCommand,
	redoCommand
].flat();

export { history, historyKeymap, historyProviderConfig, historyProviderPlugin, redoCommand, undoCommand };
//# sourceMappingURL=milkdown_plugin_history.js.map
