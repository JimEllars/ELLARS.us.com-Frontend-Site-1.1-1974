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
        <meta name="description" content="Enterprise-level influencer and thought-leader platform for James Ellars." />
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