import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material'
import {
  getTokenStatusByNumber,
  getQueueOverview,
  getAllTokens
} from '../api'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import RefreshIcon from '@mui/icons-material/Refresh'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

function CheckStatus() {
  const [tokenNumber, setTokenNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(null)
  const [queue, setQueue] = useState([])
  const [nowServing, setNowServing] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchTokenAndQueue = async () => {
    if (!tokenNumber.trim()) return

    setError('')
    try {
      const [tokenData, queueData] = await Promise.all([
        getTokenStatusByNumber(tokenNumber.trim()),
        getQueueOverview(),
      ])

      if (!tokenData) {
        setError('Token not found')
        setToken(null)
        return
      }

      setToken(tokenData)
      setQueue(queueData.items || [])

      // Find tokens that are currently being served
      const allTokensData = await getAllTokens()
      const serving = allTokensData.items?.find(t => t.status === 'SERVING')
      setNowServing(serving || null)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch data')
    }
  }

  useEffect(() => {
    if (tokenNumber.trim() && autoRefresh && token) {
      const interval = setInterval(fetchTokenAndQueue, 5000)
      return () => clearInterval(interval)
    }
  }, [tokenNumber, autoRefresh, token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tokenNumber.trim()) {
      setError('Please enter your token number')
      return
    }
    setLoading(true)
    setAutoRefresh(true)
    await fetchTokenAndQueue()
    setLoading(false)
  }

  const handleReset = () => {
    setToken(null)
    setTokenNumber('')
    setError('')
    setAutoRefresh(false)
    setQueue([])
    setNowServing(null)
  }

  const getPeopleAhead = () => {
    if (!token || queue.length === 0) return 0
    // Sort by created_at to get correct order
    const sortedQueue = [...queue].sort((a, b) =>
      new Date(a.created_at || 0) - new Date(b.created_at || 0)
    )
    const tokenIndex = sortedQueue.findIndex(t => t.token_id === token.id)
    return tokenIndex >= 0 ? tokenIndex : queue.length
  }

  const getEstimatedWaitTime = () => {
    const totalMins = token?.estimated_wait_minutes
    if (totalMins === undefined || totalMins === null) {
      // Fallback if backend doesn't provide it
      const peopleAhead = getPeopleAhead()
      return `${Math.round(peopleAhead * 5)}m` 
    }
    
    if (totalMins >= 60) {
      const h = Math.floor(totalMins / 60)
      const m = totalMins % 60
      return `${h}h ${m}m`
    }
    return `${totalMins}m`
  }

  const isTurnSoon = () => {
    return getPeopleAhead() <= 2 && token?.status === 'WAITING'
  }

  // Show input form if no token is loaded
  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8', display: 'flex', alignItems: 'center' }}>
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{
              p: 5,
              borderRadius: 3,
              bgcolor: '#fff',
              textAlign: 'center'
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
              Check Your Token
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Status
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Enter your token number below
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                placeholder="e.g., T-1 or B-205"
                value={tokenNumber}
                onChange={(e) => setTokenNumber(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                  sx: {
                    bgcolor: '#fff',
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    py: 1
                  }
                }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: '#2563eb',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  fontSize: '1.1rem'
                }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Check Status'}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Container>
      </Box>
    )
  }

  // Show status page after token is found
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 32,
              height: 32,
              bgcolor: '#2563eb',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                {token.number?.[0] || 'T'}
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Token Status
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {autoRefresh && (
              <Chip
                icon={<FiberManualRecordIcon sx={{ color: '#4caf50', fontSize: 12 }} />}
                label="Auto-refreshing..."
                size="small"
                sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }}
              />
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={handleReset}
              sx={{ textTransform: 'none' }}
            >
              Check Another
            </Button>
          </Box>
        </Box>

        {/* Your Turn Soon Alert */}
        {isTurnSoon() && (
          <Alert
            severity="warning"
            icon={<VolumeUpIcon />}
            sx={{
              mb: 3,
              bgcolor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: 2
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              <strong>Your Turn Soon!</strong>
            </Typography>
            <Typography variant="body2">
              Please proceed to the counter.
            </Typography>
          </Alert>
        )}

        {/* Token Information Card */}
        <Paper sx={{ p: 4, mb: 3, bgcolor: '#fff', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1e293b' }}>
            Your Token Number
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              mb: 4,
              color: '#2563eb',
              textAlign: 'center'
            }}
          >
            {token.number}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: '#f8f9fa', textAlign: 'center', p: 2.5, borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                  Status
                </Typography>
                <Chip
                  label={token.status}
                  color={token.status === 'WAITING' ? 'primary' : token.status === 'SERVING' ? 'info' : 'success'}
                  sx={{ fontWeight: 600, fontSize: '0.95rem' }}
                />
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: '#f8f9fa', textAlign: 'center', p: 2.5, borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                  People Ahead of You
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  {getPeopleAhead()}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ bgcolor: '#f8f9fa', textAlign: 'center', p: 2.5, borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                  Estimated Wait Time
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Approx. {getEstimatedWaitTime()}
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Now Serving Card */}
        {nowServing && (
          <Paper sx={{ p: 3, bgcolor: '#fff', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1e293b' }}>
              Now Serving
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: '#4caf50',
                textAlign: 'center'
              }}
            >
              {nowServing.number}
            </Typography>
          </Paper>
        )}

        {/* Refresh Button */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchTokenAndQueue}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Refresh Now
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

export default CheckStatus
