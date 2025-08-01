import { apiClient } from './api-client'

interface LoginResponse {
  jwt: string
  user: {
    id: number
    username: string
    email: string
    provider: string
    confirmed: boolean
    blocked: boolean
    createdAt: string
    updatedAt: string
    role: {
      id: number
      name: string
      type: string
    }
  }
}

interface RegisterResponse extends LoginResponse {}

interface RegisterData {
  username: string
  email: string
  password: string
}

interface LoginData {
  identifier: string
  password: string
}

/**
 * Authentication client for user management
 */
export class AuthClient {
  /**
   * Fetch and save the fully populated user (with role)
   */
  private async fetchAndSaveFullUser() {
    try {
      const fullUser = await apiClient.get<any>('/api/users/me', { populate: '*' })
      if (fullUser) {
        this.saveUser(fullUser)
        return fullUser
      }
    }
    catch (error) {
      console.error('Failed to fetch full user:', error)
    }
    return null
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<RegisterResponse> {
    try {
      const response = await apiClient.post<RegisterResponse>('/api/auth/local/register', data)

      // Store auth data
      if (response.jwt) {
        this.saveToken(response.jwt)
        this.saveUser(response.user)
        apiClient.setToken(response.jwt)
        // Fetch and save the full user with role
        await this.fetchAndSaveFullUser()
      }

      return response
    }
    catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  /**
   * Login a user
   */
  async login(data: LoginData): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/auth/local', data)

      // Set the token for future API calls
      if (response.jwt) {
        this.saveToken(response.jwt)
        this.saveUser(response.user)
        apiClient.setToken(response.jwt)
        // Fetch and save the full user with role
        await this.fetchAndSaveFullUser()
      }

      return response
    }
    catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  /**
   * Logout the current user
   */
  logout(): void {
    this.clearStorage()
    apiClient.clearToken()
  }

  /**
   * Check if a user is logged in
   */
  isAuthenticated(): boolean {
    if (!import.meta.client) {
      return false
    }
    const token = this.getToken()
    const user = this.getCurrentUser()
    return !!(token && user)
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    if (!import.meta.client) {
      return null
    }

    try {
      const userJson = localStorage.getItem('user')
      if (!userJson) {
        return null
      }

      return JSON.parse(userJson)
    }
    catch (error) {
      console.error('Error parsing user from localStorage:', error)
      return null
    }
  }

  /**
   * Get the stored authentication token
   */
  getToken(): string | null {
    if (!import.meta.client) {
      return null
    }
    return localStorage.getItem('token')
  }

  /**
   * Save token to localStorage
   */
  private saveToken(token: string): void {
    if (import.meta.client) {
      localStorage.setItem('token', token)
    }
  }

  /**
   * Save user to localStorage
   */
  private saveUser(user: any): void {
    if (import.meta.client) {
      localStorage.setItem('user', JSON.stringify(user))
    }
  }

  /**
   * Clear storage (token and user)
   */
  private clearStorage(): void {
    if (import.meta.client) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
}

// Export a singleton instance
export const authClient = new AuthClient()

export default authClient
