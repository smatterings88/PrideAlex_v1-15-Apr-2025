import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useDebounce } from 'use-debounce';
import { CheckCircle, XCircle } from 'lucide-react';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    mobile: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [debouncedUsername] = useDebounce(formData.username, 500);

  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername) {
        setIsUsernameAvailable(null);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const userDoc = await getDoc(doc(db, 'usernames', debouncedUsername.toLowerCase()));
        setIsUsernameAvailable(!userDoc.exists());
      } catch (error) {
        console.error('Error checking username:', error);
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    checkUsername();
  }, [debouncedUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form data
      if (!formData.username || !formData.email || !formData.password) {
        toast.error('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      // Check if username is available
      if (!isUsernameAvailable) {
        toast.error('Username is already taken');
        setIsLoading(false);
        return;
      }

      // Create auth user first
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Use a batch write to ensure both documents are created or neither is
      const batch = writeBatch(db);

      // Prepare user data
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username.toLowerCase(),
        mobile: formData.mobile,
        email: formData.email.toLowerCase(),
        createdAt: new Date().toISOString(),
      };

      // Add user document to batch
      const userRef = doc(db, 'users', userCredential.user.uid);
      batch.set(userRef, userData);

      // Add username mapping to batch
      const usernameRef = doc(db, 'usernames', formData.username.toLowerCase());
      batch.set(usernameRef, {
        uid: userCredential.user.uid
      });

      // Commit the batch
      await batch.commit();

      toast.success('Account created successfully!');
      onClose();
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle specific Firebase Auth error codes
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email is already registered');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email format');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters');
      } else if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please try again.');
      } else {
        toast.error('Failed to create account. Please try again.');
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
          <Dialog.Title className="text-2xl font-bold text-gray-900 mb-4">Sign Up</Dialog.Title>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value.trim()})}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 pr-10 ${
                    isUsernameAvailable === true ? 'border-green-500' :
                    isUsernameAvailable === false ? 'border-red-500' :
                    'border-gray-300'
                  }`}
                  required
                />
                {formData.username && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    ) : isUsernameAvailable ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : isUsernameAvailable === false ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {formData.username && !isCheckingUsername && (
                <p className={`mt-1 text-sm ${
                  isUsernameAvailable ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isUsernameAvailable ? 'Username is available' : 'Username is taken'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value.trim()})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({...formData, mobile: e.target.value.trim()})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || isCheckingUsername || isUsernameAvailable === false}
              className="w-full bg-[#004AAA] text-white py-2 px-4 rounded-md hover:bg-[#004AAA]/90 disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}