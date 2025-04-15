'use client';

import React from 'react';
import { Mail } from 'lucide-react';

const ContactButton = () => {
  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const email = 'support@zenwareai.com';
    const subject = encodeURIComponent('ZenwareAI Engage');
    const body = encodeURIComponent('Hi, I am interested in learning more about ZenWare Engage.');
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <button 
      onClick={handleContactClick}
      className="hover:bg-gray-700 px-6 py-2 border-2 rounded-[3px] w-40 mb-2 transition-colors duration-200 flex items-center justify-center gap-2"
    >
      <Mail size={18} />
      Get In Touch
    </button>
  );
};

export default ContactButton;