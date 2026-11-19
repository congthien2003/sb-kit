export type Locale = 'en' | 'vi';

type SocialLink = {
  label: string;
  href: string;
};

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

if (process.env.NODE_ENV === 'production' && !configuredSiteUrl) {
  throw new Error('NEXT_PUBLIC_SITE_URL must be configured for production.');
}

export const siteConfig = {
  name: 'sb-kit',
  url: new URL(configuredSiteUrl || 'http://localhost:3000'),
  socialLinks: [] as SocialLink[],
  contactPrivacyNotice: {
    en: '',
    vi: '',
  } satisfies Record<Locale, string>,
};
