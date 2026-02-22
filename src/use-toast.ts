import { FAQItem, TeamMember, BlogPost } from '../types';

export const heroImage = 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807187974_5455261e.jpg';

export const officeImages = [
  'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807328290_28647368.png',
  'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807319160_4246a55f.jpg'
];

export const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    role: 'CEO & Founder',
    image: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807289427_407eac36.jpg',
    bio: 'Visionary leader with 15+ years in tech innovation.',
    social: { linkedin: '#', twitter: '#' }
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'CTO',
    image: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807300210_8b0ef8fc.png',
    bio: 'Engineering expert driving our technical excellence.',
    social: { linkedin: '#', github: '#' }
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Head of Design',
    image: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807293956_afc5c391.png',
    bio: 'Award-winning designer creating beautiful experiences.',
    social: { linkedin: '#', twitter: '#' }
  },
  {
    id: '4',
    name: 'David Kim',
    role: 'Head of Product',
    image: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807289875_a7ab3717.jpg',
    bio: 'Product strategist focused on customer success.',
    social: { linkedin: '#', twitter: '#' }
  }
];

export const faqItems: FAQItem[] = [
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, and Google Pay. All transactions are secured with SSL encryption.',
    category: 'Payment'
  },
  {
    question: 'How long does shipping take?',
    answer: 'Standard shipping takes 5-7 business days. Express shipping (2-3 days) and overnight options are available at checkout. Free shipping on orders over $100.',
    category: 'Shipping'
  },
  {
    question: 'What is your return policy?',
    answer: 'We offer a 30-day hassle-free return policy. Items must be in original condition with tags attached. Refunds are processed within 5-7 business days.',
    category: 'Returns'
  },
  {
    question: 'Do you offer international shipping?',
    answer: 'Yes! We ship to over 100 countries worldwide. International shipping rates and delivery times vary by location and are calculated at checkout.',
    category: 'Shipping'
  },
  {
    question: 'How can I track my order?',
    answer: 'Once your order ships, you\'ll receive an email with a tracking number. You can also track your order in your account dashboard under "Order History".',
    category: 'Orders'
  },
  {
    question: 'Do you offer warranty on products?',
    answer: 'All our products come with a minimum 1-year manufacturer warranty. Extended warranty options are available for most electronics.',
    category: 'Products'
  },
  {
    question: 'How do I contact customer support?',
    answer: 'Our support team is available 24/7 via live chat, email (support@techstore.com), or phone (1-800-TECH-HELP). Average response time is under 2 hours.',
    category: 'Support'
  },
  {
    question: 'Can I cancel or modify my order?',
    answer: 'Orders can be modified or cancelled within 1 hour of placement. After that, please contact support and we\'ll do our best to accommodate your request.',
    category: 'Orders'
  }
];

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The Future of Wireless Audio Technology',
    slug: 'future-wireless-audio',
    content: 'Exploring the latest innovations in wireless audio...',
    excerpt: 'Discover how spatial audio and lossless streaming are revolutionizing the way we experience music.',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807328290_28647368.png',
    author_id: '1',
    category: 'Technology',
    tags: ['audio', 'wireless', 'innovation'],
    published: true,
    created_at: '2026-01-05T10:00:00Z'
  },
  {
    id: '2',
    title: 'Choosing the Perfect Smartwatch',
    slug: 'choosing-perfect-smartwatch',
    content: 'A comprehensive guide to finding your ideal smartwatch...',
    excerpt: 'From fitness tracking to productivity features, learn what to look for in your next smartwatch.',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807319160_4246a55f.jpg',
    author_id: '2',
    category: 'Guides',
    tags: ['smartwatch', 'wearables', 'guide'],
    published: true,
    created_at: '2026-01-03T14:30:00Z'
  },
  {
    id: '3',
    title: '2026 Laptop Buying Guide',
    slug: '2026-laptop-buying-guide',
    content: 'Everything you need to know about buying a laptop in 2026...',
    excerpt: 'Navigate the laptop market with confidence using our expert recommendations.',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807248114_2bef8f8a.jpg',
    author_id: '3',
    category: 'Guides',
    tags: ['laptops', 'buying guide', '2026'],
    published: true,
    created_at: '2026-01-01T09:00:00Z'
  }
];

export const testimonials = [
  {
    id: '1',
    name: 'Alex Thompson',
    role: 'Music Producer',
    content: 'The audio quality from these headphones is absolutely incredible. Best investment I\'ve made for my studio.',
    rating: 5,
    image: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807289427_407eac36.jpg'
  },
  {
    id: '2',
    name: 'Jessica Lee',
    role: 'Software Engineer',
    content: 'The UltraBook Pro handles everything I throw at it. Compiling, running VMs, video calls - all smooth.',
    rating: 5,
    image: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807293956_afc5c391.png'
  },
  {
    id: '3',
    name: 'Marcus Williams',
    role: 'Fitness Coach',
    content: 'The Smart Watch Pro tracks all my workouts perfectly. The battery life is amazing - I only charge it once a week!',
    rating: 5,
    image: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807300210_8b0ef8fc.png'
  }
];

export const stats = [
  { label: 'Happy Customers', value: '50K+' },
  { label: 'Products Sold', value: '100K+' },
  { label: 'Countries', value: '100+' },
  { label: 'Support Rating', value: '4.9/5' }
];
