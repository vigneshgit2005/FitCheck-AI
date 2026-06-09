import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, Modal, TextInput, ScrollView, RefreshControl,
  Dimensions, Alert, Animated,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, Radius, Shadow, OCCASIONS, CATEGORY_COLORS } from '../utils/theme'
import { addWardrobeItem, getWardrobe, deleteWardrobeItem, imageUrl } from '../utils/api'

const { width } = Dimensions.get('window')
const ITEM_SIZE = (width - Spacing.lg * 2 - 12) / 3

export default function WardrobeScreen() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploadModal, setUploadModal] = useState(false)
  const [image, setImage] = useState(null)
  const [label, setLabel] = useState('')
  const [selectedOccasions, setSelectedOccasions] = useState([])
  const [uploading, setUploading] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    AsyncStorage.getItem('fitcheck_user_id').then(id => {
      if (id) { setUserId(id); loadWardrobe(id) }
    })
  }, [])

  const loadWardrobe = async (uid) => {
    try {
      const { data } = await getWardrobe(uid || userId)
      setItems(data.items || [])
    } catch { /* offline graceful */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadWardrobe()
  }

  const pickImage = async (fromCamera = false) => {
    const fn = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync
    const result = await fn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [3, 4], quality: 0.8,
    })
    if (!result.canceled) setImage(result.assets[0])
  }

  const handleUpload = async () => {
    if (!image || selectedOccasions.length === 0) return
    setUploading(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const fd = new FormData()
      fd.append('user_id', userId)
      fd.append('label', label)
      fd.append('occasion_tags', selectedOccasions.join(','))
      fd.append('image', { uri: image.uri, type: 'image/jpeg', name: 'item.jpg' })
      await addWardrobeItem(fd)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setUploadModal(false)
      setImage(null); setLabel(''); setSelectedOccasions([])
      loadWardrobe()
    } catch {
      Alert.alert('Upload failed', 'Check your connection and try again.')
    } finally { setUploading(false) }
  }

  const handleDelete = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    Alert.alert('Remove item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await deleteWardrobeItem(userId, item.id)
          setItems(prev => prev.filter(i => i.id !== item.id))
        },
      },
    ])
  }

  const categories = ['all', ...new Set(items.map(i => i.category).filter(Boolean))]
  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat)

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.gridItem} onLongPress={() => handleDelete(item)}
      activeOpacity={0.85}>
      <Image source={{ uri: imageUrl(item.image_filename) }}
        style={styles.gridImage} resizeMode="cover"
        defaultSource={require('../assets/placeholder.png')} />
      <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[item.category] || CATEGORY_COLORS.unknown }]}>
        <Text style={styles.categoryBadgeText}>{item.category}</Text>
      </View>
      <View style={[styles.colorDot, { backgroundColor: item.color_hex }]} />
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>MY WARDROBE</Text>
          <Text style={styles.headerTitle}>Digital Closet</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setUploadModal(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{items.length}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{new Set(items.map(i => i.category)).size}</Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{new Set(items.flatMap(i => i.occasion_tags || [])).size}</Text>
          <Text style={styles.statLabel}>Occasions</Text>
        </View>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {categories.map(c => (
          <TouchableOpacity key={c} style={[styles.filterChip, filterCat === c && styles.filterChipActive]}
            onPress={() => { setFilterCat(c); Haptics.selectionAsync() }}>
            <Text style={[styles.filterText, filterCat === c && styles.filterTextActive]}>
              {c === 'all' ? 'All' : c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      {filtered.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👗</Text>
          <Text style={styles.emptyTitle}>Empty closet</Text>
          <Text style={styles.emptyText}>Tap + to add your first item</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setUploadModal(true)}>
            <Text style={styles.emptyBtnText}>Add clothes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={filtered} renderItem={renderItem} keyExtractor={i => i.id}
          numColumns={3} contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={Colors.mink} />} />
      )}

      {/* Upload modal */}
      <Modal visible={uploadModal} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setUploadModal(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add to wardrobe</Text>

          {/* Image picker */}
          <TouchableOpacity style={styles.imagePicker}
            onPress={() => pickImage(false)}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>📸</Text>
                <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.imageActions}>
            <TouchableOpacity style={styles.imageActionBtn} onPress={() => pickImage(true)}>
              <Text style={styles.imageActionText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageActionBtn} onPress={() => pickImage(false)}>
              <Text style={styles.imageActionText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          <TextInput style={styles.input} placeholder="Label (e.g. navy kurta, white shirt)"
            placeholderTextColor="#aaa" value={label} onChangeText={setLabel} />

          <Text style={styles.sectionLabel}>OCCASIONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.occasionRow}>
            {OCCASIONS.map(o => (
              <TouchableOpacity key={o.id}
                style={[styles.occasionChip,
                  selectedOccasions.includes(o.id) && styles.occasionChipActive]}
                onPress={() => {
                  Haptics.selectionAsync()
                  setSelectedOccasions(prev =>
                    prev.includes(o.id) ? prev.filter(x => x !== o.id) : [...prev, o.id])
                }}>
                <Text style={styles.occasionIcon}>{o.icon}</Text>
                <Text style={[styles.occasionLabel,
                  selectedOccasions.includes(o.id) && styles.occasionLabelActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.primaryBtn, (!image || selectedOccasions.length === 0 || uploading) && styles.disabledBtn]}
            onPress={handleUpload}>
            <Text style={styles.primaryBtnText}>
              {uploading ? 'Uploading…' : 'Add to closet'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setUploadModal(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.md },
  headerLabel: { fontSize: 11, letterSpacing: 3, color: Colors.mink, fontWeight: '600' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.charcoal },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.charcoal,
    alignItems: 'center', justifyContent: 'center', ...Shadow.soft },
  addBtnText: { color: Colors.white, fontSize: 24, fontWeight: '300', lineHeight: 28 },

  statsBar: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    ...Shadow.soft },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: Colors.charcoal },
  statLabel: { fontSize: 11, color: '#999', letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.stone, marginVertical: 4 },

  filterRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.stone, backgroundColor: Colors.white },
  filterChipActive: { backgroundColor: Colors.charcoal, borderColor: Colors.charcoal },
  filterText: { fontSize: 13, color: '#888', fontWeight: '500' },
  filterTextActive: { color: Colors.white },

  grid: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: 6 },
  gridItem: { width: ITEM_SIZE, height: ITEM_SIZE * 1.3, borderRadius: Radius.md,
    overflow: 'hidden', backgroundColor: Colors.stoneLight, marginRight: 6 },
  gridImage: { width: '100%', height: '100%' },
  categoryBadge: { position: 'absolute', top: 6, left: 6, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3 },
  categoryBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.charcoal },
  colorDot: { position: 'absolute', bottom: 6, right: 6, width: 12, height: 12,
    borderRadius: 6, borderWidth: 1.5, borderColor: Colors.white },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.charcoal, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#999', marginBottom: Spacing.xl },
  emptyBtn: { backgroundColor: Colors.charcoal, borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl, paddingVertical: 14 },
  emptyBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },

  modal: { flex: 1, backgroundColor: Colors.cream, padding: Spacing.lg, paddingTop: Spacing.sm },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.stone,
    alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: 24, fontWeight: '700', color: Colors.charcoal, marginBottom: Spacing.lg },

  imagePicker: { width: '100%', height: 200, borderRadius: Radius.lg,
    overflow: 'hidden', marginBottom: Spacing.sm },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, backgroundColor: Colors.stoneLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.stone, borderStyle: 'dashed', borderRadius: Radius.lg },
  imagePlaceholderIcon: { fontSize: 36, marginBottom: 8 },
  imagePlaceholderText: { fontSize: 14, color: '#999' },

  imageActions: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  imageActionBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.stoneLight, alignItems: 'center' },
  imageActionText: { fontSize: 14, fontWeight: '500', color: Colors.charcoal },

  input: { borderWidth: 1.5, borderColor: Colors.stone, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: 15,
    color: Colors.charcoal, backgroundColor: Colors.white, marginBottom: Spacing.md },

  sectionLabel: { fontSize: 11, letterSpacing: 2, color: Colors.mink,
    fontWeight: '600', marginBottom: Spacing.sm },
  occasionRow: { paddingBottom: Spacing.md, gap: 8 },
  occasionChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.stone,
    backgroundColor: Colors.white, minWidth: 72 },
  occasionChipActive: { backgroundColor: Colors.mink, borderColor: Colors.mink },
  occasionIcon: { fontSize: 20, marginBottom: 4 },
  occasionLabel: { fontSize: 11, fontWeight: '500', color: '#888' },
  occasionLabelActive: { color: Colors.white },

  primaryBtn: { backgroundColor: Colors.charcoal, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center', marginBottom: Spacing.sm },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  disabledBtn: { opacity: 0.4 },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#999', fontSize: 15 },
})
