import { Product } from '../types';

export const products: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    description: 'Experience crystal-clear audio with our premium wireless headphones. Features active noise cancellation and 30-hour battery life.',
    price: 299.99,
    category: 'Audio',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807204733_867ac462.png',
    stock: 50,
    rating: 4.8,
    reviews_count: 234,
    featured: true
  },
  {
    id: '2',
    name: 'Studio Pro Headphones',
    description: 'Professional-grade studio headphones with exceptional sound clarity and comfort for extended sessions.',
    price: 449.99,
    category: 'Audio',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807209708_d63e4ebd.png',
    stock: 30,
    rating: 4.9,
    reviews_count: 189,
    featured: true
  },
  {
    id: '3',
    name: 'Sport Wireless Earbuds',
    description: 'Sweat-resistant wireless earbuds perfect for workouts. Secure fit and powerful bass.',
    price: 149.99,
    category: 'Audio',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807207792_39c9f049.png',
    stock: 100,
    rating: 4.6,
    reviews_count: 567,
    featured: false
  },
  {
    id: '4',
    name: 'Noise Cancelling Buds',
    description: 'Compact earbuds with industry-leading noise cancellation technology.',
    price: 199.99,
    category: 'Audio',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807208637_2c2b535b.png',
    stock: 75,
    rating: 4.7,
    reviews_count: 342,
    featured: false
  },
  {
    id: '5',
    name: 'Smart Watch Pro',
    description: 'Advanced smartwatch with health monitoring, GPS, and 7-day battery life.',
    price: 399.99,
    category: 'Wearables',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807227458_c603bc3c.jpg',
    stock: 45,
    rating: 4.8,
    reviews_count: 456,
    featured: true
  },
  {
    id: '6',
    name: 'Fitness Tracker Elite',
    description: 'Comprehensive fitness tracking with heart rate, sleep analysis, and workout modes.',
    price: 249.99,
    category: 'Wearables',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807226555_02ae4a5d.jpg',
    stock: 80,
    rating: 4.5,
    reviews_count: 678,
    featured: false
  },
  {
    id: '7',
    name: 'Smart Watch Classic',
    description: 'Elegant smartwatch combining classic design with modern technology.',
    price: 349.99,
    category: 'Wearables',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807225674_412db1a5.jpg',
    stock: 35,
    rating: 4.7,
    reviews_count: 234,
    featured: false
  },
  {
    id: '8',
    name: 'Sport Watch GPS',
    description: 'Rugged sports watch with advanced GPS and multi-sport tracking.',
    price: 299.99,
    category: 'Wearables',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807233956_86ea37cb.jpg',
    stock: 60,
    rating: 4.6,
    reviews_count: 389,
    featured: false
  },
  {
    id: '9',
    name: 'UltraBook Pro 15',
    description: 'Powerful ultrabook with 15" 4K display, latest processor, and all-day battery.',
    price: 1499.99,
    category: 'Laptops',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807248114_2bef8f8a.jpg',
    stock: 25,
    rating: 4.9,
    reviews_count: 156,
    featured: true
  },
  {
    id: '10',
    name: 'Creator Laptop 17',
    description: 'Designed for creators with stunning 17" display and powerful graphics.',
    price: 1999.99,
    category: 'Laptops',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807248737_3d727fe1.jpg',
    stock: 15,
    rating: 4.8,
    reviews_count: 98,
    featured: true
  },
  {
    id: '11',
    name: 'Business Laptop Elite',
    description: 'Enterprise-grade laptop with enhanced security and productivity features.',
    price: 1299.99,
    category: 'Laptops',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807250385_b290a2d7.jpg',
    stock: 40,
    rating: 4.7,
    reviews_count: 234,
    featured: false
  },
  {
    id: '12',
    name: 'Gaming Laptop X',
    description: 'High-performance gaming laptop with RTX graphics and 144Hz display.',
    price: 1799.99,
    category: 'Laptops',
    image_url: 'https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767807254138_e8ca3ffd.png',
    stock: 20,
    rating: 4.9,
    reviews_count: 445,
    featured: true
  }
];

export const categories = ['All', 'Audio', 'Wearables', 'Laptops'];

export const getProductById = (id: string): Product | undefined => {
  return products.find(p => p.id === id);
};

export const getFeaturedProducts = (): Product[] => {
  return products.filter(p => p.featured);
};

export const getProductsByCategory = (category: string): Product[] => {
  if (category === 'All') return products;
  return products.filter(p => p.category === category);
};
