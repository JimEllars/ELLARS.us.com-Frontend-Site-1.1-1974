import { Helmet } from 'react-helmet-async';
import React from 'react';
import Hero from '@/components/home/Hero';
import Ventures from '@/components/home/Ventures';
import Expertise from '@/components/home/Expertise';
import RantsFeed from '@/components/home/RantsFeed';
import Podcast from '@/components/home/Podcast';
import Bio from '@/components/home/Bio';
import Newsletter from '@/components/home/Newsletter';

const Home = () => {
  return (
    <div className="w-full">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>James Ellars | The Blueprint</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content="James Ellars | The Blueprint" />
        <meta property="og:image" content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp" />
        <meta name="description" content="Leading American innovation through disruptive systems and algorithmic economic equity. Sovereign Innovation." />
        <meta property="og:description" content="Leading American innovation through disruptive systems. Sovereign Innovation." />
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
      <Ventures />
      <Expertise />
      <RantsFeed />
      <Podcast />
      <Bio />
      <Newsletter />
    </div>
  );
};

export default Home;
