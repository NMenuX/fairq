import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8001`

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const createToken = async (tokenData) => {
  const response = await api.post('/tokens', tokenData)
  return response.data
}

export const getTokenStatusByNumber = async (tokenNumber) => {
  const response = await api.get('/tokens/all')
  return response.data.items.find((t) => t.number?.toLowerCase() === tokenNumber.toLowerCase())
}

export const getQueueOverview = async () => {
  const response = await api.get('/queue/overview')
  return response.data
}

export const getAllTokens = async () => {
  const response = await api.get('/tokens/all')
  return response.data
}





