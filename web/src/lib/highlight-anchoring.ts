/**
 * Utilities for anchoring text highlights to DOM positions.
 *
 * Anchors are stored as:
 *   - path: CSS selector to the nearest element ancestor (skipping <mark> wrappers)
 *   - offset: character offset within that element's textContent
 *
 * This approach is robust against DOM modifications from highlight <mark> elements
 * because character offsets within an element's textContent are stable regardless
 * of how the text nodes are split or wrapped.
 */

/**
 * Compute a highlight anchor (element path + character offset) for a DOM position.
 * Skips <mark> elements so paths are always relative to the "clean" DOM structure.
 */
export function computeAnchor(
  node: Node,
  offset: number,
  root: HTMLElement,
): { path: string; offset: number } {
  // Find the nearest non-mark element ancestor
  let element: Element | null =
    node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);

  while (element && isHighlightMark(element)) {
    element = element.parentElement;
  }

  if (!element || !root.contains(element)) {
    return { path: "", offset: 0 };
  }

  // Compute character offset within this element's textContent
  const charOffset = computeCharOffset(element, node, offset);
  const path = computeElementPath(element, root);

  return { path, offset: charOffset };
}

/**
 * Resolve a highlight anchor back to a DOM position { node, offset }.
 * Works correctly whether or not <mark> elements are present in the DOM.
 */
export function resolveAnchor(
  path: string,
  charOffset: number,
  root: HTMLElement,
): { node: Node; offset: number } | null {
  const element = resolveElementPath(path, root);
  if (!element) return null;

  // Walk all text nodes within this element, counting characters
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = charOffset;
  let textNode = walker.nextNode();

  while (textNode) {
    const len = textNode.textContent?.length ?? 0;
    if (remaining <= len) {
      return { node: textNode, offset: remaining };
    }
    remaining -= len;
    textNode = walker.nextNode();
  }

  return null;
}

/**
 * Create a DOM Range from serialized highlight anchor data.
 */
export function createHighlightRange(
  startPath: string,
  startOffset: number,
  endPath: string,
  endOffset: number,
  root: HTMLElement,
): Range | null {
  const start = resolveAnchor(startPath, startOffset, root);
  const end = resolveAnchor(endPath, endOffset, root);

  if (!start || !end) return null;

  try {
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
  } catch {
    return null;
  }
}

/**
 * Apply a highlight to a Range by wrapping text nodes in <mark> elements.
 * Handles cross-element ranges by wrapping each text node segment individually.
 */
export function applyHighlightMark(
  range: Range,
  highlightId: number,
  color: string,
  root: HTMLElement,
): void {
  const textNodes = getTextNodesInRange(range, root);

  for (const textNode of textNodes) {
    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(textNode);

    if (textNode === range.startContainer) {
      nodeRange.setStart(textNode, range.startOffset);
    }
    if (textNode === range.endContainer) {
      nodeRange.setEnd(textNode, range.endOffset);
    }

    if (nodeRange.collapsed) continue;

    const mark = document.createElement("mark");
    mark.dataset.highlightId = String(highlightId);
    mark.className = `highlight-${color}`;

    try {
      nodeRange.surroundContents(mark);
    } catch {
      // surroundContents can fail on partially-selected nodes; skip
    }
  }
}

/**
 * Remove all highlight <mark> elements from the root, restoring text nodes.
 */
export function clearAllHighlightMarks(root: HTMLElement): void {
  const marks = root.querySelectorAll("mark[data-highlight-id]");
  marks.forEach((mark) => {
    const parent = mark.parentNode!;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
  root.normalize();
}

// ---- Internal helpers ----

function isHighlightMark(el: Element): boolean {
  return el.tagName === "MARK" && el.hasAttribute("data-highlight-id");
}

/**
 * Compute character offset of a position (node + offset) within an element's textContent.
 * Walks all descendant text nodes in order, summing lengths until reaching the target.
 */
function computeCharOffset(
  element: Element,
  targetNode: Node,
  targetOffset: number,
): number {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let textNode = walker.nextNode();

  while (textNode) {
    if (textNode === targetNode) {
      return charCount + targetOffset;
    }
    charCount += textNode.textContent?.length ?? 0;
    textNode = walker.nextNode();
  }

  // If targetNode is the element itself (offset = child index), sum text up to that child
  if (targetNode === element) {
    let count = 0;
    for (let i = 0; i < targetOffset && i < element.childNodes.length; i++) {
      count += element.childNodes[i].textContent?.length ?? 0;
    }
    return count;
  }

  return charCount;
}

/**
 * Compute CSS selector path from an element up to (not including) root.
 * Skips <mark> highlight elements — they are treated as transparent wrappers.
 */
function computeElementPath(element: Element, root: HTMLElement): string {
  if (element === root) return "";

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== root) {
    // Skip highlight marks
    if (isHighlightMark(current)) {
      current = current.parentElement;
      continue;
    }

    const parent = current.parentElement;
    if (!parent) break;

    const tag = current.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(
      (el) => el.tagName.toLowerCase() === tag && !isHighlightMark(el),
    );

    if (siblings.length > 1) {
      const idx = siblings.indexOf(current) + 1;
      parts.unshift(`${tag}:nth-of-type(${idx})`);
    } else {
      parts.unshift(tag);
    }

    current = parent;
  }

  return parts.join(" > ");
}

/**
 * Resolve a CSS path to an element within root.
 * Uses :scope > to ensure the path is anchored to root's direct children,
 * preventing depth-first matches of nested elements with the same selector.
 */
function resolveElementPath(path: string, root: HTMLElement): Element | null {
  if (!path) return root;
  return root.querySelector(`:scope > ${path}`) ?? root.querySelector(path);
}

/**
 * Get all text nodes within a Range, in document order.
 */
function getTextNodesInRange(range: Range, root: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let node: Node | null = walker.nextNode();
  while (node) {
    if (range.intersectsNode(node)) {
      textNodes.push(node as Text);
    }
    node = walker.nextNode();
  }
  return textNodes;
}
