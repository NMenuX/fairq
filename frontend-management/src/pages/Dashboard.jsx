import React, { useState, useEffect } from 'react'
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    InputAdornment,
    Button,
    Chip,
    LinearProgress,
    IconButton,
    TablePagination
} from '@mui/material'
import {
    Search as SearchIcon,
    FilterList as FilterListIcon,
    ArrowForward as ArrowForwardIcon,
    Bolt as BoltIcon
} from '@mui/icons-material'
import { getAllTokens, getQueueOverview, getSuggestNext, callToken } from '../api'

function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [queue, setQueue] = useState([])
    const [stats, setStats] = useState({
        totalWaiting: 0,
        avgWait: '0m',
        longestWait: '0m',
        fairness: '100%'
    })

    const [suggestion, setSuggestion] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    const handleChangePage = (event, newPage) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    // Filter queue based on search
    const filteredQueue = queue.filter(t =>
        t.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.nic && t.nic.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.service_type.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        fetchData()
    }, [])

    const handleCallSuggested = async () => {
        if (!suggestion) return;
        setActionLoading(true)
        try {
            await callToken(suggestion.token_id || suggestion.id, null) // Call as unassigned/admin
            fetchData() // Refresh
        } catch (e) {
            console.error(e)
        } finally {
            setActionLoading(false)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const [tokensData, suggestionData] = await Promise.all([
                getAllTokens(),
                getSuggestNext()
            ])

            setSuggestion(suggestionData)

            const items = tokensData.items || []
            const waiting = items.filter(t => t.status === 'WAITING')
            setQueue(waiting)

            // Calculate REAL stats from the fetched queue
            const totalWaiting = waiting.length

            let totalWaitSeconds = 0
            let maxWaitSeconds = 0

            const now = new Date()

            waiting.forEach(t => {
                const created = new Date(t.created_at || Date.now()) // Handle potential missing fields
                const waitSeconds = (now - created) / 1000
                totalWaitSeconds += waitSeconds
                if (waitSeconds > maxWaitSeconds) maxWaitSeconds = waitSeconds
            })

            const avgSeconds = totalWaiting > 0 ? (totalWaitSeconds / totalWaiting) : 0

            const formatDuration = (secs) => {
                if (secs < 60) return '0m'
                const m = Math.floor(secs / 60)
                const s = Math.floor(secs % 60)
                return `${m}m ${s}s`
            }

            setStats({
                totalWaiting: totalWaiting,
                avgWait: formatDuration(avgSeconds),
                longestWait: formatDuration(maxWaitSeconds),
                fairness: '1.00' // Simple default, or fetch if available
            })

        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }


    return (
        <Box sx={{ width: '100%', p: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', mb: 3, letterSpacing: -0.5 }}>
                Queue Overview
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { lg: '3fr 1fr', xs: '1fr' }, gap: 3 }}>

                {/* Left Section: Overview & Table */}
                <Box sx={{ minWidth: 0 }}>
                    {/* KPI Cards */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                        {[
                            { label: 'Total Waiting', value: stats.totalWaiting },
                            { label: 'Avg. Wait Time', value: stats.avgWait },
                            { label: 'Longest Wait', value: stats.longestWait },
                            { label: 'Fairness Ratio', value: stats.fairness }
                        ].map((kpi, i) => (
                            <Paper key={i} elevation={0} sx={{
                                p: 2.5,
                                border: '1px solid #E2E8F0',
                                borderRadius: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                height: 140,
                                width: '100%'
                            }}>
                                <Typography variant="subtitle2" sx={{ color: '#64748B', fontWeight: 600 }}>{kpi.label}</Typography>
                                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1E293B', fontSize: '2.5rem' }}>{kpi.value}</Typography>
                            </Paper>
                        ))}
                    </Box>

                    {/* Actions Bar */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                            fullWidth
                            placeholder="Search by Token # or Service..."
                            variant="outlined"
                            size="small"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{
                                bgcolor: 'white',
                                '& .MuiOutlinedInput-root': { borderRadius: 2, height: 48 },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' }
                            }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94A3B8' }} /></InputAdornment>
                            }}
                        />
                        <Button
                            variant="outlined"
                            startIcon={<FilterListIcon />}
                            sx={{
                                px: 3,
                                borderRadius: 2,
                                borderColor: '#E2E8F0',
                                color: '#1E293B',
                                textTransform: 'none',
                                fontWeight: 600,
                                bgcolor: 'white',
                                height: 48,
                                minWidth: 120
                            }}
                        >
                            Filter
                        </Button>
                    </Box>

                    {/* Queue Table */}
                    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden', width: '100%' }}>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 2fr 1.5fr 1fr 1fr',
                            bgcolor: '#F8FAFC',
                            py: 1.5,
                            px: 3,
                            borderBottom: '1px solid #E2E8F0',
                            alignItems: 'center'
                        }}>
                            {['Token #', 'Customer Name', 'Service', 'Wait Time', 'Vulnerability'].map(h => (
                                <Typography key={h} variant="caption" sx={{ color: '#64748B', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</Typography>
                            ))}
                        </Box>

                        {filteredQueue.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center', color: '#94A3B8' }}>
                                {searchTerm ? 'No matching customers found' : 'No customers waiting'}
                            </Box>
                        ) : (
                            <Box>
                                {filteredQueue
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((token, idx) => {
                                        const waitTimeDisplay = isNaN(token.wait_minutes) ? '0m 0s' : `${Math.round(token.wait_minutes || 0)}m ${Math.round((token.wait_minutes % 1) * 60)}s`;

                                        return (
                                            <Box key={token.id} sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '1.2fr 2fr 1.5fr 1fr 1fr',
                                                py: 2, px: 3,
                                                borderBottom: '1px solid #F1F5F9',
                                                bgcolor: 'white',
                                                '&:last-child': { borderBottom: 'none' },
                                                alignItems: 'center'
                                            }}>
                                                <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>{token.number}</Typography>
                                                <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 600 }}>{token.nic ? 'Known User' : 'Guest User'}</Typography>
                                                <Typography variant="body2" sx={{ color: '#64748B' }}>{token.service_type}</Typography>
                                                <Typography variant="body2" sx={{ color: '#64748B', fontFamily: 'monospace' }}>{waitTimeDisplay}</Typography>
                                                <Box>
                                                    <Chip
                                                        label={token.vulnerability_score > 0.5 ? 'High' : (token.vulnerability_score > 0.2 ? 'Medium' : 'Low')}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: token.vulnerability_score > 0.5 ? '#FEE2E2' : (token.vulnerability_score > 0.2 ? '#FEF3C7' : '#DCFCE7'),
                                                            color: token.vulnerability_score > 0.5 ? '#991B1B' : (token.vulnerability_score > 0.2 ? '#92400E' : '#166534'),
                                                            fontWeight: 700,
                                                            borderRadius: 1.5,
                                                            px: 0.5,
                                                            height: 24,
                                                            fontSize: '0.75rem'
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                        )
                                    })}
                            </Box>
                        )}
                        <TablePagination
                            component="div"
                            count={filteredQueue.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[5, 10, 25]}
                            sx={{ borderTop: '1px solid #E2E8F0' }}
                        />
                    </Paper>
                </Box>

                {/* Right Section: Actions */}
                <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', mb: 2 }}>Next Customer</Typography>
                            <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: 'white', width: '100%' }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<BoltIcon />}
                                    onClick={fetchData}
                                    sx={{ bgcolor: '#2563EB', color: 'white', py: 1.5, borderRadius: 2, fontWeight: 600, textTransform: 'none', mb: 3 }}
                                >
                                    Suggest Next Token
                                </Button>

                                <Box sx={{ bgcolor: '#F8FAFC', borderRadius: 2, py: 3, textAlign: 'center', mb: 3 }}>
                                    <Typography variant="caption" sx={{ color: '#64748B', mb: 0.5, display: 'block' }}>Suggested Token</Typography>
                                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#2563EB' }}>
                                        {suggestion?.number || '--'}
                                    </Typography>
                                </Box>

                                {suggestion && (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                                        {[
                                            { l: 'Service', v: suggestion.service_type, c: '#1E293B' },
                                            { l: 'Vulnerability', v: suggestion.vulnerability_score > 0.5 ? 'High' : 'Standard', c: suggestion.vulnerability_score > 0.5 ? '#D97706' : '#1E293B' }
                                        ].map((row, i) => (
                                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ color: '#94A3B8' }}>{row.l}:</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: row.c }}>{row.v}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                <Button
                                    fullWidth
                                    variant="contained"
                                    endIcon={<ArrowForwardIcon />}
                                    disabled={!suggestion || actionLoading}
                                    onClick={handleCallSuggested}
                                    sx={{ bgcolor: '#F1F5F9', color: '#1E293B', py: 1.5, borderRadius: 2, fontWeight: 700, textTransform: 'none', boxShadow: 'none', '&:hover': { bgcolor: '#E2E8F0', boxShadow: 'none' } }}
                                >
                                    Call Next
                                </Button>
                            </Paper>
                        </Box>

                        <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: 'white', width: '100%' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B', mb: 1 }}>Queue Status</Typography>
                            <Typography variant="body2" sx={{ color: '#64748B', mb: 3, lineHeight: 1.5, fontSize: '0.875rem' }}>
                                The queue is currently busy. Prioritize customers with high vulnerability.
                            </Typography>

                            <LinearProgress variant="determinate" value={75} sx={{ height: 8, borderRadius: 4, bgcolor: '#F1F5F9', mb: 2, '& .MuiLinearProgress-bar': { bgcolor: '#2563EB', borderRadius: 4 } }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" sx={{ color: '#64748B' }}>75% Capacity</Typography>
                                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>Peak Hours</Typography>
                            </Box>
                        </Paper>

                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

export default Dashboard
