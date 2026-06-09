import React from 'react';
import { User, Shield, Palette, History, ChevronRight } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';

export default function Profile({ user }: { user: FirebaseUser }) {
  const [historyCount, setHistoryCount] = React.useState(0);
  const [closetCount, setClosetCount] = React.useState(0);

  React.useEffect(() => {
    const fetchStats = async () => {
      const hSnap = await getDocs(query(collection(db, `users/${user.uid}/sessions`)));
      const cSnap = await getDocs(query(collection(db, `users/${user.uid}/closet`)));
      setHistoryCount(hSnap.size);
      setClosetCount(cSnap.size);
    };
    fetchStats();
  }, [user.uid]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-display font-bold">Your Profile</h2>
        <p className="text-gray-500">Your fashion identity and preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          label="Total Scans" 
          value={historyCount} 
          icon={<History className="text-blue-500" />} 
        />
        <StatsCard 
          label="Closet Items" 
          value={closetCount} 
          icon={<History className="text-green-500" />} 
        />
        <StatsCard 
          label="Style Tier" 
          value="Trendsettr" 
          icon={<Shield className="text-amber-500" />} 
        />
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50 space-y-6">
        <h3 className="text-xl font-display font-bold">Settings & Preferences</h3>
        <div className="space-y-4">
          <PreferenceItem 
            icon={<Palette size={20} />} 
            label="Skin Tone Profile" 
            value="Automated (Gemini Vision)" 
          />
          <PreferenceItem 
            icon={<Shield size={20} />} 
            label="Account Security" 
            value="Google Authenticated" 
          />
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 flex items-center gap-4">
      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</div>
        <div className="text-2xl font-display font-bold">{value}</div>
      </div>
    </div>
  );
}

function PreferenceItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group cursor-pointer hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-gray-400 group-hover:text-[var(--color-brand-accent)] transition-colors">
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold">{label}</div>
          <div className="text-xs text-gray-500">{value}</div>
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-300" />
    </div>
  );
}
