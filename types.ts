
export type UserRole = 'worker' | 'customer';

export type SkillCategory = 
  | 'Electrician' 
  | 'Plumber' 
  | 'Painter' 
  | 'Helper' 
  | 'Cleaner' 
  | 'Carpenter' 
  | 'Laborer' 
  | 'Gardener';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface WorkerProfile {
  id: string;
  name: string;
  phone: string;
  photo: string;
  skill: SkillCategory;
  experience: number;
  rating: number;
  totalReviews: number;
  isAvailable: boolean;
  verifiedStatus?: boolean;
  location: Location;
  distance?: number; 
  hourlyRate?: number;
}

export interface Job {
  id: string;
  customerId: string;
  title: string;
  description: string;
  skillRequired: SkillCategory;
  pay: number;
  location: Location;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  assignedWorkerId?: string;
  createdAt: number;
}

export interface Bid {
  id: string;
  jobId: string;
  workerId: string;
  amount: number;
  message: string;
  createdAt: number;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageRead?: boolean;
  updatedAt: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  read?: boolean;
  createdAt: any;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName?: string;
  workerId: string;
  workerName?: string;
  workerPhoto?: string;
  workerSkill?: string;
  workerRating?: number;
  date: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'arriving' | 'in-progress' | 'completed' | 'cancelled';
  otp?: string;
  estimatedArrivalTime?: string;
  reviewed?: boolean;
  workerLocation?: Location;
  customerLocation?: Location;
  createdAt: number;
}

export interface Review {
  id: string;
  bookingId: string;
  workerId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface AppState {
  role: UserRole | null;
  userProfile: any | null;
  isLoggedIn: boolean;
}
