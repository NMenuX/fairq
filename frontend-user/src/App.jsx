import React from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Toolbar,
  Typography,
  Stack,
  Tabs,
  Tab,
} from '@mui/material'
import DiamondIcon from '@mui/icons-material/Diamond'
import GetToken from './pages/GetToken'
import CheckStatus from './pages/CheckStatus'

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleTabChange = (event, newValue) => {
    if (newValue === 0) {
      navigate('/')
    } else {
      navigate('/check-status')
    }
  }

  const currentTab = location.pathname === '/check-status' ? 1 : 0

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8' }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <DiamondIcon sx={{ color: '#2563eb', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Customer Service Kiosk
            </Typography>
          </Stack>
        </Toolbar>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Get Token" />
            <Tab label="Check Status" />
          </Tabs>
        </Box>
      </AppBar>

      <Routes>
        <Route path="/" element={<GetToken />} />
        <Route path="/check-status" element={<CheckStatus />} />
      </Routes>
    </Box>
  )
}

export default App
