import React, { createContext, useContext, useState, useEffect } from 'react'
import { api, login as apiLogin, register as apiRegister } from '../api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('fairq_auth_token'))
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (token) {
            // Check if token is valid or just trust it for now and verify on 401
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`
            localStorage.setItem('fairq_auth_token', token)
            // Optionally fetch me() here
            setUser({ email: 'admin@fairq.com' }) // Mock user or fetch real one
            setLoading(false)
        } else {
            delete api.defaults.headers.common['Authorization']
            localStorage.removeItem('fairq_auth_token')
            setUser(null)
            setLoading(false)
        }
    }, [token])

    const login = async (email, password) => {
        const data = await apiLogin(email, password)
        setToken(data.access_token)
        setUser({ email }) // We could fetch full profile here
        return data
    }

    const logout = () => {
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
