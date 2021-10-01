/**
 * Reference: https://prosemirror.net/examples/codemirror/
 */

import React, { useEffect } from 'react';
import { render } from 'react-dom';
import { FormControl, Select as MuiSelect, MenuItem, InputLabel, styled } from '@material-ui/core';
import CodeMirror from 'codemirror';
import { exitCode } from 'prosemirror-commands';
import { NodeView } from 'prosemirror-view';
import { undo, redo } from 'prosemirror-history';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/mode/python/python';
import { Selection, TextSelection } from 'prosemirror-state';

function computeChange(oldVal: any, newVal: any) {
  if (oldVal === newVal) return null;
  let start = 0;
  let oldEnd = oldVal.length;
  let newEnd = newVal.length;
  while (start < oldEnd && oldVal.charCodeAt(start) === newVal.charCodeAt(start)) ++start;
  while (
    oldEnd > start &&
    newEnd > start &&
    oldVal.charCodeAt(oldEnd - 1) === newVal.charCodeAt(newEnd - 1)
  ) {
    oldEnd--;
    newEnd--;
  }
  return { from: start, to: oldEnd, text: newVal.slice(start, newEnd) };
}

const SUPPORTED_LANGUAGE = [
  { name: 'javascript', label: 'JavaScript' },
  { name: 'jsx', label: 'JSX' },
  { name: 'python', label: 'Python' },
];

const Select = styled(MuiSelect)(() => ({
  '& .MuiSelect-select': {
    padding: 2,
  },
}));

function LanguageSeletionDropdown({ onChanged }: { onChanged: (lang: string) => void }) {
  const [selectedLanguage, setSelectedLanguage] = React.useState(SUPPORTED_LANGUAGE[0].name);
  return (
    <FormControl fullWidth>
      <Select
        onChange={(e) => {
          const value = e.target.value as string;
          setSelectedLanguage(value);
          onChanged(value);
        }}
        value={selectedLanguage}
      >
        {SUPPORTED_LANGUAGE.map(({ name, label }) => (
          <MenuItem key={name} value={name}>
            {label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default class CodeBlockView implements NodeView {
  view: any;

  node: any;

  getPos: any;

  incomingChanges: boolean;

  cm: any;

  dom: any;

  updating: boolean;

  constructor(node: any, view: any, getPos: any) {
    // Store for later
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.incomingChanges = false;
    // Create a CodeMirror instance
    const container = document.createElement('div');
    container.classList.add('codeblock-container');
    this.cm = new (CodeMirror as any)(container, {
      value: this.node.textContent,
      lineNumbers: true,
      extraKeys: this.codeMirrorKeymap(),
    });

    // The editor's outer node is our DOM representation
    this.dom = container;
    const dropdownContainer = document.createElement('div');
    dropdownContainer.classList.add('CodeMirror-dropdown-wrapper');
    container.append(dropdownContainer);
    render(
      <LanguageSeletionDropdown
        onChanged={(language) => {
          this.cm.setOption('mode', language);
        }}
      />,
      dropdownContainer,
    );
    // CodeMirror needs to be in the DOM to properly initialize, so
    // schedule it to update itself
    setTimeout(() => this.cm.refresh(), 20);

    // This flag is used to avoid an update loop between the outer and
    // inner editor
    this.updating = false;
    // Track whether changes are have been made but not yet propagated
    this.cm.on('beforeChange', () => {
      this.incomingChanges = true;
    });
    // Propagate updates from the code editor to ProseMirror
    this.cm.on('cursorActivity', () => {
      if (!this.updating && !this.incomingChanges) this.forwardSelection();
    });
    this.cm.on('changes', () => {
      if (!this.updating) {
        this.valueChanged();
        this.forwardSelection();
      }
      this.incomingChanges = false;
    });
    this.cm.on('focus', () => this.forwardSelection());
  }

  forwardSelection() {
    if (!this.cm.hasFocus()) return;
    const { state } = this.view;
    const selection = this.asProseMirrorSelection(state.doc);
    if (!selection.eq(state.selection)) this.view.dispatch(state.tr.setSelection(selection));
  }

  asProseMirrorSelection(doc: any) {
    const offset = this.getPos() + 1;
    const anchor = this.cm.indexFromPos(this.cm.getCursor('anchor')) + offset;
    const head = this.cm.indexFromPos(this.cm.getCursor('head')) + offset;
    return TextSelection.create(doc, anchor, head);
  }

  setSelection(anchor: any, head: any) {
    this.cm.focus();
    this.updating = true;
    this.cm.setSelection(this.cm.posFromIndex(anchor), this.cm.posFromIndex(head));
    this.updating = false;
  }

  valueChanged() {
    const change = computeChange(this.node.textContent, this.cm.getValue());
    if (change) {
      const start = this.getPos() + 1;
      const tr = this.view.state.tr.replaceWith(
        start + change.from,
        start + change.to,
        change.text ? this.view.state.schema.text(change.text) : null,
      );
      this.view.dispatch(tr);
    }
  }

  codeMirrorKeymap() {
    const { view } = this;
    const mod = /Mac/.test(navigator.platform) ? 'Cmd' : 'Ctrl';
    return CodeMirror.normalizeKeyMap({
      Up: () => this.maybeEscape('line', -1),
      Left: () => this.maybeEscape('char', -1),
      Down: () => this.maybeEscape('line', 1),
      Right: () => this.maybeEscape('char', 1),
      'Ctrl-Enter': () => {
        if (exitCode(view.state, view.dispatch)) view.focus();
      },
      [`${mod}-Z`]: () => undo(view.state, view.dispatch),
      [`Shift-${mod}-Z`]: () => redo(view.state, view.dispatch),
      [`${mod}-Y`]: () => redo(view.state, view.dispatch),
    });
  }

  // eslint-disable-next-line consistent-return
  maybeEscape(unit: any, dir: any) {
    const pos = this.cm.getCursor();
    if (
      this.cm.somethingSelected() ||
      pos.line !== (dir < 0 ? this.cm.firstLine() : this.cm.lastLine()) ||
      (unit === 'char' && pos.ch !== (dir < 0 ? 0 : this.cm.getLine(pos.line).length))
    )
      return CodeMirror.Pass;
    this.view.focus();
    const targetPos = this.getPos() + (dir < 0 ? 0 : this.node.nodeSize);
    const selection = Selection.near(this.view.state.doc.resolve(targetPos), dir);
    this.view.dispatch(this.view.state.tr.setSelection(selection).scrollIntoView());
    this.view.focus();
  }

  update(node: any) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    const change = computeChange(this.cm.getValue(), node.textContent);
    if (change) {
      this.updating = true;
      this.cm.replaceRange(
        change.text,
        this.cm.posFromIndex(change.from),
        this.cm.posFromIndex(change.to),
      );
      this.updating = false;
    }
    return true;
  }

  selectNode() {
    this.cm.focus();
  }

  static stopEvent() {
    return true;
  }
}
