/**
 * Client-side unit tests for the pure helpers behind the PWA update handshake.
 *
 * No DOM, no runner: `src/lib/swPolicy.js` is deliberately free of imports and
 * browser globals so the decisions below can be asserted in CI. Run with
 * `npm run test:client`.
 */

import {
  RELOAD_MARKER,
  decideOnControllerChange,
  isRegistrationCurrent,
} from '../src/lib/swPolicy.js';

let passed = 0;
const failures = [];

const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
    return;
  }
  failures.push(`${name}${detail ? ` :: ${detail}` : ''}`);
  console.log(`  FAIL ${name}${detail ? ` :: ${detail}` : ''}`);
};

console.log('src/lib/swPolicy.js');

check(
  'first install does not reload (nothing stale to replace)',
  decideOnControllerChange({ hadController: false, audioPlaying: false, alreadyReloaded: false }) === 'ignore'
);
check(
  'update with a controller reloads',
  decideOnControllerChange({ hadController: true, audioPlaying: false, alreadyReloaded: false }) === 'reload'
);
check(
  'audio playing downgrades a reload to a prompt',
  decideOnControllerChange({ hadController: true, audioPlaying: true, alreadyReloaded: false }) === 'prompt'
);
check(
  'second update in one tab prompts instead of looping',
  decideOnControllerChange({ hadController: true, audioPlaying: false, alreadyReloaded: true }) === 'prompt'
);
check(
  'audio plus an earlier reload still prompts (no reload loop for listeners)',
  decideOnControllerChange({ hadController: true, audioPlaying: true, alreadyReloaded: true }) === 'prompt'
);
check('reload marker key is stable', RELOAD_MARKER === 'ellars_sw_reloaded_at', RELOAD_MARKER);
check(
  'a quiet registration is current',
  isRegistrationCurrent({ installing: null, waiting: null }) === true
);
check('an installing worker is not current', isRegistrationCurrent({ installing: {}, waiting: null }) === false);
check('a waiting worker is not current', isRegistrationCurrent({ installing: null, waiting: {} }) === false);
check('missing registration is not current', isRegistrationCurrent(null) === false);

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error(failures.map((line) => ` - ${line}`).join('\n'));
  process.exit(1);
}
