'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { initializeMinutesWallet, getMinutesWallet } from './minutesWallet';
import { MinutesWallet } from './types';

interface AuthContextType {
  user: (User & { username?: string; firstName?: string }) | null;
  minutesWallet: MinutesWallet | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  minutesWallet: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<(User & { username?: string; firstName?: string }) | null>(null);
  const [minutesWallet, setMinutesWallet] = useState<MinutesWallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              ...firebaseUser,
              username: userData.username,
              firstName: userData.firstName,
            });
          } else {
            setUser(firebaseUser);
          }

          // Initialize or fetch minutes wallet
          let wallet = await getMinutesWallet(firebaseUser.uid);
          if (!wallet) {
            wallet = await initializeMinutesWallet(firebaseUser.uid);
          }

          // Update the wallet state
          if (wallet) {
            setMinutesWallet(wallet);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
        setMinutesWallet(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, minutesWallet, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);