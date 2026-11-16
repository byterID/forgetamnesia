import {
  categoryTree,
  createCategory,
  defaultCategories,
  type Category,
} from '@/domain/categories';
import { DomainError } from '@/domain/errors';

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return undefined;
}

const housing: Category = { id: 'housing', name: 'Жильё', kind: 'expense', order: 0 };
const rent: Category = {
  id: 'rent',
  name: 'Аренда',
  kind: 'expense',
  parentId: 'housing',
  isMandatory: true,
  order: 0,
};
const salary: Category = { id: 'salary', name: 'Зарплата', kind: 'income', order: 0 };
const existing = [housing, rent, salary];

describe('createCategory', () => {
  it('creates a root category and a child under a root of the same kind', () => {
    expect(
      createCategory({ id: 'c1', name: ' Кафе ', kind: 'expense', order: 3 }, existing),
    ).toEqual({ id: 'c1', name: 'Кафе', kind: 'expense', order: 3 });
    expect(
      createCategory(
        {
          id: 'c2',
          name: 'Коммуналка',
          kind: 'expense',
          parentId: 'housing',
          isMandatory: true,
          order: 1,
        },
        existing,
      ),
    ).toEqual({
      id: 'c2',
      name: 'Коммуналка',
      kind: 'expense',
      parentId: 'housing',
      isMandatory: true,
      order: 1,
    });
  });

  it('allows only two levels', () => {
    expect(
      codeOf(() =>
        createCategory(
          { id: 'c3', name: 'Офис', kind: 'expense', parentId: 'rent', order: 0 },
          existing,
        ),
      ),
    ).toBe('category-invalid');
  });

  it('keeps income and expense trees apart', () => {
    expect(
      codeOf(() =>
        createCategory(
          { id: 'c4', name: 'Премия', kind: 'income', parentId: 'housing', order: 0 },
          existing,
        ),
      ),
    ).toBe('category-invalid');
  });

  it('rejects an unknown parent, itself as parent, an empty name and a mandatory income', () => {
    const attempt = (input: Parameters<typeof createCategory>[0]) =>
      codeOf(() => createCategory(input, existing));
    expect(attempt({ id: 'c5', name: 'X', kind: 'expense', parentId: 'nope', order: 0 })).toBe(
      'category-invalid',
    );
    expect(attempt({ id: 'c6', name: 'X', kind: 'expense', parentId: 'c6', order: 0 })).toBe(
      'category-invalid',
    );
    expect(attempt({ id: 'c7', name: '  ', kind: 'expense', order: 0 })).toBe('category-invalid');
    expect(attempt({ id: '', name: 'X', kind: 'expense', order: 0 })).toBe('category-invalid');
    expect(attempt({ id: 'c8', name: 'X', kind: 'income', isMandatory: true, order: 0 })).toBe(
      'category-invalid',
    );
  });
});

describe('categoryTree', () => {
  it('groups children under their parents, ordered by `order` then name, one kind at a time', () => {
    const cafe: Category = { id: 'cafe', name: 'Кафе', kind: 'expense', order: 0 };
    const deposit: Category = {
      id: 'deposit',
      name: 'Залог',
      kind: 'expense',
      parentId: 'housing',
      order: 0,
    };
    const tree = categoryTree([salary, rent, housing, deposit, cafe], 'expense');
    expect(tree.map((node) => node.category.id)).toEqual(['housing', 'cafe']);
    expect(tree[0]?.children.map((child) => child.id)).toEqual(['rent', 'deposit']);
    expect(tree[1]?.children).toEqual([]);
    expect(categoryTree(existing, 'income').map((node) => node.category.id)).toEqual(['salary']);
  });
});

describe('defaultCategories', () => {
  const defaults = defaultCategories();
  const names = (kind: Category['kind']) =>
    categoryTree(defaults, kind).map((node) =>
      node.children.length > 0
        ? `${node.category.name} (${node.children.map((child) => child.name).join(', ')})`
        : node.category.name,
    );

  it('is the starting expense set of the spec, plus the system categories', () => {
    expect(names('expense')).toEqual([
      'Продукты',
      'Кафе и рестораны',
      'Транспорт',
      'Жильё (Аренда, Коммуналка, Залог)',
      'Связь и подписки',
      'Здоровье',
      'Одежда',
      'Развлечения',
      'Путешествия',
      'Подарки',
      'Переводы людям',
      'Покупки (прочее)',
      'Образование',
      'Комиссии',
      'Неучтённое',
    ]);
  });

  it('is the starting income set of the spec', () => {
    expect(names('income')).toEqual([
      'Зарплата',
      'Аванс',
      'Кешбэк',
      'Внешние переводы',
      'Проценты',
      'Прочее',
    ]);
  });

  it('marks rent, utilities and communications as mandatory', () => {
    expect(
      defaults.filter((category) => category.isMandatory).map((category) => category.name),
    ).toEqual(['Аренда', 'Коммуналка', 'Связь и подписки']);
  });

  it('has system categories for unaccounted spending and transfer fees', () => {
    expect(defaults.find((category) => category.system === 'unaccounted')?.name).toBe('Неучтённое');
    expect(defaults.find((category) => category.system === 'fees')?.name).toBe('Комиссии');
  });

  it('has no "big purchases" category: that is the isOneOff flag', () => {
    expect(defaults.some((category) => /крупн/i.test(category.name))).toBe(false);
  });

  it('has stable, unique ids, so devices seeding independently agree', () => {
    const ids = defaults.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(defaultCategories().map((category) => category.id)).toEqual(ids);
    expect(ids).toContain('default:expense:housing:rent');
    expect(ids).toContain('default:income:salary');
  });

  it('is itself a valid two-level tree', () => {
    const accepted: Category[] = [];
    for (const category of defaults) accepted.push(createCategory(category, accepted));
    expect(accepted).toEqual(defaults);
  });
});
