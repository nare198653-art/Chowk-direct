
import React, { useState } from 'react';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { SkillCategory } from '../types';
import { SKILL_CATEGORIES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { 
  X, 
  Plus, 
  IndianRupee, 
  FileText, 
  MapPin,
  CheckCircle2
} from 'lucide-react';

interface JobPostFormProps {
  onClose: () => void;
  userLocation: { lat: number; lng: number };
}

const JobPostForm: React.FC<JobPostFormProps> = ({ onClose, userLocation }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skillRequired: 'Laborer' as SkillCategory,
    pay: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'jobs'), {
        customerId: auth.currentUser.uid,
        title: formData.title,
        description: formData.description,
        skillRequired: formData.skillRequired,
        pay: Number(formData.pay),
        location: userLocation,
        status: 'open',
        createdAt: serverTimestamp(),
      });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF6A00', '#000000', '#FFFFFF']
      });
      
      setSuccess(true);
      toast.success("Job posted successfully!");
      setTimeout(onClose, 2500);
    } catch (error) {
      console.error("Error posting job:", error);
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
            <h2 className="text-2xl font-black text-slate-900">Job Posted!</h2>
            <p className="text-slate-500">Workers in your area will be notified immediately.</p>
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
              <h2 className="text-2xl font-black text-slate-900">Post a Job</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Job Title</label>
                <div className="relative">
                  <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Need help moving furniture"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILL_CATEGORIES.map((skill) => (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={skill.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, skillRequired: skill.name })}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        formData.skillRequired === skill.name 
                          ? 'border-[#FF6A00] bg-orange-50 text-[#FF6A00]' 
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <div className={formData.skillRequired === skill.name ? 'text-[#FF6A00]' : 'text-slate-500'}>
                        {React.cloneElement(skill.icon as React.ReactElement<any>, { size: 22 })}
                      </div>
                      <span className="text-sm font-bold">{skill.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-slate-300" size={20} />
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe the work in detail..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/20 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Offer Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    required
                    type="number"
                    placeholder="500"
                    value={formData.pay}
                    onChange={(e) => setFormData({ ...formData, pay: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/20 transition-all"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-[20px] shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3"
              >
                {loading ? 'Posting...' : 'Post Job Now'}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JobPostForm;
