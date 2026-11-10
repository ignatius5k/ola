import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children, client = supabase, focusTarget = window }) {
  const [session, setSession] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [authInitialised, setAuthInitialised] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [verifiedMembershipUserId, setVerifiedMembershipUserId] = useState(null);
  const [authError, setAuthError] = useState('');

  const authEventSeen = useRef(false);
  const sessionUserIdRef = useRef(null);
  const requestIdRef = useRef(0);

  const userId = session?.user?.id ?? null;

  const refreshMembership = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!userId) {
      setMemberships([]);
      setSelectedWorkspaceId(null);
      setMembershipLoading(false);
      setVerifiedMembershipUserId(null);
      return;
    }

    setMembershipLoading(true);
    setAuthError('');

    try {
      const { data, error } = await client
        .from('workspace_members')
        .select(`
          workspace_id,
          user_id,
          role,
          active,
          workspaces!workspace_members_workspace_id_fkey (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .eq('active', true);

      if (error) throw error;

      if (requestId !== requestIdRef.current) return;

      const activeMemberships = data ?? [];

      setMemberships(activeMemberships);
      setVerifiedMembershipUserId(userId);
      setSelectedWorkspaceId(current =>
        activeMemberships.some(item => item.workspace_id === current)
          ? current
          : activeMemberships.length === 1
            ? activeMemberships[0].workspace_id
            : null
      );
    } catch {
      if (requestId === requestIdRef.current) {
        setVerifiedMembershipUserId(userId);
        setAuthError(
          'Unable to verify workspace access. Check your connection and try again.'
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setMembershipLoading(false);
      }
    }
  }, [client, userId]);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      authEventSeen.current = true;

      if (!mounted) return;

      const nextUserId = nextSession?.user?.id ?? null;
      const previousUserId = sessionUserIdRef.current;

      sessionUserIdRef.current = nextUserId;

      if (nextUserId !== previousUserId) {
        requestIdRef.current += 1;
        setMemberships([]);
        setSelectedWorkspaceId(null);
        setMembershipLoading(false);
        setVerifiedMembershipUserId(null);
        setAuthError('');
      }

      setSession(nextSession);
      setAuthInitialised(true);
    });

    async function initialise() {
      try {
        const { data, error } = await client.auth.getSession();

        if (error) throw error;

        if (mounted && !authEventSeen.current) {
          const initialSession = data.session;

          sessionUserIdRef.current =
            initialSession?.user?.id ?? null;

          setSession(initialSession);
        }
      } catch {
        if (mounted && !authEventSeen.current) {
          setSession(null);
          setAuthError('Unable to initialise authentication. Try again.');
        }
      } finally {
        if (mounted) {
          setAuthInitialised(true);
        }
      }
    }

    initialise();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (authInitialised) {
      refreshMembership();
    }
  }, [authInitialised, refreshMembership]);

  useEffect(() => {
    function handleFocus() {
      if (userId) refreshMembership();
    }

    focusTarget.addEventListener('focus', handleFocus);

    return () => {
      focusTarget.removeEventListener('focus', handleFocus);
    };
  }, [focusTarget, userId, refreshMembership]);

  async function signIn(email, password) {
    setAuthError('');

    try {
      const { error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setAuthError('Invalid email or password.');
        return false;
      }

      return true;
    } catch {
      setAuthError('Unable to sign in. Check your connection and try again.');
      return false;
    }
  }

async function signOut() {
  setAuthError('');

  try {
    const { error } = await client.auth.signOut();

    if (error) {
      setAuthError('Unable to sign out. Please try again.');
      return false;
    }

    return true;
  } catch {
    setAuthError('Unable to sign out. Please try again.');
    return false;
  }
}

  function selectWorkspace(workspaceId) {
    if (membershipLoading) {
      return;
    }

    if (!memberships.some(item => item.workspace_id === workspaceId)) {
      return;
    }

    setSelectedWorkspaceId(workspaceId);
  }

  const membership =
    memberships.find(item => item.workspace_id === selectedWorkspaceId) ??
    (memberships.length === 1 ? memberships[0] : null);

  const status = !authInitialised ||
      (userId && (
        verifiedMembershipUserId !== userId ||
        (membershipLoading && memberships.length === 0)
      ))
    ? 'loading'
    : !session
      ? 'signed_out'
      : authError
        ? 'error'
        : memberships.length === 0
          ? 'forbidden'
          : 'ready';
  const actionsAllowed = status === 'ready' && !membershipLoading;
  const membershipRole = membership?.active ? membership.role : null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        memberships,
        membership,
        workspace: membership?.workspaces ?? null,
        role: actionsAllowed ? membershipRole : null,
        displayRole: membershipRole,
        workspaceId: membership?.workspace_id ?? null,
        loading: status === 'loading',
        accessChecking: Boolean(userId && membershipLoading),
        actionsAllowed,
        status,
        authError,
        signIn,
        signOut,
        selectWorkspace,
        refreshMembership
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
