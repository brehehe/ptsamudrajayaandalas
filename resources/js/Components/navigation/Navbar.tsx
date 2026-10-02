import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import Logo from '../ui/Logo';
import Button from '../ui/Button';

interface NavbarProps {
    isAuthenticated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isAuthenticated = false }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Beranda', href: '#beranda' },
        { label: 'Tentang', href: '#tentang' },
        { label: 'Layanan', href: '#layanan' },
        { label: 'Sistem Operasional', href: '#sistem' },
        { label: 'Kontak', href: '#kontak' },
    ];

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
                isScrolled
                    ? 'bg-white/95 dark:bg-[#071322]/95 backdrop-blur-md shadow-sm border-b ' +
                      'border-[#DCEAF8] dark:border-[#1E3A5F] py-3'
                    : 'bg-white dark:bg-[#071322] border-b border-[#DCEAF8]/60 dark:border-[#1E3A5F]/60 py-4'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                <a href="#beranda" className="flex items-center">
                    <Logo />
                </a>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className={
                                'text-sm font-medium text-[#52658E] dark:text-[#94A3B8] ' +
                                'hover:text-[#0060F4] dark:hover:text-[#38BDF8] ' +
                                'transition-colors'
                            }
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* Right CTA */}
                <div className="hidden md:flex items-center gap-3">
                    <Link href={isAuthenticated ? '/dashboard' : '/login'}>
                        <Button variant="primary" size="md">
                            {isAuthenticated ? 'Buka Dashboard' : 'Masuk Sistem'}
                        </Button>
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className={
                            'p-2 rounded-lg text-[#0B1F63] dark:text-[#F1F5F9] ' +
                            'hover:bg-[#F0F8FF] dark:hover:bg-[#132847] focus:outline-none'
                        }
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? (
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
                <div
                    className={
                        'md:hidden bg-white dark:bg-[#0C1D36] border-b border-[#DCEAF8] ' +
                        'dark:border-[#1E3A5F] px-4 pt-2 pb-6 space-y-3 shadow-lg'
                    }
                >
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={
                                'block py-2 text-base font-medium text-[#52658E] ' +
                                'dark:text-[#94A3B8] hover:text-[#0060F4] ' +
                                'dark:hover:text-[#38BDF8] border-b border-gray-100 ' +
                                'dark:border-[#1E3A5F]/40'
                            }
                        >
                            {link.label}
                        </a>
                    ))}
                    <div className="pt-2">
                        <Link
                            href={isAuthenticated ? '/dashboard' : '/login'}
                            className="w-full block"
                        >
                            <Button variant="primary" size="md" className="w-full">
                                {isAuthenticated ? 'Buka Dashboard' : 'Masuk Sistem'}
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;
