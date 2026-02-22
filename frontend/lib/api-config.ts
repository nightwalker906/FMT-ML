/**
 * Centralised API configuration.
 *
 * Every frontend file that talks to the Django backend should import
 * API_BASE from here instead of hard-coding `http://localhost:8000/api`.
 *
 * Set the env var NEXT_PUBLIC_API_URL in .env.local to override:
 *   NEXT_PUBLIC_API_URL=https://api.findmytutor.co.za/api
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
