import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUpClick: () => void;
}

export default function SignInModal({ isOpen, onClose, onSignUpClick }: SignInModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleForgotPassword = async () => {
    if (!identifier) {
      toast.error('Please enter your email address');
      return;
    }

    let email = identifier;

    // If identifier is not an email, try to get the email from username
    if (!isEmail(identifier)) {
      try {
        const usernameRef = doc(db, 'usernames', identifier.toLowerCase());
        const usernameDoc = await getDoc(usernameRef);
        
        if (!usernameDoc.exists()) {
          toast.error('Username not found');
          return;
        }

        const uid = usernameDoc.data().uid;
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          toast.error('User account not found');
          return;
        }

        email = userDoc.data().email;
      } catch (error) {
        console.error('Error looking up username:', error);
        toast.error('Error processing request. Please try again with your email address.');
        return;
      }
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email address');
      } else {
        toast.error('Failed to send reset email. Please try again.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let email = identifier;

      // If the identifier is not an email, try to find the user by username
      if (!isEmail(identifier)) {
        try {
          // Validate username format before querying
          const sanitizedUsername = identifier.toLowerCase().trim();
          if (!sanitizedUsername) {
            toast.error('Please enter a valid username');
            setIsLoading(false);
            return;
          }

          // Query the username document
          const usernameRef = doc(db, 'usernames', sanitizedUsername);
          const usernameDoc = await getDoc(usernameRef);
          
          if (!usernameDoc.exists()) {
            toast.error('Username not found');
            setIsLoading(false);
            return;
          }

          // Get the user's UID from the username document
          const uid = usernameDoc.data().uid;
          if (!uid) {
            console.error('Username document missing UID');
            toast.error('Invalid username data');
            setIsLoading(false);
            return;
          }
          
          // Get the user's email from their user document
          const userRef = doc(db, 'users', uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            console.error('User document not found for UID:', uid);
            toast.error('User account not found');
            setIsLoading(false);
            return;
          }

          const userData = userDoc.data();
          if (!userData?.email) {
            console.error('User document missing email');
            toast.error('Invalid user data');
            setIsLoading(false);
            return;
          }

          email = userData.email;
        } catch (error: any) {
          console.error('Error looking up username:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          if (error.code === 'permission-denied') {
            toast.error('Access denied. Please try again later.');
          } else {
            toast.error('Error looking up username. Please try again.');
          }
          setIsLoading(false);
          return;
        }
      }

      // Sign in with the email (either provided directly or looked up from username)
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Successfully signed in!');
      onClose();
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific Firebase Auth error codes
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          toast.error('Invalid username/email or password');
          break;
        case 'auth/user-disabled':
          toast.error('This account has been disabled');
          break;
        case 'auth/too-many-requests':
          toast.error('Too many failed attempts. Please try again later');
          break;
        case 'auth/network-request-failed':
          toast.error('Network error. Please check your connection');
          break;
        case 'auth/invalid-email':
          toast.error('Invalid email format');
          break;
        default:
          toast.error('Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6">
          <Dialog.Title className="text-2xl font-bold text-gray-900 mb-4">Sign In</Dialog.Title>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username or Email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.trim())}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Enter your username or email"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
              />
              <button
                type="button"
                onClick={handleForgotPassword}
                className="mt-1 text-sm text-[#004AAA] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#004AAA] text-white py-2 px-4 rounded-md hover:bg-[#004AAA]/90 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <button
              onClick={() => {
                onClose();
                onSignUpClick();
              }}
              className="text-[#004AAA] hover:underline"
            >
              Sign up
            </button>
          </p>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}