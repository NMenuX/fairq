import React, { useState } from 'react'
import { Box, Typography, TextField, Button, Paper, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        try {
            await login(email, password)
            navigate('/')
        } catch (err) {
            setError('Invalid email or password')
        }
    }

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F1F5F9' }}>
            <Paper elevation={0} sx={{ p: 4, width: '100%', maxWidth: 400, border: '1px solid #E2E8F0', borderRadius: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', mb: 1, textAlign: 'center' }}>
                    FairQ Admin
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 3, textAlign: 'center' }}>
                    Sign in to manage queues
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Email"
                        variant="outlined"
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        sx={{ mt: 3, py: 1.5, fontWeight: 700 }}
                    >
                        Sign In
                    </Button>
                </form>
            </Paper>
        </Box>
    )
}

export default Login
