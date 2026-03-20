import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Dashboard from './pages/Dashboard'
import Metrics from './pages/Metrics'
import AllTokens from './pages/AllTokens'
import CounterManagement from './pages/CounterManagement'
import Login from './pages/Login'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563EB', // Blue from design
    },
    background: {
      default: '#F8FAFC'
    }
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/counters" element={
            <ProtectedRoute>
              <Layout>
                <CounterManagement />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute>
              <Layout>
                <Metrics />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/tokens" element={
            <ProtectedRoute>
              <Layout>
                <AllTokens />
              </Layout>
            </ProtectedRoute>
          } />

        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
