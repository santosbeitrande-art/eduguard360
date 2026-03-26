import React from 'react';
import { teamMembers, officeImages } from '../data/content';
import { LinkedInIcon, TwitterIcon, GitHubIcon, CheckIcon } from './ui/Icons';

const About: React.FC = () => {
  const values = [
    { title: 'Innovation', desc: 'Pushing boundaries with cutting-edge technology' },
    { title: 'Quality', desc: 'Only the best products make it to our store' },
    { title: 'Customer First', desc: 'Your satisfaction is our top priority' },
    { title: 'Sustainability', desc: 'Committed to eco-friendly practices' },
  ];

  return (
    <section id="about" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            About TechStore
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We're passionate about bringing you the best technology products to enhance your daily life.
          </p>
        </div>

        {/* Story Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h3>
            <p className="text-gray-600 mb-4">
              Founded in 2020, TechStore began with a simple mission: to make premium technology accessible to everyone. What started as a small online shop has grown into a trusted destination for tech enthusiasts worldwide.
            </p>
            <p className="text-gray-600 mb-6">
              We carefully curate our product selection, partnering only with brands that share our commitment to quality and innovation. Every product in our catalog has been tested and approved by our team of experts.
            </p>
            
            <div className="space-y-3">
              {['Premium quality products', 'Expert customer support', 'Fast worldwide shipping', 'Secure payment options'].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckIcon className="text-green-600" size={14} />
                  </div>
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <img
              src={officeImages[0]}
              alt="Our Office"
              className="rounded-2xl shadow-xl"
            />
            <div className="absolute -bottom-6 -left-6 w-48 h-48 hidden lg:block">
              <img
                src={officeImages[1]}
                alt="Team at work"
                className="w-full h-full object-cover rounded-2xl shadow-xl border-4 border-white"
              />
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-10">Our Values</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">{index + 1}</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{value.title}</h4>
                <p className="text-sm text-gray-600">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-10">Meet Our Team</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="group text-center"
              >
                <div className="relative mb-4 overflow-hidden rounded-2xl">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                    <div className="flex gap-3">
                      {member.social.linkedin && (
                        <a
                          href={member.social.linkedin}
                          className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white hover:text-indigo-600 transition-all"
                        >
                          <LinkedInIcon size={18} />
                        </a>
                      )}
                      {member.social.twitter && (
                        <a
                          href={member.social.twitter}
                          className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white hover:text-indigo-600 transition-all"
                        >
                          <TwitterIcon size={18} />
                        </a>
                      )}
                      {member.social.github && (
                        <a
                          href={member.social.github}
                          className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white hover:text-indigo-600 transition-all"
                        >
                          <GitHubIcon size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900">{member.name}</h4>
                <p className="text-sm text-indigo-600 mb-2">{member.role}</p>
                <p className="text-sm text-gray-500">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
