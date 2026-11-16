import { Link } from 'react-router';
import { t } from '@/i18n';
import { SCREENS } from '@/screens';

const ITEMS = SCREENS.filter((screen) => screen.placement === 'more');

export default function MoreScreen() {
  return (
    <section>
      <h1 className="text-xl font-semibold">{t('screen.more')}</h1>
      <ul className="mt-4 divide-y divide-border rounded-md border border-border">
        {ITEMS.map((item) => (
          <li key={item.path}>
            <Link to={item.path} className="flex min-h-11 items-center px-4">
              {t(item.titleKey)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
