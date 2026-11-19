
import React, { useState, useEffect } from 'react';
import { 
  UserRole, 
  SkillCategory, 
  WorkerProfile, 
  Location,
  Job,
  Chat,
  Booking
} from './types';
import { SKILL_CATEGORIES, MOCK_WORKERS } from './constants';
import { Language, translations } from './translations';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where,
  addDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import MapView from './components/MapView';
import WorkerCard from './components/WorkerCard';
import JobBoard from './components/JobBoard';
import JobPostForm from './components/JobPostForm';
import ProfileDashboard from './components/ProfileDashboard';
import AILabour from './components/AILabour';
import ChatRoom from './components/ChatRoom';
import ChatList from './components/ChatList';
import BookingModal from './components/BookingModal';
import TrackingView from './components/TrackingView';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import { 
  ChevronLeft, 
  UserCircle, 
  Phone, 
  Map as MapIcon, 
  List as ListIcon, 
  Power,
  Settings,
  Star,
  Users,
  Languages,
  ArrowRight,
  X,
  Home,
  Briefcase,
  MessageSquare,
  User as UserIcon,
  Plus,
  LogOut,
  Search,
  Bell,
  ChevronRight,
  Bot
} from 'lucide-react';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'landing' | 'role-selection' | 'main'>('landing');
  const [activeTab, setActiveTab] = useState<'home' | 'jobs' | 'messages' | 'ai-labour' | 'profile'>('home');
  
  const [selectedSkill, setSelectedSkill] = useState<SkillCategory | null>(null);
  const [priceFilter, setPriceFilter] = useState<'all' | 'under200' | '200-300' | 'above300'>('all');
  const [viewType, setViewType] = useState<'map' | 'list'>('list');
  const [userLocation, setUserLocation] = useState<Location>({ lat: 28.6139, lng: 77.2090 }); 
  const [showJobForm, setShowJobForm] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [bookingWorker, setBookingWorker] = useState<WorkerProfile | null>(null);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [myOpenJobs, setMyOpenJobs] = useState<Job[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [showTracking, setShowTracking] = useState(false);
  const [notifiedWorkers, setNotifiedWorkers] = useState<Set<string>>(new Set());

  const t = translations[lang];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
          setStep('main');
        } else {
          setStep('role-selection');
        }
      } else {
        setStep('landing');
        setActiveBooking(null);
      }
      setLoading(false);
    });

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, (err) => console.warn("Geolocation warning:", err.message), { enableHighAccuracy: true });
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Effect for global data listeners (only when logged in)
  useEffect(() => {
    if (!user) {
      setWorkers([]);
      setOpenJobs([]);
      return;
    }

    // Listen for online workers
    const workersQuery = query(collection(db, 'users'), where('role', '==', 'worker'), where('isAvailable', '==', true));
    const unsubscribeWorkers = onSnapshot(workersQuery, (snapshot) => {
      const workersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkerProfile[];
      setWorkers(workersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Listen for open jobs
    const jobsQuery = query(collection(db, 'jobs'), where('status', '==', 'open'));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      setOpenJobs(jobsData);
      
      // Specifically filter my jobs for notifications
      if (user) {
        setMyOpenJobs(jobsData.filter(j => j.customerId === user.uid));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jobs');
    });

    return () => {
      unsubscribeWorkers();
      unsubscribeJobs();
    };
  }, [user]);

  // Separate effect for active bookings
  useEffect(() => {
    if (!user) {
      setActiveBooking(null);
      return;
    }

    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('customerId', '==', user.uid),
      where('status', 'in', ['confirmed', 'arriving', 'in-progress']),
      limit(1)
    );

    const unsubscribeBookings = onSnapshot(bookingsQuery, (snapshot) => {
      if (!snapshot.empty) {
        setActiveBooking({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Booking);
      } else {
        setActiveBooking(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsubscribeBookings();
  }, [user]);

  // Effect for Push Notifications
  useEffect(() => {
    if (!user || profile?.role !== 'customer' || myOpenJobs.length === 0 || workers.length === 0) return;

    workers.forEach(worker => {
      // Skip if already notified in this session
      if (notifiedWorkers.has(worker.id)) return;

      // Check if worker matches any of my jobs
      const matchingJob = myOpenJobs.find(job => 
        job.skillRequired === worker.skill && 
        calculateDistance(job.location || userLocation, worker.location) <= 5 // 5km vicinity
      );

      if (matchingJob) {
        import('sonner').then(({ toast }) => {
          toast.info(`Worker Available Nearby!`, {
            description: `${worker.name} is available for your "${matchingJob.title}" job.`,
            duration: 10000,
            action: {
              label: "Chat Now",
              onClick: () => handleStartChat(worker.id)
            }
          });
        });
        setNotifiedWorkers(prev => new Set(prev).add(worker.id));
      }
    });
  }, [workers, myOpenJobs, user, profile, userLocation]);
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setProfile(null);
    setStep('landing');
  };

  const handleRoleSelection = async (role: UserRole) => {
    if (!user) return;
    const initialProfile = {
      uid: user.uid,
      name: user.displayName || 'New User',
      email: user.email || null,
      photo: user.photoURL || null,
      role,
      isAvailable: role === 'worker',
      rating: 5.0,
      totalReviews: 0,
      experience: 0,
      location: userLocation,
      createdAt: new Date().toISOString()
    };
    console.log("Setting initial profile for user:", user.uid, initialProfile);
    await setDoc(doc(db, 'users', user.uid), initialProfile);
    setProfile(initialProfile);
    setStep('main');
  };

  const calculateDistance = (l1: Location, l2: Location) => {
    const R = 6371; 
    const dLat = (l2.lat - l1.lat) * Math.PI / 180;
    const dLon = (l2.lng - l1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(l1.lat * Math.PI / 180) * Math.cos(l2.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredWorkers = ([...workers, ...MOCK_WORKERS] as any[])
    .filter((w, index, self) => 
      index === self.findIndex((t) => t.id === w.id)
    )
    .filter(w => !selectedSkill || w.skill === selectedSkill)
    .filter(w => {
      const rate = w.hourlyRate || 250;
      if (priceFilter === 'under200') return rate < 200;
      if (priceFilter === '200-300') return rate >= 200 && rate <= 300;
      if (priceFilter === 'above300') return rate > 300;
      return true;
    })
    .map(w => ({
      ...w,
      distance: calculateDistance(userLocation, w.location)
    }))
    .sort((a, b) => (a.distance || 0) - (b.distance || 0)) as (WorkerProfile & { distance: number })[];

  const handleStartChat = async (otherUserId: string) => {
    if (!user) return;
    
    if (!otherUserId) {
      console.error("handleStartChat: otherUserId is missing");
      return;
    }

    const chatId = [user.uid, otherUserId].sort().join('_');
    console.log(`Starting chat: ${chatId} with ${otherUserId}`);

    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (!chatDoc.exists()) {
        const chatData = {
          id: chatId,
          participants: [user.uid, otherUserId],
          updatedAt: serverTimestamp()
        };
        console.log("Creating new chat document:", chatData);
        await setDoc(doc(db, 'chats', chatId), chatData);
      }
      setActiveChatId(chatId);
      setActiveTab('messages');
    } catch (error) {
      console.error("Error in handleStartChat:", error);
    }
  };

  const LanguageSwitcher = () => (
    <div className="flex p-1 bg-gray-100 rounded-full w-fit mx-auto backdrop-blur-sm border border-white/50 shadow-sm">
      {(['en', 'hi', 'mr'] as Language[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all duration-300 ${
            lang === l ? 'bg-white text-[#FF6A00] shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {l === 'en' ? 'EN' : l === 'hi' ? 'HI' : 'MR'}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#FF6A00] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (step === 'landing') {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-between p-8 text-center overflow-hidden">
        <div className="pt-8">
           <LanguageSwitcher />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-[#FF6A00] to-[#FF8C37] p-6 rounded-[2.5rem] shadow-2xl shadow-orange-200 mb-8 transform -rotate-6">
             <MapIcon size={48} className="text-white" />
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-3">
            {t.appName}<span className="text-[#FF6A00]">.</span>
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed max-w-[280px]">
            {t.tagline}
          </p>
        </motion.div>
        
        <div className="w-full space-y-4 max-w-sm pb-8">
          <button 
            onClick={handleLogin}
            className="group w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-[20px] shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {t.loginWithGoogle}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'role-selection') {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-3xl font-black text-slate-900 mb-8">Choose Your Role</h2>
        <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
          <button 
            onClick={() => handleRoleSelection('customer')}
            className="p-8 bg-white border-2 border-slate-100 rounded-[32px] hover:border-[#FF6A00] transition-all group"
          >
            <div className="w-16 h-16 bg-orange-50 text-[#FF6A00] rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">{t.iNeedWorker}</h3>
            <p className="text-slate-400 text-sm mt-2">Post jobs and find experts</p>
          </button>
          <button 
            onClick={() => handleRoleSelection('worker')}
            className="p-8 bg-white border-2 border-slate-100 rounded-[32px] hover:border-[#FF6A00] transition-all group"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Briefcase size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900">{t.iAmWorker}</h3>
            <p className="text-slate-400 text-sm mt-2">Find work and earn money</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <header className="px-6 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF6A00] rounded-xl flex items-center justify-center text-white font-black">
                  {t.appName[0]}
                </div>
                <h1 className="text-xl font-black text-slate-900">{t.appName}</h1>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewType(viewType === 'map' ? 'list' : 'map')}
                  className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors"
                >
                  {viewType === 'map' ? <ListIcon size={20}/> : <MapIcon size={20}/>}
                </button>
                <button className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors relative">
                  <Bell size={20} />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              {viewType === 'map' ? (
                <div className="h-[calc(100vh-160px)] p-4 relative">
                  <MapView 
                    center={userLocation} 
                    workers={filteredWorkers} 
                    jobs={openJobs}
                    onWorkerClick={(w) => handleStartChat(w.id)} 
                    onJobClick={(j) => setActiveTab('jobs')}
                  />
                  
                  {/* Map Legend */}
                  <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 z-[1000] space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">You</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-600 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Experts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-slate-900 rounded-full flex items-center justify-center text-[6px]">💼</div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Jobs</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {activeBooking && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setShowTracking(true)}
                      className="bg-slate-900 p-5 rounded-[28px] shadow-xl shadow-slate-200 flex items-center justify-between cursor-pointer group overflow-hidden relative"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          >
                            <MapIcon className="text-emerald-400" size={24} />
                          </motion.div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Active Booking</div>
                          <div className="font-black text-white text-sm">{activeBooking.workerName} is on the way</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="text-right">
                          <div className="text-lg font-black text-white">{activeBooking.estimatedArrivalTime || '8m'}</div>
                          <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Away</div>
                        </div>
                        <ChevronRight className="text-white/30" size={20} />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedSkill(null)}
                      className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                        !selectedSkill ? 'bg-[#FF6A00] text-white shadow-lg shadow-orange-200' : 'bg-white text-slate-500 border border-slate-100'
                      }`}
                    >
                      All Experts
                    </motion.button>
                    {SKILL_CATEGORIES.map((skill) => (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        key={skill.name}
                        onClick={() => setSelectedSkill(skill.name)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                          selectedSkill === skill.name 
                            ? 'bg-[#FF6A00] text-white shadow-lg shadow-orange-200' 
                            : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <span className={selectedSkill === skill.name ? 'text-white' : 'text-[#FF6A00]'}>
                          {React.cloneElement(skill.icon as React.ReactElement<any>, { size: 18 })}
                        </span>
                        {skill.name}
                      </motion.button>
                    ))}
                  </div>

                  {/* Price Range Filter */}
                  <div className="space-y-2 mt-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      {t.budgetFilter || "Budget (per hr)"}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {[
                        { id: 'all', label: t.budgetAll },
                        { id: 'under200', label: t.budgetUnder200 },
                        { id: '200-300', label: t.budget200To300 },
                        { id: 'above300', label: t.budgetAbove300 }
                      ].map((item) => (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          key={item.id}
                          onClick={() => setPriceFilter(item.id as any)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            priceFilter === item.id
                              ? 'bg-slate-900 text-white shadow-md'
                              : 'bg-white text-slate-600 border border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          {item.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.1
                        }
                      }
                    }}
                    className="grid gap-4"
                  >
                    {filteredWorkers.map((worker) => (
                      <motion.div
                        key={worker.id}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 }
                        }}
                      >
                        <WorkerCard 
                          worker={worker} 
                          onCallInitiated={() => handleStartChat(worker.id)} 
                          onBookClick={(w) => setBookingWorker(w)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}
            </div>
            
            {profile?.role === 'customer' && (
              <button 
                onClick={() => setShowJobForm(true)}
                className="fixed bottom-24 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-30"
              >
                <Plus size={32} />
              </button>
            )}
          </motion.div>
        )}

        {activeTab === 'jobs' && (
          <motion.div 
            key="jobs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-6 overflow-y-auto"
          >
            <h2 className="text-3xl font-black text-slate-900 mb-6">{t.jobBoard}</h2>
            <JobBoard userLocation={userLocation} onSelectJob={(job) => handleStartChat(job.customerId)} />
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div 
            key="messages"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 h-full"
          >
            {activeChatId ? (
              <ChatRoom chatId={activeChatId} onBack={() => setActiveChatId(null)} />
            ) : (
              <div className="flex flex-col h-full">
                <header className="px-6 py-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
                  <h2 className="text-2xl font-black text-slate-900">{t.messages}</h2>
                  <button className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors">
                    <Plus size={20} />
                  </button>
                </header>
                <div className="flex-1 overflow-y-auto">
                  <ChatList onChatSelect={setActiveChatId} />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'ai-labour' && (
          <motion.div 
            key="ai-labour"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 h-full"
          >
            <AILabour />
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-slate-900">{t.profile}</h2>
              <button onClick={handleLogout} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors">
                <LogOut size={20} />
              </button>
            </div>
            <ProfileDashboard 
              role={profile?.role || 'customer'} 
              onOpenChat={setActiveChatId} 
              onBookWorker={setBookingWorker}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-slate-100 px-8 py-4 flex justify-between items-center sticky bottom-0 z-40">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-[#FF6A00]' : 'text-slate-300'}`}
        >
          <Home size={24} className={activeTab === 'home' ? 'fill-current' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('jobs')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'jobs' ? 'text-[#FF6A00]' : 'text-slate-300'}`}
        >
          <Briefcase size={24} className={activeTab === 'jobs' ? 'fill-current' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">Jobs</span>
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'messages' ? 'text-[#FF6A00]' : 'text-slate-300'}`}
        >
          <MessageSquare size={24} className={activeTab === 'messages' ? 'fill-current' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
        </button>
        <button 
          onClick={() => setActiveTab('ai-labour')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'ai-labour' ? 'text-[#FF6A00]' : 'text-slate-300'}`}
        >
          <Bot size={24} className={activeTab === 'ai-labour' ? 'fill-current' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">{t.aiLabour}</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-[#FF6A00]' : 'text-slate-300'}`}
        >
          <UserIcon size={24} className={activeTab === 'profile' ? 'fill-current' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest">Me</span>
        </button>
      </nav>

      {/* Modals */}
      {showJobForm && (
        <JobPostForm 
          onClose={() => setShowJobForm(false)} 
          userLocation={userLocation} 
        />
      )}

      {bookingWorker && (
        <BookingModal 
          worker={bookingWorker} 
          onClose={() => setBookingWorker(null)} 
        />
      )}

      <AnimatePresence>
        {showTracking && activeBooking && (
          <TrackingView 
            booking={activeBooking} 
            onClose={() => setShowTracking(false)} 
            onCancel={() => setShowTracking(false)}
          />
        )}
      </AnimatePresence>
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
};

export default App;
