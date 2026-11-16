import { t } from '@/i18n';
import { Toaster } from '@/ui/toaster';

export function App() {
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">{t('app.title')}</h1>
      <Toaster />
    </main>
  );
}
