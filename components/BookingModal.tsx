
import React, { useState } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { WorkerProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Star
} from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'firebase/firestore';

interface BookingModalProps {
  worker: WorkerProfile;
  onClose: () => void;
}

const TIME_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM'
];

const BookingModal: React.FC<BookingModalProps> = ({ worker, onClose }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  React.useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('workerId', '==', worker.id),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snapshot = await getDocs(reviewsQuery);
        const revs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReviews(revs);
      } catch (err) {
        console.error("Error fetching worker reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, [worker.id]);

  const handleBooking = async () => {
    if (!auth.currentUser || !selectedSlot) return;

    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'bookings'), {
        customerId: auth.currentUser.uid,
        customerName: auth.currentUser.displayName || 'Customer',
        workerId: worker.id,
        workerName: worker.name,
        workerPhoto: worker.photo,
        workerSkill: worker.skill,
        workerRating: worker.rating,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timeSlot: selectedSlot,
        status: 'pending',
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
        estimatedArrivalTime: '8 mins',
        workerLocation: worker.location,
        customerLocation: { lat: 28.6139, lng: 77.2090 }, // Default Delhi location
        createdAt: serverTimestamp(),
      });
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6A00', '#FFB800', '#000000']
      });
      
      setSuccess(true);
      toast.success("Booking request sent successfully!");
      setTimeout(onClose, 2500);
    } catch (err) {
      console.error("Error booking worker:", err);
      setError("Failed to book. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-sm bg-white rounded-[32px] p-10 text-center space-y-4 shadow-2xl m-6"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <h2 className="text-2xl font-black text-slate-900">Booking Requested!</h2>
            <p className="text-slate-500">{worker.name} will review your request shortly.</p>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Book {worker.name}</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">{worker.skill}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Worker Performance Summary */}
              <div className="bg-slate-50 rounded-[28px] p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
                       <Star size={20} className="fill-[#FFB800] text-[#FFB800]" />
                       {worker.rating}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Average Rating</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-2xl font-black text-slate-900">{worker.totalReviews}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed Jobs</div>
                  </div>
                </div>

                {/* Recent Reviews */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recent Performance</h4>
                  {loadingReviews ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-12 bg-white rounded-xl" />
                      <div className="h-12 bg-white rounded-xl" />
                    </div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-2">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="bg-white/60 p-3 rounded-xl border border-white/50 text-[11px]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-black text-slate-900">{rev.customerName}</span>
                            <div className="flex items-center gap-0.5 text-orange-400">
                              <Star size={10} fill="currentColor" />
                              <span className="font-black">{rev.rating}</span>
                            </div>
                          </div>
                          <p className="text-slate-500 italic line-clamp-1">"{rev.comment || 'Excellent service!'}"</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs font-bold text-slate-400 italic">
                      No reviews available yet
                    </div>
                  )}
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Calendar size={14} /> Select Date
                </label>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {next7Days.map((date) => (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center min-w-[70px] p-4 rounded-2xl border transition-all ${
                        isSameDay(selectedDate, date)
                          ? 'border-[#FF6A00] bg-orange-50 text-[#FF6A00]'
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-1">{format(date, 'EEE')}</span>
                      <span className="text-lg font-black">{format(date, 'dd')}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Time Slot Selection */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Clock size={14} /> Select Time Slot
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {TIME_SLOTS.map((slot) => (
                    <motion.button
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                        selectedSlot === slot
                          ? 'border-[#FF6A00] bg-orange-50 text-[#FF6A00]'
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <span className="font-bold">{slot}</span>
                      {selectedSlot === slot && <CheckCircle2 size={20} />}
                    </motion.button>
                  ))}
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-bold"
                >
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || !selectedSlot}
                onClick={handleBooking}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-[20px] shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3"
              >
                {loading ? 'Processing...' : 'Confirm Booking Request'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingModal;
