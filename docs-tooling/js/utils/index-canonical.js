function collectChildren(node, byId) {
  if (!node.children) {
    return [];
  }
  const children = [];
  for (const childId of node.children) {
    const child = byId.get(childId);
    if (child) {
      children.push(child);
    }
  }
  return children;
}

export function buildCanonicalIndex(bundle) {
  const byId = new Map();
  for (const node of bundle.nodes || []) {
    byId.set(node.id, node);
  }

  const childrenOf = new Map();
  const parentOf = new Map();
  for (const node of bundle.nodes || []) {
    const children = collectChildren(node, byId);
    childrenOf.set(node.id, children);
    for (const child of children) {
      if (!parentOf.has(child.id)) {
        parentOf.set(child.id, node);
      }
    }
  }

  const roots = (bundle.roots || [])
    .map((id) => byId.get(id))
    .filter(Boolean);

  return {
    byId,
    childrenOf,
    parentOf,
    roots,
  };
}
