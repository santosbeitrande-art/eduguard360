import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Menu, X, ChevronDown } from 'lucide-react';

interface NavProps {
  variant?: 'light' | 'dark';
}

export const EducuardNavigation: React.FC<NavProps> = ({ variant = 'light' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showPortalsMenu, setShowPortalsMenu] = React.useState(false);

  const isPortalRoute = location.pathname.includes('/portais') || 
                        location.pathname.includes('/edumarket') || 
                        location.pathname.includes('/sistema');

  const navItems = [
    { label: 'Início', href: '/' },
    { label: 'Sobre', href: '#about' },
    { label: 'Contacto', href: '#contact' },
  ];

  const portals = [
    { label: '🛡️ Segurança Escolar', href: '/sistema' },
    { label: '📚 EduMarket', href: '/edumarket' },
    { label: '📖 Literatura Aberta', href: '/literatura' },
    { label: '🏢 Enterprise (Em breve)', href: '#' },
    { label: '📊 Analytics (Em breve)', href: '#' },
  ];

  return (
    <nav className={`sticky top-0 z-50 ${
      variant === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
    } shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:inline">EduGuard 360</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`font-medium transition-colors hover:text-blue-600 ${
                  variant === 'dark' ? 'text-gray-300 hover:text-white' : ''
                }`}
              >
                {item.label}
              </a>
            ))}

            {/* Portals Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 font-medium py-2 px-3 rounded-lg hover:bg-gray-100/50 transition-colors">
                Portais
                <ChevronDown className="w-4 h-4" />
              </button>

              <div className="absolute left-0 mt-0 w-56 bg-white text-gray-900 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pt-2">
                <div className="py-2 px-2 space-y-1">
                  {portals.map((portal) => (
                    <button
                      key={portal.label}
                      onClick={() => {
                        if (!portal.href.startsWith('#')) {
                          navigate(portal.href);
                        }
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        portal.href.startsWith('#')
                          ? 'text-gray-400 cursor-not-allowed opacity-50'
                          : 'hover:bg-blue-50 text-gray-700'
                      }`}
                      disabled={portal.href.startsWith('#')}
                    >
                      {portal.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => navigate('/portais')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-shadow font-medium"
            >
              Acessar Portais
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 hover:bg-gray-100/50 rounded-lg"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200 pt-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block py-2 px-4 hover:bg-gray-100/50 rounded-lg"
              >
                {item.label}
              </a>
            ))}

            <div className="py-2 px-0">
              <button
                onClick={() => setShowPortalsMenu(!showPortalsMenu)}
                className="w-full text-left py-2 px-4 font-medium hover:bg-gray-100/50 rounded-lg flex items-center justify-between"
              >
                Portais
                <ChevronDown className={`w-4 h-4 transition-transform ${showPortalsMenu ? 'rotate-180' : ''}`} />
              </button>

              {showPortalsMenu && (
                <div className="pl-4 space-y-1">
                  {portals.map((portal) => (
                    <button
                      key={portal.label}
                      onClick={() => {
                        if (!portal.href.startsWith('#')) {
                          navigate(portal.href);
                          setIsOpen(false);
                        }
                      }}
                      className={`w-full text-left py-2 px-4 rounded-lg transition-colors ${
                        portal.href.startsWith('#')
                          ? 'text-gray-400 opacity-50'
                          : 'hover:bg-blue-50'
                      }`}
                      disabled={portal.href.startsWith('#')}
                    >
                      {portal.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                navigate('/portais');
                setIsOpen(false);
              }}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-shadow font-medium"
            >
              Acessar Portais
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default EducuardNavigation;
