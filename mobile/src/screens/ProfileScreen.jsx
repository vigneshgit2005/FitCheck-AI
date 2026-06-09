import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, Dimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, Radius, Shadow } from '../utils/theme'
import { getWardrobe } from '../utils/api'

const { width } = Dimensions.get('window')

const FITZPATRICK_TIPS = {
  'Very light':   ['Navy', 'Burgundy', 'Forest green', 'Dusty rose'],
  'Light':        ['Camel', 'Teal', 'Rust', 'Lavender'],
  'Medium light': ['Olive', 'Terracotta', 'Mustard', 'Cobalt'],
  'Medium':       ['Orange', 'Bright coral', 'Royal blue', 'Emerald'],
  'Medium dark':  ['Gold', 'Electric blue', 'Fuchsia', 'White'],
  'Dark':         ['Bright white', 'Yellow', 'Cobalt', 'Hot pink'],
}

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null)
  const [wardrobeStats, setWardrobeStats] = useState(null)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const load = async () => {
      const uid = await AsyncStorage.getItem('fitcheck_user_id')
      const raw = await AsyncStorage.getItem('fitcheck_profile')
      if (uid) setUserId(uid)
      if (raw) {
        const p = JSON.parse(raw)
        setProfile(p)
        try {
          const { data } = await getWardrobe(uid)
          const items = data.items || []
          const cats = {}
          items.forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1 })
          setWardrobeStats({ total: items.length, categories: cats })
        } catch {}
      }
    }
    load()
  }, [])

  if (!profile) {
    return (
      <View style={styles.noProfile}>
        <Text style={styles.noProfileIcon}>👤</Text>
        <Text style={styles.noProfileTitle}>No profile yet</Text>
        <TouchableOpacity style={styles.setupBtn} onPress={() => navigation.navigate('Onboard')}>
          <Text style={styles.setupBtnText}>Set up profile</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const skin = profile.skin_tone || {}
  const tips = FITZPATRICK_TIPS[skin.fitzpatrick_label] || []

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Hero section */}
      <View style={styles.hero}>
        <View style={[styles.skinCircle, { backgroundColor: skin.hex || '#c68642' }]} />
        <View style={styles.heroText}>
          <Text style={styles.heroId}>{userId}</Text>
          <Text style={styles.heroSkin}>{skin.fitzpatrick_label} skin tone</Text>
          <Text style={styles.heroGender}>
            {profile.gender} · {profile.body_type} build
          </Text>
        </View>
      </View>

      {/* Skin tone card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Skin tone</Text>
        <View style={styles.skinRow}>
          <View style={[styles.skinSwatch, { backgroundColor: skin.hex }]} />
          <View>
            <Text style={styles.skinCode}>{skin.hex}</Text>
            <Text style={styles.skinType}>Fitzpatrick Type {skin.fitzpatrick_type}</Text>
          </View>
        </View>
        {tips.length > 0 && (
          <>
            <Text style={styles.tipsLabel}>RECOMMENDED COLORS FOR YOU</Text>
            <View style={styles.tipsRow}>
              {tips.map(t => (
                <View key={t} style={styles.tipChip}>
                  <Text style={styles.tipText}>{t}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Wardrobe stats */}
      {wardrobeStats && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wardrobe summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{wardrobeStats.total}</Text>
              <Text style={styles.statLabel}>Total items</Text>
            </View>
            {Object.entries(wardrobeStats.categories).map(([cat, count]) => (
              <View key={cat} style={styles.statBox}>
                <Text style={styles.statNum}>{count}</Text>
                <Text style={styles.statLabel}>{cat}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Body type card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Body profile</Text>
        <View style={styles.profileRow}>
          <View style={styles.profileItem}>
            <Text style={styles.profileItemLabel}>GENDER</Text>
            <Text style={styles.profileItemValue}>{profile.gender}</Text>
          </View>
          <View style={styles.profileDivider} />
          <View style={styles.profileItem}>
            <Text style={styles.profileItemLabel}>BODY TYPE</Text>
            <Text style={styles.profileItemValue}>{profile.body_type}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.resetBtn}
        onPress={async () => {
          await AsyncStorage.clear()
          navigation.replace('Onboard')
        }}>
        <Text style={styles.resetBtnText}>Reset profile</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    paddingHorizontal: Spacing.lg, paddingTop: 70, paddingBottom: Spacing.lg },
  skinCircle: { width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: Colors.white, ...Shadow.soft },
  heroText: { flex: 1 },
  heroId: { fontSize: 20, fontWeight: '700', color: Colors.charcoal },
  heroSkin: { fontSize: 14, color: Colors.mink, fontWeight: '500', marginTop: 2 },
  heroGender: { fontSize: 13, color: '#999', marginTop: 2, textTransform: 'capitalize' },

  card: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.soft },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.charcoal, marginBottom: Spacing.md },

  skinRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  skinSwatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: Colors.stoneLight },
  skinCode: { fontSize: 16, fontWeight: '600', color: Colors.charcoal, fontFamily: 'Courier' },
  skinType: { fontSize: 13, color: '#999', marginTop: 2 },
  tipsLabel: { fontSize: 10, letterSpacing: 2, color: Colors.mink,
    fontWeight: '600', marginBottom: Spacing.sm },
  tipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.stoneLight,
    borderRadius: Radius.full },
  tipText: { fontSize: 13, color: Colors.charcoal, fontWeight: '500' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { flex: 1, minWidth: (width - 80) / 3, backgroundColor: Colors.stoneLight,
    borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '700', color: Colors.charcoal },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2, textTransform: 'capitalize' },

  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileItem: { flex: 1, alignItems: 'center' },
  profileItemLabel: { fontSize: 10, letterSpacing: 2, color: '#999', marginBottom: 6 },
  profileItemValue: { fontSize: 18, fontWeight: '600', color: Colors.charcoal, textTransform: 'capitalize' },
  profileDivider: { width: 1, height: 40, backgroundColor: Colors.stone },

  resetBtn: { marginHorizontal: Spacing.lg, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.stone, borderRadius: Radius.md, alignItems: 'center' },
  resetBtnText: { color: '#999', fontSize: 14 },

  noProfile: { flex: 1, backgroundColor: Colors.cream,
    alignItems: 'center', justifyContent: 'center' },
  noProfileIcon: { fontSize: 56, marginBottom: Spacing.lg },
  noProfileTitle: { fontSize: 22, fontWeight: '700', color: Colors.charcoal, marginBottom: Spacing.xl },
  setupBtn: { backgroundColor: Colors.charcoal, borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl, paddingVertical: 14 },
  setupBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
})
