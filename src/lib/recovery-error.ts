type RecoveryError = { code?: string; status?: number; name?: string };

export function recoveryError(error: RecoveryError) {
  const code = error.code;
  if (code === 'over_email_send_rate_limit') return { message: 'The email sending limit has been reached. Try again later, or contact your workspace administrator.', cooldown: 60 };
  if (code === 'over_request_rate_limit' || error.status === 429) return { message: 'Too many requests. Wait a few minutes before trying again.', cooldown: 60 };
  if (code === 'email_address_not_authorized') return { message: 'Email delivery is not enabled for this address. Contact your workspace administrator.', cooldown: 0 };
  if (code === 'email_address_invalid' || code === 'validation_failed') return { message: 'Please enter a valid email address.', cooldown: 0 };
  if (code === 'email_provider_disabled' || code === 'otp_disabled') return { message: 'Email recovery is not enabled. Contact your workspace administrator.', cooldown: 0 };
  if (code === 'captcha_failed') return { message: 'The verification check could not be completed. Contact your workspace administrator.', cooldown: 0 };
  if (code === 'request_timeout' || error.name === 'AuthRetryableFetchError') return { message: 'Could not reach the email service. Check your connection and try again.', cooldown: 0 };
  if (error.status && error.status >= 500) return { message: 'The recovery email service is unavailable. Contact your workspace administrator.', cooldown: 0 };
  return { message: 'Could not request a recovery email. Contact your workspace administrator if this continues.', cooldown: 0 };
}
