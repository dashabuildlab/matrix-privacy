// Run after build to generate sitemap.xml in out/
const fs = require('fs');
const path = require('path');

const baseUrl = 'https://yourmatrixofdestiny.com';
const now = new Date().toISOString().split('T')[0];

const energySlugs = Array.from({ length: 22 }, (_, i) => `chyslo-${i + 1}`);

const pages = [
  // Main pages
  { path: '/uk/', priority: '1.0', freq: 'weekly' },
  { path: '/uk/kalkulyator-matrytsi-doli/', priority: '0.95', freq: 'weekly' },
  { path: '/uk/kalkulyator-sumisnosti/', priority: '0.9', freq: 'weekly' },
  { path: '/uk/wiki/', priority: '0.9', freq: 'weekly' },
  { path: '/uk/wiki/scho-take-matrytsya-doli/', priority: '0.85', freq: 'monthly' },
  { path: '/uk/wiki/yak-rozrakhuvaty/', priority: '0.85', freq: 'monthly' },

  // Energy pages (22)
  ...energySlugs.map(slug => ({ path: `/uk/wiki/${slug}/`, priority: '0.8', freq: 'monthly' })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

const outDir = path.join(__dirname, '..', 'out');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml);
console.log(`Sitemap generated with ${pages.length} URLs`);
