import React from 'react';
import { Camera, Shirt, User, LogOut, Sparkles } from 'lucide-react';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import FitCheck from './components/FitCheck';
import Closet from './components/Closet';
import Profile from './components/Profile';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

type Tab = 'check' | 'closet' | 'profile';

export default function App() {
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<Tab>('check');

  React.useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-brand-bg)]">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-[var(--color-brand-accent)]"
        >
          <Sparkles size={48} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-brand-bg)]">
        <div className="max-w-md w-full space-y-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-2xl shadow-sm">
                <Sparkles size={40} className="text-[var(--color-brand-accent)]" />
              </div>
            </div>
            <h1 className="text-5xl font-display font-bold tracking-tight mb-4">
              FitCheck<span className="text-[var(--color-brand-accent)]">.ai</span>
            </h1>
            <p className="text-gray-500 text-lg mb-8">
              Data-driven styling. Remove the guesswork from your wardrobe.
            </p>
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-[var(--color-brand-primary)] text-white py-4 px-6 rounded-xl font-medium hover:opacity-90 transition-all cursor-pointer shadow-lg active:scale-[0.98]"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 invert" />
              Sign in with Google
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-brand-bg)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={24} className="text-[var(--color-brand-accent)]" />
            <span className="font-display font-bold text-xl tracking-tight">FitCheck.ai</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-full px-3">
              <img 
                src={user.photoURL || ''} 
                alt="Profile" 
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {user.displayName?.split(' ')[0]}
              </span>
            </div>
            <button 
              onClick={() => auth.signOut()}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24 pb-32 px-6 max-w-5xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'check' && (
            <motion.div
              key="check"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <FitCheck user={user} />
            </motion.div>
          )}
          {activeTab === 'closet' && (
            <motion.div
              key="closet"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Closet user={user} />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Profile user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-[var(--color-brand-primary)] text-white rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
          <NavButton 
            active={activeTab === 'check'} 
            onClick={() => setActiveTab('check')}
            icon={<Camera size={20} />}
            label="Analyze"
          />
          <NavButton 
            active={activeTab === 'closet'} 
            onClick={() => setActiveTab('closet')}
            icon={<Shirt size={20} />}
            label="Closet"
          />
          <NavButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')}
            icon={<User size={20} />}
            label="Profile"
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium text-sm",
        active ? "text-[var(--color-brand-primary)]" : "hover:bg-white/10 text-white/70 hover:text-white"
      )}
    >
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
      {active && (
        <motion.div 
          layoutId="activeTab" 
          className="absolute inset-0 bg-white rounded-xl z-0" 
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}
