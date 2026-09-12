import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: getSystemTheme(),
      primaryColor: '234 179 8', // Yellow default
      glassOpacity: 0.85,
      compactMode: false,

      setTheme: (theme) => {
        set({ theme })
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
      
      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark'
        get().setTheme(newTheme)
      },

      setPrimaryColor: (color) => {
        set({ primaryColor: color })
        document.documentElement.style.setProperty('--primary', color)
      },

      setCompactMode: (compact) => set({ compactMode: compact }),
      
      initTheme: () => {
        const { theme, primaryColor } = get()
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        document.documentElement.style.setProperty('--primary', primaryColor)
      }
    }),
    {
      name: 'aeriseg-theme-storage',
    }
  )
)
