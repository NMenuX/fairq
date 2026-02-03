import React, { useState, useEffect } from 'react'
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    TablePagination,
    Button
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { getAllTokens, getCounters, resetTokenToWaiting } from '../api'

function AllTokens() {
    const [tokens, setTokens] = useState([])
    const [counters, setCounters] = useState({}) // Map id -> name
    const [filteredTokens, setFilteredTokens] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [serviceFilter, setServiceFilter] = useState('ALL')

    // Pagination State
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        filterTokens()
        setPage(0) // Reset to first page on filter change
    }, [tokens, searchQuery, statusFilter, serviceFilter])

    const fetchData = async () => {
        try {
            const [tokensData, countersData] = await Promise.all([
                getAllTokens(),
                getCounters()
            ])
            setTokens(tokensData.items || [])

            // Create map for easy lookup
            const counterMap = {}
            if (Array.isArray(countersData)) {
                countersData.forEach(c => { counterMap[c.id] = c.name })
            }
            setCounters(counterMap)
        } catch (err) {
            console.error('Failed to fetch data', err)
        }
    }

    const filterTokens = () => {
        let result = [...tokens]

        // Search
        if (searchQuery) {
            const lower = searchQuery.toLowerCase()
            result = result.filter(t =>
                t.number.toLowerCase().includes(lower) ||
                (t.nic && t.nic.toLowerCase().includes(lower))
            )
        }

        // Status Filter
        if (statusFilter !== 'ALL') {
            result = result.filter(t => t.status === statusFilter)
        }

        // Service Filter
        if (serviceFilter !== 'ALL') {
            result = result.filter(t => t.service_type === serviceFilter)
        }

        setFilteredTokens(result)
    }

    // Pagination Handlers
    const handleChangePage = (event, newPage) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

    // Slice data for pagination
    const paginatedTokens = filteredTokens.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    )

    const getStatusColor = (status) => {
        switch (status) {
            case 'WAITING': return { bg: '#FEF3C7', color: '#D97706' } // Yellow
            case 'CALLED': return { bg: '#DBEAFE', color: '#1D4ED8' } // Blue
            case 'SERVING': return { bg: '#DCFCE7', color: '#15803D' } // Green
            case 'COMPLETED': return { bg: '#F1F5F9', color: '#475569' } // Gray
            case 'CANCELLED': return { bg: '#FEE2E2', color: '#B91C1C' } // Red
            default: return { bg: '#F3F4F6', color: '#374151' }
        }
    }

    return (
        <Box sx={{ p: 4, maxWidth: 1600, margin: '0 auto' }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1E293B', mb: 1, letterSpacing: -1 }}>All Tokens</Typography>
            <Typography variant="body1" sx={{ color: '#64748B', mb: 4 }}>View and search all customer tokens in the system.</Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search by Token # or NIC"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ flex: 1, minWidth: 300, bgcolor: 'white' }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94A3B8' }} /></InputAdornment>
                    }}
                />

                <FormControl sx={{ minWidth: 200, bgcolor: 'white' }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <MenuItem value="ALL">All Statuses</MenuItem>
                        <MenuItem value="WAITING">Waiting</MenuItem>
                        <MenuItem value="CALLED">Called</MenuItem>
                        <MenuItem value="SERVING">Serving</MenuItem>
                        <MenuItem value="COMPLETED">Completed</MenuItem>
                        <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 200, bgcolor: 'white' }}>
                    <InputLabel>Service Type</InputLabel>
                    <Select
                        value={serviceFilter}
                        label="Service Type"
                        onChange={(e) => setServiceFilter(e.target.value)}
                    >
                        <MenuItem value="ALL">All Services</MenuItem>
                        <MenuItem value="Deposit">Deposit</MenuItem>
                        <MenuItem value="Withdrawal">Withdrawal</MenuItem>
                        <MenuItem value="Inquiry">Inquiry</MenuItem>
                        {/* Add more as needed */}
                    </Select>
                </FormControl>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, color: '#64748B' }}>TOKEN NUMBER</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#64748B' }}>CUSTOMER NIC</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#64748B' }}>SERVICE TYPE</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#64748B' }}>STATUS</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#64748B' }}>SCORE</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#64748B' }}>ISSUE TIME</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#64748B' }}>COUNTER</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#64748B' }}>ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedTokens.map((token) => {
                            const style = getStatusColor(token.status)
                            return (
                                <TableRow key={token.id} hover>
                                    <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>{token.number}</TableCell>
                                    <TableCell sx={{ color: '#475569' }}>{token.nic || 'N/A'}</TableCell>
                                    <TableCell sx={{ color: '#475569' }}>{token.service_type}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={token.status}
                                            size="small"
                                            sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700, borderRadius: 1 }}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ color: '#475569' }}>
                                        {token.vulnerability_score ? parseFloat(token.vulnerability_score).toFixed(2) : '0.00'}
                                    </TableCell>
                                    <TableCell sx={{ color: '#64748B' }}>
                                        {new Date(token.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </TableCell>
                                    <TableCell sx={{ color: '#64748B', fontWeight: 500 }}>
                                        {token.counter_id ? (counters[token.counter_id] || `Counter ${token.counter_id}`) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {['CALLED', 'CANCELLED'].includes(token.status) && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => handleReset(token.id)}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    borderColor: '#CBD5E1',
                                                    color: '#475569',
                                                    '&:hover': {
                                                        borderColor: '#2563EB',
                                                        color: '#2563EB',
                                                        bgcolor: '#EFF6FF'
                                                    }
                                                }}
                                            >
                                                Return to Queue
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {filteredTokens.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8, color: '#94A3B8' }}>
                                    No tokens found matching filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Control */}
                <TablePagination
                    component="div"
                    count={filteredTokens.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                />
            </TableContainer>
        </Box>
    )
}

export default AllTokens
