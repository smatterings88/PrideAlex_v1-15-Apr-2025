import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          <div>
            <div className="mb-4">
              <Image 
                src="https://storage.googleapis.com/msgsndr/JBLl8rdfV29DRcGjQ7Rl/media/67fe14cf71384b2f2bb778f7.png"
                alt="AlexListens Logo"
                width={180}
                height={40}
                className="h-10 w-auto [filter:drop-shadow(0_0_3px_#fff)]"
              />
            </div>
            <p className="text-gray-400">
              Advanced voice analysis and AI assistance for better communication.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4 text-white">Product</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Use Cases</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4 text-white">Company</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4 text-white">Support</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-8 text-center">
          <p className="text-gray-400">&copy; {new Date().getFullYear()} AlexListens. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;