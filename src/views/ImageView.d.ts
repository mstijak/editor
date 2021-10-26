import { Node } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { GetPos } from './types';
declare class ImageView {
    dom: HTMLImageElement;
    node: Node;
    view: EditorView;
    getPos?: GetPos;
    constructor(node: Node, view: EditorView, getPos: GetPos);
    selectNode(): void;
    deselectNode(): void;
}
export default ImageView;
