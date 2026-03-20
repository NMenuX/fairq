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
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
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

    const { kpi, trend, distribution, heatmap, counter_performance: counterPerformance } = metrics

    // Build matrix for heatmap for easier rendering
    const heatmapMatrix = heatmap
        ? heatmap.days.map((day) => {
            const row = { day }
            heatmap.slots.forEach((slot) => {
                const match = heatmap.values.find((v) => v.day === day && v.slot === slot)
                row[slot] = match ? match.count : 0
            })
            return row
        })
        : []

    const heatmapMax =
        heatmap && heatmap.values.length
            ? Math.max(...heatmap.values.map((v) => v.count || 0))
            : 0

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

            {/* Peak Hours Heatmap - full width */}
            <Box sx={{ mt: 4 }}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: 'white', minHeight: 320, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>Peak Hours Heatmap</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            Busiest periods by weekday × time block (last 7 days)
                        </Typography>
                    </Box>

                    <Box sx={{ flex: 1, overflowX: 'auto' }}>
                        <Box sx={{ minWidth: 520 }}>
                            {/* Column headers */}
                            <Box sx={{ display: 'flex', mb: 1, ml: '60px' }}>
                                {heatmap?.slots.map((slot) => (
                                    <Box
                                        key={slot}
                                        sx={{
                                            flex: 1,
                                            textAlign: 'center',
                                            fontSize: 11,
                                            color: '#64748B',
                                        }}
                                    >
                                        {slot}
                                    </Box>
                                ))}
                            </Box>

                            {/* Rows */}
                            {heatmapMatrix.map((row) => (
                                <Box
                                    key={row.day}
                                    sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}
                                >
                                    <Box sx={{ width: 60, fontSize: 12, color: '#64748B' }}>
                                        {row.day}
                                    </Box>
                                    {heatmap.slots.map((slot) => {
                                        const value = row[slot]
                                        const intensity =
                                            heatmapMax > 0 ? value / heatmapMax : 0
                                        const bg =
                                            intensity === 0
                                                ? '#F9FAFB'
                                                : `rgba(37, 99, 235, ${0.15 + intensity * 0.65})`
                                        const color = intensity > 0.6 ? '#F9FAFB' : '#1E293B'
                                        return (
                                            <Box
                                                key={slot}
                                                sx={{
                                                    flex: 1,
                                                    mx: 0.25,
                                                    height: 28,
                                                    borderRadius: 1,
                                                    bgcolor: bg,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 11,
                                                    color,
                                                }}
                                            >
                                                {value || ''}
                                            </Box>
                                        )
                                    })}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Paper>
            </Box>

            {/* Counter Performance Comparison - full width */}
            <Box sx={{ mt: 4 }}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, bgcolor: 'white', height: 450, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                            Counter Performance Comparison
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            Tokens served, avg wait, completion rate (last 7 days)
                        </Typography>
                    </Box>
                    <Box sx={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={counterPerformance}
                                margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="name"
                                    interval={0}
                                    angle={-20}
                                    textAnchor="end"
                                    height={50}
                                    tick={{ fill: '#64748B', fontSize: 11 }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 11 }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${v}%`}
                                    tick={{ fill: '#64748B', fontSize: 11 }}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    }}
                                    formatter={(value, name) => {
                                        if (name === 'completion_rate') return [`${value}%`, 'Completion']
                                        if (name === 'avg_wait_minutes') return [`${value}m`, 'Avg Wait']
                                        return [value, 'Served']
                                    }}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 20 }} />
                                <Bar
                                    yAxisId="left"
                                    dataKey="served"
                                    name="Tokens Served"
                                    fill="#2563EB"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    yAxisId="left"
                                    dataKey="avg_wait_minutes"
                                    name="Avg Wait (min)"
                                    fill="#F97316"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    yAxisId="right"
                                    dataKey="completion_rate"
                                    name="Completion %"
                                    fill="#22C55E"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Paper>
            </Box>
        </Box>
    )
}

export default Metrics
