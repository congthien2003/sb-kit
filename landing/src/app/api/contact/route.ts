import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

import {
  getContactFormAvailability,
  getContactMailerConfig,
} from '@/lib/contact-form-config';
import { contactFormSchema } from '@/lib/contact-form-schema';

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const availability = getContactFormAvailability('en');
  const mailerConfig = getContactMailerConfig();

  if (!availability.enabled || !mailerConfig) {
    return NextResponse.json(
      { ok: false, code: 'CONTACT_UNAVAILABLE' },
      { status: 503 },
    );
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength < 0 ||
      contentLength > MAX_BODY_BYTES
    ) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_INPUT' },
        { status: 400 },
      );
    }
  }

  let payload: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing request body.');

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return NextResponse.json(
          { ok: false, code: 'INVALID_INPUT' },
          { status: 400 },
        );
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return NextResponse.json(
      { ok: false, code: 'INVALID_INPUT' },
      { status: 400 },
    );
  }

  const parsed = contactFormSchema.safeParse(payload);
  if (!parsed.success || parsed.data.website) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_INPUT' },
      { status: 400 },
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: mailerConfig.host,
      port: mailerConfig.port,
      secure: mailerConfig.secure,
      auth: {
        user: mailerConfig.user,
        pass: mailerConfig.password,
      },
    });

    await transporter.sendMail({
      from: mailerConfig.user,
      to: mailerConfig.recipient,
      replyTo: parsed.data.mail,
      subject: 'Website contact request',
      text: [
        `Name: ${parsed.data.name}`,
        `Email: ${parsed.data.mail}`,
        `Phone: ${parsed.data.phone}`,
        `Company: ${parsed.data.companyName}`,
        '',
        parsed.data.message,
      ].join('\n'),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    console.error('Contact message delivery failed.');
    return NextResponse.json(
      { ok: false, code: 'DELIVERY_FAILED' },
      { status: 502 },
    );
  }
}
