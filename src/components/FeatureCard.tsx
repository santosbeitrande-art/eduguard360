import React from 'react';

export interface FeatureCardProps {
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => (
  <article className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition'>
    <h3 className='text-lg font-semibold text-indigo-700'>{title}</h3>
    <p className='mt-2 text-slate-600'>{description}</p>
  </article>
);

export default FeatureCard;
