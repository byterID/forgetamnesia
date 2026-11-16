// Build-time file: Russian strings live here (manifest cannot call t()); keep in sync with ru.json.
export const manifest = {
  name: 'ForgetAmnesia',
  short_name: 'ForgetAmnesia',
  description: 'Календарь, задачи и финансовый ассистент',
  lang: 'ru',
  start_url: '/',
  scope: '/',
  display: 'standalone' as const,
  background_color: '#ffffff',
  theme_color: '#4f46e5',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    {
      src: '/icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  shortcuts: [
    {
      name: 'Быстрая запись',
      short_name: 'Запись',
      url: '/capture',
      icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    },
  ],
  share_target: {
    action: '/capture',
    method: 'GET' as const,
    params: { title: 'title', text: 'text', url: 'url' },
  },
};
