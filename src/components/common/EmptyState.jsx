import React from 'react';

const EmptyState = ({ message }) => {
  return (
    <div className="col-span-full py-20 flex justify-center items-center">
      <div className="deco-frame border border-yellow-electric/20 p-8 bg-[#050505] text-center w-full max-w-lg shadow-[0_0_15px_rgba(253,224,71,0.05)]">
        <span className="font-mono tracking-widest text-xs text-zinc-500 uppercase">
          {message}
        </span>
      </div>
    </div>
  );
};

export default EmptyState;
