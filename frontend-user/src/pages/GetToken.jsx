import React, { useState } from 'react'
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  FormLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material'
import { createToken } from '../api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SERVICE_TYPES = [
  'General Inquiry',
  'Account Opening',
  'Deposits/Withdrawals',
  'Loans',
  'Customer Service',
  'Cards & Services',
]

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'sinhala', label: 'සිංහල (Sinhala)' },
  { value: 'tamil', label: 'தமிழ் (Tamil)' },
]

// Extract age from Sri Lankan NIC
function extractAgeFromNic(nic) {
  if (!nic) return null
  nic = nic.trim().toUpperCase()

  // Old format: YYXXXXXXV (9 digits + V/X)
  const oldFormat = nic.match(/^(\d{2})(\d{3})(\d{4})([VX])$/)
  if (oldFormat) {
    const birthYear = 1900 + parseInt(oldFormat[1])
    return new Date().getFullYear() - birthYear
  }

  // New format: YYYYXXXXXXXX (12 digits)
  const newFormat = nic.match(/^(\d{4})(\d{3})(\d{5})$/)
  if (newFormat) {
    const birthYear = parseInt(newFormat[1])
    return new Date().getFullYear() - birthYear
  }

  return null
}

function GetToken() {
  const [step, setStep] = useState(0) // 0: form, 1: OTP, 2: success
  const [formData, setFormData] = useState({
    service_type: 'General Inquiry',
    nic: '',
    phone: '',
    language: 'english',
    disability: false,
  })
  const [otp, setOtp] = useState('')
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const calculatedAge = extractAgeFromNic(formData.nic)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const calculateVulnerabilityScore = () => {
    let score = 0.0
    const age = calculatedAge || 0

    if (age >= 65) score += 0.6
    else if (age >= 55) score += 0.4
    else if (age >= 45) score += 0.2

    if (formData.disability) score += 0.4

    return Math.min(score, 2.0)
  }

  const handleSendOtp = async () => {
    if (!formData.phone || formData.phone.length < 9) {
      setError('Please enter a valid phone number')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to send OTP')
      }

      setOtpSent(true)
      setStep(1)
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, otp: otp }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Invalid OTP')
      }

      // OTP verified, now create token
      await handleCreateToken()
    } catch (err) {
      setError(err.message || 'Failed to verify OTP')
      setLoading(false)
    }
  }

  const handleCreateToken = async () => {
    try {
      const vulnerabilityScore = calculateVulnerabilityScore()
      const payload = {
        service_type: formData.service_type,
        nic: formData.nic || null,
        phone: formData.phone || null,
        language: formData.language,
        disability: formData.disability,
        language_barrier: 0.0,
        vulnerability_score: vulnerabilityScore,
      }

      const result = await createToken(payload)
      setToken(result)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create token')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      service_type: 'General Inquiry',
      nic: '',
      phone: '',
      language: 'english',
      disability: false,
    })
    setOtp('')
    setToken(null)
    setStep(0)
    setOtpSent(false)
    setError('')
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper
        elevation={2}
        sx={{
          p: 5,
          borderRadius: 3,
          bgcolor: '#fff',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {step === 2 && token ? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Your Token Number
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 700, mb: 3, color: '#2563eb' }}>
              {token.number}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Service: {token.service_type}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Language: {LANGUAGES.find(l => l.value === formData.language)?.label || formData.language}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              SMS notification will be sent to {formData.phone} when your token is called.
            </Typography>
            <Button
              variant="contained"
              onClick={handleReset}
              sx={{
                bgcolor: '#2563eb',
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 1.5
              }}
            >
              Get Another Token
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1e293b', textAlign: 'center' }}>
              Welcome! Get Your Service Token Here
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
              Please fill in the details below to get your token number.
            </Typography>

            <Stepper activeStep={step} sx={{ mb: 4 }}>
              <Step><StepLabel>Details</StepLabel></Step>
              <Step><StepLabel>Verify Phone</StepLabel></Step>
            </Stepper>

            {step === 0 && (
              <Box>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Service Type</InputLabel>
                  <Select
                    name="service_type"
                    value={formData.service_type}
                    onChange={handleChange}
                    label="Service Type"
                  >
                    {SERVICE_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="NIC / ID Number"
                  name="nic"
                  value={formData.nic}
                  onChange={handleChange}
                  placeholder="e.g., 901234567V or 199012345678"
                  sx={{ mb: 1 }}
                />
                {calculatedAge && (
                  <Typography variant="caption" color="primary" sx={{ mb: 2, display: 'block' }}>
                    Age calculated from NIC: {calculatedAge} years
                  </Typography>
                )}
                {!calculatedAge && formData.nic && (
                  <Typography variant="caption" color="error" sx={{ mb: 2, display: 'block' }}>
                    Invalid NIC format
                  </Typography>
                )}

                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g., 0771234567"
                  sx={{ mb: 3, mt: 2 }}
                  required
                />

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Preferred Language</InputLabel>
                  <Select
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    label="Preferred Language"
                  >
                    {LANGUAGES.map((lang) => (
                      <MenuItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl component="fieldset" sx={{ mb: 4, width: '100%' }}>
                  <FormLabel component="legend">Assistance Needs (Optional)</FormLabel>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="disability"
                        checked={formData.disability}
                        onChange={handleChange}
                      />
                    }
                    label="Require disability access"
                  />
                </FormControl>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleSendOtp}
                  sx={{
                    bgcolor: '#2563eb',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    fontSize: '1.1rem'
                  }}
                  disabled={loading || !formData.service_type || !formData.phone}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Send OTP & Continue'}
                </Button>
              </Box>
            )}

            {step === 1 && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  An OTP has been sent to {formData.phone}. Please enter it below.
                </Alert>

                <TextField
                  fullWidth
                  label="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  sx={{ mb: 3 }}
                  inputProps={{ maxLength: 6, style: { letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.5rem' } }}
                />

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleVerifyOtp}
                  sx={{
                    bgcolor: '#2563eb',
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    fontSize: '1.1rem',
                    mb: 2
                  }}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify & Get Token'}
                </Button>

                <Button
                  fullWidth
                  variant="text"
                  onClick={() => { setStep(0); setError(''); }}
                  sx={{ textTransform: 'none' }}
                >
                  Back to Edit Details
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  )
}

export default GetToken
