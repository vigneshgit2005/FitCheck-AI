import { useState } from 'react'
import { imageUrl } from '../api'

function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-mono text-xs text-muted">{label}</span>
        <span className="font-mono text-xs text-gold">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-0.5 bg-blush overflow-hidden">
        <div
          className="h-full bg-gold transition-all duration-700"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  )
}

function ItemPhoto({ item, label }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex-1">
      <p className="label mb-1">{label}</p>
      <div className="aspect-[3/4] bg-blush overflow-hidden relative">
        {item.image_filename && !imgError ? (
          <img
            src={imageUrl(item.image_filename)}
            alt={label}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-10 h-10 rounded-full"
              style={{ backgroundColor: item.color_hex || '#E8E0D5' }}
            />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color_hex }} />
            <span className="font-mono text-xs text-muted truncate">{item.color_hex}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OutfitCard({ outfit, rank }) {
  const [expanded, setExpanded] = useState(false)
  const score = outfit.scores?.overall ?? 0
  const scorePercent = Math.round(score * 100)

  return (
    <div className="bg-white border border-blush hover:border-gold transition-colors duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-blush">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">#{rank}</span>
          <div className="h-3 w-px bg-blush" />
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 bg-blush overflow-hidden">
              <div className="h-full bg-gold" style={{ width: `${scorePercent}%` }} />
            </div>
            <span className="font-mono text-xs text-gold">{scorePercent}% match</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="font-mono text-xs text-muted hover:text-ink transition-colors uppercase tracking-widest"
        >
          {expanded ? 'less' : 'details'}
        </button>
      </div>

      {/* Outfit photos */}
      <div className="flex gap-px">
        <ItemPhoto item={outfit.top} label="Top" />
        <ItemPhoto item={outfit.bottom} label="Bottom" />
        <ItemPhoto item={outfit.shoes} label="Shoes" />
      </div>

      {/* Tags */}
      <div className="px-5 py-3 flex flex-wrap gap-2">
        {[...new Set([
          ...(outfit.top?.occasion_tags || []),
          ...(outfit.bottom?.occasion_tags || []),
        ].filter(Boolean))].slice(0, 4).map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>

      {/* Score breakdown (expandable) */}
      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-blush space-y-3 animate-fade-in">
          <p className="label">Score breakdown</p>
          <ScoreBar label="Vector similarity" value={outfit.scores?.vector_similarity ?? 0} />
          <ScoreBar label="Skin compatibility" value={outfit.scores?.skin_compatibility ?? 0} />
          <ScoreBar label="Color harmony" value={outfit.scores?.color_harmony ?? 0} />
          <ScoreBar label="Occasion match" value={outfit.scores?.occasion_match ?? 0} />
        </div>
      )}
    </div>
  )
}
