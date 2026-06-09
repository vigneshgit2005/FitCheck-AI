import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { onboardUser } from '../utils/api'

const GENDERS = ['Male', 'Female', 'Non-binary']
const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Plus']

export default function Onboard() {
  const nav = useNavigate()
  const [userId, setUserId] = useState('')
  const [gender, setGender] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [selfie, setSelfie] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: ([file]) => {
      setSelfie(file)
      setPreview(URL.createObjectURL(file))
    },
  })

  const handleSubmit = async () => {
    if (!userId.trim()) return toast.error('Enter a user ID')
    if (!gender) return toast.error('Select your gender')
    if (!bodyType) return toast.error('Select your body type')
    if (!selfie) return toast.error('Upload a selfie for skin tone detection')

    const fd = new FormData()
    fd.append('user_id', userId.trim())
    fd.append('gender', gender.toLowerCase())
    fd.append('body_type', bodyType.toLowerCase())
    fd.append('selfie', selfie)

    setLoading(true)
    try {
      const { data } = await onboardUser(fd)
      localStorage.setItem('fitcheck_user_id', data.user_id)
      localStorage.setItem('fitcheck_skin_tone', data.skin_tone?.hex || '#c68642')
      toast.success(`Welcome! Skin tone detected: ${data.skin_tone?.fitzpatrick_label}`)
      setTimeout(() => nav('/wardrobe'), 1200)
    } catch {
      toast.error('Onboarding failed — is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-xs tracking-widest uppercase text-mink mb-3">Personal style assistant</p>
        <h1 className="font-display text-5xl leading-tight text-charcoal mb-4">
          Dress for<br /><em>every</em> occasion.
        </h1>
        <p className="text-slate text-base leading-relaxed mb-12 max-w-md">
          Upload your wardrobe once. Get outfit recommendations from your own clothes,
          matched to your skin tone and the occasion.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="space-y-8">

        {/* User ID */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-slate mb-2">Your name or ID</label>
          <input
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="e.g. priya_2024"
            className="w-full border border-stone-300 bg-white px-4 py-3 text-sm text-charcoal
                       focus:outline-none focus:border-mink placeholder-stone-400 transition-colors"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-slate mb-3">Gender</label>
          <div className="flex gap-3">
            {GENDERS.map(g => (
              <button key={g} onClick={() => setGender(g)}
                className={`px-5 py-2 text-sm border transition-colors duration-150 ${
                  gender === g
                    ? 'bg-charcoal text-cream border-charcoal'
                    : 'border-stone-300 text-slate hover:border-charcoal hover:text-charcoal bg-white'
                }`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Body type */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-slate mb-3">Body type</label>
          <div className="flex gap-3 flex-wrap">
            {BODY_TYPES.map(b => (
              <button key={b} onClick={() => setBodyType(b)}
                className={`px-5 py-2 text-sm border transition-colors duration-150 ${
                  bodyType === b
                    ? 'bg-charcoal text-cream border-charcoal'
                    : 'border-stone-300 text-slate hover:border-charcoal hover:text-charcoal bg-white'
                }`}>
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Selfie upload */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-slate mb-3">
            Selfie — for skin tone detection
          </label>
          <div {...getRootProps()}
            className={`border-2 border-dashed border-stone-300 bg-white p-8 text-center cursor-pointer
                        transition-colors duration-150 ${isDragActive ? 'dropzone-active' : 'hover:border-mink'}`}>
            <input {...getInputProps()} />
            {preview ? (
              <img src={preview} alt="selfie preview"
                className="w-24 h-24 object-cover rounded-full mx-auto mb-3 border-2 border-mink" />
            ) : (
              <div className="text-stone-400">
                <p className="text-sm">Drop your photo here</p>
                <p className="text-xs mt-1">or click to browse</p>
              </div>
            )}
            {selfie && (
              <p className="text-xs text-mink mt-2 font-medium">{selfie.name}</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          className="btn-primary w-full text-center disabled:opacity-50">
          {loading ? 'Setting up your profile…' : 'Start my style profile →'}
        </button>
      </motion.div>
    </div>
  )
}
