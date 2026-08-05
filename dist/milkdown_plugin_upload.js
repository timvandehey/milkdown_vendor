import { h as schemaCtx } from './shared-B6E9QbLK.js';
import { $ as $ctx, a as $prose } from './shared-BvLCM71P.js';
import { m as missingNodeInSchema } from './shared-CFXWASEb.js';
import { PluginKey, Plugin } from './milkdown_prose_state.js';
import { DecorationSet, Decoration } from './milkdown_prose_view.js';
import './milkdown_ctx.js';
import './milkdown_prose.js';
import './milkdown_prose_inputrules.js';
import './milkdown_prose_transform.js';
import './milkdown_prose_model.js';
import './milkdown_transformer.js';
import './shared-Dx24TPyA.js';
import './milkdown_prose_commands.js';

//#region src/default-uploader.ts
function readImageAsBase64(file) {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.addEventListener("load", () => {
			resolve({
				alt: file.name,
				src: reader.result
			});
		}, false);
		reader.readAsDataURL(file);
	});
}
var defaultUploader = async (files, schema) => {
	const imgs = [];
	for (let i = 0; i < files.length; i++) {
		const file = files.item(i);
		if (!file) continue;
		if (!file.type.includes("image")) continue;
		imgs.push(file);
	}
	const { image } = schema.nodes;
	if (!image) throw missingNodeInSchema("image");
	return (await Promise.all(imgs.map((img) => readImageAsBase64(img)))).map(({ alt, src }) => image.createAndFill({
		src,
		alt
	}));
};
//#endregion
//#region src/upload.ts
var uploadConfig = $ctx({
	uploader: defaultUploader,
	enableHtmlFileUploader: false,
	uploadWidgetFactory: (pos, spec) => {
		const widgetDOM = document.createElement("span");
		widgetDOM.textContent = "Upload in progress...";
		return Decoration.widget(pos, widgetDOM, spec);
	}
}, "uploadConfig");
uploadConfig.meta = {
	package: "@milkdown/plugin-upload",
	displayName: "Ctx<uploadConfig>"
};
var uploadPlugin = $prose((ctx) => {
	const pluginKey = new PluginKey("MILKDOWN_UPLOAD");
	const findPlaceholder = (state, id) => {
		const decorations = pluginKey.getState(state);
		if (!decorations) return -1;
		const found = decorations.find(void 0, void 0, (spec) => spec.id === id);
		if (!found.length) return -1;
		return found[0]?.from ?? -1;
	};
	const handleUpload = (view, event, files) => {
		if (!files || files.length <= 0) return false;
		const id = Symbol("upload symbol");
		const schema = ctx.get(schemaCtx);
		const { uploader, getInsertPos } = ctx.get(uploadConfig.key);
		const { tr } = view.state;
		const defaultInsertPos = event instanceof DragEvent ? view.posAtCoords({
			left: event.clientX,
			top: event.clientY
		})?.pos ?? tr.selection.from : tr.selection.from;
		const insertPos = typeof getInsertPos === "function" ? getInsertPos(event, ctx, defaultInsertPos) : defaultInsertPos;
		view.dispatch(tr.setMeta(pluginKey, { add: {
			id,
			pos: insertPos
		} }));
		uploader(files, schema, ctx, insertPos).then((fragment) => {
			const pos = findPlaceholder(view.state, id);
			if (pos < 0) return;
			view.dispatch(view.state.tr.replaceWith(pos, pos, fragment).setMeta(pluginKey, { remove: { id } }));
		}).catch((e) => {
			console.error(e);
		});
		return true;
	};
	return new Plugin({
		key: pluginKey,
		state: {
			init() {
				return DecorationSet.empty;
			},
			apply(tr, set) {
				const _set = set.map(tr.mapping, tr.doc);
				const action = tr.getMeta(this);
				if (!action) return _set;
				if (action.add) {
					const { uploadWidgetFactory } = ctx.get(uploadConfig.key);
					const decoration = uploadWidgetFactory(action.add.pos, { id: action.add.id });
					return _set.add(tr.doc, [decoration]);
				}
				if (action.remove) {
					const target = _set.find(void 0, void 0, (spec) => spec.id === action.remove.id);
					return _set.remove(target);
				}
				return _set;
			}
		},
		props: {
			decorations(state) {
				return this.getState(state);
			},
			handlePaste: (view, event) => {
				const { enableHtmlFileUploader } = ctx.get(uploadConfig.key);
				if (!(event instanceof ClipboardEvent)) return false;
				if (!enableHtmlFileUploader && event.clipboardData?.getData("text/html")) return false;
				return handleUpload(view, event, event.clipboardData?.files);
			},
			handleDrop: (view, event) => {
				if (!(event instanceof DragEvent)) return false;
				return handleUpload(view, event, event.dataTransfer?.files);
			}
		}
	});
});
uploadPlugin.meta = {
	package: "@milkdown/plugin-upload",
	displayName: "Prose<upload>"
};
//#endregion
//#region src/index.ts
var upload = [uploadConfig, uploadPlugin];

export { defaultUploader, readImageAsBase64, upload, uploadConfig, uploadPlugin };
//# sourceMappingURL=milkdown_plugin_upload.js.map
