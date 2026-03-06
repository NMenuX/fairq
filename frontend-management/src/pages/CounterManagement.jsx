import React, { useState, useEffect } from 'react'
import {
    Box,
    Typography,
    Grid,
    Paper,
    Checkbox,
    FormGroup,
    FormControlLabel,
    Card,
    CardContent,
    Button,
    Chip,
    IconButton,
    Avatar,
    TextField,
    InputAdornment
} from '@mui/material'
import {
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Circle as CircleIcon,
    MoreVert as MoreVertIcon,
    Person as PersonIcon
} from '@mui/icons-material'
import { getCounters, getAllTokens, getQueueOverview, callNextTokenForCounter } from '../api'

function CounterManagement() {
    const [counters, setCounters] = useState([])
    const [tokens, setTokens] = useState([])
    const [loading, setLoading] = useState(true)
    const [isQueueExpanded, setIsQueueExpanded] = useState(false)

    // Filters
    const [filters, setFilters] = useState({
        open: true,
        busy: true,
        closed: false,
    })
    const [searchTerm, setSearchTerm] = useState('')

    // Handle Search
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value)
    }

    // Handle Filter Change
    const handleFilterChange = (event) => {
        setFilters({ ...filters, [event.target.name]: event.target.checked })
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [])

    const fetchData = async () => {
        try {
            const [countersData, tokensData] = await Promise.all([
                getCounters(),
                getAllTokens()
            ])
            setCounters(countersData)
            setTokens(tokensData.items || [])
            setLoading(false)
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }

    // Derived State
    // 1. Filter Waiting Tokens (by search)
    const waitingTokens = tokens.filter(t => {
        const matchesSearch = t.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.nic && t.nic.toLowerCase().includes(searchTerm.toLowerCase()));
        return t.status === 'WAITING' && matchesSearch;
    })

    const displayedTokens = isQueueExpanded ? waitingTokens : waitingTokens.slice(0, 6)

    // 2. Filter Counters
    const filteredCounters = counters.filter(counter => {
        // Determine status
        const servingToken = tokens.find(t => t.counter_id === counter.id && ['CALLED', 'SERVING'].includes(t.status))
        let status = 'closed';
        if (counter.active) {
            status = servingToken ? 'busy' : 'open';
        }

        // Apply Status Filters
        if (status === 'open' && !filters.open) return false;
        if (status === 'busy' && !filters.busy) return false;
        if (status === 'closed' && !filters.closed) return false;

        // Apply Search (Counter Name)
        if (searchTerm && !counter.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        return true;
    })

    // Handle calling next token
    const handleCallNext = async (counterId) => {
        try {
            await callNextTokenForCounter(counterId)
            fetchData() // Refresh data immediately
        } catch (error) {
            console.error("Failed to call next token", error)
        }
    }

    return (
        <Box sx={{ p: 4, minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC' }}>

            {/* Page Header */}
            <Box sx={{ mb: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', mb: 1, letterSpacing: -0.5 }}>
                        Counter Management
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#64748B' }}>
                        Assign customer tokens to available counters.
                    </Typography>
                </Box>
                <Paper
                    elevation={0}
                    component={Box}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: 350,
                        height: 48,
                        px: 2,
                        bgcolor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: 2
                    }}
                >
                    <SearchIcon sx={{ color: '#94A3B8', mr: 1.5 }} />
                    <TextField
                        placeholder="Search by Token or Customer Name"
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        fullWidth
                        value={searchTerm}
                        onChange={handleSearchChange}
                        sx={{ '& input': { fontSize: '0.95rem' } }}
                    />
                </Paper>
            </Box>

            <Grid container spacing={4} sx={{ flex: 1, width: '100%' }}>

                {/* Left Col: Filters */}
                <Grid item xs={12} md={2.5} lg={2} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Box sx={{ pr: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5, color: '#334155' }}>Filter Counters</Typography>

                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: '#475569', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Status</Typography>
                        <FormGroup sx={{ gap: 0.5 }}>
                            <FormControlLabel control={<Checkbox size="small" checked={filters.open} onChange={handleFilterChange} name="open" />} label={<Typography variant="body2">Open</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={filters.busy} onChange={handleFilterChange} name="busy" />} label={<Typography variant="body2">Busy</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" checked={filters.closed} onChange={handleFilterChange} name="closed" />} label={<Typography variant="body2">Closed</Typography>} />
                        </FormGroup>

                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 4, mb: 1.5, color: '#475569', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>Capabilities</Typography>
                        <FormGroup sx={{ gap: 0.5 }}>
                            <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="body2">Cash Transactions</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="body2">New Accounts</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="body2">Inquiries</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="body2">Forex</Typography>} />
                            <FormControlLabel control={<Checkbox size="small" />} label={<Typography variant="body2">Loans</Typography>} />
                        </FormGroup>
                    </Box>
                </Grid>

                {/* Middle Col: Waiting Queue */}
                <Grid item xs={12} md={3.5} lg={3} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#1E293B' }}>Waiting Queue</Typography>
                        <Chip label={waitingTokens.length} size="small" sx={{ bgcolor: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, borderRadius: 1 }} />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {displayedTokens.map(token => (
                            <Card key={token.id} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2, boxShadow: '0px 2px 4px rgba(0,0,0,0.02)', cursor: 'grab', '&:hover': { borderColor: '#3B82F6', transform: 'translateY(-1px)' }, transition: 'all 0.2s' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#2563EB' }}>{token.number}</Typography>
                                    <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 700, bgcolor: '#FEF2F2', px: 1, py: 0.2, borderRadius: 1 }}>
                                        Wait: {(() => { const m = Math.round(token.wait_minutes || 0); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; })()}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#1E293B' }}>{token.service_type}</Typography>
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                    {token.vulnerability_score > 0.5 ? 'Priority Customer' : 'Standard Queue'}
                                </Typography>
                            </Card>
                        ))}
                    </Box>

                    {waitingTokens.length > 6 && (
                        <Button
                            onClick={() => setIsQueueExpanded(!isQueueExpanded)}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            {isQueueExpanded ? 'See Less' : `See More (${waitingTokens.length - 6} more)`}
                        </Button>
                    )}
                </Grid>

                {/* Right Col: Active Counters */}
                <Grid item xs={12} md={6} lg={true} sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                    <Box sx={{ p: 1, mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#1E293B' }}>Active Counters</Typography>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2.5 }}>
                        {filteredCounters.length === 0 && (
                            <Typography variant="body1" sx={{ color: '#94A3B8', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', mt: 4 }}>
                                No counters match your filters.
                            </Typography>
                        )}
                        {filteredCounters.map((counter) => {
                            const servingToken = tokens.find(t => t.counter_id === counter.id && ['CALLED', 'SERVING'].includes(t.status))

                            return (
                                <Paper key={counter.id} sx={{ p: 2.5, border: '1px solid #E2E8F0', borderRadius: 3, boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: counter.active ? '#22C55E' : '#94A3B8', boxShadow: counter.active ? '0 0 0 3px #DCFCE7' : 'none' }} />
                                            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{counter.name}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 28, height: 28, border: '2px solid white', boxShadow: '0 0 0 1px #E2E8F0' }} src={`https://i.pravatar.cc/150?u=${counter.id}`} />
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
                                        {(Array.isArray(counter.service_types) ? counter.service_types : (counter.service_types || '').split(',')).filter(Boolean).map(s => (
                                            <Chip key={s} label={s} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }} />
                                        ))}
                                        {(!counter.service_types || counter.service_types.length === 0) && (
                                            <Chip label="General" size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569' }} />
                                        )}
                                    </Box>

                                    {/* Serving area */}
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            bgcolor: '#F8FAFC',
                                            border: '1px dashed #CBD5E1',
                                            borderRadius: 2,
                                            mb: 2,
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: 80
                                        }}
                                    >
                                        {servingToken ? (
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mb: 0.5, display: 'block' }}>SERVING</Typography>
                                                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B' }}>{servingToken.number}</Typography>
                                                <Typography variant="caption" sx={{ color: '#475569' }}>{servingToken.service_type}</Typography>
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                                                Open for new token
                                            </Typography>
                                        )}
                                    </Paper>

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        disabled={!counter.active || !!servingToken}
                                        onClick={() => handleCallNext(counter.id)}
                                        sx={{
                                            bgcolor: '#1E293B',
                                            color: 'white',
                                            fontWeight: 700,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            opacity: (!counter.active || !!servingToken) ? 0.7 : 1,
                                            '&:hover': { bgcolor: '#0F172A' }
                                        }}
                                    >
                                        {servingToken ? 'In Progress' : 'Call Next Token'}
                                    </Button>
                                </Paper>
                            )
                        })}
                    </Box>
                </Grid>

            </Grid>
        </Box>
    )
}

export default CounterManagement
