import React from 'react';
import { Camera, Upload, RefreshCw, CheckCircle2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface Analysis {
  skinTone: string;
  outfitColors: string[];
  verdict: string;
  recommendations: string;
  score: number;
  colorPaletteSuggestions: string[];
}

export default function FitCheck({ user }: { user: User }) {
  const [image, setImage] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [result, setResult] = React.useState<Analysis | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeOutfit = async () => {
    if (!image) return;
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setResult(data);

      // Save to history
      const sessionsPath = `users/${user.uid}/sessions`;
      try {
        await addDoc(collection(db, sessionsPath), {
          userId: user.uid,
          imageUrl: image,
          ...data,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, sessionsPath);
      }
    } catch (err) {
      setError('Failed to analyze outfit. Please try again.');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      {!result && !analyzing && (
        <div className="text-center space-y-4 py-8">
          <h2 className="text-4xl font-display font-bold">New Analysis</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Upload a photo of your outfit to get instant feedback on how it matches your skin tone.
          </p>
        </div>
      )}

      {/* Image Upload Area */}
      {!result && !analyzing && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto"
        >
          {image ? (
            <div className="relative group">
              <img src={image} alt="Preview" className="w-full h-[400px] object-cover rounded-3xl shadow-xl" />
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent rounded-b-3xl">
                <div className="flex gap-3">
                  <button
                    onClick={analyzeOutfit}
                    className="flex-1 bg-white text-black py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                  >
                    Analyze Outfit <ArrowRight size={20} />
                  </button>
                  <button
                    onClick={() => setImage(null)}
                    className="p-4 bg-white/20 backdrop-blur-md text-white rounded-2xl hover:bg-white/30 transition-colors"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center hover:border-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent)]/5 transition-all cursor-pointer group"
            >
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <Upload size={32} className="text-gray-400 group-hover:text-[var(--color-brand-accent)]" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Upload or Take Photo</h3>
              <p className="text-gray-400">JPEG, PNG up to 10MB</p>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </motion.div>
      )}

      {/* Loading State */}
      {analyzing && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-gray-100 border-t-[var(--color-brand-accent)] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera size={32} className="text-gray-300" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-display font-bold mb-2">Analyzing your style...</h3>
            <p className="text-gray-400 animate-pulse">Running computer vision models</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
        >
          {/* Left: Image & Score */}
          <div className="space-y-6">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[3/4]">
              <img src={image!} alt="Original" className="w-full h-full object-cover" />
              <div className="absolute top-6 right-6">
                <div className="bg-white/90 backdrop-blur pb-2 pt-4 px-6 rounded-2xl flex flex-col items-center shadow-lg">
                  <span className="text-4xl font-display font-black leading-none">{result.score}</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Score</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => { setResult(null); setImage(null); }}
              className="w-full py-4 border-2 border-gray-200 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} /> New Scan
            </button>
          </div>

          {/* Right: Analysis Details */}
          <div className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-50">
            <div>
              <div className="inline-flex items-center gap-2 text-[var(--color-brand-accent)] font-bold text-sm uppercase tracking-widest mb-2">
                <CheckCircle2 size={16} /> Analysis Complete
              </div>
              <h2 className="text-3xl font-display font-bold leading-tight">{result.verdict}</h2>
            </div>

            <div className="space-y-6">
              <section>
                <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-3">Color Profile</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-500">Skin Tone</span>
                    <span className="text-sm font-bold text-gray-900">{result.skinTone}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-gray-500">Outfit Palette</span>
                    <div className="flex gap-2">
                      {result.outfitColors.map((c, i) => (
                        <div 
                          key={i} 
                          className="w-6 h-6 rounded-full border border-gray-200 shadow-sm" 
                          style={{ backgroundColor: c.startsWith('#') ? c : 'transparent' }} 
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-3">Stylist Recommendations</h4>
                <div className="markdown-body prose prose-sm max-w-none">
                  <ReactMarkdown>{result.recommendations}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-3">Your Ideal Palette</h4>
                <div className="flex gap-2">
                  {result.colorPaletteSuggestions.map((c, i) => (
                    <motion.div 
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 * i }}
                      className="w-10 h-10 rounded-full border border-gray-100 shadow-sm" 
                      style={{ backgroundColor: c.startsWith('#') ? c : 'transparent' }}
                      title={c}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 border border-red-100"
        >
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
        </motion.div>
      )}
    </div>
  );
}
