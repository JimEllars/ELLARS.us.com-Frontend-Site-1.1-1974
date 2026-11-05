import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Route metadata (title, description, canonical, og/twitter) is NOT declared here.
 * It comes from STATIC_ROUTES in lib/edge/meta.js via <RouteMeta />, which is the
 * single client writer for route identity. Declaring it again here would recreate
 * the duplicate-metadata defect that Sprint 2.17 removed.
 */

const LAST_UPDATED = '5 November 2026';

const Section = ({ title, children }) => (
  <section className="mb-14">
    <h2 className="font-editorial font-black text-lg md:text-2xl text-white uppercase tracking-tight mb-5">
      {title}
    </h2>
    <div className="space-y-4 text-text-muted font-light text-sm md:text-base leading-relaxed">
      {children}
    </div>
  </section>
);

const Privacy = () => {
  return (
    <div className="min-h-screen bg-void pt-32 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-yellow-electric mb-4">
            // Privacy
          </p>
          <h1 className="font-editorial font-black text-4xl md:text-6xl text-white uppercase tracking-tighter mb-6">
            Privacy Policy
          </h1>
          <p className="text-text-main font-light text-sm md:text-base leading-relaxed mb-3">
            Plain language, and it describes what this site actually does rather than what
            a template says it should.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-16">
            Last updated {LAST_UPDATED} &middot; Version 1
          </p>

          <Section title="Who this covers">
            <p>
              ellars.us.com is run by James Ellars as an independent policy and advocacy
              initiative. It is not a campaign committee. This policy covers this website
              only. The Discord community has its own rules, published inside the server,
              and the platforms you arrive from &mdash; TikTok, Instagram, Threads, YouTube
              &mdash; are governed by their own policies.
            </p>
          </Section>

          <Section title="What we collect, and when">
            <p>
              <strong className="text-white font-medium">If you only read.</strong> We record
              performance and error telemetry: the type of event, its severity, which part of
              the site produced it, an error message where one exists, whether your device
              reported being online, and a project identifier. We do not attach your name,
              your email, or a cross-site identifier to any of it. We also use Cloudflare&rsquo;s
              cookie-less web analytics for aggregate visit counts, and Cloudflare Turnstile
              to tell humans from bots on the forms.
            </p>
            <p>
              <strong className="text-white font-medium">If you subscribe.</strong> We store
              your email address, and a Turnstile token proving the form was filled by a
              person. That is the whole record.
            </p>
            <p>
              <strong className="text-white font-medium">If you send an inquiry.</strong> We
              store your name, organisation, email address, the type of inquiry you selected,
              and whatever you write in the message.
            </p>
            <p>
              <strong className="text-white font-medium">If you hold an account.</strong> Sign-in
              is handled by Supabase, which stores your email address and a password hash. We
              never see your password. Anything you upload or save in the dashboard &mdash; media,
              drafts, vault entries &mdash; is stored against that account.
            </p>
            <p>
              <strong className="text-white font-medium">If you try to contribute.</strong>{' '}
              Contributions are not open. No payment details are collected anywhere on this
              site, and there is no payment processor connected to it.
            </p>
          </Section>

          <Section title="What we do not do">
            <p>
              No advertising networks. No selling or renting data to anyone, including data
              brokers. No cross-site tracking and no advertising profiles. No email list
              sold, shared or swapped. If that ever changes, this page changes first and the
              change is announced &mdash; not buried.
            </p>
          </Section>

          <Section title="Who handles your data, and why">
            <p>Each of these receives only what its job requires:</p>
            <ul className="space-y-2 mt-2">
              <li>
                <strong className="text-white font-medium">Cloudflare</strong> &mdash; hosting,
                the cookie-less analytics, bot protection, and video delivery.
              </li>
              <li>
                <strong className="text-white font-medium">Supabase</strong> &mdash; sign-in,
                database, and file storage.
              </li>
              <li>
                <strong className="text-white font-medium">EmailIt</strong> &mdash; newsletter
                delivery, which necessarily receives your email address.
              </li>
              <li>
                <strong className="text-white font-medium">Google Fonts</strong> &mdash; the
                typefaces on this site.
              </li>
              <li>
                <strong className="text-white font-medium">WordPress</strong> &mdash; the
                article archive and its images.
              </li>
              <li>
                <strong className="text-white font-medium">Unsplash, YouTube and Pod.co</strong>{' '}
                &mdash; placeholder imagery and embedded audio and video, which load only on the
                pages that use them.
              </li>
            </ul>
          </Section>

          <Section title="One thing worth being explicit about: the fonts">
            <p>
              The typefaces are served by Google&rsquo;s font service, which means Google receives
              a request &mdash; including your IP address &mdash; when you load a page here. It is the
              one third-party request that happens on every visit, whether or not you interact
              with anything.
            </p>
            <p>
              It is disclosed rather than hidden because a privacy notice that omits the one
              request that always happens is not a privacy notice. The fix is to serve the
              fonts ourselves; when that is done, this section is deleted and the date at the
              top changes.
            </p>
          </Section>

          <Section title="Cookies and local storage">
            <p>
              There are no advertising cookies and no third-party tracking cookies. What
              exists is stored in your own browser:
            </p>
            <ul className="space-y-2 mt-2">
              <li>Your privacy acknowledgement and interface preferences, in local storage.</li>
              <li>A session token if you sign in, so you are not asked every visit.</li>
              <li>
                Page-engagement counters in session storage &mdash; time on page, scroll depth,
                calculator use &mdash; which are cleared when you close the tab.
              </li>
              <li>
                A service-worker cache of the site&rsquo;s own files, so it works offline and loads
                quickly on a poor connection.
              </li>
            </ul>
            <p>
              None of it follows you to other sites. Clearing site data in your browser
              removes all of it.
            </p>
          </Section>

          <Section title="How long we keep it">
            <p>
              No fixed retention schedule is claimed here, because one is not yet enforced
              &mdash; and a number nobody honours is worse than an honest sentence. In practice:
              telemetry is kept while it remains useful for fixing the site; your email is kept
              until you unsubscribe; an inquiry is kept until it is resolved; account data is
              kept until you ask for it to be deleted. You can ask sooner, for any of it.
            </p>
          </Section>

          <Section title="Your choices">
            <p>
              You can ask what we hold about you, ask for a copy, ask for it corrected, ask
              for it deleted, and withdraw any consent you have given. Use the inquiry form on
              the <Link to="/about" className="text-yellow-electric underline decoration-yellow-electric/30 hover:decoration-yellow-electric">About page</Link>{' '}
              and mark the inquiry type as Privacy. If you need a formal legal contact or a
              postal address, ask through that form and it will be provided.
            </p>
          </Section>

          <Section title="Children">
            <p>
              This site is not directed at children under 13 and we do not knowingly collect
              their information. The Discord server is 13+, and its volunteer and candidate
              areas are 18+.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              The date at the top of this page is the version. Material changes are announced
              in the newsletter and in the Discord <code className="text-yellow-electric">#announcements</code>{' '}
              channel, not made quietly.
            </p>
          </Section>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy;
