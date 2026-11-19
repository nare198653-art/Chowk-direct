
import React from 'react';
import { 
  Zap, 
  Droplets, 
  Paintbrush, 
  Users, 
  Trash2, 
  Hammer, 
  HardHat, 
  Sprout 
} from 'lucide-react';
import { SkillCategory } from './types';

export const SKILL_CATEGORIES: { name: SkillCategory; icon: React.ReactNode; color: string }[] = [
  { name: 'Electrician', icon: <Zap size={24} />, color: 'bg-orange-50 text-[#FF6A00]' },
  { name: 'Plumber', icon: <Droplets size={24} />, color: 'bg-blue-50 text-blue-500' },
  { name: 'Painter', icon: <Paintbrush size={24} />, color: 'bg-pink-50 text-pink-500' },
  { name: 'Helper', icon: <Users size={24} />, color: 'bg-purple-50 text-purple-500' },
  { name: 'Cleaner', icon: <Trash2 size={24} />, color: 'bg-teal-50 text-teal-500' },
  { name: 'Carpenter', icon: <Hammer size={24} />, color: 'bg-amber-50 text-amber-600' },
  { name: 'Laborer', icon: <HardHat size={24} />, color: 'bg-slate-100 text-slate-600' },
  { name: 'Gardener', icon: <Sprout size={24} />, color: 'bg-emerald-50 text-emerald-500' },
];

export const MOCK_WORKERS = [
  {
    id: 'w1',
    name: 'Rajesh Kumar',
    phone: '9876543210',
    photo: 'https://i.pravatar.cc/150?u=rajesh',
    skill: 'Electrician',
    experience: 8,
    rating: 4.8,
    totalReviews: 142,
    verifiedStatus: true,
    isAvailable: true,
    location: { lat: 28.6139, lng: 77.2090 },
    hourlyRate: 350
  },
  {
    id: 'w2',
    name: 'Amit Singh',
    phone: '9823456789',
    photo: 'https://i.pravatar.cc/150?u=amit',
    skill: 'Plumber',
    experience: 5,
    rating: 4.5,
    totalReviews: 89,
    verifiedStatus: true,
    isAvailable: true,
    location: { lat: 28.6200, lng: 77.2150 },
    hourlyRate: 250
  },
  {
    id: 'w3',
    name: 'Suresh Yadav',
    phone: '9812345678',
    photo: 'https://i.pravatar.cc/150?u=suresh',
    skill: 'Laborer',
    experience: 12,
    rating: 4.9,
    totalReviews: 256,
    verifiedStatus: false,
    isAvailable: true,
    location: { lat: 28.6100, lng: 77.2000 },
    hourlyRate: 150
  },
  {
    id: 'w4',
    name: 'Vikas Sharma',
    phone: '9811223344',
    photo: 'https://i.pravatar.cc/150?u=vikas',
    skill: 'Carpenter',
    experience: 7,
    rating: 4.7,
    totalReviews: 64,
    verifiedStatus: true,
    isAvailable: true,
    location: { lat: 28.6150, lng: 77.2050 },
    hourlyRate: 400
  },
  {
    id: 'w5',
    name: 'Priya Verma',
    phone: '9811223355',
    photo: 'https://i.pravatar.cc/150?u=priya',
    skill: 'Cleaner',
    experience: 3,
    rating: 4.6,
    totalReviews: 42,
    verifiedStatus: true,
    isAvailable: true,
    location: { lat: 28.6250, lng: 77.2250 },
    hourlyRate: 200
  },
  {
    id: 'w6',
    name: 'Sunil Dutt',
    phone: '9811223366',
    photo: 'https://i.pravatar.cc/150?u=sunil',
    skill: 'Painter',
    experience: 10,
    rating: 4.8,
    totalReviews: 112,
    verifiedStatus: true,
    isAvailable: true,
    location: { lat: 28.6050, lng: 77.1950 },
    hourlyRate: 300
  }
];

export const MOCK_JOBS = [
  {
    id: 'j1',
    customerId: 'u1',
    title: 'Fix Kitchen Leak',
    description: 'The sink pipe is leaking and needs immediate repair. Tools required.',
    skillRequired: 'Plumber' as SkillCategory,
    pay: 450,
    status: 'open' as 'open' | 'assigned' | 'completed' | 'cancelled',
    createdAt: Date.now() - 3600000,
    location: { lat: 28.6139, lng: 77.2090 }
  },
  {
    id: 'j2',
    customerId: 'u2',
    title: 'Paint Living Room',
    description: 'Need a professional painter for a single room. Paint will be provided.',
    skillRequired: 'Painter' as SkillCategory,
    pay: 1200,
    status: 'open' as 'open' | 'assigned' | 'completed' | 'cancelled',
    createdAt: Date.now() - 7200000,
    location: { lat: 28.6200, lng: 77.2150 }
  },
  {
    id: 'j3',
    customerId: 'u3',
    title: 'Garden Maintenance',
    description: 'Trimming bushes and cleaning the lawn. Weekly work possible.',
    skillRequired: 'Gardener' as SkillCategory,
    pay: 600,
    status: 'open' as 'open' | 'assigned' | 'completed' | 'cancelled',
    createdAt: Date.now() - 10800000,
    location: { lat: 28.6100, lng: 77.2000 }
  }
];
