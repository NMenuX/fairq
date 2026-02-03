import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Container,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'

function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: location.pathname === '/' ? 'hidden' : 'auto' }}>
        {location.pathname === '/' ? (
          children
        ) : (
          <Container maxWidth="xl" sx={{ flex: 1, py: 3 }}>
            {children}
          </Container>
        )}
      </Box>
    </Box>
  )
}

export default Layout
