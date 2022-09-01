import { findParentNodeOfTypeClosestToPos } from '@curvenote/prosemirror-utils';
import { nodeNames } from '@curvenote/schema';
import type { EditorState } from 'prosemirror-state';
import { NodeSelection, Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const key = new PluginKey('state');

export const getPluginState = (state?: EditorState | null): boolean => {
  if (state == null) return false;
  const plugin = key.get(state);
  return plugin?.getState(state) ?? false;
};

function findParentBlock(state: EditorState) {
  if (
    state.selection instanceof NodeSelection &&
    state.selection.node.type.name === nodeNames.block
  ) {
    return {
      pos: state.selection.from,
      node: state.selection.node,
    };
  }

  return findParentNodeOfTypeClosestToPos(
    state.selection.$from,
    state.schema.nodes[nodeNames.block],
  );
}

function getSelectedBlockState(state: EditorState) {
  const result = findParentBlock(state);
  return result;
}

function getState(state: EditorState) {
  return {
    selectedBlock: getSelectedBlockState(state),
  };
}

function createDecorations(state: EditorState) {
  const parentBlock = findParentBlock(state);
  if (!parentBlock) return DecorationSet.empty;
  return DecorationSet.create(state.doc, [
    Decoration.node(parentBlock.pos, parentBlock.pos + parentBlock.node.nodeSize, {
      selected: 'true', // can this be technically anything
    }),
  ]);
}

export const statePlugin = (): Plugin => {
  const plugin: Plugin = new Plugin({
    key,
    props: {
      decorations(state) {
        return this.getState(state).decorations;
      },
      handleClickOn(view, pos, node, nodePos, event, direct) {
        // drect makes sure only directly clicking on a node to set the selection
        if (direct && node.type.name === 'block' && !(event.target instanceof HTMLButtonElement)) {
          view.dispatch(
            view.state.tr
              .setSelection(new NodeSelection(view.state.doc.resolve(nodePos)))
              .scrollIntoView(),
          );
          return true; // prevent default from happening if returns true
        }
      },
      handleDOMEvents: {
        mouseover(this, view, event) {
          // console.log('mouseenter', view.posAtDOM(event.target as HTMLElement, 0));
        },
        mouseout(this, view, event) {
          // console.log('mouseleave', view.posAtDOM(event.target as HTMLElement, 0));
        },
      },
    },
    state: {
      init: (config, state) => {
        const parentBlock = findParentBlock(state);
        if (!parentBlock) return { decorations: DecorationSet.empty, state: null };
        return { decorations: createDecorations(state), state: getState(state) };
      },
      apply(tr, value, oldState, newState) {
        const parentBlock = findParentBlock(newState);
        if (!parentBlock) {
          return { decorations: DecorationSet.empty, state: null };
        }
        return {
          decorations: createDecorations(newState),
          state: getState(newState),
        };
      },
      toJSON(state) {
        return state;
      },
    },
  });
  return plugin;
};
