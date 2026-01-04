import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      try {
        // Add timeout to prevent hanging when localStorage has corrupted session data
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session initialization timeout')), 5000)
        )
        const sessionPromise = supabase.auth.getSession()

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise])

        if (error) {
          console.error('Error getting session:', error)
        }
        setUser(session?.user || null)
        if (session?.user) {
          await getProfile(session.user.id)
        }
      } catch (error) {
        // If timeout or other error, clear potentially corrupted session data and proceed
        console.error('Session initialization failed:', error.message)

        // Clear all Supabase auth related localStorage keys
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-'))
          .forEach(k => localStorage.removeItem(k))

        // Force sign out to reset Supabase client internal state
        try {
          await supabase.auth.signOut({ scope: 'local' })
        } catch {
          // Ignore signOut errors during recovery
        }

        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null)
        if (session?.user) {
          await getProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const getProfile = async (userId) => {
    try {
      const { data, error, status } = await supabase
        .from('aa_profiles')
        .select('id, email, role, display_name, avatar_url')
        .eq('id', userId)
        .single()

      if (error && status !== 406) {
        throw error
      }

      setProfile(data || null)
    } catch (error) {
      console.error('Error fetching profile:', error.message)
      setProfile(null)
    }
  }

  const signUp = async (email, password, displayName = '') => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })
      if (error) throw error

      // Update profile with display_name if provided
      if (data.user && displayName) {
        await supabase
          .from('aa_profiles')
          .update({ display_name: displayName })
          .eq('id', data.user.id)
      }

      setUser(data.user)
      if (data.user) {
        await getProfile(data.user.id)
      }
      return data
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // Check if user is active
      const { data: profileData } = await supabase
        .from('aa_profiles')
        .select('is_active')
        .eq('id', data.user.id)
        .single()

      if (profileData && profileData.is_active === false) {
        await supabase.auth.signOut()
        throw new Error('您的账户已被禁用，请联系管理员')
      }

      // Update last login time
      await supabase
        .from('aa_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)

      setUser(data.user)
      await getProfile(data.user.id)
      return data
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setLoading(false)
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error) throw error
  }

  const updateProfile = async (updates) => {
    if (!user) throw new Error('用户未登录')
    const { error } = await supabase
      .from('aa_profiles')
      .update(updates)
      .eq('id', user.id)
    if (error) throw error
    await getProfile(user.id)
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    isAdmin: profile?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
