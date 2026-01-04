import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initTimeoutRef = useRef(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Safety timeout: if initialization takes too long, proceed without auth
    // With expired session pre-clearing, this should rarely trigger
    initTimeoutRef.current = setTimeout(() => {
      if (!initializedRef.current) {
        console.warn('Auth initialization timeout - proceeding without session')
        initializedRef.current = true
        setLoading(false)
      }
    }, 5000) // 5 second safety net (reduced from 10s due to pre-clearing)

    // Use onAuthStateChange as the single source of truth for auth state
    // INITIAL_SESSION event fires on mount with current session (or null)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Clear the safety timeout on first auth event
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current)
          initTimeoutRef.current = null
        }

        // Handle different auth events
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null)
          if (session?.user) {
            // Defer profile fetch to avoid blocking
            getProfile(session.user.id).catch(console.error)
          } else {
            setProfile(null)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
        }

        // Mark as initialized after first event
        if (!initializedRef.current) {
          initializedRef.current = true
          setLoading(false)
        }
      }
    )

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current)
      }
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

  // Don't block rendering - let app load immediately, auth state will update async
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
