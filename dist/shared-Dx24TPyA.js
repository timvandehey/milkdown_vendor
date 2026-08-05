import { Plugin } from './milkdown_prose_state.js';

var base = {
  8: "Backspace",
  9: "Tab",
  10: "Enter",
  12: "NumLock",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  44: "PrintScreen",
  45: "Insert",
  46: "Delete",
  59: ";",
  61: "=",
  91: "Meta",
  92: "Meta",
  106: "*",
  107: "+",
  108: ",",
  109: "-",
  110: ".",
  111: "/",
  144: "NumLock",
  145: "ScrollLock",
  160: "Shift",
  161: "Shift",
  162: "Control",
  163: "Control",
  164: "Alt",
  165: "Alt",
  173: "-",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
};

var shift = {
  48: ")",
  49: "!",
  50: "@",
  51: "#",
  52: "$",
  53: "%",
  54: "^",
  55: "&",
  56: "*",
  57: "(",
  59: ":",
  61: "+",
  173: "_",
  186: ":",
  187: "+",
  188: "<",
  189: "_",
  190: ">",
  191: "?",
  192: "~",
  219: "{",
  220: "|",
  221: "}",
  222: "\""
};

var mac$1 = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
var ie = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);

// Fill in the digit keys
for (var i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i);

// The function keys
for (var i = 1; i <= 24; i++) base[i + 111] = "F" + i;

// And the alphabetic keys
for (var i = 65; i <= 90; i++) {
  base[i] = String.fromCharCode(i + 32);
  shift[i] = String.fromCharCode(i);
}

// For each code that doesn't have a shift-equivalent, copy the base name
for (var code in base) if (!shift.hasOwnProperty(code)) shift[code] = base[code];

function keyName(event) {
  // On macOS, keys held with Shift and Cmd don't reflect the effect of Shift in `.key`.
  // On IE, shift effect is never included in `.key`.
  var ignoreKey = mac$1 && event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey ||
      ie && event.shiftKey && event.key && event.key.length == 1 ||
      event.key == "Unidentified";
  var name = (!ignoreKey && event.key) ||
    (event.shiftKey ? shift : base)[event.keyCode] ||
    event.key || "Unidentified";
  // Edge sometimes produces wrong names (Issue #3)
  if (name == "Esc") name = "Escape";
  if (name == "Del") name = "Delete";
  // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8860571/
  if (name == "Left") name = "ArrowLeft";
  if (name == "Up") name = "ArrowUp";
  if (name == "Right") name = "ArrowRight";
  if (name == "Down") name = "ArrowDown";
  return name
}

const mac = typeof navigator != "undefined" && /Mac|iP(hone|[oa]d)/.test(navigator.platform);
const windows = typeof navigator != "undefined" && /Win/.test(navigator.platform);
function normalizeKeyName(name) {
    let parts = name.split(/-(?!$)/), result = parts[parts.length - 1];
    if (result == "Space")
        result = " ";
    let alt, ctrl, shift, meta;
    for (let i = 0; i < parts.length - 1; i++) {
        let mod = parts[i];
        if (/^(cmd|meta|m)$/i.test(mod))
            meta = true;
        else if (/^a(lt)?$/i.test(mod))
            alt = true;
        else if (/^(c|ctrl|control)$/i.test(mod))
            ctrl = true;
        else if (/^s(hift)?$/i.test(mod))
            shift = true;
        else if (/^mod$/i.test(mod)) {
            if (mac)
                meta = true;
            else
                ctrl = true;
        }
        else
            throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt)
        result = "Alt-" + result;
    if (ctrl)
        result = "Ctrl-" + result;
    if (meta)
        result = "Meta-" + result;
    if (shift)
        result = "Shift-" + result;
    return result;
}
function normalize(map) {
    let copy = Object.create(null);
    for (let prop in map)
        copy[normalizeKeyName(prop)] = map[prop];
    return copy;
}
function modifiers(name, event, shift = true) {
    if (event.altKey)
        name = "Alt-" + name;
    if (event.ctrlKey)
        name = "Ctrl-" + name;
    if (event.metaKey)
        name = "Meta-" + name;
    if (shift && event.shiftKey)
        name = "Shift-" + name;
    return name;
}
/**
Create a keymap plugin for the given set of bindings.

Bindings should map key names to [command](https://prosemirror.net/docs/ref/#commands)-style
functions, which will be called with `(EditorState, dispatch,
EditorView)` arguments, and should return true when they've handled
the key. Note that the view argument isn't part of the command
protocol, but can be used as an escape hatch if a binding needs to
directly interact with the UI.

Key names may be strings like `"Shift-Ctrl-Enter"`—a key
identifier prefixed with zero or more modifiers. Key identifiers
are based on the strings that can appear in
[`KeyEvent.key`](https:developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key).
Use lowercase letters to refer to letter keys (or uppercase letters
if you want shift to be held). You may use `"Space"` as an alias
for the `" "` name.

Modifiers can be given in any order. `Shift-` (or `s-`), `Alt-` (or
`a-`), `Ctrl-` (or `c-` or `Control-`) and `Cmd-` (or `m-` or
`Meta-`) are recognized. For characters that are created by holding
shift, the `Shift-` prefix is implied, and should not be added
explicitly.

You can use `Mod-` as a shorthand for `Cmd-` on Mac and `Ctrl-` on
other platforms.

You can add multiple keymap plugins to an editor. The order in
which they appear determines their precedence (the ones early in
the array get to dispatch first).
*/
function keymap(bindings) {
    return new Plugin({ props: { handleKeyDown: keydownHandler(bindings) } });
}
/**
Given a set of bindings (using the same format as
[`keymap`](https://prosemirror.net/docs/ref/#keymap.keymap)), return a [keydown
handler](https://prosemirror.net/docs/ref/#view.EditorProps.handleKeyDown) that handles them.
*/
function keydownHandler(bindings) {
    let map = normalize(bindings);
    return function (view, event) {
        let name = keyName(event), baseName, direct = map[modifiers(name, event)];
        if (direct && direct(view.state, view.dispatch, view))
            return true;
        // A character key
        if (name.length == 1 && name != " ") {
            if (event.shiftKey) {
                // In case the name was already modified by shift, try looking
                // it up without its shift modifier
                let noShift = map[modifiers(name, event, false)];
                if (noShift && noShift(view.state, view.dispatch, view))
                    return true;
            }
            if ((event.altKey || event.metaKey || event.ctrlKey) &&
                // Ctrl-Alt may be used for AltGr on Windows
                !(windows && event.ctrlKey && event.altKey) &&
                (baseName = base[event.keyCode]) && baseName != name) {
                // Try falling back to the keyCode when there's a modifier
                // active or the character produced isn't ASCII, and our table
                // produces a different name from the the keyCode. See #668,
                // #1060, #1529.
                let fromCode = map[modifiers(baseName, event)];
                if (fromCode && fromCode(view.state, view.dispatch, view))
                    return true;
            }
        }
        return false;
    };
}

export { keymap as a, base as b, keydownHandler as c, keyName as k, shift as s };
//# sourceMappingURL=shared-Dx24TPyA.js.map
