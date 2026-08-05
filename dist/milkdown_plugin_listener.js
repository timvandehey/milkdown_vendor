import { I as InitReady, S as SerializerReady, s as serializerCtx, i as prosePluginsCtx, j as EditorViewReady } from './shared-B6E9QbLK.js';
import { createSlice } from './milkdown_ctx.js';
import { PluginKey, Plugin } from './milkdown_prose_state.js';
import { d as debounce } from './shared-CoIHiJWo.js';
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
var ListenerManager = class {
	constructor() {
		this.beforeMountedListeners = [];
		this.mountedListeners = [];
		this.updatedListeners = [];
		this.selectionUpdatedListeners = [];
		this.markdownUpdatedListeners = [];
		this.blurListeners = [];
		this.focusListeners = [];
		this.destroyListeners = [];
		this.beforeMount = (fn) => {
			this.beforeMountedListeners.push(fn);
			return this;
		};
		this.mounted = (fn) => {
			this.mountedListeners.push(fn);
			return this;
		};
		this.updated = (fn) => {
			this.updatedListeners.push(fn);
			return this;
		};
	}
	get listeners() {
		return {
			beforeMount: this.beforeMountedListeners,
			mounted: this.mountedListeners,
			updated: this.updatedListeners,
			markdownUpdated: this.markdownUpdatedListeners,
			blur: this.blurListeners,
			focus: this.focusListeners,
			destroy: this.destroyListeners,
			selectionUpdated: this.selectionUpdatedListeners
		};
	}
	markdownUpdated(fn) {
		this.markdownUpdatedListeners.push(fn);
		return this;
	}
	blur(fn) {
		this.blurListeners.push(fn);
		return this;
	}
	focus(fn) {
		this.focusListeners.push(fn);
		return this;
	}
	destroy(fn) {
		this.destroyListeners.push(fn);
		return this;
	}
	selectionUpdated(fn) {
		this.selectionUpdatedListeners.push(fn);
		return this;
	}
};
var listenerCtx = createSlice(new ListenerManager(), "listener");
var key = new PluginKey("MILKDOWN_LISTENER");
var listener = (ctx) => {
	ctx.inject(listenerCtx, new ListenerManager());
	return async () => {
		await ctx.wait(InitReady);
		const { listeners } = ctx.get(listenerCtx);
		listeners.beforeMount.forEach((fn) => fn(ctx));
		await ctx.wait(SerializerReady);
		const serializer = ctx.get(serializerCtx);
		let prevDoc = null;
		let prevMarkdown = null;
		let prevSelection = null;
		let latestTr = null;
		const debouncedHandler = debounce(() => {
			if (!latestTr) return;
			const { doc } = latestTr;
			if (listeners.updated.length > 0 && prevDoc && !prevDoc.eq(doc)) listeners.updated.forEach((fn) => {
				fn(ctx, doc, prevDoc);
			});
			if (listeners.markdownUpdated.length > 0 && prevDoc && !prevDoc.eq(doc)) {
				const markdown = serializer(doc);
				listeners.markdownUpdated.forEach((fn) => {
					fn(ctx, markdown, prevMarkdown);
				});
				prevMarkdown = markdown;
			}
			prevDoc = doc;
			latestTr = null;
		}, 200);
		const plugin = new Plugin({
			key,
			view: () => {
				return { destroy: () => {
					debouncedHandler.cancel();
					listeners.destroy.forEach((fn) => fn(ctx));
				} };
			},
			props: { handleDOMEvents: {
				focus: () => {
					listeners.focus.forEach((fn) => fn(ctx));
					return false;
				},
				blur: () => {
					listeners.blur.forEach((fn) => fn(ctx));
					return false;
				}
			} },
			state: {
				init: (_, instance) => {
					prevDoc = instance.doc;
					prevMarkdown = serializer(instance.doc);
				},
				apply: (tr) => {
					const currentSelection = tr.selection;
					if (!prevSelection && currentSelection || prevSelection && !currentSelection.eq(prevSelection)) {
						listeners.selectionUpdated.forEach((fn) => {
							fn(ctx, currentSelection, prevSelection);
						});
						prevSelection = currentSelection;
					}
					if (!(tr.docChanged || tr.storedMarksSet) || tr.getMeta("addToHistory") === false) return;
					latestTr = tr;
					debouncedHandler();
				}
			}
		});
		ctx.update(prosePluginsCtx, (x) => x.concat(plugin));
		await ctx.wait(EditorViewReady);
		listeners.mounted.forEach((fn) => fn(ctx));
	};
};
listener.meta = {
	package: "@milkdown/plugin-listener",
	displayName: "Listener"
};

export { ListenerManager, key, listener, listenerCtx };
//# sourceMappingURL=milkdown_plugin_listener.js.map
