import type { Category } from "./types";

export type CategoryNode = Category & { depth: number };

function groupByParent(categories: Category[]): Map<string | null, Category[]> {
  const byParent = new Map<string | null, Category[]>();
  for (const c of categories) {
    const key = c.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(c);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return byParent;
}

export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byParent = groupByParent(categories);
  const result: CategoryNode[] = [];

  function visit(parentId: string | null, depth: number) {
    for (const child of byParent.get(parentId) ?? []) {
      result.push({ ...child, depth });
      visit(child.id, depth + 1);
    }
  }

  visit(null, 0);
  return result;
}

export function collectCategoryDescendantIds(categories: Category[], rootId: string): Set<string> {
  const byParent = groupByParent(categories);
  const ids = new Set<string>();

  function visit(id: string) {
    for (const child of byParent.get(id) ?? []) {
      ids.add(child.id);
      visit(child.id);
    }
  }

  visit(rootId);
  return ids;
}
