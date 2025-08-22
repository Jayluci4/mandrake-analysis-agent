/**
 * Email validation utilities to prevent abuse from temporary/disposable emails
 */

// List of known disposable email domains (this is a subset, you can expand)
const DISPOSABLE_EMAIL_DOMAINS = [
  // Common temporary email services
  'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'throwaway.email', 'yopmail.com', 'tempmail.net', 'temp-mail.org',
  'getnada.com', 'tempinbox.com', 'disposablemail.com', 'sharklasers.com',
  'guerrillamailblock.com', 'mailnesia.com', 'receivemail.org', 'mailcatch.com',
  'mailnull.com', 'throwawaymail.com', 'tmpmail.net', 'tmpmail.org',
  'tempmailaddress.com', 'tempemail.net', 'tempmailer.com', 'mohmal.com',
  'inboxkitten.com', 'getairmail.com', 'dispostable.com', 'tempmail.de',
  // Add more as needed
];

// Whitelist of allowed domains (optional - for restricting to specific organizations)
const ALLOWED_DOMAINS: string[] = [
  // Uncomment and add domains to restrict access
  // 'yourcompany.com',
  // 'university.edu',
];

// Common personal email providers that are allowed
const TRUSTED_PROVIDERS = [
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'protonmail.com',
  'icloud.com', 'live.com', 'msn.com', 'aol.com', 'fastmail.com',
  'zoho.com', 'proton.me', 'pm.me', 'yandex.com', 'mail.com'
];

export interface EmailValidationResult {
  isValid: boolean;
  reason?: string;
  riskScore: number; // 0-100, higher means more risky
}

/**
 * Comprehensive email validation with anti-abuse measures
 */
export function validateEmail(email: string): EmailValidationResult {
  if (!email) {
    return { isValid: false, reason: 'Email is required', riskScore: 100 };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, reason: 'Invalid email format', riskScore: 100 };
  }

  const domain = email.split('@')[1].toLowerCase();
  
  // Check if email uses a disposable domain
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return { 
      isValid: false, 
      reason: 'Temporary/disposable email addresses are not allowed', 
      riskScore: 100 
    };
  }

  // Check subdomain variants of disposable services
  const isDisposableVariant = DISPOSABLE_EMAIL_DOMAINS.some(disposable => 
    domain.endsWith(`.${disposable}`) || domain.includes(disposable)
  );
  
  if (isDisposableVariant) {
    return { 
      isValid: false, 
      reason: 'Email domain appears to be a temporary email service', 
      riskScore: 95 
    };
  }

  // If domain whitelist is configured, check it
  if (ALLOWED_DOMAINS.length > 0 && !ALLOWED_DOMAINS.includes(domain)) {
    return { 
      isValid: false, 
      reason: 'Email domain is not in the allowed list', 
      riskScore: 90 
    };
  }

  // Check for suspicious patterns
  const localPart = email.split('@')[0];
  
  // Flag emails with too many numbers (often used by bots)
  const numberCount = (localPart.match(/\d/g) || []).length;
  if (numberCount > localPart.length * 0.6) {
    return { 
      isValid: true, // Allow but flag as risky
      reason: 'Email contains suspicious number pattern', 
      riskScore: 60 
    };
  }

  // Check for random character sequences (common in throwaway emails)
  if (localPart.length > 20 && !/[aeiou]/i.test(localPart)) {
    return { 
      isValid: true, // Allow but flag as risky
      reason: 'Email appears to be randomly generated', 
      riskScore: 50 
    };
  }

  // Trusted provider gets lower risk score
  if (TRUSTED_PROVIDERS.includes(domain)) {
    return { isValid: true, riskScore: 10 };
  }

  // Corporate/educational domains get lower risk
  if (domain.endsWith('.edu') || domain.endsWith('.gov')) {
    return { isValid: true, riskScore: 5 };
  }

  // Default: allow but with moderate risk score
  return { isValid: true, riskScore: 30 };
}

/**
 * Additional validation using Google's account info
 */
export function validateGoogleAccount(profile: any): EmailValidationResult {
  // Check if email is verified by Google
  if (!profile.email_verified) {
    return { 
      isValid: false, 
      reason: 'Email is not verified by Google', 
      riskScore: 100 
    };
  }

  // Perform standard email validation
  const emailValidation = validateEmail(profile.email);
  
  // Additional checks for Google accounts
  // Check account age if available (requires additional API calls)
  // This would need backend implementation
  
  return emailValidation;
}

/**
 * Rate limiting check (to be used with backend)
 */
export function generateRateLimitKey(email: string, ip?: string): string {
  const emailDomain = email.split('@')[1];
  const baseKey = `auth_attempt_${emailDomain}`;
  return ip ? `${baseKey}_${ip}` : baseKey;
}