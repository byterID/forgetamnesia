import { DomainError } from '@/domain/errors';
import { omitUndefined } from '@/domain/object';

export type CategoryKind = 'expense' | 'income';

/**
 * Two-level category (CONTEXT.md, "Категория"): a root, or a child of a root of the same kind.
 * Income and expense categories form separate trees.
 */
export interface Category {
  readonly id: string;
  readonly name: string;
  readonly kind: CategoryKind;
  readonly parentId?: string;
  /** Expense only: spending here is mandatory (ADR-022). */
  readonly isMandatory?: boolean;
  /** Categories the app itself books to: negative adjustments (ADR-019) and transfer fees (ADR-024). */
  readonly system?: 'unaccounted' | 'fees';
  /** Position among siblings. */
  readonly order: number;
}

export interface CategoryNode {
  readonly category: Category;
  readonly children: readonly Category[];
}

function invalid(message: string): never {
  throw new DomainError('category-invalid', message);
}

/** Validates a new category against the ones that already exist and returns it normalised. */
export function createCategory(input: Category, existing: Iterable<Category>): Category {
  const name = input.name.trim();
  if (input.id === '' || name === '') invalid('Category needs an id and a name');
  if (input.isMandatory && input.kind !== 'expense') {
    invalid('Only an expense category can be mandatory');
  }
  if (input.parentId !== undefined) {
    const parent = [...existing].find((category) => category.id === input.parentId);
    if (!parent) invalid(`Parent category "${input.parentId}" does not exist`);
    if (parent.parentId !== undefined) invalid('Categories have two levels at most');
    if (parent.kind !== input.kind) invalid('A child category has the kind of its parent');
  }
  return omitUndefined({ ...input, name });
}

const byOrder = (a: Category, b: Category) =>
  a.order - b.order || a.name.localeCompare(b.name, 'ru');

/** Roots of one kind with their children, both sorted by `order`, then by name. */
export function categoryTree(categories: Iterable<Category>, kind: CategoryKind): CategoryNode[] {
  const ofKind = [...categories].filter((category) => category.kind === kind);
  return ofKind
    .filter((category) => category.parentId === undefined)
    .sort(byOrder)
    .map((root) => ({
      category: root,
      children: ofKind.filter((category) => category.parentId === root.id).sort(byOrder),
    }));
}
