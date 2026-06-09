/**
 * api.js — FitCheck.ai API client
 *
 * Since the frontend is served from the SAME server as the backend,
 * all API calls use relative URLs — no hardcoded localhost, no port juggling.
 *
 * In production or local unified mode: everything goes to /api/*
 * In Vite dev mode: Vite proxy forwards /api/* to http://localhost:8000
 */

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',   // relative — works on any host/port
  timeout: 30000,
})

export const onboardUser       = (fd) => api.post('/onboard', fd)
export const addWardrobeItem   = (fd) => api.post('/wardrobe/add', fd)
export const getWardrobe       = (uid) => api.get(`/wardrobe/${uid}`)
export const deleteWardrobeItem = (uid, id) => api.delete(`/wardrobe/${uid}/${id}`)
export const getRecommendations = (fd) => api.post('/recommend', fd)
export const getProfile        = (uid) => api.get(`/profile/${uid}`)

// Image URLs are also relative — same origin, no localhost
export const imageUrl = (filename) => `/uploads/${filename}`
