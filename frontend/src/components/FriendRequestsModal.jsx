import React from 'react';
import { Check, X, UserCheck, UserX } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';

const FriendRequestsModal = ({ isOpen, onClose }) => {
  const { friendRequests, acceptFriendRequest, rejectFriendRequest } = useChatStore();

  const handleAccept = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      toast.success('Friend request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2c2236] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Friend Requests</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {friendRequests.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No pending friend requests
            </div>
          ) : (
            friendRequests.map((request) => (
              <div key={request._id} className="flex items-center gap-3 p-3 hover:bg-[#372945]/20 rounded-lg">
                <img 
                  src={request.from.profilePic || '/avatar.png'} 
                  alt={request.from.fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">{request.from.fullName}</div>
                  <div className="text-gray-400 text-sm">{request.from.email}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request._id)}
                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                  >
                    <UserCheck size={16} />
                  </button>
                  <button
                    onClick={() => handleReject(request._id)}
                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <UserX size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestsModal;
