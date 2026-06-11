import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

const events = [
  {
    id: 1,
    title: "High Desert Townhall",
    date: "OCT 12, 2024",
    time: "18:00 PST",
    location: "Victorville, CA",
  },
  {
    id: 2,
    title: "District 8 Phone Bank",
    date: "OCT 15, 2024",
    time: "14:00 PST",
    location: "Virtual",
  },
  {
    id: 3,
    title: "Los Angeles Automation Summit",
    date: "NOV 02, 2024",
    time: "09:00 PST",
    location: "Los Angeles, CA",
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const Events = () => {
  return (
    <div className="min-h-screen bg-void pt-32 pb-20 px-6">
      <Helmet>
        <title>Events & Itinerary | James Ellars</title>
        <meta name="description" content="Join the grassroots movement. View our official itinerary, townhalls, and policy summits." />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <span className="font-editorial text-[10px] text-yellow-electric uppercase tracking-[0.2em] font-bold block mb-4">Official Itinerary</span>
          <h1 className="font-editorial font-black text-5xl md:text-7xl text-white uppercase tracking-tighter leading-none mb-6">
            Grassroots <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-electric to-yellow-600">Events</span>
          </h1>
          <p className="text-text-muted text-lg font-light max-w-2xl">
            Engage directly with the campaign. Participate in townhalls, operational summits, and grassroots activations.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {events.map((event) => (
            <motion.div
              key={event.id}
              variants={itemVariants}
              className="deco-frame relative border-l-4 border-yellow-electric border-y border-r border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden"
            >
              <div className="flex-grow">
                <div className="flex items-center gap-4 mb-2">
                  <span className="font-mono text-xs text-yellow-electric tracking-widest uppercase">{event.date}</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full"></span>
                  <span className="font-mono text-xs text-zinc-400 tracking-widest uppercase">{event.time}</span>
                </div>
                <h3 className="font-editorial font-bold text-2xl text-white mb-2">{event.title}</h3>
                <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                  // {event.location}
                </div>
              </div>

              <div className="shrink-0">
                <button className="w-full md:w-auto border border-yellow-electric/30 text-yellow-electric px-8 py-4 text-xs tracking-widest uppercase hover:bg-yellow-electric/10 transition-colors font-editorial font-bold shadow-[0_0_15px_rgba(253,224,71,0.1)]">
                  RSVP / JOIN
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Events;
