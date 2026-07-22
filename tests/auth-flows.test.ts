import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The configured (Firebase-on) branches of the auth surface. The unconfigured
 * graceful-degradation paths live in auth.test.ts; here we mock the Firebase
 * gate and the lazily-imported `firebase/auth` SDK so the popup / email /
 * sign-out / verification flows and the onAuthChange binding are exercised and
 * the User → AuthUser mapping is asserted.
 */
const h = vi.hoisted(() => {
  const user = {
    uid: 'u1',
    email: 'cap@example.com',
    displayName: 'Cap',
    emailVerified: true,
    getIdToken: vi.fn(() => Promise.resolve('id-token-123')),
  };
  return {
    user,
    native: false,
    auth: {
      currentUser: null as Record<string, unknown> | null,
      signOut: vi.fn(() => Promise.resolve()),
    },
    authListener: null as null | ((u: unknown) => void),
    unsubbed: false,
    fa: {
      onAuthStateChanged: vi.fn((_auth: unknown, cb: (u: unknown) => void) => {
        h.authListener = cb;
        cb(h.auth.currentUser);
        return () => {
          h.unsubbed = true;
        };
      }),
      signInWithPopup: vi.fn(() => Promise.resolve({ user: h.user })),
      signInWithRedirect: vi.fn(() => Promise.resolve()),
      getRedirectResult: vi.fn(() => Promise.resolve(null as { user: unknown } | null)),
      signInWithEmailAndPassword: vi.fn(() => Promise.resolve({ user: h.user })),
      createUserWithEmailAndPassword: vi.fn(() => Promise.resolve({ user: h.user })),
      updateProfile: vi.fn(() => Promise.resolve()),
      sendPasswordResetEmail: vi.fn(() => Promise.resolve()),
      sendEmailVerification: vi.fn(() => Promise.resolve()),
      GoogleAuthProvider: class {},
    },
  };
});

vi.mock('../src/lib/native-bridge', () => ({ isNative: () => h.native }));

vi.mock('../src/lib/firebase', () => ({
  isFirebaseConfigured: () => true,
  getFirebaseAuth: () => Promise.resolve(h.auth),
}));

vi.mock('firebase/auth', () => h.fa);

type AuthModule = typeof import('../src/lib/auth');
async function load(): Promise<AuthModule> {
  vi.resetModules();
  return import('../src/lib/auth');
}

beforeEach(() => {
  h.native = false;
  h.auth.currentUser = null;
  h.authListener = null;
  h.unsubbed = false;
  vi.clearAllMocks();
});

describe('channel + availability', () => {
  it('reports the native channel inside the shell, web otherwise', async () => {
    h.native = true;
    expect((await load()).authChannel()).toBe('native');
    h.native = false;
    expect((await load()).authChannel()).toBe('web');
  });

  it('isAuthAvailable mirrors the Firebase config gate', async () => {
    expect((await load()).isAuthAvailable()).toBe(true);
  });
});

describe('getIdToken', () => {
  it('returns the current user token when signed in', async () => {
    h.auth.currentUser = h.user;
    expect(await (await load()).getIdToken()).toBe('id-token-123');
  });

  it('is null when no user is signed in', async () => {
    h.auth.currentUser = null;
    expect(await (await load()).getIdToken()).toBeNull();
  });
});

describe('onAuthChange (configured)', () => {
  it('maps the Firebase user and forwards an unsubscribe', async () => {
    h.auth.currentUser = h.user;
    const cb = vi.fn();
    const unsub = await (await load()).onAuthChange(cb);
    expect(cb).toHaveBeenCalledWith({
      uid: 'u1',
      email: 'cap@example.com',
      displayName: 'Cap',
      emailVerified: true,
    });
    unsub();
    expect(h.unsubbed).toBe(true);
  });

  it('forwards null when the user signs out', async () => {
    const cb = vi.fn();
    await (await load()).onAuthChange(cb);
    h.authListener!(null);
    expect(cb).toHaveBeenLastCalledWith(null);
  });
});

describe('sign-in flows', () => {
  it('signInWithGoogle returns the mapped user via popup', async () => {
    const out = await (await load()).signInWithGoogle();
    expect(h.fa.signInWithPopup).toHaveBeenCalled();
    expect(h.fa.signInWithRedirect).not.toHaveBeenCalled();
    expect(out?.uid).toBe('u1');
    expect(out?.email).toBe('cap@example.com');
  });

  it('signInWithGoogle goes straight to redirect in the native shell', async () => {
    h.native = true;
    const out = await (await load()).signInWithGoogle();
    expect(h.fa.signInWithRedirect).toHaveBeenCalled();
    expect(h.fa.signInWithPopup).not.toHaveBeenCalled();
    // The page navigates away, so no user is mapped synchronously.
    expect(out).toBeNull();
  });

  it('signInWithGoogle falls back to redirect when the popup is blocked', async () => {
    h.fa.signInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-blocked' });
    const out = await (await load()).signInWithGoogle();
    expect(h.fa.signInWithPopup).toHaveBeenCalled();
    expect(h.fa.signInWithRedirect).toHaveBeenCalled();
    expect(out).toBeNull();
  });

  it('signInWithGoogle rethrows a non-popup error (e.g. unauthorized domain)', async () => {
    h.fa.signInWithPopup.mockRejectedValueOnce({ code: 'auth/unauthorized-domain' });
    await expect((await load()).signInWithGoogle()).rejects.toMatchObject({
      code: 'auth/unauthorized-domain',
    });
    expect(h.fa.signInWithRedirect).not.toHaveBeenCalled();
  });

  it('onAuthChange completes a pending Google redirect on bootstrap', async () => {
    h.fa.getRedirectResult.mockResolvedValueOnce({ user: h.user });
    await (await load()).onAuthChange(vi.fn());
    // getRedirectResult is polled once when the listener is attached (fire-and-forget,
    // so wait for the dynamic import + microtasks to settle).
    await vi.waitFor(() => expect(h.fa.getRedirectResult).toHaveBeenCalledWith(h.auth));
  });

  it('signInWithEmail passes credentials through', async () => {
    const a = await load();
    await a.signInWithEmail('cap@example.com', 'pw');
    expect(h.fa.signInWithEmailAndPassword).toHaveBeenCalledWith(h.auth, 'cap@example.com', 'pw');
  });

  it('registerWithEmail sets the display name when provided', async () => {
    const a = await load();
    await a.registerWithEmail('cap@example.com', 'pw', 'Captain Adel');
    expect(h.fa.createUserWithEmailAndPassword).toHaveBeenCalled();
    expect(h.fa.updateProfile).toHaveBeenCalledWith(h.user, { displayName: 'Captain Adel' });
  });

  it('registerWithEmail skips updateProfile when no display name is given', async () => {
    const a = await load();
    await a.registerWithEmail('cap@example.com', 'pw');
    expect(h.fa.updateProfile).not.toHaveBeenCalled();
  });
});

describe('sign-out + verification', () => {
  it('signOutUser delegates to Firebase signOut', async () => {
    await (await load()).signOutUser();
    expect(h.auth.signOut).toHaveBeenCalled();
  });

  it('sendPasswordReset emails the reset link', async () => {
    await (await load()).sendPasswordReset('cap@example.com');
    expect(h.fa.sendPasswordResetEmail).toHaveBeenCalledWith(h.auth, 'cap@example.com');
  });

  it('resendEmailVerification is a no-op without a current user', async () => {
    h.auth.currentUser = null;
    await (await load()).resendEmailVerification();
    expect(h.fa.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('resendEmailVerification emails the current user when present', async () => {
    h.auth.currentUser = h.user;
    await (await load()).resendEmailVerification();
    expect(h.fa.sendEmailVerification).toHaveBeenCalledWith(h.user);
  });
});
