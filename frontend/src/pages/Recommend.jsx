import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { getRecommendations, imageUrl } from '../utils/api'

const OCCASIONS = ['casual', 'office', 'wedding', 'party', 'gym', 'beach', 'date', 'festival', 'formal']

function ScoreBar({ label, value }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-stone-500 mb-1">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-0.5 bg-stone-100 w-full">
        <div className="score-bar-fill" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  )
}

function OutfitCard({ outfit, rank }) {
  const [expanded, setExpanded] = useState(false)
  const items = [
    { label: 'Top', data: outfit.top },
    { label: 'Bottom', data: outfit.bottom },
    { label: 'Shoes', data: outfit.shoes },
  ].filter(i => i.data)

  const score = outfit.scores?.overall ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      className="bg-white border border-stone-200 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-stone-400">#{rank + 1}</span>
          <span className="text-sm font-medium text-charcoal">Outfit suggestion</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: '#8B7355' }}>
            {Math.round(score * 100)}% match
          </span>
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs text-stone-400 hover:text-charcoal transition-colors">
            {expanded ? 'less ↑' : 'details ↓'}
          </button>
        </div>
      </div>

      {/* Outfit items */}
      <div className="grid grid-cols-3 gap-0">
        {items.map(({ label, data }) => (
          <div key={label} className="border-r border-stone-100 last:border-r-0">
            <div className="aspect-square bg-stone-50">
              <img
                src={imageUrl(data?.image_filename)}
                alt={label}
                className="w-full h-full object-cover"
                onError={e => { e.target.parentElement.style.background = data?.color_hex || '#eee' }}
              />
            </div>
            <div className="px-3 py-2">
              <p className="text-xs tracking-widest uppercase text-stone-400">{label}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="color-dot" style={{ backgroundColor: data?.color_hex }} />
                <span className="text-xs text-stone-500 truncate">{data?.color_name || data?.color_hex}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded scores */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-stone-100 px-5 py-4">
            <p className="text-xs tracking-widest uppercase text-stone-400 mb-3">Score breakdown</p>
            <ScoreBar label="Vector similarity" value={outfit.scores?.vector_similarity ?? 0} />
            <ScoreBar label="Skin compatibility" value={outfit.scores?.skin_compatibility ?? 0} />
            <ScoreBar label="Color harmony" value={outfit.scores?.color_harmony ?? 0} />
            <ScoreBar label="Occasion match" value={outfit.scores?.occasion_match ?? 0} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Recommend() {
  const userId = localStorage.getItem('fitcheck_user_id') || 'guest'
  const skinTone = localStorage.getItem('fitcheck_skin_tone') || '#c68642'
  const [occasion, setOccasion] = useState('')
  const [styleNote, setStyleNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [outfits, setOutfits] = useState(null)
  const [usedOccasion, setUsedOccasion] = useState('')

  const handleRecommend = async () => {
    if (!occasion) return toast.error('Pick an occasion')
    const fd = new FormData()
    fd.append('user_id', userId)
    fd.append('occasion', occasion)
    fd.append('style_preference', styleNote)
    setLoading(true)
    setOutfits(null)
    try {
      const { data } = await getRecommendations(fd)
      setOutfits(data.outfits || [])
      setUsedOccasion(occasion)
      if (data.outfits?.length === 0) toast.error('No outfits found — add more items to your wardrobe')
    } catch {
      toast.error('Recommendation failed — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="text-xs tracking-widest uppercase text-mink mb-1">Style recommender</p>
        <h1 className="font-display text-4xl text-charcoal">What's the occasion?</h1>
      </div>

      {/* Controls */}
      <div className="card mb-10 space-y-6">
        <div>
          <p className="text-xs tracking-widest uppercase text-slate mb-3">Occasion</p>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map(o => (
              <button key={o} onClick={() => setOccasion(o)}
                className={`px-4 py-2 text-sm border transition-colors ${
                  occasion === o
                    ? 'bg-charcoal text-cream border-charcoal'
                    : 'border-stone-300 text-slate hover:border-charcoal'
                }`}>
                {o}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs tracking-widest uppercase text-slate mb-2">Style note (optional)</p>
          <input value={styleNote} onChange={e => setStyleNote(e.target.value)}
            placeholder="e.g. traditional, minimalist, bold…"
            className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-mink" />
        </div>

        {/* Skin tone badge */}
        <div className="flex items-center gap-3">
          <span className="text-xs tracking-widest uppercase text-slate">Your skin tone</span>
          <span className="color-dot w-5 h-5" style={{ backgroundColor: skinTone }} />
          <span className="font-mono text-xs text-stone-400">{skinTone}</span>
        </div>

        <button onClick={handleRecommend} disabled={loading}
          className="btn-primary disabled:opacity-50">
          {loading ? 'Finding your outfits…' : 'Recommend outfits →'}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="text-center py-16 text-stone-400 text-sm">
          <p className="font-display text-2xl text-stone-300 mb-2">Styling…</p>
          <p>Searching your wardrobe vectors</p>
        </div>
      )}

      {outfits && outfits.length > 0 && (
        <div>
          <div className="flex items-baseline gap-3 mb-6">
            <h2 className="font-display text-2xl text-charcoal">
              Outfits for <em>{usedOccasion}</em>
            </h2>
            <span className="text-sm text-stone-400">{outfits.length} suggestions</span>
          </div>
          <div className="space-y-5">
            {outfits.map((outfit, i) => (
              <OutfitCard key={i} outfit={outfit} rank={i} />
            ))}
          </div>
        </div>
      )}

      {outfits && outfits.length === 0 && (
        <div className="text-center py-16">
          <p className="font-display text-2xl text-stone-300 mb-2">No outfits found</p>
          <p className="text-sm text-stone-400">
            Add tops, bottoms, and shoes to your closet first
          </p>
        </div>
      )}
    </div>
  )
}
