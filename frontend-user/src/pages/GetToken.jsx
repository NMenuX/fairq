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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Checkbox,
} from '@mui/material'
import { createToken } from '../api'

const SERVICE_TYPES = [
  'General Inquiry',
  'Account Opening',
  'Deposits/Withdrawals',
  'Loans',
  'Customer Service',
  'Cards & Services',
]

function GetToken() {
  const [formData, setFormData] = useState({
    service_type: 'General Inquiry',
    nic: '',
    age: '',
    gender: '',
    disability: false,
    language_support: false,
  })
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const calculateVulnerabilityScore = () => {
    let score = 0.0
    const age = parseInt(formData.age) || 0
    
    if (age >= 65) score += 0.6
    else if (age >= 55) score += 0.4
    else if (age >= 45) score += 0.2
    
    if (formData.disability) score += 0.4
    if (formData.language_support) score += 0.3
    
    return Math.min(score, 2.0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const vulnerabilityScore = calculateVulnerabilityScore()
      const payload = {
        service_type: formData.service_type,
        nic: formData.nic || null,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        disability: formData.disability,
        language_barrier: formData.language_support ? 0.3 : 0.0,
        vulnerability_score: vulnerabilityScore,
      }

      const result = await createToken(payload)
      setToken(result)
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
      age: '',
      gender: '',
      disability: false,
      language_support: false,
    })
    setToken(null)
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
        {token ? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
              Your Token Number
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 700, mb: 3, color: '#2563eb' }}>
              {token.number}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Service: {token.service_type}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Status: {token.status}
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

            <Box component="form" onSubmit={handleSubmit}>
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
                placeholder="Enter your ID number"
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Age"
                name="age"
                type="number"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter your age"
                sx={{ mb: 3 }}
                inputProps={{ min: 0, max: 120 }}
              />

              <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
                <FormLabel component="legend">Gender</FormLabel>
                <RadioGroup
                  row
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <FormControlLabel value="M" control={<Radio />} label="Male" />
                  <FormControlLabel value="F" control={<Radio />} label="Female" />
                  <FormControlLabel value="Other" control={<Radio />} label="Other" />
                </RadioGroup>
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
                <FormControlLabel
                  control={
                    <Checkbox
                      name="language_support"
                      checked={formData.language_support}
                      onChange={handleChange}
                    />
                  }
                  label="Need language support"
                />
              </FormControl>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                sx={{ 
                  bgcolor: '#2563eb', 
                  textTransform: 'none', 
                  fontWeight: 600,
                  py: 1.5,
                  fontSize: '1.1rem'
                }}
                disabled={loading || !formData.service_type}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Get Token'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  )
}

export default GetToken

