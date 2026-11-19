
import React, { useState, useEffect } from 'react';
import { 
  doc, 
  onSnapshot, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  writeBatch,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { WorkerProfile, Job, UserRole, Booking, SkillCategory } from '../types';
import { MOCK_WORKERS, MOCK_JOBS, SKILL_CATEGORIES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { 
  User, 
  Star, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Briefcase,
  Power,
  Settings,
  Bell,
  ChevronRight,
  MessageSquare,
  Database,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  Navigation
} from 'lucide-react';
import { safeFormat } from '../lib/date-utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import TrackingView from './TrackingView';
import RatingModal from './RatingModal';

interface ProfileDashboardProps {
  role: UserRole;
  onOpenChat: (chatId: string) => void;
  onBookWorker: (worker: WorkerProfile) => void;
}

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ role, onOpenChat, onBookWorker }) => {
  const [profile, setProfile] = useState<any>(null);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
  const [ratingBooking, setRatingBooking] = useState<Booking | null>(null);
  const [showOtpInput, setShowOtpInput] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSkill, setEditSkill] = useState<SkillCategory>('Electrician');
  const [editExperience, setEditExperience] = useState(0);
  const [editHourlyRate, setEditHourlyRate] = useState(250);

  const handleStartEdit = () => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phone || '');
      setEditSkill(profile.skill || 'Electrician');
      setEditExperience(profile.experience || 0);
      setEditHourlyRate(profile.hourlyRate || 250);
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const updatedFields: any = {
        name: editName,
        phone: editPhone,
      };
      if (role === 'worker') {
        updatedFields.skill = editSkill;
        updatedFields.experience = Number(editExperience);
        updatedFields.hourlyRate = Number(editHourlyRate);
      }
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updatedFields);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile.");
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribeProfile = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}`);
    });

    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('workerId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(revs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });

    const jobsQuery = query(
      collection(db, 'jobs'),
      where(role === 'customer' ? 'customerId' : 'assignedWorkerId', '==', auth.currentUser.uid),
      where('status', 'in', ['open', 'assigned'])
    );

    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Job[];
      setActiveJobs(jobs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jobs');
    });

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentChats(chats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    const bookingField = role === 'worker' ? 'workerId' : 'customerId';
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where(bookingField, '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      const bks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(bks);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => {
      unsubscribeProfile();
      unsubscribeJobs();
      unsubscribeChats();
      unsubscribeBookings();
      unsubscribeReviews();
    };
  }, [role]);

  const seedDemoData = async () => {
    if (!auth.currentUser) return;
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      
      // Seed Workers
      MOCK_WORKERS.forEach((worker) => {
        const workerRef = doc(db, 'users', worker.id);
        batch.set(workerRef, {
          ...worker,
          uid: worker.id,
          role: 'worker',
          isAvailable: true,
          createdAt: serverTimestamp()
        });
      });

      // Seed Jobs
      MOCK_JOBS.forEach((job) => {
        const jobRef = doc(collection(db, 'jobs'));
        batch.set(jobRef, {
          ...job,
          customerId: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      toast.success("Demo data seeded successfully!");
    } catch (error) {
      console.error("Error seeding data:", error);
      toast.error("Failed to seed demo data. Check permissions.");
    } finally {
      setSeeding(false);
    }
  };

  const toggleAvailability = async () => {
    if (!auth.currentUser || !profile) return;
    const newStatus = !profile.isAvailable;
    
    let locationData = profile.location;
    
    if (newStatus && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch (err) {
        console.error("Could not get current location:", err);
      }
    }

    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      isAvailable: newStatus,
      location: locationData
    });
  };

  const updateBookingStatus = async (bookingId: string, status: string, providedOtp?: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      
      if (status === 'in-progress' && booking?.otp && providedOtp !== booking.otp) {
        toast.error("Invalid OTP. Please ask the customer for the correct code.");
        return;
      }

      await updateDoc(doc(db, 'bookings', bookingId), { status });
      
      if (status === 'completed') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#ffffff']
        });
        toast.success("Job marked as completed! Great work!");
      } else if (status === 'confirmed') {
        toast.success("Booking accepted!");
      } else if (status === 'arriving') {
        toast.info("You're on the way! Drive safe.");
      } else if (status === 'in-progress') {
        toast.success("Job started!");
      } else if (status === 'cancelled') {
        toast.error("Booking declined.");
      }
    } catch (err) {
      console.error("Error updating booking:", err);
      toast.error("Failed to update booking status.");
    }
  };

  const handleVerifyOtp = () => {
    if (showOtpInput) {
      updateBookingStatus(showOtpInput, 'in-progress', otpValue);
      setShowOtpInput(null);
      setOtpValue('');
    }
  };

  if (!profile) return (
    <div className="flex items-center justify-center p-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6A00]"></div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showOtpInput && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-orange-50 text-[#FF6A00] rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Verify OTP</h3>
                <p className="text-slate-500 text-sm mt-1">Ask the customer for the 4-digit code to start the job.</p>
              </div>
              <input 
                type="text" 
                maxLength={4}
                placeholder="0 0 0 0"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-3xl font-black tracking-[1em] py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-[#FF6A00]/20"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowOtpInput(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleVerifyOtp}
                  disabled={otpValue.length !== 4}
                  className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {trackingBooking && (
          <TrackingView 
            booking={trackingBooking} 
            onClose={() => setTrackingBooking(null)} 
            onCancel={() => {
              updateBookingStatus(trackingBooking.id, 'cancelled');
              setTrackingBooking(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-5 my-8"
            >
              <div>
                <h3 className="text-xl font-black text-slate-900">Edit Profile</h3>
                <p className="text-slate-500 text-xs mt-1">Update your professional details and pricing.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#FF6A00]/20 text-slate-900 text-sm font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#FF6A00]/20 text-slate-900 text-sm font-bold"
                  />
                </div>

                {role === 'worker' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Work Category (Skill)</label>
                      <select 
                        value={editSkill}
                        onChange={(e) => setEditSkill(e.target.value as any)}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#FF6A00]/20 text-slate-900 text-sm font-bold"
                      >
                        {SKILL_CATEGORIES.map((cat) => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Experience (years)</label>
                        <input 
                          type="number" 
                          min={0}
                          value={editExperience}
                          onChange={(e) => setEditExperience(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#FF6A00]/20 text-slate-900 text-sm font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Hourly Rate (₹/hr)</label>
                        <input 
                          type="number" 
                          min={0}
                          value={editHourlyRate}
                          onChange={(e) => setEditHourlyRate(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#FF6A00]/20 text-slate-900 text-sm font-bold"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-widest rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Seed Demo Data Button */}
      <motion.button 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={seedDemoData}
        disabled={seeding}
        className="w-full p-6 bg-slate-900 text-white rounded-[28px] flex items-center justify-between hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl">
            <Database size={24} />
          </div>
          <div className="text-left">
            <div className="font-black text-lg">{seeding ? 'Seeding...' : 'Seed Demo Data'}</div>
            <div className="text-xs font-bold opacity-70 uppercase tracking-widest">Populate app with prototype data</div>
          </div>
        </div>
        <ChevronRight size={20} />
      </motion.button>

      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm"
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-[24px] bg-slate-100 overflow-hidden border-4 border-white shadow-sm">
                <img src={profile.photo || `https://i.pravatar.cc/150?u=${profile.uid}`} className="w-full h-full object-cover" />
              </div>
              {profile.verifiedStatus && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1.5 rounded-xl border-4 border-white">
                  <ShieldCheck size={14} />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">{profile.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-1 text-slate-400">
                  <MapPin size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Delhi, IN</span>
                </div>
                {role === 'worker' && (
                  <>
                    <span className="text-[10px] font-black text-[#FF6A00] uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-lg">
                      {profile.skill || 'Helper'}
                    </span>
                    {profile.hourlyRate && (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                        ₹{profile.hourlyRate}/hr
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={handleStartEdit}
            className="p-4 bg-slate-50 text-[#FF6A00] rounded-2xl hover:bg-orange-50 transition-colors"
          >
            <Settings size={24} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl text-center">
            <div className="text-xl font-black text-slate-900">{profile.rating || '5.0'}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rating</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl text-center">
            <div className="text-xl font-black text-slate-900">{profile.totalReviews || '0'}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reviews</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl text-center">
            <div className="text-xl font-black text-slate-900">{profile.experience || '0'}y</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exp</div>
          </div>
        </div>
      </motion.div>

      {/* Worker Availability Toggle */}
      {role === 'worker' && (
        <motion.button 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={toggleAvailability}
          className={`w-full p-6 rounded-[28px] flex items-center justify-between transition-all ${
            profile.isAvailable 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
              : 'bg-slate-100 text-slate-400 border border-slate-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${profile.isAvailable ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
              <Power size={24} />
            </div>
            <div className="text-left">
              <div className="font-black text-lg">{profile.isAvailable ? 'You are Online' : 'You are Offline'}</div>
              <div className="text-xs font-bold opacity-70 uppercase tracking-widest">
                {profile.isAvailable ? 'Customers can find you' : 'Toggle to start working'}
              </div>
            </div>
          </div>
          <div className={`w-14 h-8 rounded-full p-1 transition-colors ${profile.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}>
            <div className={`w-6 h-6 bg-white rounded-full transition-transform ${profile.isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </motion.button>
      )}

      {/* Discover Experts Section (For Customers) */}
      {role === 'customer' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-slate-900">Top Rated Experts</h3>
            <span className="text-xs font-bold text-[#FF6A00] uppercase tracking-widest">See All</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {MOCK_WORKERS.slice(0, 5).map((worker) => (
              <motion.div 
                key={worker.id}
                whileHover={{ y: -5 }}
                className="min-w-[160px] bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm text-center space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto overflow-hidden">
                  <img src={worker.photo} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-black text-slate-900 text-sm truncate">{worker.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{worker.skill}</div>
                </div>
                <div className="flex items-center justify-center gap-1 text-orange-400">
                  <Star size={12} fill="currentColor" />
                  <span className="text-xs font-black">{worker.rating}</span>
                </div>
                <button 
                  onClick={() => onBookWorker(worker as any)}
                  className="w-full py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Book Now
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Bookings Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        {/* Active Bookings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar size={20} className="text-[#FF6A00]" /> Active Bookings
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length} Active
            </span>
          </div>

          <div className="space-y-4">
            {bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length === 0 ? (
              <div className="bg-white p-10 rounded-[32px] border border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-bold text-sm">No active bookings</p>
              </div>
            ) : (
              bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).map((booking) => (
                <div key={booking.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-orange-50 text-[#FF6A00] rounded-2xl">
                        <Clock size={20} />
                      </div>
                      <div>
                        <div className="font-black text-slate-900">{booking.timeSlot}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {safeFormat(booking.date, 'MMMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-500' :
                      'bg-orange-50 text-[#FF6A00]'
                    }`}>
                      {booking.status}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {role === 'worker' ? `Customer: ${booking.customerName || 'User'}` : `Worker: ${booking.workerName || 'Expert'}`}
                    </div>
                    {role === 'customer' && booking.status === 'confirmed' && (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTrackingBooking(booking)}
                        className="flex items-center gap-1 text-[#FF6A00] font-black text-[10px] uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-lg"
                      >
                        <MapPin size={12} /> Track
                      </motion.button>
                    )}
                  </div>

                  {role === 'worker' && booking.status === 'pending' && (
                    <div className="flex gap-3 pt-2">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                        className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                      >
                        <CheckCircle2 size={18} /> Accept
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                        className="flex-1 bg-red-50 text-red-500 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                      >
                        <XCircle size={18} /> Decline
                      </motion.button>
                    </div>
                  )}

                      {role === 'worker' && booking.status === 'confirmed' && (
                        <div className="flex gap-3 pt-2">
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateBookingStatus(booking.id, 'arriving')}
                            className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
                          >
                            <Navigation size={18} /> Start Arriving
                          </motion.button>
                        </div>
                      )}

                      {role === 'worker' && booking.status === 'arriving' && (
                        <div className="flex gap-3 pt-2">
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowOtpInput(booking.id)}
                            className="flex-1 bg-emerald-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                          >
                            <ShieldCheck size={18} /> Verify OTP to Start
                          </motion.button>
                        </div>
                      )}

                      {role === 'worker' && booking.status === 'in-progress' && (
                        <div className="flex gap-3 pt-2">
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                          >
                            <CheckCircle2 size={18} /> Complete Job
                          </motion.button>
                        </div>
                      )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Past Bookings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <History size={20} className="text-slate-400" /> Past Bookings
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).length} History
            </span>
          </div>

          <div className="space-y-4">
            {bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).length === 0 ? (
              <div className="bg-white p-10 rounded-[32px] border border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-bold text-sm">No past bookings</p>
              </div>
            ) : (
              bookings.filter(b => ['completed', 'cancelled'].includes(b.status)).map((booking) => (
                <div key={booking.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden relative">
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-50">
                        <img 
                          src={role === 'worker' ? `https://i.pravatar.cc/150?u=${booking.customerId}` : (booking.workerPhoto || `https://i.pravatar.cc/150?u=${booking.workerId}`)} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <div className="font-black text-slate-900">
                          {role === 'worker' ? booking.customerName : booking.workerName}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {safeFormat(booking.date, 'MMM dd')} • {booking.timeSlot.split(' - ')[0]}
                          </div>
                          {role === 'customer' && booking.workerRating && (
                            <div className="flex items-center gap-0.5 text-orange-400 text-[10px] font-black">
                              <Star size={10} fill="currentColor" />
                              {booking.workerRating}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      booking.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-400'
                    }`}>
                      {booking.status}
                    </div>
                  </div>
                  
                  {booking.status === 'completed' && role === 'customer' && !booking.reviewed && (
                    <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                      <button 
                        onClick={() => setRatingBooking(booking)}
                        className="flex-1 py-3 bg-[#FF6A00] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-orange-100"
                      >
                        Rate Expert
                      </button>
                    </div>
                  )}
                  {booking.status === 'completed' && role === 'customer' && booking.reviewed && (
                    <div className="mt-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase tracking-widest bg-emerald-50 px-3 py-2 rounded-xl w-fit">
                        <CheckCircle2 size={12} /> Reviewed
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Review History (For Workers and Customers to see their own history) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
             <Star size={20} className="text-[#FFB800]" /> 
             {role === 'worker' ? 'Your Reviews' : 'Recent Feedbacks'}
          </h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {reviews.length || 0} Total
          </span>
        </div>
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white p-10 rounded-[32px] border border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-bold text-sm">No reviews yet</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                      {review.customerName[0]}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-sm">{review.customerName}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {safeFormat(review.createdAt, 'MMM dd, yyyy', 'Recently')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-orange-400 bg-orange-50 px-2 py-1 rounded-lg">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-black">{review.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "{review.comment || 'No comment provided'}"
                </p>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Active Jobs */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-slate-900">Active Jobs</h3>
          <span className="text-xs font-bold text-[#FF6A00] uppercase tracking-widest">View All</span>
        </div>
        {activeJobs.length > 0 ? (
          activeJobs.map(job => (
            <div key={job.id} className="bg-white p-5 rounded-[24px] border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900">{job.title}</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{job.status}</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300" size={20} />
            </div>
          ))
        ) : (
          <div className="bg-white p-10 rounded-[32px] border border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-bold text-sm">No active jobs at the moment</p>
          </div>
        )}
      </motion.div>

      {/* Recent Chats */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-slate-900">Recent Chats</h3>
          <span className="text-xs font-bold text-[#FF6A00] uppercase tracking-widest">New</span>
        </div>
        {recentChats.length > 0 ? (
          recentChats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => onOpenChat(chat.id)}
              className="bg-white p-5 rounded-[24px] border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <MessageSquare size={24} className="text-slate-400" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900">Chat Session</h4>
                  <p className="text-xs font-medium text-slate-500 truncate max-w-[200px]">{chat.lastMessage || 'Start a conversation'}</p>
                </div>
              </div>
              <div className="w-2 h-2 bg-[#FF6A00] rounded-full" />
            </div>
          ))
        ) : (
          <div className="bg-white p-10 rounded-[32px] border border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-bold text-sm">Your inbox is empty</p>
          </div>
        )}
      </motion.div>

      {/* Safety & Support Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-black text-slate-900 px-2">Safety & Support</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="font-black text-slate-900">Safety Center</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emergency help</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
              <Phone size={24} />
            </div>
            <div>
              <div className="font-black text-slate-900">Help Center</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">24/7 Support</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfileDashboard;
