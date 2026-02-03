import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Avatar,
    Divider
} from '@mui/material'
import {
    Dashboard as DashboardIcon,
    Store as StoreIcon,
    BarChart as BarChartIcon,
    Settings as SettingsIcon,
    ListAlt as ListAltIcon
} from '@mui/icons-material'

import { useAuth } from '../context/AuthContext'

const DRAWER_WIDTH = 260

function Layout({ children }) {
    const navigate = useNavigate()
    const location = useLocation()
    const { logout, user } = useAuth()

    const navItems = [
        { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
        { label: 'Counter Management', path: '/counters', icon: <StoreIcon /> },
        { label: 'Analytics', path: '/analytics', icon: <BarChartIcon /> },
        { label: 'All Tokens', path: '/tokens', icon: <ListAltIcon /> },
        // { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    ]

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: 'white',
                        borderRight: '1px solid #E2E8F0',
                    },
                }}
            >
                {/* Admin Profile Header */}
                <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#DCFCE7', color: '#166534' }}>A</Avatar>
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E293B' }}>{user?.full_name || 'Admin'}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>{user?.email || 'admin@fairq.com'}</Typography>
                    </Box>
                </Box>

                <List sx={{ px: 2 }}>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <Typography variant="caption" sx={{ pl: 2, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                            Main Menu
                        </Typography>
                    </ListItem>

                    {navItems.map((item) => {
                        const active = location.pathname === item.path
                        return (
                            <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    onClick={() => navigate(item.path)}
                                    sx={{
                                        borderRadius: 2,
                                        bgcolor: active ? '#EFF6FF' : 'transparent',
                                        color: active ? '#2563EB' : '#64748B',
                                        '&:hover': { bgcolor: '#F1F5F9' },
                                        '& .MuiListItemIcon-root': {
                                            color: active ? '#2563EB' : '#94A3B8'
                                        }
                                    }}
                                >
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{ fontWeight: active ? 600 : 500 }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        )
                    })}
                </List>

                <Box sx={{ mt: 'auto', p: 2 }}>
                    <ListItemButton onClick={logout} sx={{ borderRadius: 2, color: '#64748B' }}>
                        <ListItemIcon><SettingsIcon /></ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box component="main" sx={{ flexGrow: 1, bgcolor: '#F8FAFC', p: 0, minHeight: '100vh', overflowX: 'hidden' }}>
                {children}
            </Box>
        </Box>
    )
}

export default Layout
