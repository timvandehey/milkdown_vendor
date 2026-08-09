import { c as computePosition, f as flip, o as offset, s as shift, a as autoUpdate } from './shared-C9xF-VKH.js';
import { posToDOMRect } from './milkdown_prose.js';
import { $ctx, $prose } from './milkdown_utils.js';
import { TextSelection, Plugin, PluginKey } from './milkdown_prose_state.js';
import { t as throttle } from './shared-ZvO3YIo3.js';
import './milkdown_prose_inputrules.js';
import './milkdown_prose_transform.js';
import './milkdown_prose_model.js';
import './shared-CFXWASEb.js';
import './shared-B6E9QbLK.js';
import './milkdown_ctx.js';
import './milkdown_transformer.js';
import './shared-Dx24TPyA.js';
import './milkdown_prose_view.js';
import './milkdown_prose_commands.js';
import './shared-CoIHiJWo.js';

//#region src/tooltip-provider.ts
var TooltipProvider = class {
	#debounce;
	#shouldShow;
	#middleware;
	#floatingUIOptions;
	#root;
	#initialized;
	#cleanupAutoUpdate;
	#offset;
	#shift;
	#updater;
	constructor(options) {
		this.#initialized = false;
		this.onShow = () => {};
		this.onHide = () => {};
		this.#updatePosition = (reference) => {
			computePosition(reference, this.element, {
				placement: this.#floatingUIOptions.placement ?? "top",
				middleware: [
					flip(),
					offset(this.#offset),
					shift(this.#shift),
					...this.#middleware
				],
				...this.#floatingUIOptions
			}).then(({ x, y }) => {
				Object.assign(this.element.style, {
					left: `${x}px`,
					top: `${y}px`
				});
			}).catch(console.error);
		};
		this.#shouldAutoUpdate = (editorView) => {
			return this.#root !== editorView.dom.parentElement;
		};
		this.#onUpdate = (view, prevState) => {
			const { state, composing } = view;
			const { selection, doc } = state;
			const { ranges } = selection;
			const from = Math.min(...ranges.map((range) => range.$from.pos));
			const to = Math.max(...ranges.map((range) => range.$to.pos));
			const isSame = prevState && prevState.doc.eq(doc) && prevState.selection.eq(selection);
			if (!this.#initialized) {
				(this.#root ?? view.dom.parentElement ?? document.body).appendChild(this.element);
				this.#initialized = true;
			}
			if (composing || isSame) return;
			this.#cleanupAutoUpdate?.();
			this.#cleanupAutoUpdate = void 0;
			if (!this.#shouldShow(view, prevState)) {
				this.hide();
				return;
			}
			const virtualEl = {
				getBoundingClientRect: () => posToDOMRect(view, from, to),
				contextElement: view.dom
			};
			if (this.#shouldAutoUpdate(view)) this.#cleanupAutoUpdate = autoUpdate(virtualEl, this.element, () => this.#updatePosition(virtualEl));
			else this.#updatePosition(virtualEl);
			this.show();
		};
		this.update = (view, prevState) => {
			this.#updater(view, prevState);
		};
		this.#_shouldShow = (view) => {
			const { doc, selection } = view.state;
			const { empty, from, to } = selection;
			const isEmptyTextBlock = !doc.textBetween(from, to).length && view.state.selection instanceof TextSelection;
			const isTooltipChildren = this.element.contains(document.activeElement);
			const notHasFocus = !view.hasFocus() && !isTooltipChildren;
			const isReadonly = !view.editable;
			if (notHasFocus || empty || isEmptyTextBlock || isReadonly) return false;
			return true;
		};
		this.destroy = () => {
			this.#cleanupAutoUpdate?.();
			this.#updater.cancel();
		};
		this.show = (virtualElement, editorView) => {
			this.element.dataset.show = "true";
			if (virtualElement) {
				this.#cleanupAutoUpdate?.();
				this.#cleanupAutoUpdate = void 0;
				const reference = {
					...virtualElement,
					contextElement: editorView?.dom
				};
				if (editorView && this.#shouldAutoUpdate(editorView)) this.#cleanupAutoUpdate = autoUpdate(reference, this.element, () => this.#updatePosition(reference));
				else this.#updatePosition(reference);
			}
			this.onShow();
		};
		this.hide = () => {
			if (this.element.dataset.show === "false") return;
			this.element.dataset.show = "false";
			this.onHide();
		};
		this.element = options.content;
		this.#debounce = options.debounce ?? 200;
		this.#shouldShow = options.shouldShow ?? this.#_shouldShow;
		this.#offset = options.offset;
		this.#shift = options.shift;
		this.#middleware = options.middleware ?? [];
		this.#floatingUIOptions = options.floatingUIOptions ?? {};
		this.#root = options.root;
		this.element.dataset.show = "false";
		this.#updater = throttle(this.#onUpdate, this.#debounce);
	}
	#updatePosition;
	#shouldAutoUpdate;
	#onUpdate;
	#_shouldShow;
};
//#endregion
//#region src/tooltip-plugin.ts
function tooltipFactory(id) {
	const tooltipSpec = $ctx({}, `${id}_TOOLTIP_SPEC`);
	const tooltipPlugin = $prose((ctx) => {
		const spec = ctx.get(tooltipSpec.key);
		return new Plugin({
			key: new PluginKey(`${id}_TOOLTIP`),
			...spec
		});
	});
	const result = [tooltipSpec, tooltipPlugin];
	result.key = tooltipSpec.key;
	result.pluginKey = tooltipPlugin.key;
	tooltipSpec.meta = {
		package: "@milkdown/plugin-tooltip",
		displayName: `Ctx<tooltipSpec>|${id}`
	};
	tooltipPlugin.meta = {
		package: "@milkdown/plugin-tooltip",
		displayName: `Prose<tooltip>|${id}`
	};
	return result;
}

export { TooltipProvider, tooltipFactory };
//# sourceMappingURL=milkdown_plugin_tooltip.js.map
