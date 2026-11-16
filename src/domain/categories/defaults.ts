import { omitUndefined } from '@/domain/object';
import type { Category, CategoryKind } from './category';

interface Seed {
  slug: string;
  name: string;
  isMandatory?: true;
  system?: Category['system'];
  children?: Seed[];
}

/** Starting set, finance.md F5. "Крупные покупки" is the `isOneOff` flag, not a category (ADR-022). */
const EXPENSES: Seed[] = [
  { slug: 'groceries', name: 'Продукты' },
  { slug: 'eating-out', name: 'Кафе и рестораны' },
  { slug: 'transport', name: 'Транспорт' },
  {
    slug: 'housing',
    name: 'Жильё',
    children: [
      { slug: 'rent', name: 'Аренда', isMandatory: true },
      { slug: 'utilities', name: 'Коммуналка', isMandatory: true },
      { slug: 'deposit', name: 'Залог' },
    ],
  },
  { slug: 'communications', name: 'Связь и подписки', isMandatory: true },
  { slug: 'health', name: 'Здоровье' },
  { slug: 'clothing', name: 'Одежда' },
  { slug: 'entertainment', name: 'Развлечения' },
  { slug: 'travel', name: 'Путешествия' },
  { slug: 'gifts', name: 'Подарки' },
  { slug: 'transfers-to-people', name: 'Переводы людям' },
  { slug: 'shopping', name: 'Покупки (прочее)' },
  { slug: 'education', name: 'Образование' },
  { slug: 'fees', name: 'Комиссии', system: 'fees' },
  { slug: 'unaccounted', name: 'Неучтённое', system: 'unaccounted' },
];

const INCOME: Seed[] = [
  { slug: 'salary', name: 'Зарплата' },
  { slug: 'advance', name: 'Аванс' },
  { slug: 'cashback', name: 'Кешбэк' },
  { slug: 'external-transfers', name: 'Внешние переводы' },
  { slug: 'interest', name: 'Проценты' },
  { slug: 'other', name: 'Прочее' },
];

function expand(seeds: Seed[], kind: CategoryKind, parentId?: string): Category[] {
  return seeds.flatMap((seed, order) => {
    const id = `${parentId ?? `default:${kind}`}:${seed.slug}`;
    const category: Category = omitUndefined({
      id,
      name: seed.name,
      kind,
      parentId,
      isMandatory: seed.isMandatory,
      system: seed.system,
      order,
    });
    return [category, ...expand(seed.children ?? [], kind, id)];
  });
}

/**
 * The categories a new installation starts with. Their ids are fixed (`default:expense:housing:rent`),
 * so two devices that seed independently produce the same records instead of duplicates after sync.
 * The names are user data from then on and may be renamed.
 */
export function defaultCategories(): Category[] {
  return [...expand(EXPENSES, 'expense'), ...expand(INCOME, 'income')];
}
