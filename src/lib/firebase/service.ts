
import {initializeApp, getApp, getApps, FirebaseApp} from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, User, updateProfile } from "firebase/auth";
import {getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, Firestore, serverTimestamp, onSnapshot, Unsubscribe, where, deleteDoc} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore;
let auth;
let storage: FirebaseStorage;

if (typeof window !== 'undefined' && firebaseConfig.projectId) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
}

export const signUpUser = async (email: string, password: string, name: string, profilePic: File | null): Promise<User> => {
    if (!auth) throw new Error("Firebase not initialized");
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const updateUserProfile = async () => {
        try {
            let photoURL: string | undefined = undefined;
            if (profilePic && storage) {
                try {
                    const storageRef = ref(storage, `profile-pics/${user.uid}/${profilePic.name}`);
                    await uploadBytes(storageRef, profilePic);
                    photoURL = await getDownloadURL(storageRef);
                } catch (storageError) {
                    console.error("Could not upload profile picture. This might be due to Firebase Storage rules or plan limitations. Skipping.", storageError);
                }
            }

            await updateProfile(user, {
                displayName: name,
                ...(photoURL && { photoURL }),
            });

        } catch (profileError) {
            console.error("Error updating user profile:", profileError);
        }
    };
    
    updateUserProfile(); 

    return user;
};


export const signInUser = async (email: string, password: string): Promise<User> => {
    if (!auth) throw new Error("Firebase not initialized");
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error: any) {
        // If admin user doesn't exist, create it
        if (email === 'admin@gmail.com' && error.code === 'auth/user-not-found') {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, 'admin@123');
                await updateProfile(userCredential.user, { displayName: "Admin" });
                return userCredential.user;
            } catch (createError) {
                throw new Error('Failed to create admin user.');
            }
        }
        // Re-throw other errors
        throw error;
    }
};

export const signOutUser = async (): Promise<void> => {
    if (!auth) throw new Error("Firebase not initialized");
    await signOut(auth);
};

export const getCurrentUser = (): User | null => {
  if (!auth) return null;
  return auth.currentUser;
}


export const createReport = async (report: any) => {
  try {
    const user = getCurrentUser();
    if (!user) {
        throw new Error("User not logged in");
    }
    if (!db) {
        console.warn("Firebase config not found, skipping Firestore write.");
        return null;
    }
    const reportData = {
        ...report,
        userId: user.uid,
        complaintTime: serverTimestamp(),
        resolvedTime: null,
        status: 'pending',
    };
    const docRef = await addDoc(collection(db, 'reports'), reportData);
    console.log('Document written with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw e;
  }
};

export const updateReport = async (reportId: string, assessmentResult: any) => {
    try {
      if (!db) {
        console.warn("Firebase config not found, skipping Firestore update.");
        return;
      }
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        assessmentResult,
        status: 'pending', // It's assessed, but not yet in progress
      });
      console.log('Document updated with ID: ', reportId);
    } catch (e) {
      console.error('Error updating document: ', e);
      throw e;
    }
  };

export const updateReportStatus = async (reportId: string, status: 'pending' | 'in progress' | 'resolved') => {
    try {
        if (!db) {
            console.warn("Firebase config not found, skipping Firestore update.");
            return;
        }
        const reportRef = doc(db, 'reports', reportId);
        const updateData: { status: string, resolvedTime?: any } = { status };
        
        if (status === 'resolved') {
            updateData.resolvedTime = serverTimestamp();
        }

        await updateDoc(reportRef, updateData);
        console.log('Report status updated for ID: ', reportId);
    } catch (e) {
        console.error('Error updating report status: ', e);
        throw e;
    }
};

export const deleteReport = async (reportId: string) => {
    try {
        if (!db) {
            console.warn("Firebase config not found, skipping Firestore delete.");
            return;
        }
        const user = getCurrentUser();
        if (!user) {
            throw new Error("User not logged in");
        }
        const reportRef = doc(db, 'reports', reportId);
        // Optional: you could add a security check here to ensure the user owns the report before deleting
        await deleteDoc(reportRef);
        console.log('Report deleted with ID: ', reportId);
    } catch (e) {
        console.error('Error deleting document: ', e);
        throw e;
    }
};

export const listenToAllReports = (callback: (reports: any[]) => void): Unsubscribe => {
    if (!db) {
        console.warn("Firebase config not found, not listening to reports.");
        callback([]);
        return () => {}; // Return a no-op unsubscribe function
    }
    const reportsCollection = collection(db, 'reports');
    
    const unsubscribe = onSnapshot(reportsCollection, (querySnapshot) => {
        const reports = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                complaintTime: data.complaintTime?.toDate(),
                resolvedTime: data.resolvedTime?.toDate(),
            };
        });
        callback(reports);
    }, (error) => {
        console.error("Error listening to all reports:", error);
    });

    return unsubscribe;
}


export const listenToUserReports = (callback: (reports: any[]) => void): Unsubscribe => {
    const user = getCurrentUser();
    if (!db || !user) {
        console.warn("Firebase config not found or user not logged in, not listening to reports.");
        // Immediately call back with empty array to clear any existing complaints
        callback([]);
        return () => {}; // Return a no-op unsubscribe function
    }
    const reportsCollection = collection(db, 'reports');
    const q = query(reportsCollection, where("userId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const reports = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                complaintTime: data.complaintTime?.toDate(),
                resolvedTime: data.resolvedTime?.toDate(),
            };
        });
        callback(reports);
    }, (error) => {
        console.error("Error listening to reports:", error);
    });

    return unsubscribe;
}
