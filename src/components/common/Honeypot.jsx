import React from 'react';

const Honeypot = ({ value, onChange, name = "bot_field" }) => {
  return (
    <div
      className="opacity-0 absolute -z-50 w-0 h-0 pointer-events-none"
      aria-hidden="true"
      tabIndex="-1"
    >
      <label htmlFor={name}>Leave this field empty if you are human</label>
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete="off"
        tabIndex="-1"
      />
    </div>
  );
};

export default Honeypot;
