import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import Onboard from './pages/Onboard'
import Wardrobe from './pages/Wardrobe'
import Recommend from './pages/Recommend'

const NAV = [
  { to: '/wardrobe', label: 'My Closet' },
  { to: '/recommend', label: 'Get Outfit' },
]

export default function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }
      }} />

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-cream border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <NavLink to="/" className="font-display text-xl tracking-tight text-charcoal">
            FitCheck<span style={{ color: '#8B7355' }}>.ai</span>
          </NavLink>
          <nav className="flex gap-8">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to}
                className={({ isActive }) =>
                  `text-sm tracking-wide transition-colors duration-150 ${
                    isActive ? 'text-mink font-medium' : 'text-slate hover:text-charcoal'
                  }`
                }>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Pages */}
      <main className="pt-14">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrap><Onboard /></PageWrap>} />
            <Route path="/wardrobe" element={<PageWrap><Wardrobe /></PageWrap>} />
            <Route path="/recommend" element={<PageWrap><Recommend /></PageWrap>} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}

function PageWrap({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
