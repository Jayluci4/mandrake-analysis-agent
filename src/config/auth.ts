// AIDEV-NOTE: Google OAuth configuration for unified app
// Google Client ID from environment variable
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// Email validation configuration
export const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'mailinator.com',
  'throwaway.email',
  'yopmail.com',
  'temp-mail.org',
  'getnada.com',
  'maildrop.cc',
  'getairmail.com',
  'moakt.com',
  'dispostable.com',
  'trashmail.com',
  'sharklasers.com',
  'spam4.me',
  'guerrillamail.info',
  'guerrillamail.biz',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.de',
  'mailcatch.com',
  'mailnesia.com',
  'tempr.email',
  'harakirimail.com',
  'mytemp.email',
  '33mail.com',
  'fakeinbox.com',
  'crazymailing.com'
];

// Allowed email domains (optional - set to empty array to allow all non-disposable)
export const ALLOWED_EMAIL_DOMAINS: string[] = [
  // Add specific allowed domains if needed
  // 'gmail.com',
  // 'company.com'
];

export const validateEmail = (email: string): { valid: boolean; reason?: string } => {
  if (!email || !email.includes('@')) {
    return { valid: false, reason: 'Invalid email format' };
  }

  const domain = email.split('@')[1].toLowerCase();
  
  // Check for disposable email domains
  if (DISPOSABLE_EMAIL_DOMAINS.some(d => domain.includes(d))) {
    return { valid: false, reason: 'Temporary or disposable email addresses are not allowed' };
  }

  // If allowed domains are specified, check if email domain is in the list
  if (ALLOWED_EMAIL_DOMAINS.length > 0 && !ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return { valid: false, reason: `Email domain ${domain} is not allowed` };
  }

  return { valid: true };
};