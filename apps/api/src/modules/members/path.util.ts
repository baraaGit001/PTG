/**
 * Materialized-path helpers shared by SponsorRelationship and
 * PlacementRelationship. `path` is the dot-delimited chain of *ancestor* ids
 * (never including the node itself), always starting and ending with a dot,
 * e.g. root -> ".", root's child -> ".<rootId>.".
 */
export interface PathLocation {
  path: string;
  depth: number;
}

export const ROOT_LOCATION: PathLocation = { path: '.', depth: 0 };

export function computeChildLocation(parent: PathLocation, parentId: string): PathLocation {
  return { path: `${parent.path}${parentId}.`, depth: parent.depth + 1 };
}

/** Prefix every descendant of `node` (with the given id) must start with. */
export function descendantPrefix(node: PathLocation, nodeId: string): string {
  return `${node.path}${nodeId}.`;
}

/** True when `candidate` sits at or below `ancestor` (with id `ancestorId`) in the tree. */
export function isWithinSubtree(ancestor: PathLocation, ancestorId: string, candidate: PathLocation, candidateId: string): boolean {
  if (candidateId === ancestorId) return true;
  return candidate.path.startsWith(descendantPrefix(ancestor, ancestorId));
}

/** Rewrites a descendant's location after its subtree root moved from `oldLocation` to `newLocation`. */
export function rebasePath(
  descendantPath: string,
  descendantDepth: number,
  oldNode: PathLocation,
  oldNodeId: string,
  newNode: PathLocation,
  newNodeId: string,
): PathLocation {
  const oldPrefix = descendantPrefix(oldNode, oldNodeId);
  const newPrefix = descendantPrefix(newNode, newNodeId);
  const suffix = descendantPath.slice(oldPrefix.length);
  const depthDelta = newNode.depth + 1 - (oldNode.depth + 1);
  return { path: `${newPrefix}${suffix}`, depth: descendantDepth + depthDelta };
}
