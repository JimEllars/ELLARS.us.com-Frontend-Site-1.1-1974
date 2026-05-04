import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import SafeIcon from '@/common/SafeIcon';

const About = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

    const visionData = [
    {
      title: "The American Tax Credit",
      icon: "DollarSign",
      description: "An extra $12,000 annual tax credit, paid monthly, providing predictability and dignity for families."
    },
    {
      title: "The Automation Dividend",
      icon: "Cpu",
      description: "Closing loopholes and taxing entities that use public infrastructure and automation to replace labor."
    }
  ];

  return (
    <div className="pt-32 pb-20 min-h-screen bg-transparent">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>James Ellars | People-First Economic Vision</title>
        <meta name="description" content="James Ellars - Rooted in reality. Driven by systems. Personal infrastructure and vision." />

        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "James Ellars",
              "jobTitle": "Community Leader & Business Development Specialist",
              "description": "Born in Victorville and raised in Hesperia as the 4th of 6 children, James is a Business Development Specialist building strong communities through People-First economics and infrastructure. He advocates for Economic Equity and an extra $12,000 annual tax credit for algorithmic stability, funded by an Automation Dividend.",
              "birthPlace": "Victorville, CA",
              "url": "https://ellars.us.com",
              "sameAs": [
                "https://www.instagram.com/ellarsjames",
                "https://www.tiktok.com/@ellars",
                "https://twitter.com/ellars"
              ],
              "family": "Raised as the 4th of 6 children."
            }
          `}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center md:text-left"
        >
          <div className="inline-flex items-center space-x-2 border border-yellow-electric/30 rounded-sm px-3 py-1 mb-6 bg-yellow-electric/10">
            <SafeIcon name="Target" className="w-3 h-3 text-yellow-electric" />
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold">Profile Overview</span>
          </div>
          <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight uppercase mb-4">
            ROOTED IN REALITY.<br className="hidden md:block"/> DRIVEN BY SYSTEMS.
          </h1>
          <p className="text-text-muted max-w-3xl text-lg md:text-xl font-light leading-relaxed">
            The logistical challenges of the 2030s require leaders who have actually scaled systems. We do not need career orators; we need Community Leaders.
          </p>
        </motion.div>
      </section>

      {/* Personal Infrastructure */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="mb-12 border-b border-white/10 pb-4">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="Users" className="w-6 h-6 mr-4 text-electric-yellow" />
            Personal Infrastructure
          </h3>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 gap-6"
        >
          <motion.div variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
            <h4 className="text-white font-editorial text-xl font-bold mb-4">ROOTED IN REALITY. DRIVEN BY SYSTEMS.</h4>
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              Born in Victorville and raised in Hesperia as the 4th of 6 children. Experiencing the practical realities of a large family in the High Desert shaped an uncompromising work ethic and a deep understanding of community dynamics. His advocacy was born from a singular drive: ensuring the American Dream remains an accessible reality for the working class, rather than an abstract concept.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed">
              His advocacy is personal, born from a desire to ensure the American Dream remains accessible to the working class. It is not just about policy; it's about building the personal and societal infrastructure that allows every individual the opportunity to thrive.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* The Vision */}
      <section className="py-24 mb-32 -mx-6 px-6 lg:-mx-24 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 border-b border-white/10 pb-4">
            <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
              <SafeIcon name="Compass" className="w-6 h-6 mr-4 text-purple-neon" />
              The Economic Vision
            </h3>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-3 gap-6"
          >
            {visionData.map((item, index) => (
              <motion.div key={index} variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative group">
                <div className="w-12 h-12 bg-white/5 rounded-sm flex items-center justify-center mb-6 transition-colors duration-500 group-hover:bg-yellow-electric/10">
                  <SafeIcon name={item.icon} className="w-6 h-6 text-white transition-colors duration-500 group-hover:text-yellow-electric" />
                </div>
                <h4 className="text-white font-editorial text-xl font-bold mb-4 group-hover:text-yellow-electric transition-colors">{item.title}</h4>
                <p className="text-text-muted font-light text-sm leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
