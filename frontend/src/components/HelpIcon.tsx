"use client";

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpIconProps {
  title: string;
  description: string;
}

export default function HelpIcon({ title, description }: HelpIconProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-blue-500 focus:outline-none transition-colors"
        aria-label="Ajuda"
      >
        <HelpCircle size={18} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-64 p-4 mt-2 bg-white rounded-lg shadow-lg border border-gray-100 top-full right-0 lg:left-0 lg:right-auto animate-fade-in-up">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-gray-800 text-sm">{title}</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <span className="sr-only">Fechar</span>
              &times;
            </button>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
}
