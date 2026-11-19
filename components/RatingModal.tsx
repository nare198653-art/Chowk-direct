
import React, { useState } from 'react';
import { 
  doc, 
  addDoc, 
  collection, 
  serverTimestamp,
  updateDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Booking } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface RatingModalProps {
  booking: Booking;
  onClose: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({ booking, onClose }) => {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      // 1. Add review to reviews collection
      await addDoc(collection(db, 'reviews'), {
        bookingId: booking.id,
        workerId: booking.workerId,
        customerId: auth.currentUser.uid,
        customerName: auth.currentUser.displayName || 'Customer',
        rating,
        comment,
        createdAt: serverTimestamp()
      });

      // 2. Update booking to mark as reviewed
      await updateDoc(doc(db, 'bookings', booking.id), {
        reviewed: true
      });

      // 3. Update worker profile statistics
      const workerRef = doc(db, 'users', booking.workerId);
      const workerDoc = await getDoc(workerRef);
      
      if (workerDoc.exists()) {
        const workerData = workerDoc.data();
        const currentRating = workerData.rating || 5;
        const totalReviews = workerData.totalReviews || 0;
        
        // Calculate new average rating
        const newTotalReviews = totalReviews + 1;
        const newRating = ((currentRating * totalReviews) + rating) / newTotalReviews;
        
        await updateDoc(workerRef, {
          rating: Number(newRating.toFixed(1)),
          totalReviews: increment(1)
        });
      }

      setSuccess(true);
      toast.success("Thank you for your feedback!");
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error("Error submitting rating:", err);
      toast.error("Failed to submit rating.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div 
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-sm rounded-[32px] p-10 text-center space-y-4 shadow-2xl"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">Review Submitted!</h3>
            <p className="text-slate-500 text-sm">Your feedback helps the community grow.</p>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900">Rate your experience</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star 
                      size={40} 
                      className={`transition-colors ${
                        star <= (hoveredRating || rating) 
                          ? 'fill-[#FFB800] text-[#FFB800]' 
                          : 'text-slate-200'
                      }`} 
                    />
                  </motion.button>
                ))}
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                {rating === 5 ? 'Excellent' : rating === 4 ? 'Great' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                Share your thoughts (optional)
              </label>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or what could be improved?"
                className="w-full h-32 p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/20 resize-none text-sm"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              onClick={handleSubmit}
              className="w-full bg-slate-900 text-white font-bold py-5 rounded-[20px] shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Send size={20} />
              {loading ? 'Submitting...' : 'Submit Review'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RatingModal;
