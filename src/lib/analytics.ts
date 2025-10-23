// Google Analytics 4 integration with consent management

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * Initialize GA4 - only call after consent is granted
 */
export function initGA(measurementId: string): void {
  // Check if already initialized
  if (typeof window.gtag === 'function') {
    return;
  }

  // Create script element
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
): void {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
}

/**
 * Get cookie consent status from localStorage
 */
export function getCookieConsent(): 'accepted' | 'rejected' | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cookieConsent') as 'accepted' | 'rejected' | null;
}

/**
 * Set cookie consent status
 */
export function setCookieConsent(status: 'accepted' | 'rejected'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cookieConsent', status);
}

/**
 * Check if GA should be loaded
 */
export function shouldLoadGA(): boolean {
  return getCookieConsent() === 'accepted';
}
