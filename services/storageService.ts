
import { WorkshopData, VoteResult, UserProfile, ParticipantData, WorkshopSessionConfig, BoardItem, StepId, AdminUser } from '../types';
import { CORE_VALUE_OPTIONS, FIREBASE_CONFIG, STORAGE_KEY_USER, STORAGE_KEY_DATA, STORAGE_KEY_SESSIONS, STORAGE_KEY_BOARD, STORAGE_KEY_KEYWORD_VOTES } from '../constants';
// Use compat imports to support namespaced v8-style code in Firebase v9+
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const isFirebaseEnabled = !!FIREBASE_CONFIG.apiKey;
let db: firebase.firestore.Firestore;
let storage: firebase.storage.Storage;
let auth: firebase.auth.Auth;
let isDbVerified = false; 

if (isFirebaseEnabled) {
  try {
    // Initialize Firebase using compat layer to fix "Property initializeApp does not exist" and related errors
    const app = firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore(app);
    storage = firebase.storage(app);
    auth = firebase.auth(app);
    console.log("🔥 Firebase initialized. Project:", FIREBASE_CONFIG.projectId);
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
}

// [Helper] Safe LocalStorage Save
const safeLocalStorageSave = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e: any) {
    console.warn(`⚠️ LocalStorage Error for ${key}:`, e);
  }
};

// [Helper] Error Logging
const handleFirebaseError = (context: string, error: any) => {
  const msg = error.message || "";
  if (msg.includes("permission-denied") || msg.includes("Missing or insufficient permissions")) {
    console.warn(`🚨 [${context}] Permission Denied.`);
  } else {
    console.warn(`⚠️ [${context}] Firebase Error:`, error);
  }
};

// [Helper] Base64 Image Upload
const uploadBase64Image = async (base64String: string, path: string): Promise<string | null> => {
  if (!isFirebaseEnabled || !storage || !isDbVerified || !base64String.startsWith('data:')) {
    return null; 
  }
  try {
    const response = await fetch(base64String);
    const blob = await response.blob();
    const storageRef = storage.ref(path);
    await storageRef.put(blob);
    return await storageRef.getDownloadURL();
  } catch (e: any) {
    console.warn("⚠️ Image upload failed.", e.message);
    return null; 
  }
};

// [Mock Generator]
const generateMockParticipants = (): ParticipantData[] => {
  return []; // Placeholder for actual implementation if needed
};

export const StorageService = {
  checkDbConnection: async (): Promise<boolean> => {
    if (!isFirebaseEnabled || !db) return false;

    // Timeout Promise to prevent hanging
    const timeout = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 3000);
    });

    const connectionPromise = new Promise<boolean>(async (resolve) => {
        try {
            if (auth && !auth.currentUser) {
                try {
                  await auth.signInAnonymously();
                } catch(e) {
                  // Suppress warning: Authentication is optional for some public setups
                  console.debug("Info: Anonymous auth not enabled or failed. Attempting public access.");
                }
            }
            const testDocRef = db.doc("diagnostics/connection_check");
            // Just try to read. If it fails (permission denied or network), it throws.
            await testDocRef.get();
            
            isDbVerified = true;
            resolve(true);
        } catch (e: any) {
            console.warn("DB Check Failed (Falling back to Local Mode):", e.message);
            isDbVerified = false;
            resolve(false);
        }
    });

    return Promise.race([connectionPromise, timeout]);
  },
  
  // --- Admin Auth & Management ---
  loginAdminWithGoogle: async (): Promise<boolean> => {
    if (!isFirebaseEnabled || !auth) return false;
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const email = result.user?.email;
        if (!email) return false;
        
        if (db && isDbVerified) {
            const adminRef = db.collection("system_admins").doc(email);
            const adminSnap = await adminRef.get();
            if (adminSnap.exists) return true;
            else {
                // First user becomes admin automatically (Bootstrap)
                const snapshot = await db.collection("system_admins").get();
                if (snapshot.empty) {
                    await adminRef.set({ email, addedAt: Date.now(), addedBy: 'SYSTEM_BOOTSTRAP' });
                    return true;
                }
                alert("접근 권한이 없습니다. 관리자에게 문의하세요.");
                return false;
            }
        }
        return true; // If DB not verified but Auth worked, allow logic flow (though risky)
    } catch (e) { 
        console.error("Google Login Error", e);
        return false; 
    }
  },
  
  getAdmins: async (): Promise<AdminUser[]> => {
      if (isFirebaseEnabled && db && isDbVerified) {
        try {
            const snapshot = await db.collection("system_admins").orderBy("addedAt", "desc").get();
            return snapshot.docs.map(doc => doc.data() as AdminUser);
        } catch(e) { return []; }
      }
      return [];
  },

  addAdmin: async (email: string): Promise<boolean> => {
      if (isFirebaseEnabled && db && isDbVerified) {
          try {
            await db.collection("system_admins").doc(email).set({ 
                email, 
                addedAt: Date.now(), 
                addedBy: auth.currentUser?.email || 'Unknown' 
            });
            return true;
          } catch { return false; }
      }
      return false;
  },

  deleteAdmin: async (email: string): Promise<boolean> => {
      if (isFirebaseEnabled && db && isDbVerified) {
          try {
            await db.collection("system_admins").doc(email).delete();
            return true;
          } catch { return false; }
      }
      return false;
  },

  diagnoseFirebase: async (): Promise<string[]> => {
      const logs: string[] = [];
      logs.push(`API Key Configured: ${!!FIREBASE_CONFIG.apiKey}`);
      logs.push(`Auth Initialized: ${!!auth}`);
      logs.push(`DB Initialized: ${!!db}`);
      if(auth?.currentUser) logs.push(`User: ${auth.currentUser.email || 'Anonymous'}`);
      return logs;
  },

  // --- User Session Management ---
  saveUser: (user: UserProfile) => {
    safeLocalStorageSave(STORAGE_KEY_USER, user);
  },

  getUser: (): UserProfile | null => {
    const data = sessionStorage.getItem(STORAGE_KEY_USER) || localStorage.getItem(STORAGE_KEY_USER);
    return data ? JSON.parse(data) : null;
  },

  logout: () => {
    sessionStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_USER);
    // Note: We don't clear STORAGE_KEY_DATA in local mode to prevent accidental data loss
    // unless explicit reset is called.
  },

  // [New] Find Participant for Read-Only Access
  // 조(Group) 정보를 검색 조건에 추가하여 동명이인이 다른 조에 있을 경우 오동작 방지
  findParticipant: async (company: string, batch: string, name: string, group: string): Promise<ParticipantData | null> => {
      // 1. Firebase Check
      if (isFirebaseEnabled && db && isDbVerified) {
          try {
              const snapshot = await db.collection("participants")
                  .where("company", "==", company)
                  .where("batch", "==", batch)
                  .where("group", "==", group)
                  .where("name", "==", name)
                  .get();
              if (!snapshot.empty) {
                  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ParticipantData;
              }
          } catch (e) {
              console.error("Failed to find participant", e);
          }
      }

      // 2. Local Storage Check
      const localDataStr = localStorage.getItem(STORAGE_KEY_DATA);
      const localUserStr = localStorage.getItem(STORAGE_KEY_USER);
      if (localDataStr && localUserStr) {
          const user = JSON.parse(localUserStr);
          // Check if stored local user matches the search criteria
          if (user.company === company && user.batch === batch && user.group === group && user.name === name) {
              const data = JSON.parse(localDataStr);
              return { ...user, ...data, id: 'local' };
          }
      }
      return null;
  },

  setGroupCaptain: async (company: string, batch: string, group: string, captainName: string): Promise<boolean> => {
      // Local update
      const currentUser = StorageService.getUser();
      if (currentUser && currentUser.company === company && currentUser.batch === batch && currentUser.group === group) {
          const isMe = currentUser.name === captainName;
          currentUser.isCaptain = isMe;
          StorageService.saveUser(currentUser);
      }

      // Remote update
      if (isFirebaseEnabled && db && isDbVerified) {
          try {
            const snapshot = await db.collection("participants")
                .where("company", "==", company)
                .where("batch", "==", batch)
                .where("group", "==", group)
                .get();
            const batchOp = db.batch();
            
            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.name === captainName) {
                    batchOp.update(docSnap.ref, { isCaptain: true });
                } else if (data.isCaptain) {
                    batchOp.update(docSnap.ref, { isCaptain: false });
                }
            });
            await batchOp.commit();
            return true;
          } catch (e) { 
              console.error("Set captain error", e);
              return false; 
          }
      }
      return true;
  },

  // --- Workshop Data (Individual) ---
  saveWorkshopData: async (data: Partial<WorkshopData>) => {
      const user = StorageService.getUser();
      
      // Local Save
      const currentLocal = localStorage.getItem(STORAGE_KEY_DATA);
      const current = currentLocal ? JSON.parse(currentLocal) : {};
      const updatedLocal = { ...current, ...data };
      safeLocalStorageSave(STORAGE_KEY_DATA, updatedLocal);

      // Remote Save
      if (isFirebaseEnabled && isDbVerified && user && !user.isReadOnly) {
          const remoteData = { ...data };
          const timestamp = Date.now();

          // Handle Image Uploads
          const imageFields = [
            { field: 'step0_aiProfileImage', path: 'images/profiles' },
            { field: 'step4_structureImage', path: 'images/structures' },
            { field: 'step5_finalImage', path: 'images/final_posters' }
          ] as const;

          for (const { field, path } of imageFields) {
              const val = (remoteData as any)[field];
              if (val && val.startsWith('data:')) {
                 const filePath = `${path}/${user.name}_${timestamp}.png`;
                 const url = await uploadBase64Image(val, filePath);
                 if (url) {
                    (remoteData as any)[field] = url;
                 } else {
                    delete (remoteData as any)[field];
                 }
              }
          }

          try {
            const querySnapshot = await db.collection("participants")
                .where("name", "==", user.name)
                .where("company", "==", user.company)
                .where("batch", "==", user.batch)
                .where("group", "==", user.group)
                .get();
            if (!querySnapshot.empty) {
                await querySnapshot.docs[0].ref.update(remoteData);
            } else {
                await db.collection("participants").add({ 
                    ...user, 
                    ...updatedLocal, 
                    ...remoteData, 
                    joinedAt: Date.now() 
                });
            }
          } catch(e) { handleFirebaseError("Save Data", e); }
      }
  },

  getWorkshopData: async (): Promise<WorkshopData> => {
      const localData = localStorage.getItem(STORAGE_KEY_DATA);
      let result = localData ? JSON.parse(localData) : {};

      if (isFirebaseEnabled && db && isDbVerified) {
          const user = StorageService.getUser();
          if (user) {
              try {
                  const querySnapshot = await db.collection("participants")
                      .where("name", "==", user.name)
                      .where("company", "==", user.company)
                      .where("batch", "==", user.batch)
                      .where("group", "==", user.group)
                      .get();
                  if (!querySnapshot.empty) {
                      const remoteData = querySnapshot.docs[0].data() as WorkshopData;
                      
                      // Sync Captain Status
                      const fullData = querySnapshot.docs[0].data();
                      if (fullData.isCaptain !== undefined && fullData.isCaptain !== user.isCaptain) {
                          user.isCaptain = fullData.isCaptain;
                          StorageService.saveUser(user);
                      }

                      result = { ...result, ...remoteData };
                      // Do not overwrite local storage if in ReadOnly mode to avoid polluting local session
                      if (!user.isReadOnly) {
                          safeLocalStorageSave(STORAGE_KEY_DATA, result);
                      }
                  }
              } catch (e) { handleFirebaseError("Fetch Data", e); }
          }
      }
      return result;
  },

  // --- Voting & Analysis ---
  submitVotes: async (selectedValues: string[]) => {
      await StorageService.saveWorkshopData({ step3_votes: selectedValues });
  },

  getVoteResults: async (): Promise<VoteResult[]> => {
      const calculateVotes = (docs: any[]) => {
       const counts: Record<string, number> = {};
       docs.forEach(data => {
         if (data.step3_votes && Array.isArray(data.step3_votes)) {
           data.step3_votes.forEach((v: string) => {
             counts[v] = (counts[v] || 0) + 1;
           });
         }
       });
       return Object.entries(counts).map(([keyword, count]) => ({ keyword, count })).sort((a, b) => b.count - a.count);
    };

    if (isFirebaseEnabled && db && isDbVerified) {
        try {
            const user = StorageService.getUser();
            let query: firebase.firestore.Query = db.collection("participants");
            if (user) {
                 query = query.where("company", "==", user.company).where("batch", "==", user.batch);
            }
            const querySnapshot = await query.get();
            return calculateVotes(querySnapshot.docs.map(d => d.data()));
        } catch(e) { 
            return calculateVotes([]); 
        }
    }
    // Local fallback (Demo)
    return [];
  },

  toggleKeywordVote: async (keyword: string) => {
      const user = StorageService.getUser();
      if (!user || user.isReadOnly) return;
      
      const sessionKey = `${user.company}_${user.batch}`;
      const docId = `${sessionKey}_${keyword}`; 

      if (isFirebaseEnabled && db && isDbVerified) {
          try {
              const voteRef = db.collection("keyword_votes").doc(docId);
              const snap = await voteRef.get();
              
              if (snap.exists) {
                  let remoteData = snap.data() || {};
                  let userIds = remoteData.userIds || [];
                  let count = remoteData.count || 0;
                  
                  if (userIds.includes(user.name)) {
                      userIds = userIds.filter((id: string) => id !== user.name);
                      count = Math.max(0, count - 1);
                  } else {
                      userIds.push(user.name);
                      count += 1;
                  }
                  await voteRef.update({ count, userIds });
              } else {
                  await voteRef.set({ 
                      count: 1, 
                      userIds: [user.name],
                      company: user.company,
                      batch: user.batch,
                      keyword: keyword
                  });
              }
          } catch (e) {
              handleFirebaseError("Toggle Keyword Vote", e);
          }
      }
  },

  getKeywordVotes: async (): Promise<Record<string, number>> => {
      const user = StorageService.getUser();
      const results: Record<string, number> = {};
      if (!user) return results;

      if (isFirebaseEnabled && db && isDbVerified) {
          try {
              const snapshot = await db.collection("keyword_votes")
                  .where("company", "==", user.company)
                  .where("batch", "==", user.batch)
                  .get();
              snapshot.docs.forEach(doc => {
                  const data = doc.data();
                  results[data.keyword] = data.count || 0;
              });
          } catch (e) {
              handleFirebaseError("Get Keyword Votes", e);
          }
      }
      return results;
  },

  getAllParticipants: async (): Promise<ParticipantData[]> => {
      if (isFirebaseEnabled && db && isDbVerified) {
          try {
              const querySnapshot = await db.collection("participants").get();
              return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ParticipantData));
          } catch (e) { return []; }
      }
      return [];
  },

  // --- Session Management ---
  getSessions: async (): Promise<WorkshopSessionConfig[]> => {
    const defaultSession = [
      { id: 'session_1', company: '삼성전자', batch: '2025 상반기', totalGroups: 6, createdAt: Date.now() }
    ];

    if (isFirebaseEnabled && db && isDbVerified) {
      try {
        const querySnapshot = await db.collection("sessions").orderBy("createdAt", "desc").get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkshopSessionConfig));
      } catch (e) {
        handleFirebaseError("Get Sessions", e);
        return defaultSession;
      }
    }

    const data = localStorage.getItem(STORAGE_KEY_SESSIONS);
    return data ? JSON.parse(data) : defaultSession;
  },

  saveSession: async (session: WorkshopSessionConfig) => {
    if (isFirebaseEnabled && db && isDbVerified) {
      try {
        await db.collection("sessions").doc(session.id).set(session);
        return;
      } catch (e) {
        handleFirebaseError("Save Session", e);
      }
    }
    const sess = await StorageService.getSessions();
    sess.push(session);
    safeLocalStorageSave(STORAGE_KEY_SESSIONS, sess);
  },

  updateSessionCoreValues: async (company: string, batch: string, newValues: string[]) => {
      if (isFirebaseEnabled && db && isDbVerified) {
          const snapshot = await db.collection("sessions").where("company", "==", company).where("batch", "==", batch).get();
          if (!snapshot.empty) {
              await snapshot.docs[0].ref.update({ coreValues: newValues });
          }
      }
  },

  deleteSession: async (id: string, company?: string, batch?: string) => {
      if (isFirebaseEnabled && db && isDbVerified) {
          try {
            // 1. Delete Session Doc
            await db.collection("sessions").doc(id).delete();
            
            if (company && batch) {
                // Collections to cleanup: participants, board_items, keyword_votes
                const collectionsToCheck = ["participants", "board_items", "keyword_votes"];
                let allRefsToDelete: firebase.firestore.DocumentReference[] = [];

                for (const colName of collectionsToCheck) {
                    const snapshot = await db.collection(colName)
                        .where("company", "==", company)
                        .where("batch", "==", batch)
                        .get();
                    snapshot.docs.forEach(doc => allRefsToDelete.push(doc.ref));
                }

                // Batch Delete Execution (Chunk size 500)
                const chunkSize = 500;
                for (let i = 0; i < allRefsToDelete.length; i += chunkSize) {
                    const batchOp = db.batch();
                    const chunk = allRefsToDelete.slice(i, i + chunkSize);
                    chunk.forEach(ref => batchOp.delete(ref));
                    await batchOp.commit();
                }
            }
          } catch (e) {
              console.error("Cascading delete failed", e);
              throw e; 
          }
      }
      
      // Local Storage Cleanup
      let localSessions = JSON.parse(localStorage.getItem(STORAGE_KEY_SESSIONS) || '[]');
      localSessions = localSessions.filter((s: WorkshopSessionConfig) => s.id !== id);
      safeLocalStorageSave(STORAGE_KEY_SESSIONS, localSessions);

      if (company && batch) {
          const cleanLocal = (key: string) => {
               const raw = localStorage.getItem(key);
               if(!raw) return;
               try {
                   const parsed = JSON.parse(raw);
                   if(Array.isArray(parsed)) {
                       const filtered = parsed.filter((item: any) => 
                           !(item.company === company && item.batch === batch) && item.id !== id
                       );
                       safeLocalStorageSave(key, filtered);
                   }
               } catch(e) {}
           };
           // Note: STORAGE_KEY_DATA is typically one user profile + workshop data.
           // Admin usually clears specific bulk data in DB. 
           // For local dev simulation, we clean board items.
           cleanLocal(STORAGE_KEY_BOARD);
      }
  },

  resetAllData: async () => {
    if (isFirebaseEnabled && db && isDbVerified) {
       try {
         const collections = ["participants", "sessions", "board_items", "diagnostics", "system_admins", "keyword_votes"];
         for (const colName of collections) {
            const snapshot = await db.collection(colName).get();
            const deletePromises = snapshot.docs.map(d => d.ref.delete());
            await Promise.all(deletePromises);
         }
       } catch (e) {
         handleFirebaseError("Reset All Data", e);
       }
    }
    localStorage.clear();
  },

  // --- Board (Shared Items) ---
  getBoardItems: async (stepId: StepId): Promise<BoardItem[]> => {
      const user = StorageService.getUser();
      const getLocalItems = () => {
        const data = localStorage.getItem(STORAGE_KEY_BOARD);
        const allItems: BoardItem[] = data ? JSON.parse(data) : [];
        return allItems.filter(item => 
            item.stepId === stepId && 
            (!user || (item.company === user.company && item.batch === user.batch))
        ).sort((a, b) => b.votes - a.votes);
      };

      if (isFirebaseEnabled && db && isDbVerified) {
          try {
            let query: firebase.firestore.Query = db.collection("board_items").where("stepId", "==", stepId);
            if (user) {
                query = query.where("company", "==", user.company).where("batch", "==", user.batch);
            }
            const querySnapshot = await query.get();
            const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BoardItem));
            return items.sort((a,b) => {
                if (b.votes !== a.votes) return b.votes - a.votes;
                return b.timestamp - a.timestamp;
            });
          } catch(e) {
              return getLocalItems();
          }
      }
      return getLocalItems();
  },

  addBoardItem: async (item: BoardItem) => {
      const user = StorageService.getUser();
      // Inject session info
      if (user) {
          if(!item.company) item.company = user.company;
          if(!item.batch) item.batch = user.batch;
      }

      // Local
      const data = localStorage.getItem(STORAGE_KEY_BOARD);
      const allItems: BoardItem[] = data ? JSON.parse(data) : [];
      allItems.unshift(item);
      safeLocalStorageSave(STORAGE_KEY_BOARD, allItems);

      // Remote
      if (isFirebaseEnabled && db && isDbVerified && (!user || !user.isReadOnly)) {
          const remoteItem = { ...item };
          if (remoteItem.imageUrl && remoteItem.imageUrl.startsWith('data:')) {
             const path = `images/board/${remoteItem.id}.png`;
             const url = await uploadBase64Image(remoteItem.imageUrl, path);
             if (url) remoteItem.imageUrl = url;
             else delete remoteItem.imageUrl;
          }
          await db.collection("board_items").doc(remoteItem.id).set(remoteItem);
      }
  },

  updateBoardItem: async (itemId: string, newContent: string) => {
      if (isFirebaseEnabled && db && isDbVerified) {
          await db.collection("board_items").doc(itemId).update({ content: newContent });
      }
  },

  updateBoardItemExtended: async (itemId: string, updates: Partial<BoardItem>) => {
      if (isFirebaseEnabled && db && isDbVerified) {
          await db.collection("board_items").doc(itemId).update(updates);
      }
  },

  deleteBoardItem: async (itemId: string) => {
      if (isFirebaseEnabled && db && isDbVerified) {
          await db.collection("board_items").doc(itemId).delete();
      }
  },

  voteBoardItem: async (itemId: string, userId: string) => {
      const user = StorageService.getUser();
      if(user && user.isReadOnly) return; // Read-only users cannot vote

      if (isFirebaseEnabled && db && isDbVerified) {
          const itemRef = db.collection("board_items").doc(itemId);
          const itemSnap = await itemRef.get();
          if (itemSnap.exists) {
              const data = itemSnap.data() as BoardItem;
              const voted = data.votedUserIds || [];
              if (voted.includes(userId)) {
                  await itemRef.update({
                      votes: Math.max(0, data.votes - 1),
                      votedUserIds: voted.filter(id => id !== userId)
                  });
              } else {
                  await itemRef.update({
                      votes: data.votes + 1,
                      votedUserIds: [...voted, userId]
                  });
              }
          }
      }
  },

  getAllBoardItems: async (): Promise<BoardItem[]> => {
      if (isFirebaseEnabled && db && isDbVerified) {
          const snap = await db.collection("board_items").get();
          return snap.docs.map(d => ({ id: d.id, ...d.data() } as BoardItem));
      }
      return [];
  }
};
