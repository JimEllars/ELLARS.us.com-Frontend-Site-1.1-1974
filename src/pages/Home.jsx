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
  // Route-level metadata (title, description, robots, og:*, twitter:*, canonical)
  // belongs to <RouteMeta />, which resolves it from the same table the edge
  // middleware uses — see src/lib/headMeta.js for why hand-copied page strings
  // were removed. This page contributes structured data and nothing else.
  //
  // Scroll reset is handled by <ScrollToTop /> in App.jsx for every route.
  return (
    <div className="w-full">
      <Helmet>
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
