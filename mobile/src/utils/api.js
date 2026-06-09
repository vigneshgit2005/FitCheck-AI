import axios from 'axios'

// Change this to your backend URL
// Local dev: 'http://192.168.x.x:8000' (your machine's IP on the same WiFi)
// Production: 'https://api.fitcheck.ai'
const BASE_URL = 'http://192.168.1.100:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

export const onboardUser = (formData) =>
  api.post('/onboard', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const addWardrobeItem = (formData) =>
  api.post('/wardrobe/add', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getWardrobe = (userId) => api.get(`/wardrobe/${userId}`)

export const deleteWardrobeItem = (userId, itemId) =>
  api.delete(`/wardrobe/${userId}/${itemId}`)

export const getRecommendations = (formData) =>
  api.post('/recommend', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getProfile = (userId) => api.get(`/profile/${userId}`)

export const imageUrl = (filename) => `${BASE_URL}/uploads/${filename}`
