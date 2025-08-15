import {initializeApp, getApp, getApps, FirebaseApp} from 'firebase/app';
import {getFirestore, collection, addDoc, getDocs, query, doc, updateDoc, Firestore, serverTimestamp, onSnapshot, Unsubscribe} from 'firebase/firestore';

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

if (typeof window !== 'undefined' && firebaseConfig.projectId) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
}


export const createReport = async (report: any) => {
  try {
    if (!db) {
        console.warn("Firebase config not found, skipping Firestore write.");
        return null;
    }
    const reportData = {
        ...report,
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
        const updateData: any = { status };
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

export const getReports = async () => {
    try {
        if (!db) {
            console.warn("Firebase config not found, returning empty array.");
            return [];
        }
        const reportsCollection = collection(db, 'reports');
        const reportSnapshot = await getDocs(query(reportsCollection));
        const reportList = reportSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return reportList;
    } catch (e) {
        console.error("Error getting documents: ", e);
        throw e;
    }
}

export const listenToReports = (callback: (reports: any[]) => void): Unsubscribe => {
    if (!db) {
        console.warn("Firebase config not found, not listening to reports.");
        return () => {}; // Return a no-op unsubscribe function
    }
    const reportsCollection = collection(db, 'reports');
    const q = query(reportsCollection);
    
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
