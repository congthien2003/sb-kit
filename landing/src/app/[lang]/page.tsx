import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/config/site';
import { siteConfig } from '@/config/site';
import ApproachSection from '@/components/sections/ApproachSection';
import ContactSection from '@/components/sections/ContactSection';
import FeatureSection from '@/components/sections/FeatureSection';
import HeroSection from '@/components/sections/HeroSection';
import SkillExamplesSection from '@/components/sections/SkillExamplesSection';

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = lang === 'vi' ? 'vi' : 'en';
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const title = siteConfig.name;
  const description = t('description');
  const previewImage = {
    url: new URL('/social-preview.png', siteConfig.url),
    width: 1200,
    height: 630,
    alt: title,
  };

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: new URL(`/${locale}`, siteConfig.url),
      languages: {
        en: new URL('/en', siteConfig.url),
        vi: new URL('/vi', siteConfig.url),
      },
    },
    openGraph: {
      title,
      description,
      url: new URL(`/${locale}`, siteConfig.url),
      siteName: siteConfig.name,
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      type: 'website',
      images: [previewImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [previewImage],
    },
  };
}

export default async function Home({ params }: PageProps) {
  const { lang } = await params;
  const locale: Locale = lang === 'vi' ? 'vi' : 'en';

  return (
    <>
      <HeroSection />
      <FeatureSection />
      <SkillExamplesSection />
      <ApproachSection />
      <ContactSection lang={locale} />
    </>
  );
}
