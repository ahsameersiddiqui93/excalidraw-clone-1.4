/**
 * core/scene.ts
 * -----------------------------------------------------------------------------
 * Scene-level operations that act on the full element array: z-ordering
 * (layer arrangement) and grouping / ungrouping.
 *
 * The element array order *is* the z-order: index 0 is the back, the last
 * index is the front.
 */

import type { WhiteboardElement } from "../types";
import { generateId } from "../utils/id";
import { mutateElement } from "./element";

/** Layer-ordering operations. */
export type LayerOp = "front" | "back" | "forward" | "backward";

/**
 * Reorder the given selection within the element array according to a layer
 * operation. Returns a new array; the relative order of non-selected elements
 * is preserved.
 */
export function arrangeLayers(
  elements: WhiteboardElement[],
  selectedIds: Set<string>,
  op: LayerOp,
): WhiteboardElement[] {
  const selected = elements.filter((e) => selectedIds.has(e.id));
  const others = elements.filter((e) => !selectedIds.has(e.id));
  if (selected.length === 0) return elements;

  switch (op) {
    case "front":
      return [...others, ...selected];
    case "back":
      return [...selected, ...others];
    case "forward":
      return shiftSelection(elements, selectedIds, 1);
    case "backward":
      return shiftSelection(elements, selectedIds, -1);
    default:
      return elements;
  }
}

/**
 * Move selected elements one step toward front (+1) or back (-1) while keeping
 * everything else stable.
 */
function shiftSelection(
  elements: WhiteboardElement[],
  selectedIds: Set<string>,
  dir: 1 | -1,
): WhiteboardElement[] {
  const arr = [...elements];
  if (dir === 1) {
    // Iterate from back to front so swaps don't cascade.
    for (let i = arr.length - 2; i >= 0; i--) {
      if (selectedIds.has(arr[i].id) && !selectedIds.has(arr[i + 1].id)) {
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      }
    }
  } else {
    for (let i = 1; i < arr.length; i++) {
      if (selectedIds.has(arr[i].id) && !selectedIds.has(arr[i - 1].id)) {
        [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
      }
    }
  }
  return arr;
}

/**
 * Group the selected elements: a fresh group id is appended to the outermost
 * level of each selected element's `groupIds`. Selected elements are also
 * contiguously reordered so the group renders together.
 */
export function groupElements(
  elements: WhiteboardElement[],
  selectedIds: Set<string>,
): { elements: WhiteboardElement[]; groupId: string } {
  const groupId = generateId();
  const selected: WhiteboardElement[] = [];
  const others: WhiteboardElement[] = [];

  for (const el of elements) {
    if (selectedIds.has(el.id)) {
      selected.push(mutateElement(el, { groupIds: [...el.groupIds, groupId] }));
    } else {
      others.push(el);
    }
  }

  // Place the grouped elements at the front, preserving relative order.
  return { elements: [...others, ...selected], groupId };
}

/**
 * Ungroup: remove the outermost (last) group id from each selected element.
 */
export function ungroupElements(
  elements: WhiteboardElement[],
  selectedIds: Set<string>,
): WhiteboardElement[] {
  return elements.map((el) => {
    if (!selectedIds.has(el.id) || el.groupIds.length === 0) return el;
    return mutateElement(el, { groupIds: el.groupIds.slice(0, -1) });
  });
}

/**
 * Given a clicked element, expand a selection to include every element that
 * shares its outermost group. Returns the set of ids that should be selected.
 */
export function expandSelectionByGroup(
  elements: WhiteboardElement[],
  element: WhiteboardElement,
): Set<string> {
  const ids = new Set<string>([element.id]);
  if (element.groupIds.length === 0) return ids;
  const groupId = element.groupIds[element.groupIds.length - 1];
  for (const el of elements) {
    if (el.groupIds.includes(groupId)) ids.add(el.id);
  }
  return ids;
}

/** Whether all selected elements already belong to a common outer group. */
export function selectionSharesGroup(selected: WhiteboardElement[]): boolean {
  if (selected.length < 2) return false;
  const outer = selected[0].groupIds.at(-1);
  if (!outer) return false;
  return selected.every((e) => e.groupIds.at(-1) === outer);
}
