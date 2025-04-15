'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SignInModal from './auth/SignInModal';
import SignUpModal from './auth/SignUpModal';
import { useAuth } from '@/lib/AuthContext';
import UserDropdown from './UserDropdown';
import { Menu as MenuIcon, X } from 'lucide-react';

const Header = () => {
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <header className="bg-[#004AAA] py-4 px-6 fixed w-full top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-white hover:text-blue-100 transition-colors relative z-50">
          <Image 
            src="https://storage.googleapis.com/msgsndr/JBLl8rdfV29DRcGjQ7Rl/media/67fe14cf71384b2f2bb778f7.png"
            alt="AlexListens Logo"
            width={180}
            height={40}
            className="h-10 w-auto [filter:drop-shadow(0_0_3px_#fff)]"
          />
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden relative z-50 text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MenuIcon className="h-6 w-6" />
          )}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-8 items-center">
            <li><Link href="#" className="text-blue-100 hover:text-white transition-colors">Home</Link></li>
            <li><Link href="#" className="text-blue-100 hover:text-white transition-colors">Features</Link></li>
            <li><Link href="#" className="text-blue-100 hover:text-white transition-colors">About</Link></li>
            <li><Link href="#" className="text-blue-100 hover:text-white transition-colors">Contact</Link></li>
            {!loading && (
              <>
                {user ? (
                  <li>
                    <UserDropdown />
                  </li>
                ) : (
                  <li>
                    <button
                      onClick={() => setIsSignInOpen(true)}
                      className="bg-white text-[#004AAA] px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      Sign In
                    </button>
                  </li>
                )}
              </>
            )}
          </ul>
        </nav>

        {/* Mobile Navigation */}
        <div className={`
          fixed inset-0 bg-[#004AAA] z-40 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
          md:hidden
        `}>
          <div className="flex flex-col items-center justify-center h-full">
            <nav className="w-full">
              <ul className="flex flex-col items-center space-y-8">
                <li><Link href="#" className="text-white text-xl" onClick={() => setIsMobileMenuOpen(false)}>Home</Link></li>
                <li><Link href="#" className="text-white text-xl" onClick={() => setIsMobileMenuOpen(false)}>Features</Link></li>
                <li><Link href="#" className="text-white text-xl" onClick={() => setIsMobileMenuOpen(false)}>About</Link></li>
                <li><Link href="#" className="text-white text-xl" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link></li>
                {!loading && (
                  <>
                    {user ? (
                      <li className="w-full flex justify-center">
                        <UserDropdown />
                      </li>
                    ) : (
                      <li>
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsSignInOpen(true);
                          }}
                          className="bg-white text-[#004AAA] px-6 py-3 rounded-md text-xl"
                        >
                          Sign In
                        </button>
                      </li>
                    )}
                  </>
                )}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignUpClick={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
      />

      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
      />
    </header>
  );
};

export default Header;