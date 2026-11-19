
import React, { useState } from 'react';
import { Phone, Star, StarHalf, MapPin, BadgeCheck, CalendarCheck, Heart } from 'lucide-react';
import { WorkerProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface WorkerCardProps {
  worker: WorkerProfile;
  onCallInitiated?: (worker: WorkerProfile) => void;
  onBookClick?: (worker: WorkerProfile) => void;
}

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, maxStars = 5, size = 12 }) => {
  const stars = [];
  for (let i = 1; i <= maxStars; i++) {
    const isFull = rating >= i;
    const isHalf = !isFull && rating >= i - 0.5;

    if (isFull) {
      stars.push(
        <Star key={i} size={size} className="fill-[#FFB800] text-[#FFB800]" />
      );
    } else if (isHalf) {
      stars.push(
        <StarHalf key={i} size={size} className="fill-[#FFB800] text-[#FFB800]" />
      );
    } else {
      stars.push(
        <Star key={i} size={size} className="fill-slate-200 text-slate-300" />
      );
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const WorkerCard: React.FC<WorkerCardProps> = ({ worker, onCallInitiated, onBookClick }) => {
  const [isLiked, setIsLiked] = useState(false);

  const handleCall = () => {
    if (onCallInitiated) onCallInitiated(worker);
    // window.location.href = `tel:${worker.phone}`;
  };

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-50 flex items-center gap-5 transition-all hover:shadow-xl group cursor-pointer relative overflow-hidden"
    >
      <div className="relative">
        <motion.img 
          whileHover={{ rotate: 5 }}
          src={worker.photo} 
          alt={worker.name} 
          className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm transition-transform" 
        />
        <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white shadow-sm">
          <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-40" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center gap-1">
          <h3 className="font-black text-slate-900 text-lg truncate leading-tight">{worker.name}</h3>
          {worker.verifiedStatus && <BadgeCheck size={16} className="text-blue-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-black text-[#FF6A00] uppercase tracking-widest mt-0.5 opacity-80">
            {worker.skill} • {worker.experience} yrs
          </p>
          {worker.hourlyRate && (
            <>
              <span className="w-1 h-1 bg-slate-300 rounded-full mt-0.5" />
              <span className="text-xs font-bold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">₹{worker.hourlyRate}/hr</span>
            </>
          )}
          <span className="w-1 h-1 bg-slate-300 rounded-full mt-0.5" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Online</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center text-slate-900 text-xs font-black bg-gray-50 px-2 py-1 rounded-lg gap-1.5">
            <StarRating rating={worker.rating} size={12} />
            <span className="text-slate-900 font-black ml-0.5">{worker.rating}</span> 
            <span className="text-slate-400 font-bold text-[10px]">({worker.totalReviews})</span>
          </div>
          <div className="flex items-center text-slate-300 text-[10px] font-bold tracking-tight">
            <MapPin size={12} className="mr-1 opacity-50" />
            {worker.distance ? `${worker.distance.toFixed(1)} km` : 'Near you'}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isLiked ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-300 hover:text-red-400'
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isLiked ? 'liked' : 'unliked'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              >
                <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>
        <div className="flex gap-2">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCall}
            className="bg-slate-900 hover:bg-[#FF6A00] text-[#FF6A00] w-12 h-12 rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center transform hover:text-white"
          >
            <Phone size={20} className="fill-current" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onBookClick?.(worker);
            }}
            className="bg-orange-50 hover:bg-orange-100 text-[#FF6A00] w-12 h-12 rounded-2xl shadow-sm transition-all duration-300 flex items-center justify-center transform"
          >
            <CalendarCheck size={20} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default WorkerCard;
