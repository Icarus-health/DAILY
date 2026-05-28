import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  deleteDoc,
  getDocFromServer,
  writeBatch
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// ----------------------------------------------------
// Robust Firebase Initialization
// ----------------------------------------------------
const isDevelopmentPlaceholder = firebaseConfig.apiKey.includes("DummyKey");

let firebaseApp;
let firestoreDb: any;
let firebaseAuth: any;
let isRealFirebaseActive = false;

try {
  if (!isDevelopmentPlaceholder) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    // CRITICAL: The app will break without firestoreDatabaseId mapping
    firestoreDb = getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId || "(default)");
    firebaseAuth = getAuth(firebaseApp);
    isRealFirebaseActive = true;
    console.log("✦ Firebase initialized successfully using credentials!");
  } else {
    console.warn("ℹ️ Firebase running in Simulation/Sandbox mode. Run 'set_up_firebase' to connect real cloud database.");
  }
} catch (error) {
  console.warn("⚠️ Firebase credentials invalid or inaccessible. Falling back to client-simulated sandbox mode.", error);
}

export const db = firestoreDb;
export const auth = firebaseAuth;
export const isRealFirebase = () => isRealFirebaseActive;

// ----------------------------------------------------
// Error Handler conformant with Firebase Skill
// ----------------------------------------------------
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || "";

  // Check if it's an offline/network error rather than "permission denied"
  const isOffline = errMsg.toLowerCase().includes("offline") || 
                    errMsg.toLowerCase().includes("unavailable") || 
                    errMsg.toLowerCase().includes("unreachable") || 
                    errMsg.toLowerCase().includes("network") || 
                    errCode === "unavailable";

  if (isOffline) {
    console.warn(`ℹ️ Firebase is offline during ${operationType} on ${path}. Switching to simulated sandbox to guarantee performance.`);
    isRealFirebaseActive = false; // Disable real Firebase globally
    throw new Error(`offline: ${errMsg}`);
  }

  const currentAuth = firebaseAuth ? getAuth() : null;
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: currentAuth?.currentUser?.uid || null,
      email: currentAuth?.currentUser?.email || null,
      emailVerified: currentAuth?.currentUser?.emailVerified || null,
      isAnonymous: currentAuth?.currentUser?.isAnonymous || null,
      tenantId: currentAuth?.currentUser?.tenantId || null,
      providerInfo: currentAuth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Raised: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on initial boot as defined in skill guidelines
export async function testFirestoreConnection() {
  if (!isRealFirebaseActive || !db) return false;
  try {
    // Attempt standard single server fetch
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("✓ Firestore cloud connection handshake successful.");
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("ℹ️ Firebase is offline or configuration is restricted. Switching to simulated sandbox mode to guarantee interactive stability.");
      isRealFirebaseActive = false;
    } else {
      console.warn("ℹ️ Firestore handshake query returned warning:", error.message || error);
    }
    return false;
  }
}

// ----------------------------------------------------
// Google Sign-In / Auth Services
// ----------------------------------------------------
let cachedGoogleAccessToken: string | null = null;

export function getGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}

export function setGoogleAccessToken(token: string | null): void {
  cachedGoogleAccessToken = token;
}

export async function loginWithGoogle(): Promise<FirebaseUser | null> {
  if (!isRealFirebaseActive) {
    // Generate a dummy simulated user for local testing when cloud authentication is offline
    const dummyUser: any = {
      uid: "simulated-user-123456",
      displayName: "John Doe",
      email: "SrKube@gmail.com",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&q=80",
      emailVerified: true
    };
    localStorage.setItem("daily_simulated_user", JSON.stringify(dummyUser));
    setGoogleAccessToken("mock-google-access-token-12345");
    return dummyUser;
  }

  try {
    const provider = new GoogleAuthProvider();
    // Add scopes for Calendar, Gmail and Google Tasks
    provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
    provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
    provider.addScope("https://www.googleapis.com/auth/tasks");
    
    // Also request offline access or select_account if needed
    provider.setCustomParameters({
      prompt: "select_account"
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setGoogleAccessToken(credential.accessToken);
    }
    const user = result.user;
    
    // Save/Ensure user entry in Firestore user collection
    await syncUserProfile(user);
    return user;
  } catch (error) {
    console.error("Google Authentication Popup Error:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  setGoogleAccessToken(null);
  if (!isRealFirebaseActive) {
    localStorage.removeItem("daily_simulated_user");
    return;
  }
  await signOut(auth);
}

// Ensure AuthState handler
export function setupAuthListener(onUserChanged: (user: any | null) => void) {
  if (!isRealFirebaseActive) {
    // Trigger simulated auth listener
    const localUser = localStorage.getItem("daily_simulated_user");
    onUserChanged(localUser ? JSON.parse(localUser) : null);
    return () => {};
  }
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setGoogleAccessToken(null);
    }
    onUserChanged(user);
  });
}

// ----------------------------------------------------
// DB Synchronization Services
// ----------------------------------------------------

// Synchronize User profile
export async function syncUserProfile(user: FirebaseUser) {
  if (!isRealFirebaseActive) return;
  const userPath = `users/${user.uid}`;
  try {
    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      displayName: user.displayName || "Google User",
      email: user.email || "",
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

// ----------------------------------------------------
// Settings Services
// ----------------------------------------------------
export interface UserSettings {
  id: string;
  userId: string;
  topics: string[];
  location: string;
  newsSources: string[];
  emailProvider: string;
  taskSource: string;
  includeCalendar: boolean;
  includeEmail: boolean;
  includeTasks: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  id: "default-id",
  userId: "simulated-user-123456",
  topics: ["Digital Health", "AI & Robotics", "Health Policy"],
  location: "Berlin",
  newsSources: ["TechCrunch", "Spiegel Online"],
  emailProvider: "gmail",
  taskSource: "internal",
  includeCalendar: true,
  includeEmail: true,
  includeTasks: true
};

export async function fetchSettings(userId: string): Promise<UserSettings> {
  const path = `settings/${userId}`;
  
  // Fallback to localStorage if cloud is not active
  if (!isRealFirebaseActive) {
    const stored = localStorage.getItem(`brief_settings_${userId}`);
    if (stored) return JSON.parse(stored);
    const initial = { ...DEFAULT_SETTINGS, userId };
    localStorage.setItem(`brief_settings_${userId}`, JSON.stringify(initial));
    return initial;
  }

  try {
    const docRef = doc(db, "settings", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserSettings;
    } else {
      // Create defaults
      const initial = { ...DEFAULT_SETTINGS, id: userId, userId };
      await setDoc(docRef, initial);
      return initial;
    }
  } catch (error) {
    // If permission or configuration fails, yield robust error payload but log the telemetry
    try {
      handleFirestoreError(error, OperationType.GET, path);
    } catch (formattedError) {
      console.warn("Firestore settings fetching failed, loading from localized cache.", formattedError);
      const stored = localStorage.getItem(`brief_settings_${userId}`);
      return stored ? JSON.parse(stored) : { ...DEFAULT_SETTINGS, userId };
    }
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const path = `settings/${settings.userId}`;
  localStorage.setItem(`brief_settings_${settings.userId}`, JSON.stringify(settings));

  if (!isRealFirebaseActive) return;

  try {
    await setDoc(doc(db, "settings", settings.userId), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// Daily Brief Storage Services
// ----------------------------------------------------
export interface DailyBrief {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  text: string;
  briefingTitle?: string;
  summaryBullets: string[];
  hasAudio: boolean;
  audioUrl?: string; // Base64 PCM or asset URL
  weatherContent?: string;
  newsContent?: string;
  calendarContent?: string;
  emailsContent?: string;
  tasksContent?: string;
  esignContent?: string;
}

export async function fetchDailyBriefs(userId: string): Promise<DailyBrief[]> {
  const path = `dailyBriefs`;

  if (!isRealFirebaseActive) {
    const cached = localStorage.getItem(`brief_history_${userId}`);
    return cached ? JSON.parse(cached) : [];
  }

  try {
    const q = query(
      collection(db, "dailyBriefs"),
      where("userId", "==", userId),
      orderBy("date", "desc"),
      limit(7)
    );
    const querySnapshot = await getDocs(q);
    const briefs: DailyBrief[] = [];
    querySnapshot.forEach((doc) => {
      briefs.push(doc.data() as DailyBrief);
    });
    
    // Maintain secondary backup
    localStorage.setItem(`brief_history_${userId}`, JSON.stringify(briefs));
    return briefs;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (err) {
      console.warn("Firestore history pull blocked. Servicing requests using sandbox cache.", err);
      const cached = localStorage.getItem(`brief_history_${userId}`);
      return cached ? JSON.parse(cached) : [];
    }
  }
}

export async function saveDailyBrief(brief: DailyBrief): Promise<void> {
  const path = `dailyBriefs/${brief.id}`;
  
  // Local storage synchronization
  const cacheKey = `brief_history_${brief.userId}`;
  const cached = localStorage.getItem(cacheKey);
  let historic: DailyBrief[] = cached ? JSON.parse(cached) : [];
  historic = historic.filter(b => b.id !== brief.id);
  historic.unshift(brief);
  localStorage.setItem(cacheKey, JSON.stringify(historic.slice(0, 7)));

  if (!isRealFirebaseActive) return;

  try {
    await setDoc(doc(db, "dailyBriefs", brief.id), brief);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// Tasks Storage Services
// ----------------------------------------------------
export interface DbTask {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  status: "pending" | "completed";
  priority: "high" | "medium" | "low";
}

export async function fetchTasks(userId: string, date: string): Promise<DbTask[]> {
  const path = `tasks`;

  if (!isRealFirebaseActive) {
    const cacheKey = `tasks_${userId}_${date}`;
    const cached = localStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }

  try {
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", userId),
      where("date", "==", date)
    );
    const querySnapshot = await getDocs(q);
    const tasks: DbTask[] = [];
    querySnapshot.forEach((doc) => {
      tasks.push(doc.data() as DbTask);
    });
    return tasks;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (err) {
      console.warn("Tasks pull failed. Loading from local storage fallback.", err);
      const cacheKey = `tasks_${userId}_${date}`;
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
    }
  }
}

export async function saveTask(task: DbTask): Promise<void> {
  const path = `tasks/${task.id}`;
  
  // Local storage caching first
  const cacheKey = `tasks_${task.userId}_${task.date}`;
  const stored = localStorage.getItem(cacheKey);
  let localTasks: DbTask[] = stored ? JSON.parse(stored) : [];
  localTasks = localTasks.filter(t => t.id !== task.id);
  localTasks.push(task);
  localStorage.setItem(cacheKey, JSON.stringify(localTasks));

  if (!isRealFirebaseActive) return;

  try {
    await setDoc(doc(db, "tasks", task.id), task);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTask(taskId: string, userId: string, date: string): Promise<void> {
  const path = `tasks/${taskId}`;
  
  // Local storage sync
  const cacheKey = `tasks_${userId}_${date}`;
  const stored = localStorage.getItem(cacheKey);
  if (stored) {
    const localTasks: DbTask[] = JSON.parse(stored);
    localStorage.setItem(cacheKey, JSON.stringify(localTasks.filter(t => t.id !== taskId)));
  }

  if (!isRealFirebaseActive) return;

  try {
    await deleteDoc(doc(db, "tasks", taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
