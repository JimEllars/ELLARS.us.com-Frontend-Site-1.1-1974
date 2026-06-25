import { Helmet } from 'react-helmet-async';
import React, { useEffect } from 'react';
import Hero from '@/components/home/Hero';
import Ventures from '@/components/home/Ventures';
import Expertise from '@/components/home/Expertise';
import RantsFeed from '@/components/home/RantsFeed';
import Podcast from '@/components/home/Podcast';
import Bio from '@/components/home/Bio';
import Newsletter from '@/components/home/Newsletter';

const Home = () => {
  useEffect(() => {
    document.title = "Ellars for Congress | Home";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="w-full">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>Home | James Ellars | Official</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content="James Ellars | The Blueprint" />
        <meta property="og:image" content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp?v=1.1" />
        <meta name="description" content="Leading American Innovation through Sustainable Systems , Forward-Thinking Ideas and a Blue-Collar Work Ethic." />
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
      <Ventures />
      <RantsFeed />
      <Expertise />
      <Podcast />
      <Bio />
      <Newsletter />
    </div>
  );
};

export default Home;
