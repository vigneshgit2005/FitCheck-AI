import { useState } from 'react'
import { imageUrl } from '../api'

export default function ClothingItem({ item, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [imgError, setImgError] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await onDelete(item.id)
    setDeleting(false)
  }

  const CATEGORY_COLORS = {
    top: 'bg-blue-50 text-blue-700',
    bottom: 'bg-purple-50 text-purple-700',
    shoes: 'bg-amber-50 text-amber-700',
    outerwear: 'bg-slate-50 text-slate-700',
    dress: 'bg-pink-50 text-pink-700',
    accessory: 'bg-green-50 text-green-700',
    unknown: 'bg-gray-50 text-gray-500',
  }

  const catClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.unknown

  return (
    <div className="group bg-white border border-blush hover:border-gold transition-colors duration-200 overflow-hidden">
      {/* Image */}
      <div className="aspect-[3/4] overflow-hidden bg-blush relative">
        {item.image_filename && !imgError ? (
          <img
            src={imageUrl(item.image_filename)}
            alt={item.description}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div
              className="w-16 h-16 rounded-full"
              style={{ backgroundColor: item.color_hex || '#E8E0D5' }}
            />
            <p className="font-mono text-xs text-muted">{item.color_hex}</p>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150
                     bg-white border border-blush w-8 h-8 flex items-center justify-center hover:bg-red-50 hover:border-red-200"
          title="Remove item"
        >
          {deleting ? (
            <span className="w-3 h-3 border border-muted border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <path d="M2 2l8 8M10 2l-8 8"/>
            </svg>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-body px-2 py-0.5 font-medium ${catClass}`}>
            {item.category}
          </span>
          <div
            className="w-4 h-4 rounded-full border border-blush"
            style={{ backgroundColor: item.color_hex }}
            title={item.color_hex}
          />
        </div>

        {item.occasion_tags?.filter(Boolean).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.occasion_tags.filter(Boolean).slice(0, 3).map(tag => (
              <span key={tag} className="tag text-xs">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
