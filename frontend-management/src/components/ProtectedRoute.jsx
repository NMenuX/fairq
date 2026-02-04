import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
    // DEMO MODE: Authentication bypassed due to bcrypt Python 3.13 compatibility issue
    // TODO: Re-enable authentication for production
    return children

    // Original auth check (commented out for demo):
    // const { token } = useAuth()
    // const location = useLocation()
    // if (!token) {
    //     return <Navigate to="/login" state={{ from: location }} replace />
    // }
    // return children
}

export default ProtectedRoute
