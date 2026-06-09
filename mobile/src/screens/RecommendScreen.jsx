import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  FlatList, Image, Animated, PanResponder, Dimensions,
  ActivityIndicator, Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, Radius, Shadow, OCCASIONS } from '../utils/theme'
import { getRecommendations, imageUrl } from '../utils/api'

const { width } = Dimensions.get('window')

function OccasionCard({ occasion, selected, onPress }) {
  const scale = useRef(new Animated.Value(1)).current
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={press} activeOpacity={1}
        style={[styles.occasionCard, selected && styles.occasionCardActive,
          { backgroundColor: selected ? Colors.charcoal : Colors.white }]}>
        <Text style={styles.occasionCardIcon}>{occasion.icon}</Text>
        <Text style={[styles.occasionCardLabel, selected && { color: Colors.white }]}>
          {occasion.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

function OutfitCard({ outfit, index }) {
  const translateX = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current
  const [liked, setLiked] = useState(false)

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
    onPanResponderMove: (_, g) => translateX.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (g.dx > 100) {
        setLiked(true)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start()
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start()
      }
    },
  })

  const items = [
    { label: 'Top',    data: outfit.top },
    { label: 'Bottom', data: outfit.bottom },
    { label: 'Shoes',  data: outfit.shoes },
  ].filter(i => i.data)

  const score = Math.round((outfit.scores?.overall ?? 0.5) * 100)
  const rotate = translateX.interpolate({ inputRange: [-150, 0, 150], outputRange: ['-8deg', '0deg', '8deg'] })

  return (
    <Animated.View {...panResponder.panHandlers}
      style={[styles.outfitCard, { transform: [{ translateX }, { rotate }], opacity }]}>

      {/* Score + liked indicator */}
      <View style={styles.outfitCardHeader}>
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{score}% match</Text>
        </View>
        {liked && (
          <View style={styles.likedBadge}>
            <Text style={styles.likedText}>❤️ Saved</Text>
          </View>
        )}
      </View>

      {/* Outfit items */}
      <View style={styles.outfitItems}>
        {items.map(({ label, data }) => (
          <View key={label} style={styles.outfitItemCol}>
            <View style={styles.outfitImageWrap}>
              <Image source={{ uri: imageUrl(data?.image_filename) }}
                style={styles.outfitImage} resizeMode="cover"
                onError={() => {}} />
              <View style={[styles.outfitColorDot, { backgroundColor: data?.color_hex || '#ccc' }]} />
            </View>
            <Text style={styles.outfitItemLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Score bars */}
      <View style={styles.scoreBars}>
        {[
          ['Skin match', outfit.scores?.skin_compatibility],
          ['Harmony',   outfit.scores?.color_harmony],
          ['Occasion',  outfit.scores?.occasion_match],
        ].map(([label, val]) => (
          <View key={label} style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{label}</Text>
            <View style={styles.scoreTrack}>
              <View style={[styles.scoreFill, { width: `${Math.round((val ?? 0.5) * 100)}%` }]} />
            </View>
            <Text style={styles.scoreVal}>{Math.round((val ?? 0.5) * 100)}%</Text>
          </View>
        ))}
      </View>

      <Text style={styles.swipeHint}>← Swipe right to save  •  Long press to share →</Text>
    </Animated.View>
  )
}

export default function RecommendScreen() {
  const [occasion, setOccasion] = useState('')
  const [outfits, setOutfits] = useState(null)
  const [loading, setLoading] = useState(false)
  const [styleNote, setStyleNote] = useState('')
  const scrollRef = useRef(null)

  const handleRecommend = async () => {
    if (!occasion) return
    const userId = await AsyncStorage.getItem('fitcheck_user_id')
    if (!userId) return Alert.alert('Set up your profile first')
    setLoading(true)
    setOutfits(null)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const fd = new FormData()
      fd.append('user_id', userId)
      fd.append('occasion', occasion)
      fd.append('style_preference', styleNote)
      const { data } = await getRecommendations(fd)
      setOutfits(data.outfits || [])
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => scrollRef.current?.scrollTo({ y: 500, animated: true }), 300)
    } catch {
      Alert.alert('Could not fetch recommendations. Is the backend running?')
    } finally { setLoading(false) }
  }

  return (
    <ScrollView ref={scrollRef} style={styles.container}
      contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>OUTFIT RECOMMENDER</Text>
        <Text style={styles.headerTitle}>What's the{'\n'}occasion?</Text>
      </View>

      {/* Occasion grid */}
      <View style={styles.occasionGrid}>
        {OCCASIONS.map(o => (
          <OccasionCard key={o.id} occasion={o}
            selected={occasion === o.id}
            onPress={() => setOccasion(o.id)} />
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.recommendBtn, !occasion && styles.disabledBtn]}
        onPress={handleRecommend} disabled={!occasion || loading}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.white} size="small" />
            <Text style={[styles.recommendBtnText, { marginLeft: 10 }]}>Finding your outfits…</Text>
          </View>
        ) : (
          <Text style={styles.recommendBtnText}>
            {occasion ? `Get ${occasion} outfits →` : 'Pick an occasion first'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Results */}
      {outfits && outfits.length === 0 && (
        <View style={styles.emptyResult}>
          <Text style={styles.emptyResultIcon}>👗</Text>
          <Text style={styles.emptyResultTitle}>No outfits found</Text>
          <Text style={styles.emptyResultText}>Add tops, bottoms and shoes to your closet first</Text>
        </View>
      )}

      {outfits && outfits.length > 0 && (
        <View style={styles.results}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {outfits.length} outfits for{' '}
              <Text style={{ color: Colors.mink }}>{occasion}</Text>
            </Text>
            <Text style={styles.resultsHint}>Swipe right to save</Text>
          </View>
          {outfits.map((outfit, i) => (
            <OutfitCard key={i} outfit={outfit} index={i} />
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingBottom: 120 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.lg },
  headerLabel: { fontSize: 11, letterSpacing: 3, color: Colors.mink, fontWeight: '600', marginBottom: 4 },
  headerTitle: { fontSize: 32, fontWeight: '700', color: Colors.charcoal, lineHeight: 40 },

  occasionGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 10, marginBottom: Spacing.lg },
  occasionCard: { width: (width - Spacing.lg * 2 - 30) / 3, paddingVertical: Spacing.md,
    borderRadius: Radius.lg, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.stone, ...Shadow.soft },
  occasionCardActive: { borderColor: Colors.charcoal },
  occasionCardIcon: { fontSize: 26, marginBottom: 6 },
  occasionCardLabel: { fontSize: 12, fontWeight: '600', color: Colors.charcoal },

  recommendBtn: { marginHorizontal: Spacing.lg, backgroundColor: Colors.charcoal,
    borderRadius: Radius.md, paddingVertical: 18, alignItems: 'center', marginBottom: Spacing.xl, ...Shadow.medium },
  recommendBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  disabledBtn: { opacity: 0.5 },

  emptyResult: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyResultIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyResultTitle: { fontSize: 20, fontWeight: '700', color: Colors.charcoal, marginBottom: 8 },
  emptyResultText: { fontSize: 14, color: '#999', textAlign: 'center', paddingHorizontal: Spacing.xl },

  results: { paddingHorizontal: Spacing.lg },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md },
  resultsTitle: { fontSize: 18, fontWeight: '700', color: Colors.charcoal },
  resultsHint: { fontSize: 12, color: '#999' },

  outfitCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md, ...Shadow.medium },
  outfitCardHeader: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.md },
  matchBadge: { backgroundColor: Colors.mink, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 5 },
  matchText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  likedBadge: { backgroundColor: '#FFE4E8', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 5 },
  likedText: { fontSize: 12, fontWeight: '500', color: '#D85A30' },

  outfitItems: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  outfitItemCol: { flex: 1, alignItems: 'center' },
  outfitImageWrap: { width: '100%', aspectRatio: 0.75, borderRadius: Radius.md,
    overflow: 'hidden', backgroundColor: Colors.stoneLight, marginBottom: 6 },
  outfitImage: { width: '100%', height: '100%' },
  outfitColorDot: { position: 'absolute', bottom: 6, right: 6, width: 10, height: 10,
    borderRadius: 5, borderWidth: 1.5, borderColor: Colors.white },
  outfitItemLabel: { fontSize: 11, fontWeight: '600', color: '#999', letterSpacing: 1 },

  scoreBars: { gap: 8, marginBottom: Spacing.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreLabel: { fontSize: 12, color: '#999', width: 80 },
  scoreTrack: { flex: 1, height: 3, backgroundColor: Colors.stoneLight, borderRadius: 2 },
  scoreFill: { height: '100%', backgroundColor: Colors.mink, borderRadius: 2 },
  scoreVal: { fontSize: 12, color: Colors.mink, fontWeight: '600', width: 34, textAlign: 'right' },
  swipeHint: { fontSize: 11, color: '#ccc', textAlign: 'center', letterSpacing: 0.5 },
})
