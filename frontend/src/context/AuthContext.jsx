import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo
} from "react";
import { supabase, getProfile, getSession } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const isMountedRef = useRef(true);
  const profileFetchPromiseRef = useRef(null);

  // ✅ Profile fetch with promise queue and timeout (fixes race condition + hanging)
  const fetchProfile = async (userId) => {
    // If a fetch is already in-flight for this user, wait for it to complete
    if (profileFetchPromiseRef.current) {
      return profileFetchPromiseRef.current;
    }

    // Create the fetch promise with retry logic and timeout
    const fetchPromise = Promise.race([
      (async () => {
        try {
          let result = await getProfile(userId);
          let attempts = 0;
          const maxRetries = 5;

          // Retry if profile is null (trigger might not have fired yet)
          while ((result.data === null || result.data === undefined) && attempts < maxRetries) {
            attempts++;
            console.log(`[AuthContext] Profile not found, retrying... (attempt ${attempts}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            result = await getProfile(userId);
          }

          if (result.error) throw result.error;

          // Still no profile after retries - this is concerning but not fatal
          if (!result.data) {
            console.warn('[AuthContext] Profile still not found after retries, but user is authenticated');
            return null;
          }

          return result.data;
        } catch (err) {
          console.error('Profile fetch failed:', err);
          // Return error object instead of null for better error tracking
          return {
            _fetchError: true,
            message: err?.message || 'Failed to load profile',
            error: err
          };
        }
      })(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Profile fetch timeout (5m)')),
          50000
        )
      )
    ]);

    // Store the promise so concurrent calls wait for it
    profileFetchPromiseRef.current = fetchPromise;

    try {
      const result = await fetchPromise;
      return result;
    } catch (timeoutErr) {
      // Timeout occurred
      console.error('Profile fetch timeout:', timeoutErr);
      return {
        _fetchError: true,
        message: 'Profile load took too long. Please refresh the page.',
        error: timeoutErr
      };
    } finally {
      // Clear the promise reference after it completes
      profileFetchPromiseRef.current = null;
    }
  };

  useEffect(() => {
    console.log('[AuthContext] Initializing...');
    isMountedRef.current = true;
    let authStateChangeTimeout;
    let authStateChangeFired = false;

    // ✅ Auth listener (primary source of truth)
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth event:', event);
      try {
        // Mark that listener fired so fallback doesn't run
        authStateChangeFired = true;
        clearTimeout(authStateChangeTimeout);

        if (!isMountedRef.current) {
          console.log('[AuthContext] Component unmounted, skipping auth state update');
          return;
        }

        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          console.log('[AuthContext] Signed in event, fetching profile...');
          if (session?.user) {
            setUser(session.user);

            const profileData = await fetchProfile(session.user.id);

            if (!isMountedRef.current) return;

            // Check if fetchProfile returned an error
            if (profileData?._fetchError) {
              console.error('[AuthContext] Profile fetch error:', profileData.message);
              setProfile(null);
              setAuthError({
                message: profileData.message,
                retryable: true,
                originalError: profileData.error
              });
            } else {
              console.log('[AuthContext] Profile loaded successfully');
              setProfile(profileData);
              setAuthError(null);
            }
          } else {
            console.log('[AuthContext] No user in session');
            setUser(null);
            setProfile(null);
          }
        }

        if (event === "SIGNED_OUT") {
          console.log('[AuthContext] User signed out');
          setUser(null);
          setProfile(null);
          setAuthError(null);
        }
      } catch (err) {
        console.error('[AuthContext] Auth error:', err);
        if (isMountedRef.current) {
          setAuthError({
            message: err?.message || "Auth error",
            retryable: true
          });
        }
      } finally {
        console.log('[AuthContext] Auth event processing complete, setting loading=false');
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    });

    // ✅ Fallback session check only if onAuthStateChange doesn't fire
    authStateChangeTimeout = setTimeout(async () => {
      console.log('[AuthContext] Fallback timeout: authStateChangeFired=', authStateChangeFired);
      // If listener already fired, don't run this fallback
      if (authStateChangeFired || !isMountedRef.current) {
        console.log('[AuthContext] Skipping fallback (listener already fired)');
        return;
      }

      console.log('[AuthContext] Fallback: checking session...');
      try {
        const { session, error } = await getSession();

        if (error) throw error;

        if (session?.user) {
          console.log('[AuthContext] Fallback: session exists, fetching profile...');
          setUser(session.user);

          const profileData = await fetchProfile(session.user.id);

          if (!isMountedRef.current || authStateChangeFired) return;

          if (profileData?._fetchError) {
            console.error('[AuthContext] Fallback: profile fetch error:', profileData.message);
            setProfile(null);
            setAuthError({
              message: profileData.message,
              retryable: true,
              originalError: profileData.error
            });
          } else {
            console.log('[AuthContext] Fallback: profile loaded');
            setProfile(profileData);
            setAuthError(null);
          }
        } else {
          console.log('[AuthContext] Fallback: no session found');
        }
      } catch (err) {
        console.error('[AuthContext] Fallback error:', err);
        if (isMountedRef.current && !authStateChangeFired) {
          setAuthError({
            message: err?.message || "Session check failed",
            retryable: true
          });
        }
      } finally {
        console.log('[AuthContext] Fallback complete, setting loading=false');
        if (isMountedRef.current && !authStateChangeFired) {
          setLoading(false);
        }
      }
    }, 500); // 500ms timeout for listener to fire

    return () => {
      console.log('[AuthContext] Cleanup');
      isMountedRef.current = false;
      clearTimeout(authStateChangeTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // ✅ Login
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw new Error(error.message);

    if (data.user) {
      const profileData = await fetchProfile(data.user.id);

      // Check if profile fetch failed
      if (profileData?._fetchError) {
        throw new Error(profileData.message);
      }

      if (!profileData) {
        throw new Error("Profile not found");
      }

      setUser(data.user);
      setProfile(profileData);
      setAuthError(null);

      return profileData;
    }
  };

  // ✅ Register
  const register = async ({
    email,
    password,
    name,
    role = "customer",
    phone
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, phone },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw new Error(error.message);

    if (data.user) {
      // ✅ DO NOT set user here - wait for email confirmation
      // The auth listener will handle this when email is confirmed
      console.log('[AuthContext] Registration successful - awaiting email confirmation');
      return { id: data.user.id, email, name, role };
    }
  };

  // ✅ Logout
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setUser(null);
    setProfile(null);
    setAuthError(null);
  };

  // ✅ Refresh profile
  const refreshProfile = async () => {
    if (!user) return;

    const profileData = await fetchProfile(user.id);

    if (isMountedRef.current) {
      if (profileData?._fetchError) {
        setProfile(null);
        setAuthError({
          message: profileData.message,
          retryable: true,
          originalError: profileData.error
        });
      } else {
        setProfile(profileData);
        // Clear error if profile refresh succeeds
        if (authError?.message.includes('Profile')) {
          setAuthError(null);
        }
      }
    }
  };

  // ✅ Retry auth (manual trigger, no timeout)
  const retryAuth = async () => {
    setIsRetrying(true);
    setAuthError(null);
    setLoading(true);

    try {
      const { session, error } = await getSession();

      if (error) throw error;

      if (session?.user) {
        setUser(session.user);

        const profileData = await fetchProfile(session.user.id);

        if (isMountedRef.current) {
          if (profileData?._fetchError) {
            setProfile(null);
            setAuthError({
              message: profileData.message,
              retryable: true,
              originalError: profileData.error
            });
          } else {
            setProfile(profileData);
          }
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setAuthError({
          message: err?.message || "Retry failed",
          retryable: true
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsRetrying(false);
      }
    }
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      authError,
      isRetrying,
      retryAuth,
      login,
      register,
      logout,
      refreshProfile,
      isAuthenticated: !!user,
      isAdmin: profile?.role === "admin",
      isDriver: profile?.role === "driver",
      isCustomer:
        profile?.role === "customer" || (!profile?.role && !!user)
    }),
    [user, profile, loading, authError, isRetrying]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}