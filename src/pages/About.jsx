import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SafeIcon from "../common/SafeIcon";
import { useAppStore } from '@/store/useAppStore';
import { submitBookingInquiry } from '@/lib/email';


const ImageWithSkeleton = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <div className="relative w-full h-full">
      {!isLoaded && (
        <div className={`absolute inset-0 z-0 animate-pulse bg-gray-200 ${className}`}></div>
      )}
      <img
        loading="lazy"
        src={src}
        alt={alt}
        className={`relative z-10 rounded-lg shadow-md ${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

const About = () => {
  const { showToast } = useAppStore();

  const handleAssetDownload = (assetName) => {
    showToast(`// DOWNLOADING: ${assetName}`);
  };

  const [bookingForm, setBookingForm] = useState({
    name: '',
    organization: '',
    email: '',
    type: 'General',
    details: ''
  });
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);


  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setIsBookingSubmitting(true);

    const payload = {
      source: 'media_booking',
      ...bookingForm
    };

    console.log('[Telemetry] Booking payload:', payload);

    try {
      await submitBookingInquiry(payload);
      showToast('// INQUIRY TRANSMITTED');
      setBookingForm({
        name: '',
        organization: '',
        email: '',
        type: 'General',
        details: ''
      });
    } catch (error) {
      showToast('// TRANSMISSION FAILED');
      console.error(error);
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingForm(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    document.title = "About James Ellars | Bridging Main Street";
    window.scrollTo(0, 0);

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = "Discover James Ellars: From a working class foundation to an 18-year career in business development. Bridging Main Street through healthcare reform and overturning Citizens United for a People-First Economy.";
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <div className="overflow-x-hidden pt-32 pb-20 min-h-screen bg-transparent space-y-32 py-24 bg-grid">
      <Helmet>
        <meta name="robots" content="index, follow" />
        <title>About James Ellars | Bridging Main Street</title>
        <meta
          name="description"
          content="Discover James Ellars: From a working class foundation to an 18-year career in business development. Bridging Main Street through healthcare reform and overturning Citizens United for a People-First Economy."
        />
        <meta
          property="og:description"
          content="The comprehensive profile of James Ellars—bridging the gap between working-class grit and forward-thinking American innovation."
        />
        <meta
          name="twitter:description"
          content="The comprehensive profile of James Ellars—bridging the gap between working-class grit and forward-thinking American innovation."
        />
        <meta
          property="og:image"
          content="https://wp.axim.us.com/wp-content/uploads/2026/04/1776866096564_04266f9841304c5e8d53190e26a26e95.webp?v=1.1"
        />

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
                "Economic Equity",
                "Automation Dividend",
                "Business Development Specialist",
                "Civic Infrastructure",
                "Vital System Protection",
                "Taxation Parity",
                "Digital Data Rights",
                "Housing Sovereignty",
                "Green Transportation Systems",
                "People-First Economy",
                "All-American Tax Credit",
                "Supply Chain Automation",
                "Logistics Systems Inefficiencies",
                "Logistics Efficiency Protocols",
                "Sovereign Innovation"
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
            <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-widest font-bold">
              The Blueprint of Advocacy
            </span>
          </div>
          <h1 className="font-deco font-normal text-white uppercase tracking-wider text-5xl md:text-7xl leading-tight mb-4">
            MEET JAMES
          </h1>
          <h2 className="text-yellow-electric text-2xl font-editorial font-bold mb-6">
            A New Kind of Working-Class Advocate
          </h2>
          <p className="text-text-muted max-w-3xl text-lg md:text-xl font-light leading-relaxed first-letter:text-5xl first-letter:font-deco first-letter:text-yellow-electric first-letter:float-left first-letter:mr-3">
            Analyzing the modern shift away from rigid party lines toward a
            human-centric economy, this profile outlines the foundational roots
            and forward-thinking directives of a blue-collar advocate focused on
            sustainable systems and forward-thinking ideas.
          </p>
        </motion.div>
      </section>

      {/* Section 01: High Desert Roots and a Blue-Collar Legacy */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 pb-4 border-b border-white/5 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-yellow-electric/30 after:to-transparent">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon
              name="MapPin"
              className="w-6 h-6 mr-4 text-yellow-electric"
            />
            01. High Desert Roots and a Blue-Collar Legacy
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-12 gap-12 items-center"
        >
          <motion.div
            variants={itemVariants}
            className="col-span-12 md:col-span-7 interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group"
          >
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              Born in February 1989 in Victorville, California, and growing up in Hesperia as the fourth of six children to John and Kandie Ellars, James's foundation was built on physical resilience and community.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              His grandfather, Bill Ellars, founded Ellars Trucking in the 1980s, establishing a strong family legacy in business and blue-collar work. This local, grassroots operation—navigating as a family-first business—stood in stark contrast to the massive corporate monopolies of today. James grew up witnessing the rapid evolution of this industry from grounded, human-operated fleets into the automated, AI-driven logistics networks of today. He saw firsthand the shift from family-run local businesses fueling our economy to the current reality of stockholder-driven corporate monopolies attempting to control every aspect of the market. This experience served as a permanent catalyst for his future-of-work focus, directly informing his stance on{" "}
              <Link
                to="/platform/the-automation-dividend-and-taxation"
                className="relative inline-block px-1 py-0.5 rounded hover:bg-gray-100 transition-colors"
              >
                Directive 02: The Automation Dividend
              </Link>
              .
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="col-span-12 md:col-span-5 deco-frame w-full max-w-full overflow-hidden bg-void/50 rounded-sm border border-white/5 shadow-2xl">
              <ImageWithSkeleton
                src="https://wp.axim.us.com/wp-content/uploads/2026/05/Ellars-Inc-Logo-Pic.webp?v=1.1"
                alt="Ellars Inc Legacy Fleet"
                className="w-full aspect-[598/598] object-cover transition-transform duration-500 hover:scale-102"
              />
            </motion.div>
        </motion.div>
      </section>

      <div className="deco-divider"></div>
      {/* Section 02: Bridging Main Street and the Corporate World */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 pb-4 border-b border-white/5 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-yellow-electric/30 after:to-transparent">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon
              name="Briefcase"
              className="w-6 h-6 mr-4 text-yellow-electric"
            />
            02. Bridging Main Street and the Corporate World
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-12 gap-12 items-center"
        >
          <motion.div variants={itemVariants} className="col-span-12 md:col-span-4 deco-frame w-full max-w-full overflow-hidden bg-void/50 rounded-sm border border-white/5 shadow-2xl">
            <ImageWithSkeleton
              src="https://wp.ellars.us.com/wp-content/uploads/2026/06/Screenshot_20251223-145124.webp?v=1.1"
              alt="Bridging Main Street and Corporate"
              className="w-full aspect-[1080/1659] object-cover object-top transition-transform duration-500 hover:scale-102"
            />
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="col-span-12 md:col-span-8 interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group"
          >
            <h4 className="font-deco uppercase tracking-wide text-yellow-electric text-xl mb-4">
              A Unique Perspective on Regional Economies
            </h4>
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4 italic text-white/70">
              Transitioning from this grounded background into the corporate
              sector shaped his unique perspective on regional economies.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              With an 18-year career in Business Development and Marketing,
              James has effectively bridged the gap between local enterprise and
              broad corporate strategies. His tenure on the Board of Directors
              for the Adelanto Chamber of Commerce (2014–2016) provided critical
              insights into civic infrastructure and small business advocacy.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed">
              Extensive nationwide travel across his business development
              footprint allowed him to monitor the real-time toll of
              globalization firsthand. Watching capital accumulate in coastal
              corporate centers while regional agricultural hubs and industrial
              towns were hollowed out fundamentally shaped his perspective on
              corporate accountability. He holds a firm stance of demanding
              structural economic parity without relying on hollow
              anti-corporate buzzwords. Observing the displacement of
              working-class families due to this systemic imbalance solidified
              his focus on{" "}
              <Link
                to="/platform/future-infrastructure"
                className="relative inline-block px-1 py-0.5 rounded hover:bg-gray-100 transition-colors"
              >
                Directive 06: Housing Sovereignty
              </Link>
              .
            </p>
          </motion.div>
        </motion.div>
      </section>

      <div className="deco-divider"></div>
      {/* Section 03: Taking on the Establishment — The 2020 Campaign */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 pb-4 border-b border-white/5 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-yellow-electric/30 after:to-transparent">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon
              name="TrendingUp"
              className="w-6 h-6 mr-4 text-yellow-electric"
            />
            03. Taking on the Establishment — The 2020 Campaign
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid lg:grid-cols-12 gap-12 items-start"
        >
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-5 deco-frame w-full max-w-full overflow-hidden bg-void/50 rounded-sm border border-white/5 shadow-2xl relative group/image">
            <ImageWithSkeleton
              src="https://wp.ellars.us.com/wp-content/uploads/2026/06/IMG_7556.webp?v=1.1"
              alt="Taking on the establishment"
              className="w-full aspect-[2208/1242] object-cover transition-transform duration-500 group-hover/image:scale-102"
            />
          </motion.div>
          <motion.div className="col-span-12 lg:col-span-7 flex flex-col gap-12">
            <motion.div
              variants={itemVariants}
              className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group"
            >
              <p className="text-text-muted font-light text-sm leading-relaxed">
                In 2020, James launched a frugal "tester campaign" for the U.S.
                House of Representatives in California's 8th Congressional
                District. The campaign proved that widespread community engagement
                doesn't require exorbitant corporate funding. He achieved maximum
                name recognition with minimal spending through a strategy of
                "minimum money raised and minimum events."
              </p>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20 transition-all duration-500 hover:-translate-y-1 hover:border-yellow-electric group">
                <div className="font-mono text-[10px] uppercase text-gray-600 tracking-widest mb-2 group-hover:text-yellow-electric transition-colors">
                  Campaign Raised
                </div>
                <div className="font-editorial text-3xl font-black text-white">
                  $2,056{" "}
                  <span className="text-sm text-yellow-electric font-mono">
                    .20
                  </span>
                </div>
              </div>
              <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20 transition-all duration-500 hover:-translate-y-1 hover:border-yellow-electric group">
                <div className="font-mono text-[10px] uppercase text-gray-600 tracking-widest mb-2 group-hover:text-yellow-electric transition-colors">
                  Campaign Spent
                </div>
                <div className="font-editorial text-3xl font-black text-white">
                  $1,890{" "}
                  <span className="text-sm text-yellow-electric font-mono">
                    .25
                  </span>
                </div>
              </div>
              <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20 transition-all duration-500 hover:-translate-y-1 hover:border-yellow-electric group">
                <div className="font-mono text-[10px] uppercase text-gray-600 tracking-widest mb-2 group-hover:text-yellow-electric transition-colors">
                  Total Votes
                </div>
                <div className="font-editorial text-3xl font-black text-white">
                  ~4,000{" "}
                </div>
              </div>
              <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20 transition-all duration-500 hover:-translate-y-1 hover:border-yellow-electric group">
                <div className="font-mono text-[10px] uppercase text-gray-600 tracking-widest mb-2 group-hover:text-yellow-electric transition-colors">
                  Cost Efficiency
                </div>
                <div className="font-editorial text-3xl font-black text-white">
                  $0.48{" "}
                  <span className="text-sm text-yellow-electric font-mono uppercase">
                    / Vote
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <div className="deco-divider"></div>
      {/* Section 04: Activism in an Age of Crisis */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 pb-4 border-b border-white/5 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-yellow-electric/30 after:to-transparent">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon
              name="AlertCircle"
              className="w-6 h-6 mr-4 text-yellow-electric"
            />
            04. Activism in an Age of Crisis
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-12 gap-12 items-center"
        >
          <motion.div
            variants={itemVariants}
            className="col-span-12 md:col-span-7 interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group"
          >
            <p className="text-text-muted font-light text-sm leading-relaxed mb-4">
              During the unprecedented challenges of the pandemic, James engaged
              in robust public advocacy. He quickly pivoted to heavily criticize
              the direct one-time relief checks of the HEROES Act (May 2020) as
              entirely insufficient for the sustained economic devastation faced
              by working families.
            </p>
            <p className="text-text-muted font-light text-sm leading-relaxed">
              Beyond policy critique, he took active public alignment with
              striking workers and participated in nationwide protests for
              racial justice. His stance was clear: framing economic empowerment
              as the ultimate mechanism for achieving true social equity.
            </p>
          </motion.div>
          <motion.div variants={itemVariants} className="col-span-12 md:col-span-5 deco-frame w-full max-w-full overflow-hidden bg-void/50 rounded-sm border border-white/5 shadow-2xl relative group/image">
            <ImageWithSkeleton
              src="https://wp.ellars.us.com/wp-content/uploads/2026/06/Screenshot_20260422-091225.webp?v=1.1"
              alt="Activism in an Age of Crisis"
              className="w-full aspect-[864/874] object-cover transition-transform duration-500 group-hover/image:scale-102"
            />
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-end p-4 pointer-events-none">
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-mono">Archived correspondence, 2020</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <div className="deco-divider"></div>
      {/* Section 05: A Blueprint for the Future: The People-First Economy */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 pb-4 border-b border-white/5 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-yellow-electric/30 after:to-transparent">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon
              name="FileText"
              className="w-6 h-6 mr-4 text-yellow-electric"
            />
            05. A Blueprint for the Future: The People-First Economy
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div
            variants={itemVariants}
            className="interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group"
          >
            <p className="text-text-muted font-light text-sm leading-relaxed mb-6">
              Connecting his corporate background with the framework of a
              "People-First Economy", James argues that progress must be
              measured by human prosperity rather than decoupled stock market
              metrics or GDP. The cornerstone of his platform is the structural
              implementation mechanics of the All-American Tax Credit. This
              flagship proposal establishes a $12,000 annual tax credit
              delivered in predictable $1,000 monthly installments designed to
              avoid the welfare trap.
            </p>
                        <blockquote className="relative border-l-4 border-yellow-electric bg-white/5 p-6 md:p-8 my-12 font-deco text-lg md:text-xl italic text-white/90 max-w-3xl rounded-r-sm shadow-lg">
              <svg className="absolute -left-3 -top-3 w-8 h-8 text-white/10" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              "We can no longer measure our country's success solely by the
              stock market or GDP. If corporate profits are hitting record highs
              but everyday families can't afford housing, the system is broken."
            </blockquote>
            <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-[#4ade80]/20 mb-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#4ade80] group">
              <h4 className="text-white font-editorial text-xl font-bold mb-2 group-hover:text-[#4ade80] transition-colors">
                The Automation Dividend
              </h4>
              <p className="text-text-muted font-light text-sm leading-relaxed">
                This massive social contract is not funded by taxing the working
                class, but directly through the Automation Dividend—taxing tech
                monopolies like Amazon and Walmart that freely extract consumer
                data and displace labor pools using public networks. They must
                pay a higher premium on what they hold to ensure stability for
                the displaced workforce.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <div className="deco-divider"></div>
      {/* Section 06 [SECOND TO LAST]: Lessons from the Gridiron */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 pb-4 border-b border-white/5 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-yellow-electric/30 after:to-transparent">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon
              name="Shield"
              className="w-6 h-6 mr-4 text-yellow-electric"
            />
            06. Lessons from the Gridiron
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-12 gap-12 items-start"
        >
          <motion.div
            variants={itemVariants}
            className="col-span-12 md:col-span-8 interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group"
          >
            <p className="text-text-muted font-light text-sm leading-relaxed">
              Graduating from Sultana High School in 2007, James was a standout
              student-athlete and captain of the football and track & field
              teams. Playing tight end and outside linebacker for the Sultana
              Sultans under Coach Justin Price, high school sports in
              working-class towns served as a vital training ground for
              psychological resilience. His time on the gridiron instilled a
              deep understanding of strategy, endurance, and leading by example
              under immense pressure.
            </p>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="col-span-12 md:col-span-4 flex flex-col gap-4"
          >
            <div className="bg-surface border border-white/5 p-6 rounded-sm border-b-yellow-electric/20 transition-all duration-500 hover:-translate-y-1 hover:border-yellow-electric group">
              <div className="font-mono text-[10px] uppercase text-gray-600 tracking-widest mb-2 group-hover:text-yellow-electric transition-colors">
                Sultana High Defense
              </div>
              <div className="font-editorial text-4xl font-black text-white">
                132{" "}
                <span className="text-sm font-mono uppercase text-text-muted">
                  Total Tackles
                </span>
              </div>
              <p className="text-xs text-text-muted font-light mt-2">
                Senior season average of 12 total tackles per game under
                pressure.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <div className="deco-divider"></div>
      {/* Section 07 [CONCLUSION]: The Road Ahead */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="mb-12 pb-4 border-b border-white/5 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-yellow-electric/30 after:to-transparent">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon
              name="Activity"
              className="w-6 h-6 mr-4 text-yellow-electric"
            />
            07. The Road Ahead
          </h3>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-12 gap-12 items-center"
        >
          <motion.div variants={itemVariants} className="col-span-12 md:col-span-5 deco-frame w-full max-w-full overflow-hidden bg-void/50 rounded-sm border border-white/5 shadow-2xl relative group/image">
            <ImageWithSkeleton
              src="https://wp.ellars.us.com/wp-content/uploads/2026/06/IMG_20260328_141917_696.webp?v=1.1"
              alt="The Road Ahead"
              className="w-full aspect-[2048/2048] object-cover transition-transform duration-500 group-hover/image:scale-102"
            />
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-end p-4 pointer-events-none">
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-mono">The Road Ahead</span>
            </div>
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="col-span-12 md:col-span-7 interactive-card p-8 bg-black/40 backdrop-blur-sm relative overflow-hidden group"
          >
            <p className="text-text-muted font-light text-sm leading-relaxed">
              In conclusion, James Ellars's political brand combines authentic
              High Desert roots with a sophisticated grasp of advanced tax
              policy, AI logistics, and global economics to prepare
              working-class families for the future. He stands as a vanguard for
              economic equity, ready to navigate the complex intersection of
              main street reality and systemic reform.
            </p>
            <div className="mt-8 pt-8 border-t border-white/10 text-center md:text-left">
              <Link to="/platform" className="btn-gold inline-block">
                VIEW FULL STRATEGIC PLATFORM
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <div className="deco-divider"></div>
      {/* OFFICIAL PRESS ASSETS */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="mb-12 pb-4 border-b border-white/5 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-yellow-electric/30 after:to-transparent">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="Download" className="w-6 h-6 mr-4 text-yellow-electric" />
            Official Press Assets
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            variants={itemVariants}
            className="deco-frame p-6 flex flex-col justify-between group border border-white/10 hover:border-yellow-electric/30 transition-colors"
          >
            <div>
              <div className="bg-gray-800 text-gray-600 text-[10px] uppercase font-mono tracking-widest px-2 py-1 inline-block mb-4 rounded-sm">
                .ZIP ARCHIVE
              </div>
              <h4 className="font-editorial text-xl text-white font-bold mb-2">High-Resolution Headshots</h4>
              <p className="text-text-muted text-sm font-light mb-6">
                Official high-resolution photography for media use. Includes standard and isolated subjects.
              </p>
            </div>
            <button
              onClick={() => handleAssetDownload('HEADSHOTS_ARCHIVE.ZIP')}
              className="w-full border border-yellow-electric/30 text-yellow-electric text-xs tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors py-3 font-bold rounded-sm text-center"
            >
              Download Asset 01
            </button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="deco-frame p-6 flex flex-col justify-between group border border-white/10 hover:border-yellow-electric/30 transition-colors"
          >
            <div>
              <div className="bg-gray-800 text-gray-600 text-[10px] uppercase font-mono tracking-widest px-2 py-1 inline-block mb-4 rounded-sm">
                .PDF DOCUMENT
              </div>
              <h4 className="font-editorial text-xl text-white font-bold mb-2">Official Biographical Brief</h4>
              <p className="text-text-muted text-sm font-light mb-6">
                Standardized biographic summary, legislative priorities, and platform statistics.
              </p>
            </div>
            <button
              onClick={() => handleAssetDownload('BIOGRAPHICAL_BRIEF.PDF')}
              className="w-full border border-yellow-electric/30 text-yellow-electric text-xs tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors py-3 font-bold rounded-sm text-center"
            >
              Download Asset 02
            </button>
          </motion.div>
        </div>
      </section>

      <div className="deco-divider"></div>
      {/* BOOKING & MEDIA INQUIRIES */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="mb-12 pb-4 border-b border-white/5 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-yellow-electric/30 after:to-transparent">
          <h3 className="font-editorial text-3xl text-white uppercase font-bold flex items-center">
            <SafeIcon name="Mail" className="w-6 h-6 mr-4 text-yellow-electric" />
            Booking & Media Inquiries
          </h3>
        </div>

        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="deco-frame bg-surface/50 backdrop-blur-md p-8 relative"
          >
            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label htmlFor="bookingName" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">Name *</label>
                  <input
                    type="text"
                    id="bookingName"
                    name="name"
                    required
                    value={bookingForm.name}
                    onChange={handleBookingChange}
                    className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors"
                    disabled={isBookingSubmitting}
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="bookingOrg" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">Organization / Publication *</label>
                  <input
                    type="text"
                    id="bookingOrg"
                    name="organization"
                    required
                    value={bookingForm.organization}
                    onChange={handleBookingChange}
                    className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors"
                    disabled={isBookingSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label htmlFor="bookingEmail" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">Email Address *</label>
                  <input
                    type="email"
                    id="bookingEmail"
                    name="email"
                    required
                    value={bookingForm.email}
                    onChange={handleBookingChange}
                    className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors"
                    disabled={isBookingSubmitting}
                  />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="bookingType" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">Inquiry Type *</label>
                  <select
                    id="bookingType"
                    name="type"
                    required
                    value={bookingForm.type}
                    onChange={handleBookingChange}
                    className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors appearance-none"
                    disabled={isBookingSubmitting}
                  >
                    <option value="Speaking">Speaking</option>
                    <option value="Interview">Interview</option>
                    <option value="Podcast">Podcast</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col">
                <label htmlFor="bookingDetails" className="font-editorial text-[10px] uppercase tracking-widest text-text-muted mb-2">Details *</label>
                <textarea
                  id="bookingDetails"
                  name="details"
                  required
                  rows="4"
                  value={bookingForm.details}
                  onChange={handleBookingChange}
                  className="bg-zinc-900 border border-white/10 text-white px-4 py-3 font-inter text-sm outline-none focus:border-yellow-electric transition-colors resize-none"
                  disabled={isBookingSubmitting}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isBookingSubmitting}
                className="w-full bg-transparent text-yellow-electric border border-yellow-electric px-8 py-4 font-editorial font-bold uppercase tracking-[0.2em] text-xs transition-all duration-300 hover:bg-yellow-electric/10 disabled:opacity-50 relative overflow-hidden text-center mt-4"
              >
                {isBookingSubmitting ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-yellow-electric rounded-full animate-pulse"></span>
                    <span>TRANSMITTING...</span>
                  </span>
                ) : (
                  <span>TRANSMIT INQUIRY</span>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default About;
