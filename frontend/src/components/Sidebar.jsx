import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Bell, Search } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import AddFriendsModal from './AddFriendsModal';
import FriendRequestsModal from './FriendRequestsModal';

const Sidebar = () => {
  const { 
    contacts, 
    selectedContact, 
    setSelectedContact, 
    friendRequests, 
    loadContacts,
    getFriendRequests 
  } = useChatStore();
  
  const [showAddFriends, setShowAddFriends] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContacts();
    getFriendRequests();
  }, [loadContacts, getFriendRequests]);

  // Add safety checks for array operations
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const safeFriendRequests = Array.isArray(friendRequests) ? friendRequests : [];
  
  const filteredContacts = safeContacts.filter(contact =>
    contact.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full sm:w-80 shrink-0 bg-base-200 border-r border-base-300 flex flex-col">
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="size-5" />
            Contacts ({safeContacts.length})
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFriendRequests(true)}
              className="btn btn-ghost btn-sm relative"
              title="Friend Requests"
            >
              <Bell className="size-4" />
              {safeFriendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-error-content text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {safeFriendRequests.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowAddFriends(true)}
              className="btn btn-primary btn-sm"
              title="Add Friends"
            >
              <UserPlus className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50 size-4" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10 input-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-base-content/50">
            {safeContacts.length === 0 ? (
              <div>
                <p>No contacts yet</p>
                <button
                  onClick={() => setShowAddFriends(true)}
                  className="btn btn-primary btn-sm mt-2"
                >
                  Add Friends
                </button>
              </div>
            ) : (
              <p>No contacts match your search</p>
            )}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact._id}
              onClick={() => setSelectedContact(contact)}
              className={`flex items-center gap-3 p-4 hover:bg-base-300 cursor-pointer border-b border-base-300 ${
                selectedContact?._id === contact._id ? 'bg-primary/10' : ''
              }`}
            >
              <div className="relative">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {contact.profilePic ? (
                    <img
                      src={contact.profilePic}
                      alt={contact.fullName}
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-semibold">
                      {contact.fullName?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div
                  className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-base-200 ${
                    contact.online ? 'bg-success' : 'bg-base-content/30'
                  }`}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {contact.fullName || 'Unknown User'}
                </h3>
                <p className="text-sm text-base-content/70">
                  {contact.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <AddFriendsModal
        isOpen={showAddFriends}
        onClose={() => setShowAddFriends(false)}
      />
      
      <FriendRequestsModal
        isOpen={showFriendRequests}
        onClose={() => setShowFriendRequests(false)}
      />
    </div>
  );
};

export default Sidebar;
