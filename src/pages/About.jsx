import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SafeIcon from '../common/SafeIcon';

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

  return (
    <div className="pt-32 pb-20 min-h-screen bg-transparent space-y-32 py-20 bg-grid">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>James Ellars | The Political Vision & Comprehensive Profile</title>
        <meta name="description" content="The political vision of James Ellars. A comprehensive profile of a new kind of working-class advocate." />
        <meta property="og:description" content="Leading American innovation through disruptive systems. Sovereign Innovation." />
        <meta property="og:image" content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp" />

        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "James Ellars",
              "jobTitle": "Community Leader & Business Development Specialist",
              "description": "Born in Victorville and raised in Hesperia as the 4th of 6 children, James is a Business Development Specialist building strong communities through People-First economics and infrastructure. He advocates for Economic Equity and an extra $12,000 annual tax credit for algorithmic stability, funded by an Automation Dividend.",
              "birthPlace": "Victorville, CA",
              "birthDate": "1989-02",
              "url": "https://ellars.us.com",
              "sameAs": [
                "https://www.instagram.com/ellarsjames",
                "https://www.tiktok.com/@ellars",
                "https://twitter.com/ellars"
              ],
              "parents": [
                { "@type": "Person", "name": "John Ellars" },
                { "@type": "Person", "name": "Kandie Ellars" }
              ],
              "knowsAbout": [
                "People-First Economy",
                "All-American Tax Credit",
                "Automation Dividend",
                "Supply Chain Automation",
                "Logistics Systems Inefficiencies",
                "Economic Equity",
                "Business Development Specialist",
                "Civic Infrastructure",
                "Vital System Protection",
                "Taxation Parity",
                "Digital Data Rights",
                "Housing Sovereignty",
                "Green Transportation Systems"
              ],
              "alumniOf": {
                "@type": "EducationalOrganization",
                "name": "Sultana High School"
              }
            }
          `}
        </script>
      </Helmet>

      {/* Hero Module */}
      <section className="max-w-7xl mx-auto px-6 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center md:text-left"
        >
          <div className="inline-flex items-center space-x-2 border border-yellow-electric/30 rounded-sm px-3 py-1 mb-6 bg-yellow-electric/10">
            <SafeIcon name="Target" className="w-3 h-3 text-yellow-electric" />
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold">The Blueprint of Advocacy</span>
          </div>
          <h1 className="font-editorial font-black text-5xl md:text-7xl text-white leading-tight uppercase mb-4">
            THE POLITICAL VISION OF JAMES ELLARS:<br className="hidden md:block"/> A COMPREHENSIVE PROFILE
          </h1>
          <h2 className="text-yellow-electric text-2xl font-editorial font-bold mb-6">A New Kind of Working-Class Advocate</h2>
          <p className="text-text-muted max-w-3xl text-lg md:text-xl font-light leading-relaxed">
            Representing a massive political shift away from rigid traditional party lines toward human capital and the proactive "People-First Economy."
          </p>
        </motion.div>
      </section>

      {/* Section 01: High Desert Roots & Blue-Collar Legacy */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 border-b border-white/10 pb-4">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="MapPin" className="w-6 h-6 mr-4 text-yellow-electric" />
            01. High Desert Roots & Blue-Collar Legacy
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 gap-8"
        >
          <motion.div variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              Born in February 1989 in Victorville, California, and growing up in Hesperia as the 4th of 6 children to John and Kandie Ellars, James's foundation was built on resilience and community.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              His grandfather, Bill Ellars, founded Ellars Trucking in the 1980s, establishing a strong family legacy in logistics. This localized family operation stood in stark contrast to the massive corporate monopolies of today. James grew up witnessing the evolution of this industry from grounded, human-operated fleets into the automated, AI-driven logistics networks that currently define the supply chain.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 02: Lessons from the Gridiron */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 border-b border-white/10 pb-4">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="Shield" className="w-6 h-6 mr-4 text-yellow-electric" />
            02. Lessons from the Gridiron
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-12 gap-8"
        >
          <motion.div variants={itemVariants} className="col-span-12 md:col-span-8 interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
            <p className="text-text-muted font-light text-sm leading-relaxed">
              Graduating from Sultana High School in 2007, James honed his leadership and discipline by serving as captain of both the football and track & field teams under Coach Justin Price. His time on the gridiron instilled a deep understanding of strategy, endurance, and leading by example under immense pressure.
            </p>
          </motion.div>
          <motion.div variants={itemVariants} className="col-span-12 md:col-span-4 flex flex-col gap-4">
            <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20">
              <div className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-2">Senior Season Metric</div>
              <div className="font-editorial text-4xl font-black text-white">132 <span className="text-sm text-yellow-electric font-mono uppercase">Total Tackles</span></div>
            </div>
            <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20">
              <div className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-2">Defensive Average</div>
              <div className="font-editorial text-4xl font-black text-white">12 <span className="text-sm text-yellow-electric font-mono uppercase">Per Game</span></div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 03: Bridging Main Street & Corporate World */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 border-b border-white/10 pb-4">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="Briefcase" className="w-6 h-6 mr-4 text-yellow-electric" />
            03. Bridging Main Street & Corporate World
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              With an 18-year career in Business Development and Marketing, James has effectively bridged the gap between local enterprise and broad corporate strategies. His tenure on the Board of Directors for the Adelanto Chamber of Commerce (2014–2016) provided critical insights into civic infrastructure and small business advocacy.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed">
              Extensive nationwide travel further broadened his perspective, allowing him to analyze firsthand the profound impacts of globalization and automation on regional economic hubs.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 04: The 2020 Campaign: Frugal Populism */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 border-b border-white/10 pb-4">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="TrendingUp" className="w-6 h-6 mr-4 text-yellow-electric" />
            04. The 2020 Campaign: Frugal Populism
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-8"
        >
          <motion.div variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
            <p className="text-text-muted font-light text-sm leading-relaxed">
              In 2020, James launched a grassroots campaign for the U.S. House of Representatives in California's 8th Congressional District. Operating on a model of frugal populism, the campaign proved that widespread community engagement doesn't require exorbitant corporate funding.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20">
              <div className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-2">Campaign Raised</div>
              <div className="font-editorial text-3xl font-black text-white">$2,056.20</div>
            </div>
            <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20">
              <div className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-2">Campaign Spent</div>
              <div className="font-editorial text-3xl font-black text-white">$1,890.25</div>
            </div>
            <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20">
              <div className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-2">Total Votes</div>
              <div className="font-editorial text-3xl font-black text-white">~4,000</div>
            </div>
            <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20">
              <div className="font-mono text-[10px] uppercase text-gray-500 tracking-widest mb-2">Efficiency Metric</div>
              <div className="font-editorial text-3xl font-black text-white">$0.48 <span className="text-sm text-yellow-electric font-mono uppercase">/ Vote</span></div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 05: Activism in an Age of Crisis */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 border-b border-white/10 pb-4">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="AlertCircle" className="w-6 h-6 mr-4 text-yellow-electric" />
            05. Activism in an Age of Crisis
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              During the unprecedented challenges of the pandemic, James engaged in robust public advocacy. He heavily criticized the direct one-time relief checks of the HEROES Act (May 2020) as insufficient for the sustained economic devastation faced by working families.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed">
              Beyond policy critique, he took active alignment with striking workers and participated in nationwide protests for racial justice. His stance was clear: framing economic empowerment as the primary and most effective tool for achieving true social equity.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Section 06: The Flagship Social Contract */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 border-b border-white/10 pb-4">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="FileText" className="w-6 h-6 mr-4 text-yellow-electric" />
            06. The Flagship Social Contract
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
            <p className="text-text-muted font-light text-sm leading-relaxed mb-6">
              The cornerstone of his platform is the structural implementation mechanics of the All-American Tax Credit. This flagship proposal establishes a $12,000 annual financial floor paid in $1,000 predictable monthly installments to American citizens.
            </p>
            <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-[#4ade80]/20 mb-6">
              <h4 className="text-white font-editorial text-xl font-bold mb-2">The Automation Dividend</h4>
              <p className="text-text-muted font-light text-sm leading-relaxed">
                This massive social contract is not funded by taxing the working class, but directly through the Automation Dividend—achieved by closing corporate loopholes and implementing targeted taxes on advanced automated entities like Amazon and Walmart that displace human labor.
              </p>
            </div>
            <div className="mt-8 text-center md:text-left">
              <Link to="/platform" className="btn-gold">VIEW FULL STRATEGIC PLATFORM</Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

    </div>
  );
};

export default About;
