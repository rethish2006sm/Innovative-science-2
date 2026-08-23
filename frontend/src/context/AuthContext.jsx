import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { firebaseAuth, googleProvider } from '../firebase'
import { apiRequest } from '../api'
import { clearAuth, getStoredAuth, saveAuth } from '../authStorage'

const AuthContext = createContext(null)

const firebaseErrorMessage = (error) => {
  const messages = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account was found with this email address.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase Console.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/popup-blocked': 'Please allow popups to sign in with Google.',
    'auth/network-request-failed': 'Network error. Please try again.',
  }
  return messages[error?.code] || error?.message || 'Authentication failed. Please try again.'
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState('')

  const syncBackendSession = useCallback(async (firebaseUser, profile = {}) => {
    if (!firebaseUser) {
      if (getStoredAuth()?.provider !== 'legacy') clearAuth()
      return null
    }
    const idToken = await firebaseUser.getIdToken()
    const data = await apiRequest('/api/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({
        idToken,
        name: profile.name || firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        phoneNumber: profile.phoneNumber || firebaseUser.phoneNumber || '',
      }),
    })
    saveAuth({ token: data.token, user: { ...data.user, firebaseUid: firebaseUser.uid } })
    return data.user
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setUser(firebaseUser)
      setError('')
      try {
        await syncBackendSession(firebaseUser)
      } catch (authError) {
        clearAuth()
        setError(firebaseErrorMessage(authError))
      } finally {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [syncBackendSession])

  const runAuthAction = async (action) => {
    setError('')
    setAuthLoading(true)
    try {
      const result = await action()
      if (result?.legacySession) {
        saveAuth({
          token: result.legacySession.token,
          user: result.legacySession.user,
          provider: 'legacy',
        })
        return null
      }
      await syncBackendSession(result.user, result.profile)
      return result.user
    } catch (authError) {
      setError(firebaseErrorMessage(authError))
      throw authError
    } finally {
      setAuthLoading(false)
    }
  }

  const signUp = (email, password, profile = {}) => runAuthAction(async () => {
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    if (profile.name) await updateProfile(result.user, { displayName: profile.name })
    return { user: result.user, profile }
  })

  const signIn = (email, password) => runAuthAction(async () => {
    try {
      return await signInWithEmailAndPassword(firebaseAuth, email, password)
    } catch (authError) {
      if (authError?.code !== 'auth/invalid-credential') throw authError

      try {
        const migration = await apiRequest('/api/auth/firebase/migrate-legacy', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        return await signInWithCustomToken(firebaseAuth, migration.customToken)
      } catch {
        try {
          const legacySession = await apiRequest('/api/auth/signin', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          })
          return { legacySession }
        } catch {
          throw authError
        }
      }
    }
  })
  const signInWithGoogle = () => runAuthAction(() => signInWithPopup(firebaseAuth, googleProvider))
  const completeProfile = (profile) => syncBackendSession(firebaseAuth.currentUser, profile)
  const logout = async () => {
    await signOut(firebaseAuth)
    clearAuth()
  }

  const value = useMemo(() => ({ user, loading, authLoading, error, signUp, signIn, signInWithGoogle, completeProfile, logout }), [user, loading, authLoading, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
