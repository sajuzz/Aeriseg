import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: async (username, password) => {
        const formData = new FormData()
        formData.append('username', username)
        formData.append('password', password)
        
        try {
          const res = await axios.post('/api/auth/login', formData)
          const { access_token, user } = res.data
          set({ token: access_token, user })
          axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          return { success: true }
        } catch (err) {
          return { success: false, error: err.response?.data?.detail || 'Login failed' }
        }
      },
      logout: () => {
        set({ user: null, token: null })
        delete axios.defaults.headers.common['Authorization']
      },
      checkAuth: async () => {
        const { token } = get()
        if (!token) return
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        try {
          const res = await axios.get('/api/auth/me')
          set({ user: res.data })
        } catch (err) {
          get().logout()
        }
      }
    }),
    { name: 'medishield-auth' }
  )
)
