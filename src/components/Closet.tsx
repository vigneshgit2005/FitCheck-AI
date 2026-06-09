import React from 'react';
import { Plus, Search, Tag, Shirt, Trash2, Filter } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, onSnapshot, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

interface ClothingItem {
  id: string;
  category: string;
  primaryColor: string;
  imageUrl: string;
  tags: string[];
}

export default function Closet({ user }: { user: User }) {
  const [items, setItems] = React.useState<ClothingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [newItem, setNewItem] = React.useState({
    category: 'top',
    primaryColor: '#000000',
    tags: [] as string[]
  });
  const [imageFile, setImageFile] = React.useState<string | null>(null);

  const closetPath = `users/${user.uid}/closet`;

  React.useEffect(() => {
    const q = query(collection(db, closetPath));
    return onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClothingItem)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, closetPath);
    });
  }, [user.uid]);

  const addItem = async () => {
    if (!imageFile) return;
    try {
      await addDoc(collection(db, closetPath), {
        userId: user.uid,
        ...newItem,
        imageUrl: imageFile,
        createdAt: serverTimestamp()
      });
      setAdding(false);
      setImageFile(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, closetPath);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, closetPath, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, closetPath + '/' + id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-display font-bold">Digital Closet</h2>
          <p className="text-gray-500">Manage your wardrobe and get suggestions.</p>
        </div>
        <button 
          onClick={() => setAdding(true)}
          className="p-4 bg-[var(--color-brand-primary)] text-white rounded-2xl hover:opacity-90 transition-all shadow-lg active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group border border-gray-50"
            >
              <div className="aspect-[4/5] relative">
                <img src={item.imageUrl} alt={item.category} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="p-3 bg-white text-red-500 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{item.category}</span>
                  <div className="text-sm font-semibold capitalize">{item.primaryColor}</div>
                </div>
                <div 
                  className="w-4 h-4 rounded-full border border-gray-100" 
                  style={{ backgroundColor: item.primaryColor }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Shirt size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Your closet is empty</h3>
          <p className="text-gray-500">Start adding your clothes to get digital pairings.</p>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {adding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100">
                <h3 className="text-2xl font-display font-bold">Add Item</h3>
              </div>
              
              <div className="p-8 space-y-6 overflow-y-auto">
                {/* Image Drop */}
                <div 
                  onClick={() => document.getElementById('item-upload')?.click()}
                  className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {imageFile ? (
                    <img src={imageFile} className="w-full h-full object-cover rounded-3xl" />
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-300 mb-2" />
                      <span className="text-sm font-medium text-gray-400">Upload Image</span>
                    </>
                  )}
                  <input 
                    id="item-upload"
                    type="file" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setImageFile(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Category</label>
                    <select 
                      className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-[var(--color-brand-accent)]"
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="outerwear">Outerwear</option>
                      <option value="shoes">Shoes</option>
                      <option value="accessory">Accessory</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Color</label>
                    <input 
                      type="color" 
                      className="w-full h-12 p-1 bg-gray-50 rounded-xl cursor-pointer"
                      value={newItem.primaryColor}
                      onChange={(e) => setNewItem({...newItem, primaryColor: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 flex gap-4">
                <button 
                  onClick={() => setAdding(false)}
                  className="flex-1 py-4 font-bold text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={addItem}
                  disabled={!imageFile}
                  className="flex-1 py-4 bg-[var(--color-brand-primary)] text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Add to Closet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Upload({ size, className }: { size?: number, className?: string }) {
  return <Plus size={size} className={className} />;
}
