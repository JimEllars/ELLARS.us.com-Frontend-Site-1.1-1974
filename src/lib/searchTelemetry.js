/**
 * What a search is allowed to report about itself.
 *
 * ## What was wrong
 *
 * `SearchOverlay` sent `{ query }` verbatim with every `search_execution` event, and
 * the edge stores the payload with no expiry — so the raw contents of the site's
 * search box were written to a table with an unbounded lifetime. A search box is the
 * one field on this site that can carry something a reader did not mean to publish:
 * an address pasted into the wrong box, a name, a medical question.
 *
 * Sprint 2.32 disclosed it in `/privacy` Version 3, which was the minimum and not a
 * fix. Sprint 2.37 removed the *amplification* — the event no longer re-fired on
 * every engagement-score change, so one search is one event — which is what made
 * this affordable to finish.
 *
 * ## What a search reports instead
 *
 * The purpose the data was collected for is the content gap: which questions the
 * archive fails to answer. That question is fully answered by **how long the term
 * was, how many words it had, and how many results came back**. The words themselves
 * were never load-bearing, so they are not collected.
 *
 * Two smaller decisions, both of which change what the numbers mean:
 *
 *  - `term_words` is not derivable from `term_length`, and a three-word query that
 *    misses is a different editorial signal from a one-word query that misses.
 *  - `corpus_loaded` records whether the archive was actually available. Without it
 *    a `result_count: 0` is ambiguous between "nothing matched" and "the fetch had
 *    not returned yet", and the zeros would be read as gaps that do not exist. The
 *    component therefore waits for the corpus to settle before it records anything.
 *
 * Pure: no imports, no globals, so every branch is asserted in `npm run test:client`.
 */

/** A term's shape, without its content. */
export const parseSearchTerm = (term) => {
  const collapsed = String(term ?? '').trim().replace(/\s+/g, ' ');
  return {
    length: collapsed.length,
    words: collapsed === '' ? 0 : collapsed.split(' ').length,
  };
};

/**
 * The `search_execution` payload.
 *
 * Deliberately has no field that can hold any part of what was typed — the shape is
 * the guarantee, not a filter that could be forgotten.
 */
export const summarizeSearch = ({ term, resultCount, corpusLoaded = true }) => {
  const { length, words } = parseSearchTerm(term);
  const results = Number.isFinite(resultCount) ? Math.max(0, Math.trunc(resultCount)) : 0;

  return {
    term_length: length,
    term_words: words,
    result_count: results,
    corpus_loaded: corpusLoaded === true,
  };
};
