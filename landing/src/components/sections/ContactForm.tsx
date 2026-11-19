'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  contactFormSchema,
  type ContactFormData,
} from '@/lib/contact-form-schema';

type ContactFormProps = {
  enabled: boolean;
  privacyNotice: string;
};

type ApiResponse = {
  ok?: boolean;
  code?: string;
};

export default function ContactForm({
  enabled,
  privacyNotice,
}: ContactFormProps) {
  const t = useTranslations('Contact');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      mail: '',
      phone: '',
      companyName: '',
      message: '',
      website: '',
    },
  });

  const submit = async (data: ContactFormData) => {
    setStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = (await response.json().catch(() => ({}))) as ApiResponse;

      if (!response.ok || !result.ok) {
        setStatus('error');
        return;
      }

      setStatus('success');
      reset();
    } catch {
      setStatus('error');
    }
  };

  if (!enabled) {
    return (
      <p
        className="rounded-xl bg-layout p-5 text-sm leading-6 text-neutral-300"
        role="status"
        aria-live="polite"
      >
        {t('formUnavailable')}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
      <div
        className="absolute -left-[10000px] h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register('website')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-name"
            className="text-sm font-medium text-neutral-100"
          >
            {t('name')}
          </label>
          <input
            id="contact-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'contact-name-error' : undefined}
            className="mt-2 min-h-12 w-full rounded-xl border border-neutral-700 bg-layout-2 px-4 text-sm text-neutral-0 outline-none transition focus:border-neutral-0 focus:ring-2 focus:ring-neutral-0 aria-[invalid=true]:border-neutral-0"
            {...register('name')}
          />
          {errors.name && (
            <p id="contact-name-error" className="mt-2 text-xs font-semibold text-neutral-0">
              {errors.name.message === 'required'
                ? t('validation.required')
                : t('validation.fieldInvalid')}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="contact-mail"
            className="text-sm font-medium text-neutral-100"
          >
            {t('mail')}
          </label>
          <input
            id="contact-mail"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.mail)}
            aria-describedby={errors.mail ? 'contact-mail-error' : undefined}
            className="mt-2 min-h-12 w-full rounded-xl border border-neutral-700 bg-layout-2 px-4 text-sm text-neutral-0 outline-none transition focus:border-neutral-0 focus:ring-2 focus:ring-neutral-0 aria-[invalid=true]:border-neutral-0"
            {...register('mail')}
          />
          {errors.mail && (
            <p id="contact-mail-error" className="mt-2 text-xs font-semibold text-neutral-0">
              {errors.mail.message === 'invalidEmail'
                ? t('validation.invalidEmail')
                : errors.mail.message === 'required'
                  ? t('validation.required')
                  : t('validation.fieldInvalid')}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="contact-phone"
            className="text-sm font-medium text-neutral-100"
          >
            {t('phone')}
          </label>
          <input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
            className="mt-2 min-h-12 w-full rounded-xl border border-neutral-700 bg-layout-2 px-4 text-sm text-neutral-0 outline-none transition focus:border-neutral-0 focus:ring-2 focus:ring-neutral-0 aria-[invalid=true]:border-neutral-0"
            {...register('phone')}
          />
          {errors.phone && (
            <p id="contact-phone-error" className="mt-2 text-xs font-semibold text-neutral-0">
              {errors.phone.message === 'required'
                ? t('validation.required')
                : t('validation.fieldInvalid')}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="contact-company"
            className="text-sm font-medium text-neutral-100"
          >
            {t('companyName')}
          </label>
          <input
            id="contact-company"
            autoComplete="organization"
            aria-invalid={Boolean(errors.companyName)}
            aria-describedby={
              errors.companyName ? 'contact-company-error' : undefined
            }
            className="mt-2 min-h-12 w-full rounded-xl border border-neutral-700 bg-layout-2 px-4 text-sm text-neutral-0 outline-none transition focus:border-neutral-0 focus:ring-2 focus:ring-neutral-0 aria-[invalid=true]:border-neutral-0"
            {...register('companyName')}
          />
          {errors.companyName && (
            <p id="contact-company-error" className="mt-2 text-xs font-semibold text-neutral-0">
              {errors.companyName.message === 'required'
                ? t('validation.required')
                : t('validation.fieldInvalid')}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="text-sm font-medium text-neutral-100"
        >
          {t('message')}
        </label>
        <textarea
          id="contact-message"
          rows={5}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={
            errors.message ? 'contact-message-error' : undefined
          }
          className="mt-2 w-full resize-y rounded-xl border border-neutral-700 bg-layout-2 px-4 py-3 text-sm leading-6 text-neutral-0 outline-none transition focus:border-neutral-0 focus:ring-2 focus:ring-neutral-0 aria-[invalid=true]:border-neutral-0"
          {...register('message')}
        />
        {errors.message && (
          <p id="contact-message-error" className="mt-2 text-xs font-semibold text-neutral-0">
            {errors.message.message === 'messageTooShort'
              ? t('validation.messageTooShort')
              : t('validation.fieldInvalid')}
          </p>
        )}
      </div>

      <p className="border-t border-neutral-800 pt-4 text-xs leading-5 text-neutral-300">
        {privacyNotice}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="kit-button kit-button-primary disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? t('sending') : t('send')}
        </button>
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-neutral-300"
        >
          {status === 'success'
            ? t('successMessage')
            : status === 'error'
              ? t('errorMessage')
              : ''}
        </p>
      </div>
    </form>
  );
}
