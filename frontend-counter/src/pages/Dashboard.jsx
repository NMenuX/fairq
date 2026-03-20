import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  TextField,
  InputAdornment,
  Avatar,
  IconButton,
  Switch,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel
} from '@mui/material'
import {
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  VolumeUp as VolumeUpIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  SwapHoriz as SwapHorizIcon,
  Close as CloseIcon,
  FiberManualRecord as FiberManualRecordIcon,
} from '@mui/icons-material'
import {
  getQueueOverview,
  getQueueOverviewForCounter,
  getSuggestNext,
  getSuggestNextForCounter,
  getAllTokens,
  getCounters,
  callToken,
  startToken,
  completeToken,
  cancelToken,
  updateTokenNotes,
  getCounter,
  updateCounter,
  transferToken,
  holdToken,
  resumeToken
} from '../api'

function Dashboard() {
  const [counters, setCounters] = useState([])
  const [selectedCounterId, setSelectedCounterId] = useState(null)
  const [queue, setQueue] = useState([]) // Waiting tokens
  const [assignedTokens, setAssignedTokens] = useState([]) // Tokens assigned to this counter
  const [recentTokens, setRecentTokens] = useState([]) // Recently completed/cancelled tokens
  const [onHoldTokens, setOnHoldTokens] = useState([]) // Tokens on hold
  const [suggestion, setSuggestion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState(null)
  const selectedTokenRef = useRef(null)
  const [selectedTokenFull, setSelectedTokenFull] = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [isCounterOpen, setIsCounterOpen] = useState(true) // Staff Availability

  // Keep ref in sync with state for stale closure avoidance in setInterval
  useEffect(() => {
    selectedTokenRef.current = selectedToken
  }, [selectedToken])
  const [notes, setNotes] = useState('') // Service Notes
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState('') // 'pool' or counterId

  // Update notes when selected token changes
  useEffect(() => {
    if (selectedTokenFull) {
      setNotes(selectedTokenFull.notes || '')
    }
  }, [selectedTokenFull?.id])

  const handleNoteSave = async () => {
    if (!selectedToken) return
    try {
      await updateTokenNotes(selectedToken.token_id, notes)
    } catch (err) {
      console.error('Failed to save notes:', err)
    }
  }

  // Fetch counters on mount and check localStorage
  useEffect(() => {
    const loadCounters = async () => {
      try {
        const countersData = await getCounters()
        setCounters(countersData)

        // Check for saved counter
        const savedCounterId = localStorage.getItem('fairq_counter_id')
        if (savedCounterId) {
          // Verify the saved counter still exists
          const exists = countersData.find(c => c.id === parseInt(savedCounterId))
          if (exists) {
            setSelectedCounterId(exists.id)
          } else {
            localStorage.removeItem('fairq_counter_id') // Invalid ID
          }
        }
      } catch (err) {
        console.error('Failed to load counters:', err)
      }
    }
    loadCounters()
  }, [])

  const handleCounterSelect = (counterId) => {
    setSelectedCounterId(counterId)
    localStorage.setItem('fairq_counter_id', counterId)
  }

  const handleLogout = () => {
    setSelectedCounterId(null)
    localStorage.removeItem('fairq_counter_id')
    setQueue([])
    setAssignedTokens([])
    setSelectedToken(null)
  }

  const handleStatusToggle = async (newStatus) => {
    setIsCounterOpen(newStatus) // Optimistic update
    try {
      await updateCounter(selectedCounterId, { active: newStatus })
      // Optionally refresh global state
    } catch (err) {
      console.error('Failed to update counter status:', err)
      setIsCounterOpen(!newStatus) // Revert on failure
    }
  }

  const fetchData = async (forceSelectTokenId = null) => {
    if (!selectedCounterId) return

    setLoading(true)
    try {
      const [queueData, suggestionData, allTokensData, counterData] = await Promise.all([
        getQueueOverviewForCounter(selectedCounterId),
        getSuggestNextForCounter(selectedCounterId),
        getAllTokens(),
        getCounter(selectedCounterId)
      ])

      if (counterData) {
        setIsCounterOpen(counterData.active)
      }

      const allItems = queueData.items || []
      const allTokensItemsRaw = allTokensData.items || []

      const now = new Date()
      const allTokensItems = allTokensItemsRaw.map(t => {
        if (t.wait_minutes !== undefined) return t
        const created = new Date(t.created_at)
        const diffMs = now - created
        const mins = Math.max(0, diffMs / 60000)
        return { ...t, wait_minutes: mins }
      })

      const assigned = allTokensItems.filter(t =>
        t.counter_id === selectedCounterId &&
        ['CALLED', 'SERVING', 'WAITING'].includes(t.status)
      )

      const general = allItems.filter(t =>
        t.status === 'WAITING' &&
        !t.counter_id  // only truly unassigned tokens; transferred tokens belong to their target counter
      )

      // On-hold tokens for this counter
      const onHold = allTokensItems.filter(t =>
        t.counter_id === selectedCounterId &&
        t.status === 'ON_HOLD'
      )

      // Recently completed/cancelled tokens for this counter (last 10)
      const recent = allTokensItems
        .filter(t =>
          t.counter_id === selectedCounterId &&
          ['COMPLETED', 'CANCELLED'].includes(t.status)
        )
        .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
        .slice(0, 10)

      setQueue(general)
      setAssignedTokens(assigned)
      setRecentTokens(recent)
      setOnHoldTokens(onHold)

      // If an action just called a token, force-select it from fresh data
      if (forceSelectTokenId) {
        const calledToken = allTokensItems.find(t => t.id === forceSelectTokenId)
        if (calledToken) {
          const normalized = { ...calledToken, token_id: calledToken.id }
          setSelectedToken(normalized)
          setSelectedTokenFull(calledToken)
          selectedTokenRef.current = normalized // Update ref immediately to avoid stale closure in next tick
        }
      } else if (selectedTokenRef.current) {
        // Auto-update the currently selected token using the ref to avoid stale closure
        const currentSelected = selectedTokenRef.current
        const assignedMatch = assigned.find(t => (t.token_id || t.id) === (currentSelected.token_id || currentSelected.id))
        if (assignedMatch) {
          // Normalize: allTokensItems uses 'id', but selectedToken expects 'token_id'
          const normalizedStr = { ...assignedMatch, token_id: assignedMatch.id ?? assignedMatch.token_id }
          setSelectedToken(normalizedStr)
          const fullToken = allTokensItems.find(t => t.id === normalizedStr.token_id)
          if (fullToken) setSelectedTokenFull(fullToken)
        } else {
          const queueMatch = allItems.find(t => t.token_id === currentSelected.token_id)
          if (queueMatch) {
            setSelectedToken(queueMatch)
            const fullToken = allTokensItems.find(t => t.id === queueMatch.token_id)
            if (fullToken) setSelectedTokenFull(fullToken)
          }
          // NOTE: Do NOT fall back to COMPLETED/CANCELLED tokens — let the panel stay
          // showing the last state but do not re-open a closed/done token.
        }
      }
      setSuggestion(suggestionData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [selectedCounterId])

  const handleTokenSelect = async (token) => {
    // Normalize to ensure token_id exists for API actions
    const normalizedToken = { ...token, token_id: token.token_id ?? token.id }
    setSelectedToken(normalizedToken)
    try {
      const allTokensData = await getAllTokens()
      const found = allTokensData.items.find((t) => t.id === normalizedToken.token_id)
      if (found) setSelectedTokenFull(found)
    } catch (err) { console.error(err) }
  }

  const handleAction = async (action, tokenId) => {
    setActionLoading(prev => ({ ...prev, [tokenId]: true }))
    try {
      switch (action) {
        case 'call': await callToken(tokenId, selectedCounterId); break;
        case 'start': await startToken(tokenId); break;
        case 'complete': await completeToken(tokenId); break;
        case 'cancel': await cancelToken(tokenId); break;
      }

      if (action === 'complete' || action === 'cancel') {
        // Clear the panel immediately so the completed/cancelled token disappears
        setSelectedToken(null)
        setSelectedTokenFull(null)
        await fetchData()
      } else if (action === 'call') {
        // Pass tokenId to fetchData so it force-selects from fresh data
        // (avoids stale closure problem where old selectedToken overrides the new one)
        await fetchData(tokenId)
      } else {
        await fetchData()
      }
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      setActionLoading(prev => ({ ...prev, [tokenId]: false }))
    }
  }

  const handleTransferSubmit = async () => {
    if (!selectedToken) return
    setActionLoading(prev => ({ ...prev, [selectedToken.token_id]: true }))
    try {
      const targetId = transferTarget === 'pool' ? null : parseInt(transferTarget)
      await transferToken(selectedToken.token_id, targetId)
      setTransferDialogOpen(false)
      setSelectedToken(null) // Deselect after transfer
      await fetchData()
    } catch (err) {
      console.error("Transfer failed", err)
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedToken.token_id]: false }))
    }
  }

  const handleRecall = async (tokenId) => {
    setActionLoading(prev => ({ ...prev, [tokenId]: true }))
    try {
      // Transfer the token back to this counter (sets status to WAITING + counter_id)
      await transferToken(tokenId, selectedCounterId)
      await fetchData()
    } catch (err) {
      console.error('Recall failed:', err)
    } finally {
      setActionLoading(prev => ({ ...prev, [tokenId]: false }))
    }
  }

  const handleHold = async (tokenId) => {
    setActionLoading(prev => ({ ...prev, [tokenId]: true }))
    try {
      await holdToken(tokenId)
      setSelectedToken(null)
      setSelectedTokenFull(null)
      await fetchData()
    } catch (err) {
      console.error('Hold failed:', err)
    } finally {
      setActionLoading(prev => ({ ...prev, [tokenId]: false }))
    }
  }

  const handleResume = async (tokenId) => {
    setActionLoading(prev => ({ ...prev, [tokenId]: true }))
    try {
      await resumeToken(tokenId)
      await fetchData(tokenId)
    } catch (err) {
      console.error('Resume failed:', err)
    } finally {
      setActionLoading(prev => ({ ...prev, [tokenId]: false }))
    }
  }

  const selectedCounterName = counters.find(c => c.id === selectedCounterId)?.name || 'Counter 00'

  // SELECTION SCREEN
  if (!selectedCounterId) {
    return (
      <Box sx={{
        height: '100vh',
        bgcolor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Paper sx={{ p: 5, borderRadius: 4, maxWidth: 500, width: '100%', textAlign: 'center', boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', mb: 1 }}>
            Welcome
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748B', mb: 4 }}>
            Select your counter to start the session.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {counters.map(counter => (
              <Button
                key={counter.id}
                variant="outlined"
                size="large"
                onClick={() => handleCounterSelect(counter.id)}
                sx={{
                  py: 2,
                  justifyContent: 'flex-start',
                  borderColor: '#E2E8F0',
                  color: '#1E293B',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#3B82F6',
                    bgcolor: '#EFF6FF'
                  }
                }}
              >
                {counter.name}
              </Button>
            ))}
            {counters.length === 0 && (
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>No counters available</Typography>
            )}
          </Box>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#F8FAFC' }}>

      {/* Header */}
      <Box sx={{
        bgcolor: '#FFFFFF',
        px: 3,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
            {selectedCounterName} Workspace
          </Typography>
        </Box>

        <TextField
          placeholder="Search tokens..."
          size="small"
          sx={{ width: 400, bgcolor: '#F1F5F9', borderRadius: 1, '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94A3B8' }} />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            bgcolor: isCounterOpen ? '#DCFCE7' : '#FEE2E2',
            color: isCounterOpen ? '#166534' : '#991B1B',
            px: 2, py: 0.5, borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 1,
            fontWeight: 600, fontSize: '0.875rem'
          }}>
            <FiberManualRecordIcon sx={{ fontSize: 12 }} />
            Counter: {isCounterOpen ? 'OPEN' : 'CLOSED'}
          </Box>

          <Button
            onClick={handleLogout}
            size="small"
            sx={{ color: '#64748B', fontWeight: 600, textTransform: 'none', px: 1 }}
          >
            Switch
          </Button>

          <IconButton><NotificationsIcon sx={{ color: '#64748B' }} /></IconButton>
          <IconButton><SettingsIcon sx={{ color: '#64748B' }} /></IconButton>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#DBEAFE', color: '#1E40AF' }} src="/broken-image.jpg" />
        </Box>
      </Box>

      {/* Main Content Grid */}
      <Grid container sx={{ flex: 1, overflow: 'hidden', height: '100%' }}>

        {/* Left & Middle Column Wrapper */}
        <Grid item xs={12} md={8} lg={9} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', height: '100%' }}>

          {/* Suggested Next Customer (Algorithm) */}
          {suggestion && suggestion.number && (
            <Paper elevation={0} sx={{ p: 3, border: '2px solid #3B82F6', borderRadius: 2, bgcolor: '#EFF6FF' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="overline" sx={{ color: '#1E40AF', fontWeight: 700, letterSpacing: 1 }}>Recommended Next</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E3A8A' }}>
                    {suggestion.number}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1E40AF', fontWeight: 600 }}>
                    {suggestion.service_type}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => handleAction('call', suggestion.token_id)}
                  disabled={actionLoading[suggestion.token_id]}
                  sx={{
                    bgcolor: '#2563EB',
                    px: 4, py: 1.5,
                    fontWeight: 700,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                    '&:hover': { bgcolor: '#1D4ED8' }
                  }}
                >
                  Call Now
                </Button>
              </Box>
            </Paper>
          )}

          {/* Staff Availability Card */}
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>Staff Availability</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>Switch to 'Closed' when taking a break or finishing shift.</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#475569' }}>STATUS TOGGLE</Typography>
              <Switch
                checked={isCounterOpen}
                onChange={(e) => handleStatusToggle(e.target.checked)}
                color="primary"
              />
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', gap: 3, flex: 1 }}>
            {/* Assigned to Me */}
            <Paper elevation={0} sx={{ flex: 1, p: 2, border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountCircleIcon sx={{ color: '#3B82F6' }} /> My Active Desk
                </Typography>
                <Chip label={`${assignedTokens.length} Waiting`} size="small" sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', fontWeight: 600 }} />
              </Box>

              {assignedTokens.length === 0 && (
                <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center', mt: 4 }}>No tokens assigned.</Typography>
              )}

              {assignedTokens.map(token => (
                <Card
                  key={token.token_id}
                  onClick={() => handleTokenSelect(token)}
                  sx={{
                    mb: 2, p: 2, cursor: 'pointer',
                    border: selectedToken?.token_id === token.token_id ? '2px solid #3B82F6' : '1px solid #E2E8F0',
                    boxShadow: 'none'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{token.number}</Typography>
                      {token.status === 'WAITING' && (
                        <Chip label="AVAILABLE" size="small" sx={{ bgcolor: '#FEF08A', color: '#854D0E', fontSize: '0.65rem', fontWeight: 700, height: 20 }} />
                      )}
                      {token.status === 'CALLED' && (
                        <Chip label="CALLED" size="small" sx={{ bgcolor: '#DBEAFE', color: '#1E40AF', fontSize: '0.65rem', fontWeight: 700, height: 20 }} />
                      )}
                      {token.status === 'SERVING' && (
                        <Chip label="SERVING" size="small" sx={{ bgcolor: '#DCFCE7', color: '#166534', fontSize: '0.65rem', fontWeight: 700, height: 20 }} />
                      )}
                    </Box>
                    {token.vulnerability_score > 0.5 && (
                      <Chip label="PRIORITY" size="small" sx={{ bgcolor: '#FEE2E2', color: '#991B1B', fontSize: '0.7rem', fontWeight: 700 }} />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>{token.service_type}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Wait: {(() => { const m = Math.round(token.wait_minutes); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; })()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#3B82F6', fontWeight: 600 }}>Active Selection →</Typography>
                  </Box>
                </Card>
              ))}

              {/* On-Hold Tokens */}
              {onHoldTokens.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    ⏸ On Hold
                  </Typography>
                  {onHoldTokens.map(token => (
                    <Box
                      key={token.id}
                      sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        py: 1, px: 1, borderBottom: '1px solid #FEF3C7', bgcolor: '#FFFBEB', borderRadius: 1, mb: 0.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#92400E' }}>{token.number}</Typography>
                        <Chip
                          label="ON HOLD"
                          size="small"
                          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#FEF3C7', color: '#D97706' }}
                        />
                      </Box>
                      <Button
                        size="small"
                        onClick={() => handleResume(token.id)}
                        disabled={actionLoading[token.id]}
                        sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'none', color: '#059669', minWidth: 'auto', px: 1 }}
                      >
                        ▶ Resume
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Recently Served (History) */}
              {recentTokens.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Recently Served
                  </Typography>
                  {recentTokens.map(token => (
                    <Box
                      key={token.id}
                      sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        py: 1, px: 1, borderBottom: '1px solid #F1F5F9',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748B' }}>{token.number}</Typography>
                        <Chip
                          label={token.status}
                          size="small"
                          sx={{
                            height: 18, fontSize: '0.6rem', fontWeight: 700,
                            bgcolor: token.status === 'COMPLETED' ? '#DCFCE7' : '#FEE2E2',
                            color: token.status === 'COMPLETED' ? '#166534' : '#991B1B',
                          }}
                        />
                      </Box>
                      {token.status === 'CANCELLED' && (
                        <Button
                          size="small"
                          onClick={() => handleRecall(token.id)}
                          disabled={actionLoading[token.id]}
                          sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'none', color: '#2563EB', minWidth: 'auto', px: 1 }}
                        >
                          Recall
                        </Button>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>

            {/* General Queue */}
            <Paper elevation={0} sx={{ flex: 1, p: 2, border: '1px solid #E2E8F0', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ fontSize: 20 }}>👥</Box> General Queue
                </Typography>
                <Chip label={`${queue.length} in line`} size="small" sx={{ bgcolor: '#F1F5F9', color: '#64748B', fontWeight: 600 }} />
              </Box>

              {/* Table Header */}
              <Box sx={{ display: 'flex', px: 2, py: 1, bgcolor: '#F8FAFC', borderRadius: 1, mb: 1 }}>
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, color: '#64748B' }}>Token</Typography>
                <Typography variant="caption" sx={{ flex: 2, fontWeight: 600, color: '#64748B' }}>Service</Typography>
                <Typography variant="caption" sx={{ width: 50, fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Wait</Typography>
              </Box>

              {queue.length === 0 && (
                <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center', mt: 4 }}>Queue is empty.</Typography>
              )}

              {queue.map(token => (
                <Box
                  key={token.token_id}
                  onClick={() => handleTokenSelect(token)}
                  sx={{
                    display: 'flex', px: 2, py: 1.5, borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                    bgcolor: selectedToken?.token_id === token.token_id ? '#F0F9FF' : 'transparent',
                    '&:hover': { bgcolor: '#F8FAFC' }
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, color: '#1E293B' }}>{token.number}</Typography>
                  <Typography variant="body2" sx={{ flex: 2, color: '#475569' }}>{token.service_type}</Typography>
                  <Typography variant="body2" sx={{ width: 50, textAlign: 'right', color: '#64748B' }}>{(() => { const m = Math.round(token.wait_minutes); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; })()}</Typography>
                </Box>
              ))}
            </Paper>
          </Box>
        </Grid>

        {/* Right Panel - Token Action Panel */}
        <Grid item xs={12} md={4} lg={3} sx={{ bgcolor: '#FFFFFF', borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {selectedToken ? (
            <>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Token Action Panel</Typography>
                <IconButton onClick={() => setSelectedToken(null)} size="small"><CloseIcon /></IconButton>
              </Box>

              <Box sx={{ p: 3, overflow: 'auto', flex: 1 }}>
                {/* Token Card */}
                <Paper elevation={0} sx={{ bgcolor: '#F8FAFC', p: 3, textAlign: 'center', border: '1px solid #E2E8F0', borderRadius: 3, mb: 3 }}>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#2563EB', mb: 1 }}>
                    {selectedToken.number}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: '#64748B', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 1, mb: 3 }}>
                    {selectedToken.service_type}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sx={{ borderRight: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Wait Time</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{(() => { const m = Math.round(selectedToken.wait_minutes); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; })()}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Customer Level</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>{selectedToken.vulnerability_score > 0.5 ? 'Priority' : 'Standard'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Actions */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<VolumeUpIcon />}
                    onClick={() => handleAction('call', selectedToken.token_id)}
                    disabled={actionLoading[selectedToken.token_id] || selectedToken.status !== 'WAITING'}
                    sx={{
                      bgcolor: '#2563EB', color: 'white', py: 1.5, fontWeight: 600, borderRadius: 2, textTransform: 'none',
                      '&:hover': { bgcolor: '#1D4ED8' }
                    }}
                  >
                    Call Customer
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleAction('start', selectedToken.token_id)}
                    disabled={actionLoading[selectedToken.token_id] || !['WAITING', 'CALLED'].includes(selectedToken.status)}
                    sx={{
                      bgcolor: '#0F172A', color: 'white', py: 1.5, fontWeight: 600, borderRadius: 2, textTransform: 'none',
                      '&:hover': { bgcolor: '#1E293B' }
                    }}
                  >
                    Start Service
                  </Button>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleAction('complete', selectedToken.token_id)}
                      disabled={actionLoading[selectedToken.token_id] || selectedToken.status !== 'SERVING'}
                      sx={{
                        bgcolor: '#22C55E', color: 'white', py: 3, fontWeight: 600, borderRadius: 2, textTransform: 'none',
                        flexDirection: 'column', gap: 0.5,
                        '&:hover': { bgcolor: '#16A34A' }
                      }}
                    >
                      Complete
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<SwapHorizIcon />}
                      onClick={() => setTransferDialogOpen(true)}
                      sx={{
                        bgcolor: '#F1F5F9', color: '#475569', py: 3, fontWeight: 600, borderRadius: 2, textTransform: 'none',
                        flexDirection: 'column', gap: 0.5, boxShadow: 'none',
                        '&:hover': { bgcolor: '#E2E8F0', boxShadow: 'none' }
                      }}
                    >
                      Transfer
                    </Button>
                  </Box>

                  {selectedToken.status === 'SERVING' && (
                    <Button
                      variant="outlined"
                      onClick={() => handleHold(selectedToken.token_id)}
                      disabled={actionLoading[selectedToken.token_id]}
                      sx={{
                        color: '#D97706', borderColor: '#FCD34D', fontWeight: 600, borderRadius: 2, textTransform: 'none', py: 1.5,
                        '&:hover': { bgcolor: '#FFFBEB', borderColor: '#F59E0B' }
                      }}
                    >
                      ⏸ Put On Hold
                    </Button>
                  )}

                  <Button
                    variant="outlined"
                    onClick={() => handleAction('cancel', selectedToken.token_id)}
                    sx={{
                      color: '#DC2626', borderColor: '#FCA5A5', fontWeight: 600, borderRadius: 2, textTransform: 'none', py: 1.5, mt: 1,
                      '&:hover': { bgcolor: '#FEF2F2', borderColor: '#EF4444' }
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 16, mr: 1 }} /> No-Show / Cancel
                  </Button>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ fontSize: 18 }}>≡</Box> Service Notes
                </Typography>
                <TextField
                  multiline
                  rows={4}
                  placeholder="Enter notes about the service interaction..."
                  fullWidth
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNoteSave}
                  sx={{
                    bgcolor: '#F8FAFC',
                    '& .MuiOutlinedInput-root': { borderRadius: 2 },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' }
                  }}
                />

                <Paper elevation={0} sx={{ mt: 3, p: 2, bgcolor: '#FEF9C3', border: '1px solid #FEF08A', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ color: '#854D0E', fontStyle: 'italic', display: 'block' }}>
                    "Customer mentioned difficulty with online login last week. Suggested password reset."
                  </Typography>
                </Paper>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
              <Typography>Select a token to view action panel</Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Footer */}
      <Box sx={{ bgcolor: 'white', borderTop: '1px solid #E2E8F0', p: 1, px: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: '#94A3B8' }}>Terminal: T4-W-01    IP: 192.168.1.104    Session: 4h 12m active</Typography>
        <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#22C55E' }} /> Cloud Sync: Optimized
        </Typography>
      </Box>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Transfer Token</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
            Select a destination for token <strong>{selectedToken?.number}</strong>.
          </Typography>
          <RadioGroup
            value={transferTarget}
            onChange={(e) => setTransferTarget(e.target.value)}
          >
            <FormControlLabel value="pool" control={<Radio />} label="General Waiting Queue (Unassigned)" />
            <Divider sx={{ my: 1 }} />
            {counters.filter(c => c.id !== selectedCounterId).map(c => (
              <FormControlLabel
                key={c.id}
                value={c.id.toString()}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{c.name}</Typography>
                    {!c.active && <Chip label="Closed" size="small" sx={{ height: 16, fontSize: '0.65rem' }} />}
                  </Box>
                }
              />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setTransferDialogOpen(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleTransferSubmit}
            disabled={!transferTarget}
          >
            Transfer Now
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  )
}

export default Dashboard
