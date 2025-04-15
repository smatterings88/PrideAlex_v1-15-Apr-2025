import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore';
import { MinutesWallet } from './types';

const DEFAULT_SECONDS = 420; // 7 minutes * 60 seconds

export async function initializeMinutesWallet(userId: string): Promise<MinutesWallet> {
  const walletRef = doc(db, 'minutesWallets', userId);
  
  try {
    const wallet = await getDoc(walletRef);
    
    if (!wallet.exists()) {
      const newWallet: MinutesWallet = {
        userId,
        seconds: DEFAULT_SECONDS,
        lastUpdated: serverTimestamp(),
      };
      
      await setDoc(walletRef, newWallet);
      return newWallet;
    }
    
    return wallet.data() as MinutesWallet;
  } catch (error) {
    console.error('Error initializing minutes wallet:', error);
    throw error;
  }
}

export async function getMinutesWallet(userId: string): Promise<MinutesWallet | null> {
  try {
    const walletRef = doc(db, 'minutesWallets', userId);
    const wallet = await getDoc(walletRef);
    
    if (!wallet.exists()) {
      return null;
    }
    
    return wallet.data() as MinutesWallet;
  } catch (error) {
    console.error('Error getting minutes wallet:', error);
    throw error;
  }
}

export async function updateMinutesWallet(userId: string, secondsUsed: number): Promise<void> {
  try {
    const walletRef = doc(db, 'minutesWallets', userId);
    const wallet = await getDoc(walletRef);
    
    if (!wallet.exists()) {
      throw new Error('Minutes wallet not found');
    }
    
    const currentSeconds = wallet.data().seconds;
    const newSeconds = Math.max(0, currentSeconds - secondsUsed);
    
    await updateDoc(walletRef, {
      seconds: newSeconds,
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating minutes wallet:', error);
    throw error;
  }
}