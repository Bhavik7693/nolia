import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that updates og:image and twitter:image meta tags
 * to point to the app's opengraph image with the correct Replit domain.
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      const googleVerification =
        process.env.GOOGLE_SITE_VERIFICATION ??
        process.env.VITE_GOOGLE_SITE_VERIFICATION ??
        null;

      const googleVerificationToken = normalizeGoogleVerificationToken(googleVerification);

      if (googleVerificationToken && !/name="google-site-verification"/i.test(html)) {
        const escaped = escapeHtmlAttribute(googleVerificationToken);
        html = html.replace(
          /<\/head>/i,
          `  <meta name="google-site-verification" content="${escaped}" />\n  </head>`
        );
      }

      const publicBaseUrl = normalizePublicBaseUrl(process.env.PUBLIC_BASE_URL ?? null);
      if (publicBaseUrl) {
        const canonicalUrl = `${publicBaseUrl}/`;
        const escapedCanonical = escapeHtmlAttribute(canonicalUrl);

        const socialPath = getPreferredSocialImagePath();
        const socialUrl = `${publicBaseUrl}${socialPath}`;
        const escapedSocialUrl = escapeHtmlAttribute(socialUrl);

        if (/property="og:image"/i.test(html)) {
          html = html.replace(
            /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g,
            `<meta property="og:image" content="${escapedSocialUrl}" />`
          );
        } else {
          html = html.replace(
            /<\/head>/i,
            `  <meta property="og:image" content="${escapedSocialUrl}" />\n  </head>`
          );
        }

        if (/name="twitter:image"/i.test(html)) {
          html = html.replace(
            /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g,
            `<meta name="twitter:image" content="${escapedSocialUrl}" />`
          );
        } else {
          html = html.replace(
            /<\/head>/i,
            `  <meta name="twitter:image" content="${escapedSocialUrl}" />\n  </head>`
          );
        }

        if (!/<link\s+rel="canonical"/i.test(html)) {
          html = html.replace(
            /<\/head>/i,
            `  <link rel="canonical" href="${escapedCanonical}" />\n  </head>`
          );
        }

        if (!/property="og:url"/i.test(html)) {
          html = html.replace(
            /<\/head>/i,
            `  <meta property="og:url" content="${escapedCanonical}" />\n  </head>`
          );
        }

        if (!/application\/ld\+json/i.test(html)) {
          const jsonLd = buildJsonLd({ canonicalUrl });
          html = html.replace(
            /<\/head>/i,
            `  <script type="application/ld+json">${jsonLd}</script>\n  </head>`
          );
        }
      }

      const baseUrl = getDeploymentUrl();
      if (!baseUrl) {
        log('[meta-images] no Replit deployment domain found, skipping meta tag updates');
        return html;
      }

      // Check if opengraph image exists in public directory
      const publicDir = path.resolve(process.cwd(), 'client', 'public');
      const opengraphPngPath = path.join(publicDir, 'opengraph.png');
      const opengraphJpgPath = path.join(publicDir, 'opengraph.jpg');
      const opengraphJpegPath = path.join(publicDir, 'opengraph.jpeg');

      let imageExt: string | null = null;
      if (fs.existsSync(opengraphPngPath)) {
        imageExt = 'png';
      } else if (fs.existsSync(opengraphJpgPath)) {
        imageExt = 'jpg';
      } else if (fs.existsSync(opengraphJpegPath)) {
        imageExt = 'jpeg';
      }

      if (!imageExt) {
        log('[meta-images] OpenGraph image not found, skipping meta tag updates');
        return html;
      }

      const imageUrl = `${baseUrl}/opengraph.${imageExt}`;

      log('[meta-images] updating meta image tags to:', imageUrl);

      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g,
        `<meta property="og:image" content="${imageUrl}" />`
      );

      html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g,
        `<meta name="twitter:image" content="${imageUrl}" />`
      );

      return html;
    },
  };
}

function getDeploymentUrl(): string | null {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    const url = `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
    log('[meta-images] using internal app domain:', url);
    return url;
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    const url = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    log('[meta-images] using dev domain:', url);
    return url;
  }

  return null;
}

function log(...args: any[]): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(...args);
  }
}

function escapeHtmlAttribute(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function normalizePublicBaseUrl(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    u.search = '';
    return u.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function normalizeGoogleVerificationToken(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const prefix = 'google-site-verification=';
  if (trimmed.toLowerCase().startsWith(prefix)) {
    const token = trimmed.slice(prefix.length).trim();
    return token || null;
  }

  return trimmed;
}

function getPreferredSocialImagePath(): string {
  const publicDir = path.resolve(process.cwd(), 'client', 'public');
  const opengraphPngPath = path.join(publicDir, 'opengraph.png');
  const opengraphJpgPath = path.join(publicDir, 'opengraph.jpg');
  const opengraphJpegPath = path.join(publicDir, 'opengraph.jpeg');

  if (fs.existsSync(opengraphPngPath)) return '/opengraph.png';
  if (fs.existsSync(opengraphJpgPath)) return '/opengraph.jpg';
  if (fs.existsSync(opengraphJpegPath)) return '/opengraph.jpeg';

  return '/og.svg';
}

function escapeJsonForHtmlScript(json: string): string {
  return json.replaceAll("</", "<\\/");
}

function buildJsonLd(params: { canonicalUrl: string }): string {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "NOLIA",
        url: params.canonicalUrl,
      },
      {
        "@type": "Organization",
        name: "NOLIA",
        url: params.canonicalUrl,
      },
    ],
  };

  return escapeJsonForHtmlScript(JSON.stringify(data));
}
