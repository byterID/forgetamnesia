import { t, type MessageKey } from '@/i18n';

export function PlaceholderScreen({ titleKey }: { titleKey: MessageKey }) {
  return (
    <section>
      <h1 className="text-xl font-semibold">{t(titleKey)}</h1>
      <p className="mt-2 text-sm opacity-70">{t('common.placeholder')}</p>
    </section>
  );
}
