'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { CallLog } from '@/lib/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CallLogs() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserCalls(userId: string) {
      try {
        const callsRef = collection(db, 'callLogs');
        const q = query(
          callsRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const callsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CallLog[];

        // Filter out calls with 'disconnected' status
        const filteredCalls = callsData.filter(call => call.status !== 'disconnected');
        setCalls(filteredCalls);
      } catch (error) {
        console.error('Error fetching calls:', error);
        toast.error('Failed to load call history');
      } finally {
        setLoading(false);
      }
    }

    async function fetchUserIdByUsername(username: string): Promise<string | null> {
      try {
        const usernameRef = doc(db, 'usernames', username.toLowerCase());
        const usernameDoc = await getDoc(usernameRef);
        
        if (usernameDoc.exists()) {
          return usernameDoc.data().uid;
        }
        return null;
      } catch (error) {
        console.error('Error fetching user ID by username:', error);
        return null;
      }
    }

    async function fetchUserIdByEmail(email: string): Promise<string | null> {
      try {
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('email', '==', email.toLowerCase()));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          return userSnapshot.docs[0].id;
        }
        return null;
      } catch (error) {
        console.error('Error fetching user ID by email:', error);
        return null;
      }
    }

    async function fetchCalls() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        let userId = user.uid;

        if (!userId && user.username) {
          userId = await fetchUserIdByUsername(user.username) || '';
        }

        if (!userId && user.email) {
          userId = await fetchUserIdByEmail(user.email) || '';
        }

        if (!userId) {
          toast.error('Could not find associated user records');
          setLoading(false);
          setCalls([]);
          return;
        }

        await fetchUserCalls(userId);
      } catch (error) {
        console.error('Error in fetchCalls:', error);
        toast.error('Failed to load call history');
        setLoading(false);
      }
    }

    fetchCalls();
  }, [user]);

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'disconnected':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'duration_exceeded':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-600">Please sign in to view your call logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-[#004AAA] hover:text-[#004AAA]/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Call History</h1>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004AAA] mx-auto"></div>
          </div>
        ) : calls.length === 0 ? (
          <p className="text-center text-gray-600">No calls found.</p>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(call.startTime.toDate(), 'MMM d, yyyy h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(call.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`capitalize ${getStatusColor(call.status)}`}>
                        {call.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
