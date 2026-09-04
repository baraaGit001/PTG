import { ROOT_LOCATION, computeChildLocation, descendantPrefix, isWithinSubtree, rebasePath } from '../src/modules/members/path.util.js';

describe('materialized-path tree helpers (sponsor/placement trees)', () => {
  it('computes a root location', () => {
    expect(ROOT_LOCATION).toEqual({ path: '.', depth: 0 });
  });

  it('computes a child location under root', () => {
    const child = computeChildLocation(ROOT_LOCATION, 'root-id');
    expect(child).toEqual({ path: '.root-id.', depth: 1 });
  });

  it('computes a grandchild location', () => {
    const child = computeChildLocation(ROOT_LOCATION, 'a');
    const grandchild = computeChildLocation(child, 'b');
    expect(grandchild).toEqual({ path: '.a.b.', depth: 2 });
  });

  it('builds the descendant prefix used for the indexed subtree query', () => {
    const node = { path: '.a.', depth: 1 };
    expect(descendantPrefix(node, 'b')).toBe('.a.b.');
  });

  it('detects when a candidate sits within a subtree, including the root itself', () => {
    const root = { path: '.', depth: 0 };
    const child = { path: '.root.', depth: 1 };
    expect(isWithinSubtree(root, 'root', root, 'root')).toBe(true);
    expect(isWithinSubtree(root, 'root', child, 'child')).toBe(true);
  });

  it('detects when a candidate sits outside a subtree - the circular-relationship guard', () => {
    const branchA = { path: '.root.', depth: 1 };
    const branchB = { path: '.root.', depth: 1 };
    expect(isWithinSubtree(branchA, 'a', branchB, 'b')).toBe(false);
  });

  it('rebases a direct child of the moved member', () => {
    // memberX moves from directly under root to directly under newParent (itself under root).
    // A direct child of memberX has `path` == memberX's own descendant prefix, ".root.memberX.".
    const oldMemberXLocation = { path: '.root.', depth: 1 };
    const newParent = { path: '.root.', depth: 1 };
    const newMemberXLocation = computeChildLocation(newParent, 'newParent');
    const rebased = rebasePath('.root.memberX.', 2, oldMemberXLocation, 'memberX', newMemberXLocation, 'memberX');
    expect(rebased).toEqual({ path: '.root.newParent.memberX.', depth: 3 });
  });

  it('rebases a grandchild of the moved member, preserving the suffix below it', () => {
    const oldMemberXLocation = { path: '.root.', depth: 1 };
    const newParent = { path: '.root.', depth: 1 };
    const newMemberXLocation = computeChildLocation(newParent, 'newParent');
    // grandchild's own `path` is ".root.memberX.child." at depth 3.
    const rebased = rebasePath('.root.memberX.child.', 3, oldMemberXLocation, 'memberX', newMemberXLocation, 'memberX');
    expect(rebased).toEqual({ path: '.root.newParent.memberX.child.', depth: 4 });
  });
});
