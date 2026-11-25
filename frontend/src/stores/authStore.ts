import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://rttvhqhjzmxixnccipuf.supabase.co'
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: any | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setSession: (session: any | null) => void
  setLoading: (loading: boolean) => void
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  initializeAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),

      signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error && data.session) {
          set({ user: data.user, session: data.session, isAuthenticated: true })
        }
        return { error }
      },

      signUp: async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (!error && data.session) {
          set({ user: data.user, session: data.session, isAuthenticated: true })
        }
        return { error }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null, isAuthenticated: false })
      },

      initializeAuth: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          set({ user: session.user, session, isAuthenticated: true, isLoading: false })
        } else {
          set({ isLoading: false })
        }

        supabase.auth.onAuthStateChange((_e, session) => {
          if (session) {
            set({ user: session.user, session, isAuthenticated: true })
          } else {
            set({ user: null, session: null, isAuthenticated: false })
          }
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)