import {initializeApp, getApp, getApps} from 'firebase/app';
import {getFirestore, collection, addDoc, getDocs, query, doc, updateDoc} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export const createReport = async (report: any) => {
  try {
    if (!firebaseConfig.projectId) {
        console.warn("Firebase config not found, skipping Firestore write.");
        return null;
    }
    const docRef = await addDoc(collection(db, 'reports'), report);
    console.log('Document written with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw e;
  }
};

export const updateReport = async (reportId: string, assessmentResult: any) => {
    try {
      if (!firebaseConfig.projectId) {
        console.warn("Firebase config not found, skipping Firestore update.");
        return;
      }
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        assessmentResult,
        status: 'assessed',
      });
      console.log('Document updated with ID: ', reportId);
    } catch (e) {
      console.error('Error updating document: ', e);
      throw e;
    }
  };

export const getReports = async () => {
    try {
        if (!firebaseConfig.projectId) {
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
