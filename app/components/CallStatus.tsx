import React, { ReactNode } from 'react';

interface CallStatusProps {
  status: string;
  children?: ReactNode;
}

const CallStatus: React.FC<CallStatusProps> = ({ status, children }) => {
  return (
    <div className="flex flex-col bg-gray-50 rounded-xl p-4 sm:p-6 w-full lg:w-1/3 shadow-lg border border-gray-200">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-blue-900">Conversation Status</h2>
        <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
          <p className="text-base sm:text-lg font-medium text-gray-900">Current Status</p>
          <p className="text-sm sm:text-base text-gray-600">{status}</p>
        </div>
      </div>

      {children}
    </div>
  );
};

export default CallStatus;