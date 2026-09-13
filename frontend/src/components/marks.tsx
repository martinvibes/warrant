/**
 * The marks on the catalogue cards.
 *
 * A live resource shows the real mark of the company actually answering the
 * call, because that is the fastest way to tell that something is wired to a
 * real service rather than drawn to look like one. A resource that is still in
 * development has no provider to name, so it keeps a drawn glyph. The two
 * shapes are deliberately different: a filled logo and a stroked outline never
 * get mistaken for each other, and nothing on the page wears a logo it has not
 * earned.
 *
 * Brand paths are the companies' own, taken from Simple Icons (CC0) for Hedera,
 * OpenAI and Resend. Telnyx publishes a wordmark and no square mark, so the
 * phone line keeps a handset and names Telnyx in words on the card.
 */

/** Official single-path logos, on a 24-unit grid, drawn with fill. */
const BRANDS: Record<string, { title: string; path: string }> = {
  hedera: {
    title: 'Hedera',
    path: 'M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm4.9571 17.3963h-1.5812V14.01H8.6224v3.3777H7.0498V6.6037H8.631v3.3845h6.7535V6.6037h1.5812zm-1.5812-6.2592H8.6224v1.7241h6.7535Z',
  },
  openai: {
    title: 'OpenAI',
    path: 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z',
  },
  resend: {
    title: 'Resend',
    path: 'M2.023 0v24h5.553v-8.434h2.998L15.326 24h6.65l-5.372-9.258a7.652 7.652 0 0 0 3.316-3.016c.709-1.21 1.062-2.57 1.062-4.08 0-1.462-.353-2.767-1.062-3.91-.709-1.165-1.692-2.079-2.95-2.742C15.737.331 14.355 0 12.823 0Zm5.553 4.87h4.219c.731 0 1.349.125 1.851.376.526.252.925.618 1.2 1.098.274.457.412.994.412 1.611S15.132 9.12 14.88 9.6c-.229.48-.572.856-1.03 1.13-.434.252-.948.38-1.542.38H7.576Z',
  },
};

/** Which company actually answers each call. */
const PROVIDER: Record<string, keyof typeof BRANDS> = {
  'identity.mint': 'hedera',
  'memory.write': 'hedera',
  inference: 'openai',
  'email.inbox': 'resend',
  'email.send': 'resend',
  'email.sealed': 'resend',
};

/**
 * Filled, on the same 24-unit grid as the logos, for the phone line.
 *
 * Telnyx publishes a wordmark and no square mark, and a wordmark is unreadable
 * at this size. A handset is drawn instead, filled rather than outlined so it
 * sits at the same weight as the logos beside it and the card does not look
 * like it is missing one. The card names Telnyx in words underneath.
 */
const SOLID: Record<string, string> = {
  'phone.provision':
    'M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z',
  'sms.send':
    'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM8 11H6V9h2v2Zm5 0h-2V9h2v2Zm5 0h-2V9h2v2Z',
};

/** Outlines, on a 16-unit grid, for everything with no provider to show. */
const GLYPHS: Record<string, string> = {
  domains: 'M8 1a7 7 0 100 14A7 7 0 008 1zM1 8h14M8 1c2 2 2 12 0 14M8 1C6 3 6 13 8 15',
  compute: 'M2 2h12v5H2zM2 9h12v5H2zM4.5 4.5h1M4.5 11.5h1',
  social: 'M11 5.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM2 14c0-2.8 2.7-4.5 5.5-4.5S13 11.2 13 14',
  refill: 'M8 2v5l3 2M14 8A6 6 0 112 8M12 3.5V6h-2.5',
  delegation: 'M8 2v4M4 14v-3M12 14v-3M4 11h8M8 6v5',
  fallback: 'M8 1v14M1 8h14M3.5 3.5l9 9M12.5 3.5l-9 9',
};

/**
 * The mark for one resource. Named for a screen reader, because "OpenAI" is
 * the useful thing to hear here and "decorative image" is not.
 */
export function Mark({ kind, dim }: { kind: string; dim?: boolean }) {
  const brand = PROVIDER[kind];
  const fill = dim ? 'var(--color-muted)' : 'var(--color-text)';

  if (brand) {
    const { title, path } = BRANDS[brand]!;
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" role="img" aria-label={title} data-brand="">
        <path d={path} fill={fill} />
      </svg>
    );
  }

  if (SOLID[kind]) {
    return (
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" data-brand="">
        <path d={SOLID[kind]} fill={fill} />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={GLYPHS[kind] ?? GLYPHS.fallback}
        stroke={dim ? 'var(--color-muted)' : 'var(--color-accent-light)'}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
