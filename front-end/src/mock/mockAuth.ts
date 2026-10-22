// ============================================================
//  MOCK DATA MUNA (walang backend pa)
//  Lahat ng screens ng Login/Profile frame dito kumukuha ng data.
//  Nasa memory lang lahat -> nire-reset pag ni-reload yung app.
//
//  Test accounts:
//    user@example.com / SecurePassword123!  -> existing account (2 profiles)
//    any new email -> Sign Up -> code 849201
//
//  Pag ready na si backend, palitan lang yung laman ng mga function dito ng fetch(),
//  hindi na kailangan galawin yung screens.
// ============================================================
import loginResponse from './json/login.response.json';
import signupResponse from './json/signup.response.json';
import verifyRequest from './json/verify-code.request.json';
import verifyResponse from './json/verify-code.response.json';
import fetchProfilesResponse from './json/fetch-profiles.response.json';
import addProfileResponse from './json/add-profile.response.json';

// ---- Shapes (same as the Mockdata JSON) ----
// CHANGE: profile_display_name -> profile_display_name (display name na lagi)
export type Profile = {
  profile_id: number;
  profile_icon: number;
  profile_fullname: string;
  profile_display_name: string;
  profile_birthdate: string; // YYYY-MM-DD
};
export type NewProfile = Omit<Profile, 'profile_id'>;
export type Session = { session_token: string; session_expire_at: string };
export type Result<T = undefined> = { success: boolean; code: number; message: string; data?: T };

// ---- Fake "backend" data ----
type Account = { account_id: number; email: string; password: string; verified: boolean; profiles: Profile[] };

const seed = fetchProfilesResponse.data;
const accounts: Record<string, Account> = {
  [seed.email]: {
    account_id: seed.account_id,
    email: seed.email,
    password: 'SecurePassword123!',
    verified: true,
    profiles: seed.profiles.map((p) => ({ ...p })),
  },
};
const MOCK_CODE = verifyRequest.code; // "849201"
let nextId = addProfileResponse.data.profile_id;

// ---- Current app state (mock) ----
let session: Session | null = null; // valid lang habang bukas ang app
let currentEmail: string | null = null;
let activeProfile: Profile | null = null;
let savedLogin: { email: string; password: string } | null = null; // "Save your login info?" -> Yes

const wait = () => new Promise((r) => setTimeout(r, 500)); // para may loading
const norm = (e: string) => e.trim().toLowerCase();
const fail = (code: number, message: string): Result<any> => ({ success: false, code, message });
const newSession = (): Session => ({
  session_token: 'mock_' + Math.random().toString(36).slice(2),
  session_expire_at: new Date(Date.now() + 3600_000).toISOString(),
});

export const MockAuth = {
  // ---------- Log In ----------
  async login(email: string, password: string): Promise<Result<Session>> {
    await wait();
    const acc = accounts[norm(email)];
    if (!acc || acc.password !== password) return fail(401, 'Incorrect email or password.');
    if (!acc.verified) return fail(403, 'Please verify your email first.');
    session = newSession();
    currentEmail = acc.email;
    activeProfile = null;
    return { ...loginResponse, data: session };
  },

  // ---------- Sign Up ----------
  // Existing account -> code 409 (screen will silently log them in, no verification)
  // New account -> unverified until the code is entered
  async signUp(email: string, password: string): Promise<Result> {
    await wait();
    const e = norm(email);
    if (accounts[e]?.verified) return fail(409, 'Account already exists.');
    accounts[e] = { account_id: Date.now(), email: e, password, verified: false, profiles: [] };
    console.log(`[mock] Verification code for ${e}: ${MOCK_CODE}`);
    return signupResponse;
  },

  async resendCode(email: string): Promise<Result> {
    await wait();
    console.log(`[mock] Verification code for ${norm(email)}: ${MOCK_CODE}`);
    return { success: true, code: 200, message: 'A new code was sent to your email.' };
  },

  // ---------- Verify Code ----------
  async verifyCode(email: string, code: string): Promise<Result<Session>> {
    await wait();
    const acc = accounts[norm(email)];
    if (!acc) return fail(404, 'Account not found. Please sign up again.');
    if (code !== MOCK_CODE) return fail(400, 'Incorrect code. Please try again.');
    acc.verified = true;
    session = newSession();
    currentEmail = acc.email;
    activeProfile = null;
    return { ...verifyResponse, data: session };
  },

  // ---------- Profiles (need a session) ----------
  getProfiles(): Profile[] {
    if (!session || !currentEmail) return [];
    return accounts[currentEmail].profiles;
  },

  async addProfile(p: NewProfile): Promise<Result<Profile>> {
    await wait();
    if (!session || !currentEmail) return fail(401, 'Session expired. Please log in again.');
    const profile: Profile = { ...p, profile_id: ++nextId };
    accounts[currentEmail].profiles.push(profile);
    return { ...addProfileResponse, data: profile };
  },

  selectProfile(p: Profile) {
    activeProfile = p;
  },
  getActiveProfile: () => activeProfile,
  isLoggedIn: () => !!session,

  logout() {
    session = null;
    currentEmail = null;
    activeProfile = null;
  },

  // ---------- Saved login info (auto-fill) ----------
  getSavedLogin: () => savedLogin,
  saveLogin(email: string, password: string) {
    savedLogin = { email: email.trim(), password };
  },
  /** After Verify: saves the email + password the user signed up with. */
  saveCurrentLogin() {
    if (currentEmail) savedLogin = { email: currentEmail, password: accounts[currentEmail].password };
  },
  forgetLogin() {
    savedLogin = null;
  },
};