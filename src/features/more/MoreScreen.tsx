import { Link } from 'react-router';
import { t, type MessageKey } from '@/i18n';

const ITEMS: readonly { to: string; key: MessageKey }[] = [
  { to: '/accounts', key: 'screen.accounts' },
  { to: '/plans', key: 'screen.plans' },
  { to: '/analytics', key: 'screen.analytics' },
  { to: '/inbox', key: 'screen.inbox' },
  { to: '/settings', key: 'screen.settings' },
];

export default function MoreScreen() {
  return (
    <section>
      <h1 className="text-xl font-semibold">{t('screen.more')}</h1>
      <ul className="mt-4 divide-y divide-border rounded-md border border-border">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="flex min-h-11 items-center px-4">
              {t(item.key)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
