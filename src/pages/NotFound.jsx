import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="bg-void bg-grid min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-electric-gold text-5xl md:text-7xl font-editorial font-black mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
        404 // SIGNAL LOST
      </h1>
      <p className="text-text-muted text-xl md:text-2xl font-light mb-12">
        The requested transmission could not be located.
      </p>
      <Link to="/" className="btn-gold">
        RETURN TO HUB
      </Link>
    </div>
  );
};

export default NotFound;
