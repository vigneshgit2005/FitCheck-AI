import axios from 'axios'

const BASE = '/api'

export const api = axios.create({ baseURL: BASE })

// ── User ──────────────────────────────────────────────────────────────────────

export async function onboardUser({ userId, gender, bodyType, selfie }) {
  const form = new FormData()
  form.append('user_id', userId)
  form.append('gender', gender)
  form.append('body_type', bodyType)
  form.append('selfie', selfie)
  const { data } = await api.post('/onboard', form)
  return data
}

export async function getProfile(userId) {
  const { data } = await api.get(`/profile/${userId}`)
  return data
}

// ── Wardrobe ──────────────────────────────────────────────────────────────────

export async function addWardrobeItem({ userId, image, label, occasionTags, styleTags, pattern }) {
  const form = new FormData()
  form.append('user_id', userId)
  form.append('image', image)
  form.append('label', label || '')
  form.append('occasion_tags', occasionTags || 'casual')
  form.append('style_tags', styleTags || '')
  form.append('pattern', pattern || 'solid')
  const { data } = await api.post('/wardrobe/add', form)
  return data
}

export async function getWardrobe(userId) {
  const { data } = await api.get(`/wardrobe/${userId}`)
  return data
}

export async function deleteWardrobeItem(userId, itemId) {
  const { data } = await api.delete(`/wardrobe/${userId}/${itemId}`)
  return data
}

// ── Recommendations ───────────────────────────────────────────────────────────

export async function getRecommendations({ userId, occasion, stylePreference }) {
  const form = new FormData()
  form.append('user_id', userId)
  form.append('occasion', occasion)
  form.append('style_preference', stylePreference || '')
  const { data } = await api.post('/recommend', form)
  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function imageUrl(filename) {
  return filename ? `/uploads/${filename}` : null
}
