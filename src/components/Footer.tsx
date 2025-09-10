import React from 'react';
import { Mail, Phone, Copyright } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-300 py-2 text-gray-600 font-sans ">
      <div className="flex flex-col md:flex-row justify-center items-center max-w-5xl mx-auto px-8 gap-2 md:gap-4">
        {/* Contact Section */}
        <div className="flex flex-col md:flex-row justify-center gap-1 md:gap-2 mb-1 md:mb-0">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="text-gray-400 w-5 h-5" />
            <span>info@digentechnology.com</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="text-gray-400 w-5 h-5" />
            <span>+256 782 651 854</span>
          </div>
        </div>
        {/* Links Section */}
        <div className="flex items-center gap-2 text-sm">
          <a
            href="https://www.digentechnology.com"
            className="text-gray-600 hover:text-black transition-colors duration-300"
          >
            <span className="inline-flex items-center gap-2">
              <Copyright className="w-4 h-4 text-gray-400" />
              DigenTechnology 2025
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
