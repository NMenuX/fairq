import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

export { api }

export const login = async (email, password) => {
    // Initialize form-data for OAuth2PasswordRequestForm
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)

    const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
}

export const register = async (email, password, fullName, role = 'admin') => {
    const response = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        role
    })
    return response.data
}

export const getMe = async () => {
    const response = await api.get('/auth/me')
    return response.data
}

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

export const callNextTokenForCounter = async (counterId) => {
    const response = await api.put(`/counters/${counterId}/call_next`)
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

export const resetTokenToWaiting = async (tokenId) => {
    const response = await api.put(`/tokens/${tokenId}/reset-wait`)
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
