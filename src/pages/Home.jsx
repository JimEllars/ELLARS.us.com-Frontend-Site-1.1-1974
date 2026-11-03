import { Helmet } from 'react-helmet-async';
import React from 'react';
import Hero from '@/components/home/Hero';
import Ventures from '@/components/home/Ventures';
import Expertise from '@/components/home/Expertise';
import RantsFeed from '@/components/home/RantsFeed';

import Bio from '@/components/home/Bio';
import Newsletter from '@/components/home/Newsletter';
import LiveBroadcast from '@/components/home/LiveBroadcast';

const Home = () => {
  // The document title and description belong to <Helmet> below, which the edge
  // middleware mirrors in the raw shell (lib/edge/meta.js). This component used to
  // also assign document.title and overwrite <meta name="description"> in an
  // effect, which runs *after* Helmet commits — so the tab said "Ellars for
  // Congress | Home" while the crawler, the canonical <title> and every share card
  // said "Home | James Ellars | Official", and the description a reader's DOM
  // ended up with was not the one the edge wrote. Whichever won depended on effect
  // ordering. One owner, one value.
  //
  // Scroll reset is handled by <ScrollToTop /> in App.jsx for every route.
  return (
    <div className="w-full">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Home | James Ellars | Official</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content="James Ellars | The Blueprint" />
        <meta property="og:image" content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp?v=1.1" />
        <meta property="og:description" content="Leading American Innovation through Sustainable Systems , Forward-Thinking Ideas and a Blue-Collar Work Ethic." />
        <meta name="twitter:description" content="Leading American Innovation through Sustainable Systems , Forward-Thinking Ideas and a Blue-Collar Work Ethic." />
                <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "James Ellars",
              "url": "https://ellars.us.com",
              "knowsAbout": [
                "Economic Equity",
                "Automation Dividend",
                "Business Development Specialist",
                "Civic Infrastructure"
              ]
            }
          `}
        </script>
      </Helmet>
      <Hero />
      <LiveBroadcast />
      <Ventures />
      <RantsFeed />
      <Expertise />

      <Bio />
      <Newsletter />
    </div>
  );
};

export default Home;
