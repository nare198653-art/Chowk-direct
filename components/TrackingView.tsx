
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  MessageSquare, 
  Shield, 
  Clock, 
  MapPin, 
  ChevronDown, 
  Star, 
  AlertTriangle,
  CheckCircle2,
  Navigation,
  X
} from 'lucide-react';
import { Booking, Location } from '../types';
import MapView from './MapView';
import { safeFormat } from '../lib/date-utils';

interface TrackingViewProps {
  booking: Booking;
  onClose: () => void;
  onCancel: () => void;
}

const TrackingView: React.FC<TrackingViewProps> = ({ booking, onClose, onCancel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [workerPos, setWorkerPos] = useState<Location>(booking.workerLocation || { lat: 28.6139, lng: 77.2090 });
  const [timeLeft, setTimeLeft] = useState(booking.estimatedArrivalTime || '8 mins');

  // Simulate worker movement
  useEffect(() => {
    if (booking.status === 'arriving' || booking.status === 'confirmed') {
      const interval = setInterval(() => {
        setWorkerPos(prev => ({
          lat: prev.lat + (Math.random() - 0.5) * 0.0001,
          lng: prev.lng + (Math.random() - 0.5) * 0.0001,
        }));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [booking.status]);

  const getStatusColor = () => {
    switch (booking.status) {
      case 'arriving': return 'text-orange-500 bg-orange-50';
      case 'in-progress': return 'text-blue-500 bg-blue-50';
      case 'confirmed': return 'text-emerald-500 bg-emerald-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  const getStatusMessage = () => {
    switch (booking.status) {
      case 'arriving': return 'Worker is on the way';
      case 'in-progress': return 'Job in progress';
      case 'confirmed': return 'Booking confirmed';
      default: return 'Status updated';
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden">
      {/* Map Background */}
      <div className="flex-1 relative">
        <MapView 
          center={booking.customerLocation || { lat: 28.6139, lng: 77.2090 }}
          workers={[{
            id: booking.workerId,
            name: booking.workerName || 'Expert',
            photo: booking.workerPhoto || '',
            skill: (booking.workerSkill as any) || 'Helper',
            rating: booking.workerRating || 5,
            experience: 0,
            totalReviews: 0,
            isAvailable: true,
            location: workerPos,
            phone: ''
          }]}
          onWorkerClick={() => {}}
        />

        {/* Top Overlay */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
          <motion.button 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onClose}
            className="p-4 bg-white rounded-2xl shadow-xl pointer-events-auto hover:bg-slate-50 transition-colors"
          >
            <X size={24} className="text-slate-900" />
          </motion.button>

          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`px-6 py-3 rounded-2xl shadow-xl bg-white flex items-center gap-3 pointer-events-auto`}
          >
            <div className={`w-3 h-3 rounded-full animate-pulse ${booking.status === 'arriving' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
            <span className="font-black text-slate-900 text-sm uppercase tracking-widest">{getStatusMessage()}</span>
          </motion.div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: isExpanded ? '0%' : '65%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] shadow-[0_-20px_60px_rgba(0,0,0,0.1)] z-10 flex flex-col max-h-[90vh]"
      >
        {/* Handle */}
        <div 
          className="w-full py-4 flex justify-center cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="px-8 pb-8 overflow-y-auto">
          {/* Main Info */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-[24px] bg-slate-100 overflow-hidden border-4 border-white shadow-md">
                  <img src={booking.workerPhoto || `https://i.pravatar.cc/150?u=${booking.workerId}`} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-xl border-4 border-white">
                  <Star size={14} fill="currentColor" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">{booking.workerName}</h2>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <span className="text-xs font-bold uppercase tracking-widest">{booking.workerSkill}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-orange-400" fill="currentColor" />
                    <span className="text-xs font-black text-slate-900">{booking.workerRating}</span>
                  </div>
                </div>
                <button className="text-[10px] font-bold text-[#FF6A00] uppercase tracking-widest mt-2 hover:underline">View Full Profile</button>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-black text-[#FF6A00]">{timeLeft}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arriving In</div>
            </div>
          </div>

          {/* OTP Section (Rapido Style) */}
          <div className="bg-slate-900 p-6 rounded-[32px] mb-8 flex items-center justify-between shadow-xl shadow-slate-200">
            <div>
              <div className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Share OTP to start job</div>
              <div className="text-3xl font-black text-white tracking-[0.2em]">{booking.otp || '4829'}</div>
            </div>
            <div className="p-4 bg-white/10 rounded-2xl">
              <Shield size={32} className="text-emerald-400" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-5 bg-slate-50 text-slate-900 rounded-[28px] font-black flex flex-col items-center gap-2 hover:bg-slate-100 transition-all border border-slate-100"
            >
              <Phone size={24} className="text-emerald-500" />
              <span className="text-[11px] uppercase tracking-widest">Call</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-5 bg-slate-50 text-slate-900 rounded-[28px] font-black flex flex-col items-center gap-2 hover:bg-slate-100 transition-all border border-slate-100"
            >
              <MessageSquare size={24} className="text-blue-500" />
              <span className="text-[11px] uppercase tracking-widest">Chat</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-5 bg-slate-50 text-slate-900 rounded-[28px] font-black flex flex-col items-center gap-2 hover:bg-slate-100 transition-all border border-slate-100"
            >
              <Navigation size={24} className="text-orange-500" />
              <span className="text-[11px] uppercase tracking-widest">Share</span>
            </motion.button>
          </div>

          {/* Detailed Info (Visible when expanded) */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 pt-6 border-t border-slate-100"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-50 text-[#FF6A00] rounded-2xl">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Service Location</div>
                    <div className="font-black text-slate-900">B-42, Sector 62, Noida, UP</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scheduled Time</div>
                    <div className="font-black text-slate-900">{booking.timeSlot}, {safeFormat(booking.date, 'MMM dd')}</div>
                  </div>
                </div>

                <div className="bg-red-50 p-6 rounded-[32px] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <AlertTriangle size={24} className="text-red-500" />
                    <div>
                      <div className="font-black text-red-900">Safety Center</div>
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Emergency assistance</div>
                    </div>
                  </div>
                  <button className="px-6 py-2 bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-widest">SOS</button>
                </div>

                <button 
                  onClick={onCancel}
                  className="w-full py-4 text-red-500 font-black text-sm uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-colors"
                >
                  Cancel Booking
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default TrackingView;
