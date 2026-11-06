/**
 * `/privacy` is a published statement, and telemetry is the thing it is a statement
 * about. This suite exists because that statement drifted twice:
 *
 *  - Version 2 described telemetry as "the type of event, its severity, which part of
 *    the site produced it, an error message…" while every event also carried a
 *    **per-visit engagement score and tier**, a **salted IP hash and country** were
 *    being written server-side, and the **site search box recorded what was typed**.
 *    None of the three appeared anywhere on the page.
 *  - The session counters *were* disclosed as local — "cleared when you close the
 *    tab" — which is true of the counters and false of the score computed from them.
 *
 * The client half of this check is mechanical: it walks a real payload produced by
 * the real builder and requires the policy to name every leaf it finds. The
 * hook-level half is a maintained list, and that limit is stated rather than hidden —
 * adding a field still requires remembering to add it here.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildApiFailurePayload, classifyApiFailure } from '@/lib/apiFailure';

const ROOT = resolve(__dirname, '../..');
/**
 * The source, with its JSX line breaks collapsed.
 *
 * The published page wraps prose across lines, so a phrase that reads as one clause
 * to a visitor is two lines in the file — matching the raw source would fail on a
 * statement that is genuinely present.
 */
const policy = readFileSync(resolve(ROOT, 'src/pages/Privacy.jsx'), 'utf8').replace(/\s+/g, ' ');

const mentions = (pattern) => new RegExp(pattern, 'i').test(policy);

/** Every leaf key a failure payload can carry, harvested from the builder itself. */
const leafKeys = (value, into = new Set()) => {
  if (Array.isArray(value)) {
    for (const item of value) leafKeys(item, into);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      into.add(key);
      leafKeys(child, into);
    }
  }
  return into;
};

const realPayload = buildApiFailurePayload({
  classification: classifyApiFailure({ url: '/api/config', status: 503 }),
  url: 'https://wp.ellars.us.com/wp-json/wp/v2/posts?per_page=9',
  requestId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  attempt: 2,
  online: true,
});

/**
 * How the policy has to name each field. The left side is the payload's own key, so
 * a rename in `apiFailure.js` fails here rather than silently leaving the policy
 * describing a field that no longer exists.
 */
const API_FIELD_PHRASES = {
  event_type: 'type of event',
  severity: 'severity',
  component_origin: 'component produced it',
  error_message: 'error message',
  url: 'origin and path of the address',
  failure_kind: 'When a request fails',
  http_status: 'When a request fails',
  attempt: 'whether it was retried',
  network_status: 'said it was online',
  request_id: 'random id that ties the failure',
  project_id: 'project identifier',
  timestamp: null, // a clock reading; not personal and not worth a clause
  idempotency_key: null,
  context_scope: null,
  environment: null,
  session: null,
  telemetry_envelope: null,
  event_payload: null,
  metadata: null,
  stack_trace: null, // always empty (see the note below)
};

describe('the policy names every field a failure payload actually carries', () => {
  it('harvests the real payload rather than a copy of it', () => {
    const keys = leafKeys(realPayload);
    // If this list changes, the loop below starts failing until the policy follows.
    expect([...keys].sort()).toEqual(
      Object.keys(API_FIELD_PHRASES).sort()
    );
  });

  it('names each field that is a fact about the reader', () => {
    const missing = [];
    for (const [key, phrase] of Object.entries(API_FIELD_PHRASES)) {
      if (phrase === null) continue;
      if (!mentions(phrase)) missing.push(`${key} ("${phrase}")`);
    }
    expect(missing).toEqual([]);
  });

  it('does not claim a stack trace is collected, because none is', () => {
    // `stack_trace` exists in the envelope and is always the empty string: no call
    // site ever passes one. A policy that listed it would be describing a field it
    // does not have, which is the same defect in the other direction.
    expect(realPayload.event_payload.stack_trace).toBe('');
    expect(mentions('stack trace')).toBe(false);
  });
});

describe('the four things Version 2 left out', () => {
  it('discloses the engagement score, and that it leaves the browser', () => {
    expect(mentions('engagement score')).toBe(true);
    expect(mentions('travels with each telemetry event')).toBe(true);
    // The distinction it previously blurred: counters are local, the score is sent.
    expect(mentions('summarised into the score')).toBe(true);
  });

  it('discloses the salted IP hash and the country', () => {
    expect(mentions('salted hash of your IP address')).toBe(true);
    expect(mentions('your country')).toBe(true);
    expect(mentions('user-agent string is')).toBe(true);
  });

  it('discloses the shape of a search, and that the term itself is not kept', () => {
    expect(mentions('search box')).toBe(true);
    expect(mentions('how long the term was')).toBe(true);
    expect(mentions('how many results it returned')).toBe(true);
    expect(mentions('figures you entered')).toBe(true);
    // Version 3 said the term was recorded, which was true then and is not now. The
    // sentence has to move with the code, not stay as a hedge that is merely dark.
    expect(mentions('the term is recorded')).toBe(false);
  });

  it('the search overlay sends no part of what was typed', () => {
    // Static, and stated as static: the overlay is exercised end to end in
    // `search-telemetry.test.jsx`, but this guard covers a second call site later
    // added elsewhere, which that suite would not see.
    const overlay = readFileSync(resolve(ROOT, 'src/components/common/SearchOverlay.jsx'), 'utf8');
    expect(overlay).toContain('summarizeSearch(');
    expect(overlay).not.toMatch(/trackEvent\(\s*'search_execution'\s*,\s*\{/);
    expect(overlay).not.toMatch(/query:\s*debouncedQuery/);
  });

  it('discloses the copied share link', () => {
    expect(mentions('records the address of the page you shared')).toBe(true);
  });
});

describe('retention says what is enforced and what is not', () => {
  it('states the enforced 30-day expiry and the missing one', () => {
    expect(mentions('30 days')).toBe(true);
    expect(mentions('no expiry set yet')).toBe(true);
    // The sentence it replaced claimed no schedule was enforced at all, while the KV
    // sink had been expiring at 30 days since it was written.
    expect(mentions('No fixed retention schedule is claimed')).toBe(false);
  });
});

describe('the page carries a version, so a material change can be announced', () => {
  it('has a version marker the Changes section can point at', () => {
    expect(policy).toMatch(/const LAST_UPDATED = '\d{1,2} \w+ \d{4}';/);
    expect(policy).toMatch(/Version \d/);
  });
});
