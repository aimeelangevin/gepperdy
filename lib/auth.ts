/**
 * Client-side authentication utilities
 * Handles storing and retrieving user ID from browser storage
 */

const USER_ID_KEY = "gepperdy_userId";

/**
 * Save user ID to localStorage
 */
export function saveUserId(userId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_ID_KEY, userId);
  }
}

/**
 * Get user ID from localStorage
 */
export function getUserId(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(USER_ID_KEY);
  }
  return null;
}

/**
 * Remove user ID from localStorage (logout)
 */
export function clearUserId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_ID_KEY);
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getUserId() !== null;
}

