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