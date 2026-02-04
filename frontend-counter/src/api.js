import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getQueueOverview = async () => {
  const response = await api.get('/queue/overview')
  return response.data
}

export const getSuggestNext = async () => {
  const response = await api.get('/counters/suggest-next')
  return response.data
}

export const callToken = async (tokenId, counterId = null) => {
  const response = await api.post(`/tokens/${tokenId}/call`, { counter_id: counterId })
  return response.data
}

export const startToken = async (tokenId) => {
  const response = await api.post(`/tokens/${tokenId}/start`)
  return response.data
}

export const completeToken = async (tokenId) => {
  const response = await api.post(`/tokens/${tokenId}/complete`)
  return response.data
}

export const cancelToken = async (tokenId) => {
  const response = await api.post(`/tokens/${tokenId}/cancel`)
  return response.data
}

export const updateTokenNotes = async (tokenId, notes) => {
  const response = await api.put(`/tokens/${tokenId}/notes`, { notes })
  return response.data
}

export const transferToken = async (tokenId, targetCounterId = null) => {
  const response = await api.post(`/tokens/${tokenId}/transfer`, { target_counter_id: targetCounterId })
  return response.data
}

export const getAllTokens = async () => {
  const response = await api.get('/tokens/all')
  return response.data
}

export const getMetrics = async () => {
  const response = await api.get('/metrics/summary')
  return response.data
}

// Counter management endpoints
export const getCounters = async () => {
  const response = await api.get('/counters')
  return response.data
}

export const getCounter = async (counterId) => {
  const response = await api.get(`/counters/${counterId}`)
  return response.data
}

export const createCounter = async (counterData) => {
  const response = await api.post('/counters', counterData)
  return response.data
}

export const updateCounter = async (counterId, counterData) => {
  const response = await api.put(`/counters/${counterId}`, counterData)
  return response.data
}

export const deleteCounter = async (counterId) => {
  const response = await api.delete(`/counters/${counterId}`)
  return response.data
}

export const getSuggestNextForCounter = async (counterId) => {
  const response = await api.get(`/counters/${counterId}/suggest-next`)
  return response.data
}

// Updated queue overview with counter filter
export const getQueueOverviewForCounter = async (counterId) => {
  const response = await api.get(`/queue/overview?counter_id=${counterId}`)
  return response.data
}





