import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Animated, Dimensions, Alert,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Spacing, Radius, Shadow, Typography } from '../utils/theme'
import { onboardUser } from '../utils/api'

const { width } = Dimensions.get('window')

const GENDERS = [
  { id: 'female', label: 'Female', icon: '👩' },
  { id: 'male',   label: 'Male',   icon: '👨' },
  { id: 'other',  label: 'Other',  icon: '🧑' },
]

const BODY_TYPES = [
  { id: 'slim',     label: 'Slim',     desc: 'Lean frame' },
  { id: 'athletic', label: 'Athletic', desc: 'Toned build' },
  { id: 'average',  label: 'Average',  desc: 'Balanced' },
  { id: 'plus',     label: 'Plus',     desc: 'Fuller figure' },
]

export default function OnboardScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [step, setStep] = useState(0)           // 0=welcome, 1=selfie, 2=gender, 3=body
  const [selfie, setSelfie] = useState(null)
  const [gender, setGender] = useState('')
  const [bodyType, setBodyType] = useState('')
  const [loading, setLoading] = useState(false)
  const [skinTone, setSkinTone] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const cameraRef = useRef(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  const animateIn = () => {
    fadeAnim.setValue(0)
    slideAnim.setValue(30)
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start()
  }

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setStep(s => s + 1)
    setTimeout(animateIn, 50)
  }

  const takeSelfie = async () => {
    if (!permission?.granted) {
      const res = await requestPermission()
      if (!res.granted) return Alert.alert('Camera permission needed')
    }
    setCameraOpen(true)
  }

  const capturePhoto = async () => {
    if (!cameraRef.current) return
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false })
    setSelfie(photo)
    setCameraOpen(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    nextStep()
  }

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    })
    if (!result.canceled) {
      setSelfie(result.assets[0])
      nextStep()
    }
  }

  const handleSubmit = async () => {
    if (!selfie || !gender || !bodyType) return
    setLoading(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const userId = `user_${Date.now()}`
      const fd = new FormData()
      fd.append('user_id', userId)
      fd.append('gender', gender)
      fd.append('body_type', bodyType)
      fd.append('selfie', { uri: selfie.uri, type: 'image/jpeg', name: 'selfie.jpg' })

      const { data } = await onboardUser(fd)
      await AsyncStorage.setItem('fitcheck_user_id', userId)
      await AsyncStorage.setItem('fitcheck_skin_tone', data.skin_tone?.hex || '#c68642')
      await AsyncStorage.setItem('fitcheck_profile', JSON.stringify(data))

      setSkinTone(data.skin_tone)
      setStep(4)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(animateIn, 50)
    } catch {
      Alert.alert('Could not connect', 'Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          <View style={styles.cameraOverlay}>
            <View style={styles.faceGuide} />
            <Text style={styles.cameraHint}>Position your face in the oval</Text>
            <TouchableOpacity style={styles.captureBtn} onPress={capturePhoto}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelCamera} onPress={() => setCameraOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>

      {/* Step 0: Welcome */}
      {step === 0 && (
        <View style={styles.step}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>✨</Text>
          </View>
          <Text style={styles.heroTitle}>Your style,{'\n'}perfected.</Text>
          <Text style={styles.heroSubtitle}>
            Upload your wardrobe once. Get outfit recommendations tailored to your
            skin tone, body type, and every occasion.
          </Text>
          <View style={styles.featureRow}>
            {['Skin tone matching', 'Your own clothes', 'AI-powered combos'].map(f => (
              <View key={f} style={styles.featureChip}>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={nextStep}>
            <Text style={styles.primaryBtnText}>Get started</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 1: Selfie */}
      {step === 1 && (
        <Animated.View style={[styles.step, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.stepLabel}>STEP 1 OF 3</Text>
          <Text style={styles.stepTitle}>Your selfie</Text>
          <Text style={styles.stepSubtitle}>We'll detect your skin tone to match outfit colors perfectly.</Text>

          {selfie ? (
            <Image source={{ uri: selfie.uri }} style={styles.selfiePreview} />
          ) : (
            <View style={styles.selfiePlaceholder}>
              <Text style={styles.selfieIcon}>📷</Text>
              <Text style={styles.selfiePlaceholderText}>No photo yet</Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={takeSelfie}>
            <Text style={styles.primaryBtnText}>Take selfie</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={pickFromGallery}>
            <Text style={styles.ghostBtnText}>Choose from gallery</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Step 2: Gender */}
      {step === 2 && (
        <Animated.View style={[styles.step, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.stepLabel}>STEP 2 OF 3</Text>
          <Text style={styles.stepTitle}>How do you{'\n'}identify?</Text>
          <View style={styles.genderGrid}>
            {GENDERS.map(g => (
              <TouchableOpacity key={g.id}
                style={[styles.genderCard, gender === g.id && styles.genderCardActive]}
                onPress={() => { setGender(g.id); Haptics.selectionAsync() }}>
                <Text style={styles.genderIcon}>{g.icon}</Text>
                <Text style={[styles.genderLabel, gender === g.id && styles.activeLabelText]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.primaryBtn, !gender && styles.disabledBtn]}
            onPress={gender ? nextStep : null}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Step 3: Body type */}
      {step === 3 && (
        <Animated.View style={[styles.step, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.stepLabel}>STEP 3 OF 3</Text>
          <Text style={styles.stepTitle}>Your body type</Text>
          <View style={styles.bodyGrid}>
            {BODY_TYPES.map(b => (
              <TouchableOpacity key={b.id}
                style={[styles.bodyCard, bodyType === b.id && styles.bodyCardActive]}
                onPress={() => { setBodyType(b.id); Haptics.selectionAsync() }}>
                <Text style={[styles.bodyLabel, bodyType === b.id && styles.activeLabelText]}>
                  {b.label}
                </Text>
                <Text style={styles.bodyDesc}>{b.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, (!bodyType || loading) && styles.disabledBtn]}
            onPress={bodyType ? handleSubmit : null}>
            <Text style={styles.primaryBtnText}>
              {loading ? 'Analysing your look…' : 'Finish setup'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Step 4: Result */}
      {step === 4 && skinTone && (
        <Animated.View style={[styles.step, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.skinToneCircle, { backgroundColor: skinTone.hex }]} />
          <Text style={styles.heroTitle}>Looking great!</Text>
          <Text style={styles.stepSubtitle}>
            Skin tone detected: {skinTone.fitzpatrick_label}
          </Text>
          <View style={styles.skinInfo}>
            <Text style={styles.skinInfoText}>
              We'll use this to suggest colors that complement your natural tone.
            </Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn}
            onPress={() => navigation.replace('Main')}>
            <Text style={styles.primaryBtnText}>Build my wardrobe →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { flexGrow: 1, padding: Spacing.lg, paddingTop: 80 },
  step: { flex: 1, alignItems: 'center' },

  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.mink,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  heroEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 38, fontWeight: '700', color: Colors.charcoal, textAlign: 'center',
    lineHeight: 46, marginBottom: Spacing.md },
  heroSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24,
    marginBottom: Spacing.xl, paddingHorizontal: Spacing.md },

  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
    marginBottom: Spacing.xl },
  featureChip: { backgroundColor: Colors.stoneLight, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 6 },
  featureText: { fontSize: 12, color: Colors.mink, fontWeight: '500', letterSpacing: 0.5 },

  stepLabel: { fontSize: 11, letterSpacing: 3, color: Colors.mink, fontWeight: '600',
    marginBottom: Spacing.sm },
  stepTitle: { fontSize: 32, fontWeight: '700', color: Colors.charcoal, textAlign: 'center',
    lineHeight: 40, marginBottom: Spacing.sm },
  stepSubtitle: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22,
    marginBottom: Spacing.xl, paddingHorizontal: Spacing.md },

  selfiePlaceholder: { width: 160, height: 160, borderRadius: 80, backgroundColor: Colors.stoneLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl,
    borderWidth: 2, borderColor: Colors.stone, borderStyle: 'dashed' },
  selfieIcon: { fontSize: 40, marginBottom: 8 },
  selfiePlaceholderText: { fontSize: 13, color: '#999' },
  selfiePreview: { width: 160, height: 160, borderRadius: 80, marginBottom: Spacing.xl,
    borderWidth: 3, borderColor: Colors.mink },

  genderGrid: { flexDirection: 'row', gap: 12, marginBottom: Spacing.xl },
  genderCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg,
    backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1.5,
    borderColor: Colors.stone, ...Shadow.soft },
  genderCardActive: { borderColor: Colors.mink, backgroundColor: Colors.mink },
  genderIcon: { fontSize: 28, marginBottom: 8 },
  genderLabel: { fontSize: 13, fontWeight: '600', color: Colors.charcoal },
  activeLabelText: { color: Colors.white },

  bodyGrid: { width: '100%', gap: 10, marginBottom: Spacing.xl },
  bodyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.stone, ...Shadow.soft },
  bodyCardActive: { borderColor: Colors.mink, backgroundColor: Colors.mink },
  bodyLabel: { fontSize: 15, fontWeight: '600', color: Colors.charcoal },
  bodyDesc: { fontSize: 13, color: '#999' },

  skinToneCircle: { width: 120, height: 120, borderRadius: 60, marginBottom: Spacing.xl,
    borderWidth: 4, borderColor: Colors.white, ...Shadow.medium },
  skinInfo: { backgroundColor: Colors.stoneLight, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.xl, width: '100%' },
  skinInfoText: { fontSize: 14, color: Colors.charcoal, textAlign: 'center', lineHeight: 22 },

  primaryBtn: { width: '100%', backgroundColor: Colors.charcoal, borderRadius: Radius.md,
    paddingVertical: 16, alignItems: 'center', marginBottom: Spacing.sm, ...Shadow.soft },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  disabledBtn: { opacity: 0.4 },
  ghostBtn: { width: '100%', borderWidth: 1.5, borderColor: Colors.stone,
    borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center' },
  ghostBtnText: { color: Colors.charcoal, fontSize: 16, fontWeight: '500' },

  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 50 },
  faceGuide: { position: 'absolute', top: 100, width: 220, height: 280, borderRadius: 110,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' },
  cameraHint: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 30 },
  captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3,
    borderColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20 },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.white },
  cancelCamera: { paddingVertical: 10 },
  cancelText: { color: Colors.white, fontSize: 16 },
})
