import React, { useState, useEffect, useRef } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import Header from '@/components/eduguard/Header';
import Hero from '@/components/eduguard/Hero';
import HowItWorks from '@/components/eduguard/HowItWorks';
import Project from '@/components/eduguard/Project';
import ForSchools from '@/components/eduguard/ForSchools';
import ForParents from '@/components/eduguard/ForParents';
import ProcessDetails from '@/components/eduguard/ProcessDetails';
import Contact from '@/components/eduguard/Contact';
import Footer from '@/components/eduguard/Footer';

const AppLayout: React.FC = () => {
  const [activeSection, setActiveSection] = useState('home');
  const sectionsRef = useRef<{ [key: string]: HTMLElement | null }>({});

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
    setActiveSection(sectionId);
  };

  // Track scroll position to update active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'project', 'howItWorks', 'forSchools', 'forParents', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRequestDemo = () => {
    scrollToSection('contact');
  };

  const handleLearnMore = () => {
    scrollToSection('project');
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <Header activeSection={activeSection} onNavigate={scrollToSection} />

        {/* Main Content */}
        <main>
          {/* Hero Section */}
          <Hero onRequestDemo={handleRequestDemo} onLearnMore={handleLearnMore} />

          {/* Project Section */}
          <div id="project">
            <Project />
          </div>

          {/* How It Works Section */}
          <HowItWorks />

          {/* Process Details */}
          <ProcessDetails />

          {/* For Schools Section */}
          <ForSchools />

          {/* For Parents Section */}
          <ForParents />

          {/* Contact Section */}
          <Contact />
        </main>

        {/* Footer */}
        <Footer onNavigate={scrollToSection} />

        {/* Back to Top Button */}
        <BackToTopButton />
      </div>
    </LanguageProvider>
  );
};

// Back to Top Button Component
const BackToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 w-12 h-12 bg-[#2ecc71] text-white rounded-full shadow-lg hover:bg-[#27ae60] transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
      aria-label="Back to top"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
};

export default AppLayout;
