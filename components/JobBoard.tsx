
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Job, SkillCategory } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { SKILL_CATEGORIES, MOCK_JOBS } from '../constants';
import { 
  Briefcase, 
  MapPin, 
  IndianRupee, 
  Clock, 
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';
import { safeFormatDistanceToNow } from '../lib/date-utils';

interface JobBoardProps {
  userLocation: { lat: number; lng: number };
  onSelectJob: (job: Job) => void;
}

const JobBoard: React.FC<JobBoardProps> = ({ userLocation, onSelectJob }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<SkillCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'jobs'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      setJobs(jobsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jobs');
    });

    return () => unsubscribe();
  }, []);

  const allJobs = [...jobs, ...MOCK_JOBS].filter((job, index, self) => 
    index === self.findIndex((t) => t.id === job.id)
  );

  const filteredJobs = allJobs.filter(job => {
    const matchesFilter = filter === 'All' || job.skillRequired === filter;
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         job.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 transition-all shadow-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setFilter('All')}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              filter === 'All' ? 'bg-[#FF6A00] text-white shadow-lg shadow-orange-200' : 'bg-white text-slate-500 border border-slate-100'
            }`}
          >
            All Jobs
          </button>
          {SKILL_CATEGORIES.map((skill) => (
            <button
              key={skill.name}
              onClick={() => setFilter(skill.name)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                filter === skill.name ? 'bg-[#FF6A00] text-white shadow-lg shadow-orange-200' : 'bg-white text-slate-500 border border-slate-100'
              }`}
            >
              {skill.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => onSelectJob(job)}
              className="group bg-white p-5 rounded-[24px] border border-slate-100 hover:border-[#FF6A00]/30 hover:shadow-xl hover:shadow-orange-50/50 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-orange-50 rounded-2xl text-[#FF6A00]">
                  <Briefcase size={24} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-black text-slate-900 flex items-center gap-1">
                    <IndianRupee size={16} /> {job.pay}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Pay</span>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-[#FF6A00] transition-colors">{job.title}</h3>
              <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">{job.description}</p>

              <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin size={16} />
                  <span className="text-xs font-bold">Nearby</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={16} />
                  <span className="text-xs font-bold">
                    {safeFormatDistanceToNow(job.createdAt)} ago
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-1 text-[#FF6A00] font-bold text-sm">
                  Apply Now <ChevronRight size={16} />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No jobs found</h3>
            <p className="text-slate-500">Try changing your filters or search query</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobBoard;
