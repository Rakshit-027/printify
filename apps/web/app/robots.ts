import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://print2me.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/how-it-works',
          '/document-printing',
          '/campus-printing',
          '/partner',
          '/faq',
          '/locations',
          '/v/*',
          '/brand/*',
        ],
        disallow: [
          '/api/',
          '/admin/',
          '/vendor/',
          '/pay/',
          '/track/',
          '/login',
          '/register',
          '/*?*token=',
          '/*?*session=',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/'],
        disallow: ['/api/', '/admin/', '/vendor/', '/pay/', '/track/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
