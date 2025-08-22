import React, { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';

const AddFriendsModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { searchUsers, sendFriendRequest } = useChatStore();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      toast.error('Error searching users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await sendFriendRequest(userId);
      toast.success('Friend request sent!');
      setSearchResults(prev => 
        prev.map(user => 
          user._id === userId 
            ? { ...user, requestSent: true }
            : user
        )
      );
    } catch (error) {
      toast.error('Failed to send friend request');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2c2236] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Add Friends</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by email or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 bg-[#1a1823] text-white border border-[#372945]/40 rounded-lg outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {isSearching ? '...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-64 overflow-y-auto">
          {searchResults.length === 0 && !isSearching && searchQuery && (
            <div className="text-center text-gray-400 py-4">
              No users found
            </div>
          )}
          
          {searchResults.map((user) => (
            <div key={user._id} className="flex items-center gap-3 p-3 hover:bg-[#372945]/20 rounded-lg">
              <img 
                src={user.profilePic || '/avatar.png'} 
                alt={user.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="text-white font-medium">{user.fullName}</div>
                <div className="text-gray-400 text-sm">{user.email}</div>
              </div>
              <button
                onClick={() => handleAddFriend(user._id)}
                disabled={user.requestSent}
                className="p-2 bg-violet-600 text-white rounded-full hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <UserPlus size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddFriendsModal;
