import Box from '@material-ui/core/Box'
import ReCAPTCHA from 'react-google-recaptcha'
import React, { useState } from 'react'
import Typography from '@material-ui/core/Typography'
import { Alert } from 'src/components/Alert'
import TextField from '@material-ui/core/TextField'
import { Button } from 'src/components/Button'
import { ClaimDateMessage } from 'src/pages/Airdrop/ClaimDateMessage'
import { ExternalLink } from 'src/components/Link'
import { StyledButton } from 'src/components/Button/StyledButton'

const captchaSiteKey = '6LfOm4cfAAAAAJWnWkKuh2hS91sgMUZw0T3rvOsT'

export function AuthereumVerify() {
  const [inputValue, setInputValue] = useState('')
  const [captchaResponseToken, setCaptchaResponseToken] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [successMsg, setSuccessMsg] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  function handleInputChange(event: any) {
    setInputValue(event.target.value)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccessMsg('')
      const url = 'https://authereum.hop.exchange/check-email'
      const data = { email: inputValue, responseToken: captchaResponseToken }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (json.error) {
        throw new Error(json.error)
      }
      if (json.success) {
        setSuccessMsg(json.success)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const onCaptchaChange = (value: string | null) => {
    setCaptchaResponseToken(value ?? '')
  }

  const submitDisabled = !(inputValue && captchaResponseToken)

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center">
      <Box m={2} textAlign="center">
        <Typography variant="h5" component="div">
          Are you an Authereum user?
        </Typography>
      </Box>
      <Box m={3} maxWidth={500} textAlign="center">
        <Typography variant="body1">
          If you are an <ExternalLink href="https://authereum.com">Authereum</ExternalLink> user and meet the minimum eligibility requirements, you qualify for a HOP airdrop.
        </Typography>
      </Box>
      <ClaimDateMessage />
      <Box mb={3} display="flex" flexDirection="column" justifyContent="center">
        <TextField
          value={inputValue}
          onChange={handleInputChange}
          label="Authereum Email"
          placeholder="alice@example.com"
        />
        <Box my={3} display="flex" flexDirection="column" justifyContent="center" alignItems="center">
          <ReCAPTCHA
            sitekey={captchaSiteKey}
            onChange={onCaptchaChange}
          />
        </Box>

        <Button loading={loading} disabled={submitDisabled} onClick={handleSubmit} variant="contained" color="primary" highlighted>
          Send verification email
        </Button>
      </Box>
      <Box marginBottom={4} m={3} maxWidth={300} textAlign="center">
        <Typography variant="body2" color="textSecondary">
          <em>It’s not possible to sign-up for Authereum anymore as the wallet has <ExternalLink href="https://medium.com/authereum/an-end-and-a-new-beginning-ae0e2e596e1b">closed down</ExternalLink> since March 2021.</em>
        </Typography>
      </Box>
      <Alert severity="error" onClose={() => setError('')}>
        {error}
      </Alert>
      <Alert severity="success" onClose={() => setSuccessMsg('')}>
        {successMsg}
      </Alert>
      <Box my={3} display="flex" flexDirection="column" justifyContent="center">
        <StyledButton href={"/airdrop/preview"}>
          Go back
        </StyledButton>
      </Box>
    </Box>
  )
}
