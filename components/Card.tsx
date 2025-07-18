
import React from 'react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg flex flex-col ${className}`}>
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
};

export default Card;
