import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserData {
  uid: string;
  displayName: string;
  photoURL: string;
  gCoins: number;
  reputation: number;
  role: 'adventurer' | 'client' | 'admin';
  rank: string;
  bio: string;
}

interface FirebaseContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Connection Test (Skill Requirement)
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, '_connection_test_', 'check'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.error("Firebase offline or config issue.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        // Initial user setup if doesn't exist
        const userRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) {
          const newData: UserData = {
            uid: fbUser.uid,
            displayName: fbUser.displayName || 'Anonymous Adventurer',
            photoURL: fbUser.photoURL || '',
            gCoins: 0,
            reputation: 0,
            role: 'adventurer',
            rank: 'E',
            bio: 'A new recruit to the guild.'
          };
          await setDoc(userRef, newData);
          setUserData(newData);
        }

        // Real-time listener for user data (coins, reputation change)
        const unsubData = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          }
        });
        setLoading(false);
        return () => unsubData();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <FirebaseContext.Provider value={{ user, userData, loading, signIn, signOut: logout }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
