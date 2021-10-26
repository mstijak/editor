import { Node } from 'prosemirror-model';
import { MdFormatSerialize } from '../serialize/types';
import { createLatexStatement } from '../serialize/tex/utils';
import { AlignOptions, CaptionKind, MyNodeSpec, NodeGroups, NumberedNode } from './types';
import { determineCaptionKind } from '../process/utils';
import { getNumberedAttrs, getNumberedDefaultAttrs, setNumberedAttrs } from './utils';
import { nodeNames } from '../types';

export type Attrs = NumberedNode & {
  align: AlignOptions;
};

const figure: MyNodeSpec<Attrs> = {
  group: NodeGroups.block,
  content: NodeGroups.insideFigure,
  attrs: {
    ...getNumberedDefaultAttrs(),
    align: { default: 'center' },
  },
  toDOM(node) {
    const { align } = node.attrs;
    return [
      'figure',
      {
        ...setNumberedAttrs(node.attrs),
        align,
      },
      0,
    ];
  },
  parseDOM: [
    {
      tag: 'figure',
      getAttrs(dom) {
        return {
          ...getNumberedAttrs(dom),
          align: dom.getAttribute('align') ?? 'center',
        };
      },
    },
  ],
};

export const toMarkdown: MdFormatSerialize = (state, node) => {
  state.ensureNewLine();
  const { kind } = node.attrs;
  // TODO: Translate between callout/admonition
  state.write(`\`\`\`{${kind || 'note'}}`);
  state.ensureNewLine();
  state.renderContent(node);
  state.write('```');
  state.closeBlock(node);
};

function nodeToCommand(node: Node) {
  const kind = determineCaptionKind(node);
  switch (kind) {
    case CaptionKind.fig:
      return 'figure';
    case CaptionKind.table:
      return 'table';
    case CaptionKind.code:
      return 'code';
    case CaptionKind.eq:
      return 'figure'; // not sure what to do here.
    default:
      return 'figure';
  }
}

export const toTex = createLatexStatement(
  (opts, node) => {
    return {
      command: nodeToCommand(node),
      bracketOpts: '!htbp',
    };
  },
  (state, node) => {
    const { numbered, id } = node.attrs as Attrs;
    const localId = state.options.localizeId?.(id ?? '') ?? id;
    const star = numbered ? '' : '*';
    // TODO: Based on align attr
    state.write('\\centering');
    const captionFirst = node.firstChild?.type.name === nodeNames.figcaption;
    if (localId && captionFirst) {
      state.ensureNewLine();
      state.write(`\\label${star}{${localId}}`);
    }
    state.ensureNewLine();
    state.renderContent(node);
    if (localId && !captionFirst) {
      state.ensureNewLine();
      state.write(`\\label${star}{${localId}}`);
    }
  },
);

export default figure;