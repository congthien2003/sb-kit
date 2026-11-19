import type { Locale } from '@/config/site';
import { siteConfig } from '@/config/site';

export type ContactMailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  recipient: string;
};

export function getContactMailerConfig(): ContactMailerConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const portValue = process.env.SMTP_PORT?.trim();
  const secureValue = process.env.SMTP_SECURE?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const recipient = process.env.MAIL_RECEIVER?.trim();
  const port = Number(portValue);

  if (
    !host ||
    !portValue ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !secureValue ||
    !['true', 'false'].includes(secureValue) ||
    !user ||
    !password ||
    !recipient
  ) {
    return null;
  }

  return {
    host,
    port,
    secure: secureValue === 'true',
    user,
    password,
    recipient,
  };
}

export function getContactFormAvailability(locale: Locale) {
  const noticeConfigured = Boolean(
    siteConfig.contactPrivacyNotice.en.trim() &&
    siteConfig.contactPrivacyNotice.vi.trim(),
  );
  const upstreamRateLimitConfirmed =
    process.env.NODE_ENV !== 'production' ||
    process.env.CONTACT_UPSTREAM_RATE_LIMIT_CONFIRMED === 'true';
  const enabled =
    process.env.CONTACT_FORM_ENABLED === 'true' &&
    Boolean(getContactMailerConfig()) &&
    noticeConfigured &&
    upstreamRateLimitConfirmed;

  return {
    enabled,
    noticeConfigured,
    privacyNotice: siteConfig.contactPrivacyNotice[locale],
  };
}
