/**
 * Two DOM defects that a visual pass cannot see, measured on production
 * 2026-11-06 with a duplicate-id and accessible-name probe over four routes:
 *
 *  - **`#bot_field` appeared twice on `/`.** The honeypot trap's DOM id *was* its
 *    `name`, and the homepage renders two forms — the newsletter section and the
 *    footer. Duplicate ids are invalid HTML and make `label[for]` and
 *    `getElementById` resolve to whichever element the browser met first.
 *  - **`#footer-email` had no accessible name on any page**, and neither did the
 *    newsletter section's field. A placeholder is not a name: a screen reader
 *    announces an unnamed edit field on the site-wide conversion control. `/login`
 *    scored correctly, which is what made this a footer defect rather than a
 *    systematic one.
 *
 * The check is deliberately general: every input in the tree must have a name a
 * screen reader can announce, and no id may repeat — so the next form added to
 * either component is covered without editing this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/email', () => ({ subscribeToNewsletter: vi.fn(async () => ({ isError: false })) }));
vi.mock('@/lib/api', () => ({ subscribeToNewsletter: vi.fn(async () => ({ isError: false })) }));

const Footer = (await import('@/components/common/Footer')).default;
const Newsletter = (await import('@/components/home/Newsletter')).default;

const renderForms = () =>
  render(
    <MemoryRouter>
      <Newsletter />
      <Footer />
    </MemoryRouter>
  );

/** A name a screen reader can actually announce. */
const accessibleName = (element) => {
  const aria = element.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy && element.ownerDocument.getElementById(labelledBy)) return 'labelledby';
  const id = element.getAttribute('id');
  if (id) {
    const label = element.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return label.textContent.trim();
  }
  const wrapper = element.closest('label');
  if (wrapper) return wrapper.textContent.trim();
  return null;
};

const fields = (container) => [...container.querySelectorAll('input, textarea, select')];

beforeEach(() => {
  // The newsletter section registers a Turnstile widget when a site key exists; it
  // does not in tests, so the effect is a no-op. Nothing else in these components
  // touches the network on mount.
});

describe('the two forms the homepage renders together', () => {
  it('never emit the same id twice', () => {
    const { container } = renderForms();

    const ids = [...container.querySelectorAll('[id]')].map((el) => el.getAttribute('id'));
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

    expect([...new Set(duplicates)]).toEqual([]);
  });

  it('keeps the honeypot a trap while giving each instance its own id', () => {
    const { container } = renderForms();

    const traps = [...container.querySelectorAll('input[name="bot_field"]')];
    expect(traps).toHaveLength(2);
    // The id changed; the field the handlers read did not. Submission and the spam
    // check both read component state, so `name` is the contract that matters.
    expect(traps[0].id).not.toBe(traps[1].id);
    expect(traps[0].id).toMatch(/^:/); // React's useId prefix
  });

  it('gives every field a name a screen reader can announce', () => {
    const { container } = renderForms();

    const unnamed = fields(container)
      .filter((element) => (element.getAttribute('type') || '').toLowerCase() !== 'hidden')
      .filter((element) => !accessibleName(element))
      .map((element) => element.getAttribute('id') || element.getAttribute('name'));

    expect(unnamed).toEqual([]);
  });

  it('names the site-wide email field specifically', () => {
    const { container } = renderForms();

    const footerEmail = container.querySelector('#footer-email');
    const sectionEmail = container.querySelector('#email');

    expect(accessibleName(footerEmail)).toMatch(/email/i);
    expect(accessibleName(sectionEmail)).toMatch(/email/i);
    // The visible placeholder is unchanged: this fix is invisible by design.
    expect(footerEmail.getAttribute('placeholder')).toBe('YOUR EMAIL ADDRESS');
  });
});
