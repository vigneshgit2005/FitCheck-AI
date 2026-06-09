import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { addWardrobeItem, getWardrobe, deleteWardrobeItem, imageUrl } from '../utils/api'

const OCCASIONS = ['casual', 'office', 'wedding', 'party', 'gym', 'beach', 'date', 'festival', 'formal']
const CATEGORY_COLORS = {
  top: 'bg-blue-50 text-blue-700 border-blue-200',
  bottom: 'bg-green-50 text-green-700 border-green-200',
  shoes: 'bg-amber-50 text-amber-700 border-amber-200',
  dress: 'bg-pink-50 text-pink-700 border-pink-200',
  outerwear: 'bg-purple-50 text-purple-700 border-purple-200',
  accessory: 'bg-stone-50 text-stone-600 border-stone-200',
  unknown: 'bg-stone-50 text-stone-500 border-stone-200',
}

export default function Wardrobe() {
  const userId = localStorage.getItem('fitcheck_user_id') || 'guest'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [label, setLabel] = useState('')
  const [pattern, setPattern] = useState('solid')
  const [selectedOccasions, setSelectedOccasions] = useState([])
  const [filterCat, setFilterCat] = useState('all')

  const loadWardrobe = useCallback(async () => {
    try {
      const { data } = await getWardrobe(userId)
      setItems(data.items || [])
    } catch {
      toast.error('Could not load wardrobe')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadWardrobe() }, [loadWardrobe])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] }, maxFiles: 1,
    onDrop: ([file]) => { setImage(file); setPreview(URL.createObjectURL(file)) },
  })

  const toggleOccasion = (o) =>
    setSelectedOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])

  const handleUpload = async () => {
    if (!image) return toast.error('Select a clothing photo')
    if (selectedOccasions.length === 0) return toast.error('Select at least one occasion')
    const fd = new FormData()
    fd.append('user_id', userId)
    fd.append('label', label)
    fd.append('occasion_tags', selectedOccasions.join(','))
    fd.append('pattern', pattern)
    fd.append('image', image)
    setUploading(true)
    try {
      await addWardrobeItem(fd)
      toast.success('Item added to your closet!')
      setImage(null); setPreview(null); setLabel(''); setSelectedOccasions([])
      loadWardrobe()
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (itemId) => {
    try {
      await deleteWardrobeItem(userId, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
      toast.success('Item removed')
    } catch {
      toast.error('Could not remove item')
    }
  }

  const categories = ['all', ...new Set(items.map(i => i.category).filter(Boolean))]
  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat)

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs tracking-widest uppercase text-mink mb-1">Digital closet</p>
          <h1 className="font-display text-4xl text-charcoal">My Wardrobe</h1>
        </div>
        <p className="text-slate text-sm">{items.length} items</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Upload panel */}
        <div className="lg:col-span-1">
          <div className="card space-y-5 sticky top-20">
            <h2 className="font-display text-xl text-charcoal">Add Item</h2>

            <div {...getRootProps()}
              className={`border-2 border-dashed border-stone-300 p-6 text-center cursor-pointer
                          transition-colors ${isDragActive ? 'dropzone-active' : 'hover:border-mink'}`}>
              <input {...getInputProps()} />
              {preview
                ? <img src={preview} className="w-full h-40 object-contain mx-auto" alt="preview" />
                : <p className="text-sm text-stone-400">Drop clothing photo here</p>}
            </div>

            <input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Label (e.g. white shirt, blue jeans)"
              className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-mink" />

            <div>
              <p className="text-xs tracking-widest uppercase text-slate mb-2">Occasions</p>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map(o => (
                  <button key={o} onClick={() => toggleOccasion(o)}
                    className={`text-xs px-3 py-1 border transition-colors ${
                      selectedOccasions.includes(o)
                        ? 'bg-charcoal text-cream border-charcoal'
                        : 'border-stone-300 text-slate hover:border-mink'
                    }`}>
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs tracking-widest uppercase text-slate mb-2">Pattern</p>
              <select value={pattern} onChange={e => setPattern(e.target.value)}
                className="w-full border border-stone-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-mink">
                {['solid', 'striped', 'checked', 'floral', 'geometric', 'printed'].map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <button onClick={handleUpload} disabled={uploading}
              className="btn-primary w-full text-center disabled:opacity-50 text-sm">
              {uploading ? 'Adding…' : 'Add to closet'}
            </button>
          </div>
        </div>

        {/* Items grid */}
        <div className="lg:col-span-2">
          {/* Category filter */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setFilterCat(c)}
                className={`text-xs px-4 py-1.5 border transition-colors ${
                  filterCat === c ? 'bg-charcoal text-cream border-charcoal' : 'border-stone-300 text-slate hover:border-charcoal'
                }`}>
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20 text-stone-400 text-sm">Loading your closet…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <p className="font-display text-2xl text-stone-300 mb-2">Empty closet</p>
              <p className="text-sm">Upload your first item →</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <AnimatePresence>
                {filtered.map(item => (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white border border-stone-200 group relative overflow-hidden">
                    <div className="aspect-square bg-stone-50">
                      <img
                        src={imageUrl(item.image_filename)}
                        alt={item.description}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 border ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.unknown}`}>
                          {item.category}
                        </span>
                        <span className="color-dot" style={{ backgroundColor: item.color_hex }} />
                      </div>
                      <p className="text-xs text-stone-500 truncate">{item.occasion_tags?.join(', ')}</p>
                    </div>
                    <button onClick={() => handleDelete(item.id)}
                      className="absolute top-2 right-2 w-6 h-6 bg-white border border-stone-200
                                 text-stone-400 hover:text-red-500 hover:border-red-300
                                 opacity-0 group-hover:opacity-100 transition-all text-xs flex items-center justify-center">
                      ×
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
