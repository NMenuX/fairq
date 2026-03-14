import React, { useState } from 'react'
import {
    Box,
    Typography,
    Grid,
    Paper,
    Button,
    FormControl,
    Select,
    MenuItem
} from '@mui/material'
import { Refresh as RefreshIcon, ArrowUpward, ArrowDownward } from '@mui/icons-material'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts'

import { getMetrics } from '../api'

function Metrics() {
    const [timeRange, setTimeRange] = useState('today')
    const [metrics, setMetrics] = useState(null)
    const [loading, setLoading] = useState(true)

    React.useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await getMetrics()
                setMetrics(data)
            } catch (error) {
                console.error("Failed to fetch metrics", error)
            } finally {
                setLoading(false)
            }
        }
        fetchMetrics()
    }, [])

    if (loading || !metrics) {
        return <Box sx={{ p: 4 }}>Loading analytics...</Box>
    }

    const { kpi, trend, distribution } = metrics

    return (
        <Box sx={{ p: 4, minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC' }}>

            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1E293B', mb: 1, letterSpacing: -0.5 }}>
                        Metrics & Analytics
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#64748B' }}>
                        Real-time queue performance and fairness metrics.
                    </Typography>
                </Box>
                <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
                    Refresh Data
                </Button>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'white' }}>
                    <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} sx={{ borderRadius: 2 }}>
                        <MenuItem value="today">Date: Today</MenuItem>
                        <MenuItem value="week">Date: Last 7 Days</MenuItem>
                        <MenuItem value="month">Date: Last 30 Days</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* KPI Cards (CSS Grid) */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: 3,
                mb: 4
            }}>
                {kpi.map((item, index) => (
                    <Paper key={index} elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: 'white', '&:hover': { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Typography variant="subtitle2" sx={{ color: '#64748B', fontWeight: 600, mb: 1 }}>{item.label}</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 700, color: '#1E293B', mb: 2 }}>{item.value}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {item.positive !== undefined && (item.positive ? <ArrowUpward sx={{ fontSize: 16, color: '#22C55E' }} /> : <ArrowDownward sx={{ fontSize: 16, color: '#EF4444' }} />)}
                            <Typography variant="body2" sx={{ color: item.positive ? '#16A34A' : '#EF4444', fontWeight: 600 }}>{item.trend}</Typography>
                            <Typography variant="caption" sx={{ color: '#94A3B8', ml: 1 }}>{item.subtext}</Typography>
                        </Box>
                    </Paper>
                ))}
            </Box>

            {/* Charts Grid (CSS Grid) */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
                gap: 3,
                flex: 1
            }}>

                {/* Line Chart */}
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: 'white', height: 400, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>Wait Time Trend</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>Last 7 Days (Priority vs Standard)</Typography>
                    </Box>
                    <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Line type="monotone" dataKey="priority" name="Priority" stroke="#2563EB" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="standard" name="Standard" stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>

                {/* Bar Chart */}
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: 'white', height: 400, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>Wait Distribution</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>Today</Typography>
                    </Box>
                    <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distribution}>
                                <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} dy={10} interval={0} />
                                <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Bar dataKey="count" fill="#DBEAFE" radius={[4, 4, 0, 0]} activeBar={{ fill: '#2563EB' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>

            </Box>
        </Box>
    )
}

export default Metrics
