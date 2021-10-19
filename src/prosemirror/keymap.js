import { wrapIn, setBlockType, chainCommands, toggleMark, exitCode, joinUp, joinDown, lift, selectParentNode, } from 'prosemirror-commands';
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { undo, redo } from 'prosemirror-history';
import { undoInputRule } from 'prosemirror-inputrules';
import { store, opts } from '../connect';
import { focusSelectedEditorView } from '../store/ui/actions';
import { executeCommand } from '../store/actions';
import { CommandNames } from '../store/suggestion/commands';
import { createId } from '../utils';
var mac = typeof navigator !== 'undefined' ? /Mac/.test(navigator.platform) : false;
export function buildBasicKeymap(schema, bind) {
    var keys = {};
    var ourBind = bind !== null && bind !== void 0 ? bind : (function (key, cmd) {
        keys[key] = cmd;
    });
    if (schema.marks.strong) {
        ourBind('Mod-b', toggleMark(schema.marks.strong));
        ourBind('Mod-B', toggleMark(schema.marks.strong));
    }
    if (schema.marks.em) {
        ourBind('Mod-i', toggleMark(schema.marks.em));
        ourBind('Mod-I', toggleMark(schema.marks.em));
    }
    if (schema.marks.underline) {
        ourBind('Mod-u', toggleMark(schema.marks.underline));
        ourBind('Mod-U', toggleMark(schema.marks.underline));
    }
    if (schema.marks.code)
        ourBind('Mod-C', toggleMark(schema.marks.code));
    if (schema.marks.link) {
        var addLink = function () {
            var viewId = store.getState().editor.ui.viewId;
            store.dispatch(executeCommand(CommandNames.link, viewId));
            return true;
        };
        ourBind('Mod-k', addLink);
        ourBind('Mod-K', addLink);
    }
    return keys;
}
export function buildKeymap(stateKey, schema) {
    var keys = {};
    var bind = function (key, cmd) {
        keys[key] = cmd;
    };
    var allUndo = chainCommands(undoInputRule, undo);
    bind('Mod-z', allUndo);
    bind('Backspace', undoInputRule);
    bind('Mod-Z', redo);
    if (!mac)
        bind('Mod-y', redo);
    bind('Alt-ArrowUp', joinUp);
    bind('Alt-ArrowDown', joinDown);
    bind('Mod-BracketLeft', lift);
    bind('Escape', chainCommands(undoInputRule, selectParentNode, function () {
        store.dispatch(focusSelectedEditorView(false));
        return true;
    }));
    bind('Shift-Escape', chainCommands(undoInputRule, function () {
        store.dispatch(focusSelectedEditorView(false));
        return true;
    }));
    buildBasicKeymap(schema, bind);
    if (schema.nodes.blockquote)
        bind('Ctrl->', wrapIn(schema.nodes.blockquote));
    if (schema.nodes.hard_break) {
        var br_1 = schema.nodes.hard_break;
        var cmd = chainCommands(exitCode, function (state, dispatch) {
            if (dispatch === undefined)
                return false;
            dispatch(state.tr.replaceSelectionWith(br_1.create()).scrollIntoView());
            return true;
        });
        bind('Mod-Enter', cmd);
        bind('Shift-Enter', cmd);
        if (mac)
            bind('Ctrl-Enter', cmd);
    }
    if (schema.nodes.list_item) {
        bind('Enter', splitListItem(schema.nodes.list_item));
        bind('Mod-Shift-7', chainCommands(liftListItem(schema.nodes.list_item), wrapInList(schema.nodes.ordered_list)));
        bind('Mod-Shift-8', chainCommands(liftListItem(schema.nodes.list_item), wrapInList(schema.nodes.bullet_list)));
        var cmdLift = liftListItem(schema.nodes.list_item);
        var cmdSink = sinkListItem(schema.nodes.list_item);
        bind('Shift-Tab', cmdLift);
        bind('Mod-[', cmdLift);
        bind('Tab', cmdSink);
        bind('Mod-]', cmdSink);
    }
    if (schema.nodes.paragraph)
        bind('Mod-Alt-0', setBlockType(schema.nodes.paragraph));
    if (schema.nodes.heading) {
        for (var i = 1; i <= 6; i += 1) {
            bind("Mod-Alt-" + i, setBlockType(schema.nodes.heading, { level: i, id: createId() }));
        }
    }
    if (schema.nodes.horizontal_rule) {
        var hr_1 = schema.nodes.horizontal_rule;
        bind('Mod-_', function (state, dispatch) {
            if (dispatch === undefined)
                return false;
            dispatch(state.tr.replaceSelectionWith(hr_1.create()).scrollIntoView());
            return true;
        });
    }
    bind('Mod-Alt-c', function (state, dispatch) { return dispatch !== undefined && opts.addComment(stateKey, state); });
    bind('Mod-Alt-m', function (state, dispatch) { return dispatch !== undefined && opts.addComment(stateKey, state); });
    return keys;
}
export function captureTab() {
    var capture = function () { return true; };
    var keys = {
        'Shift-Tab': capture,
        Tab: capture,
    };
    return keys;
}
//# sourceMappingURL=keymap.js.map