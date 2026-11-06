import React, { useId } from 'react';

/**
 * The trap field every form carries.
 *
 * The DOM `id` was the `name` — `bot_field` — so any page that rendered two forms
 * (the homepage carries the newsletter section *and* the footer) emitted the same id
 * twice. Duplicate ids are invalid HTML, and they make `label[for]` association and
 * `getElementById` resolve to whichever element the browser found first. Measured on
 * production 2026-11-06: `/` had `#bot_field` twice.
 *
 * `useId()` gives each instance its own id while `name` stays `bot_field`, which is
 * what the submit handlers and the spam check actually read — they use state, not the
 * DOM, so nothing about the trap's behaviour changes.
 */
const Honeypot = ({ value, onChange, name = "bot_field" }) => {
  const fieldId = useId();
  return (
    <div
      className="opacity-0 absolute -z-50 w-0 h-0 pointer-events-none"
      aria-hidden="true"
      tabIndex="-1"
    >
      <label htmlFor={fieldId}>Leave this field empty if you are human</label>
      <input
        type="text"
        id={fieldId}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete="off"
        tabIndex="-1"
      />
    </div>
  );
};

export default Honeypot;
