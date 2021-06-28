var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
import { getSuggestion } from '../selectors';
import { insertInlineNode, insertVariable } from '../../actions/editor';
import { variableTrigger, SuggestionKind } from '../types';
import { KEEP_SELECTION_ALIVE, cancelSuggestion } from '../../../prosemirror/plugins/suggestion';
var getFirstSuggestion = function (kind) {
    var _a;
    var title = (_a = {},
        _a[SuggestionKind.variable] = 'Create Variable',
        _a[SuggestionKind.display] = 'Create Dynamic Display',
        _a);
    return {
        id: 'FINISHED',
        name: title[kind],
        description: 'Enter a value or expression. Select the variables below to add them to your expression.',
    };
};
export var startingSuggestions = function (kind, getState) { return __spreadArray([
    getFirstSuggestion(kind)
], Object.entries(getState().runtime.variables).map(function (_a) {
    var variable = _a[1];
    return variable;
})); };
function createVariable(schema, dispatch, trigger, search) {
    var _a, _b;
    var name = (_b = (_a = trigger.match(variableTrigger)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : 'myVar';
    var match = search.match(/^\s?(\$?\d+.?[\d]*)$/);
    if (!match) {
        dispatch(insertVariable(schema, { name: name, valueFunction: search.trim() }));
        return true;
    }
    var dollars = match[1].indexOf('$') !== -1 ? '$,' : '';
    var number = match[1].replace('$', '');
    var decimals = number.split('.');
    var numDecimals = decimals.length === 1 ? 0 : decimals[1].length;
    dispatch(insertVariable(schema, { name: name, value: number, format: dollars + "." + numDecimals + "f" }));
    return true;
}
function createDisplay(schema, dispatch, search) {
    var valueFunction = (search.endsWith('}}') ? search.slice(0, -2) : search).trim();
    dispatch(insertInlineNode(schema.nodes.display, { valueFunction: valueFunction }));
    return true;
}
export function chooseSelection(kind, result) {
    return function (dispatch, getState) {
        var _a;
        var _b = getSuggestion(getState()), view = _b.view, _c = _b.range, from = _c.from, to = _c.to, trigger = _b.trigger, search = _b.search;
        if (view == null || search == null)
            return false;
        if (result.id !== 'FINISHED') {
            var tr = view.state.tr;
            tr.insertText((_a = result.name) !== null && _a !== void 0 ? _a : '');
            view.dispatch(tr);
            return KEEP_SELECTION_ALIVE;
        }
        var removeText = function () {
            var tr = view.state.tr;
            tr.insertText('', from, to);
            view.dispatch(tr);
            return true;
        };
        var schema = view.state.schema;
        removeText();
        switch (kind) {
            case SuggestionKind.variable:
                return createVariable(schema, dispatch, trigger, search);
            case SuggestionKind.display:
                return createDisplay(schema, dispatch, search);
            default:
                throw new Error('Unknown suggestion kind.');
        }
    };
}
export function filterResults(kind, schema, search, dispatch, getState, callback) {
    if (kind === SuggestionKind.display && search.endsWith('}}')) {
        cancelSuggestion(getState().editor.suggestion.view);
        setTimeout(function () { return dispatch(chooseSelection(kind, getFirstSuggestion(kind))); }, 5);
        return;
    }
    setTimeout(function () {
        var results = __spreadArray([
            getFirstSuggestion(kind)
        ], Object.entries(getState().runtime.variables).map(function (_a) {
            var variable = _a[1];
            return variable;
        }));
        callback(results);
    }, 1);
}
//# sourceMappingURL=variable.js.map