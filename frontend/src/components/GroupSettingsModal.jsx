import React, { useState, useRef, useEffect } from 'react';
import { X, Settings, Users, Trash2, Save, UserPlus, UserMinus, Search } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const GroupSettingsModal = ({ isOpen, onClose, group, onGroupUpdated }) => {
  const { authUser } = useAuthStore();
  const { clearGroupChat, addMemberToGroup, removeMemberFromGroup } = useChatStore();
  
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [messageRetentionDays, setMessageRetentionDays] = useState(30);
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  
  const modalRef = useRef(null);

  useEffect(() => {
    if (group && isOpen) {
      setGroupName(group.name || '');
      setDescription(group.description || '');
      setMessageRetentionDays(group.messageRetentionDays || 30);
      setAutoDeleteMessages(group.autoDeleteMessages || false);
    }
  }, [group, isOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const isAdmin = group?.admin === authUser?._id;

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axiosInstance.get(`/users/search?q=${query}`);
      const users = response.data.filter(user => 
        !group.members.some(member => member.user._id === user._id)
      );
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId) => {
    setIsAddingMember(true);
    try {
      const updatedGroup = await addMemberToGroup(group._id, userId);
      onGroupUpdated(updatedGroup);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding member:', error);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (userId === group.admin) {
      toast.error('Cannot remove group admin');
      return;
    }

    if (window.confirm('Are you sure you want to remove this member from the group?')) {
      try {
        const updatedGroup = await removeMemberFromGroup(group._id, userId);
        onGroupUpdated(updatedGroup);
      } catch (error) {
        console.error('Error removing member:', error);
      }
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) return;

    setIsUpdating(true);
    
    try {
      const response = await axiosInstance.put(`/groups/${group._id}`, {
        name: groupName.trim(),
        description: description.trim(),
        messageRetentionDays: parseInt(messageRetentionDays),
        autoDeleteMessages
      });

      onGroupUpdated(response.data);
      toast.success('Group settings updated successfully');
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearChat = async () => {
    const confirmMessage = `Are you sure you want to clear all group chat history?\n\nThis will delete all messages permanently.\n\nNote: Messages are automatically deleted after ${messageRetentionDays} days.`;
    
    if (window.confirm(confirmMessage)) {
      setIsClearingChat(true);
      try {
        await clearGroupChat(group._id);
      } catch (error) {
        console.error('Error clearing chat:', error);
      } finally {
        setIsClearingChat(false);
      }
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Group Settings</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={handleUpdateGroup} className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text">Group Name</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="input input-bordered w-full"
                required
                disabled={!isAdmin}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description"
                className="textarea textarea-bordered w-full"
                rows="3"
                disabled={!isAdmin}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Message Retention</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoDelete"
                    checked={autoDeleteMessages}
                    onChange={(e) => setAutoDeleteMessages(e.target.checked)}
                    className="checkbox checkbox-sm"
                    disabled={!isAdmin}
                  />
                  <label htmlFor="autoDelete" className="label-text">
                    Automatically delete old messages
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">Keep messages for:</span>
                  <select
                    value={messageRetentionDays}
                    onChange={(e) => setMessageRetentionDays(e.target.value)}
                    className="select select-bordered select-sm"
                    disabled={!autoDeleteMessages || !isAdmin}
                  >
                    <option value="7">7 days</option>
                    <option value="15">15 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
                
                {autoDeleteMessages && (
                  <p className="text-xs text-base-content/70">
                    Messages older than {messageRetentionDays} days will be automatically deleted
                  </p>
                )}
              </div>
            </div>

            <div className="divider">Members Management</div>

            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Current Members ({group.members?.length || 0})</span>
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {group.members?.map((member) => (
                    <div key={member.user._id} className="flex items-center justify-between p-2 bg-base-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content text-sm font-semibold">
                          {member.user.profilePic ? (
                            <img src={member.user.profilePic} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            member.user.fullName?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.user.fullName}</p>
                          <p className="text-xs text-base-content/70">{member.role}</p>
                        </div>
                      </div>
                      {isAdmin && member.user._id !== group.admin && (
                        <button
                          onClick={() => handleRemoveMember(member.user._id)}
                          className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                          title="Remove member"
                        >
                          <UserMinus className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="label">
                    <span className="label-text">Add New Members</span>
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-base-content/50" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users to add..."
                        className="input input-bordered w-full pl-10"
                      />
                    </div>
                    
                    {isSearching && (
                      <div className="text-center py-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        <span className="ml-2 text-sm">Searching...</span>
                      </div>
                    )}
                    
                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div key={user._id} className="flex items-center justify-between p-2 bg-base-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content text-sm font-semibold">
                                {user.profilePic ? (
                                  <img src={user.profilePic} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  user.fullName?.charAt(0) || 'U'
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{user.fullName}</p>
                                <p className="text-xs text-base-content/70">{user.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddMember(user._id)}
                              disabled={isAddingMember}
                              className="btn btn-primary btn-xs"
                              title="Add to group"
                            >
                              {isAddingMember ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                <UserPlus className="size-4" />
                              )}
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchQuery && !isSearching && searchResults.length === 0 && (
                      <p className="text-center text-sm text-base-content/70 py-2">
                        No users found or all users are already in the group
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="divider">Danger Zone</div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                <div>
                  <h4 className="font-medium text-warning">Clear Chat History</h4>
                  <p className="text-sm text-base-content/70">
                    Delete all messages in this group permanently
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearChat}
                  disabled={!isAdmin || isClearingChat}
                  className="btn btn-warning btn-sm"
                >
                  {isClearingChat ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Clear
                </button>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost flex-1"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={!groupName.trim() || isUpdating}
                >
                  {isUpdating ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default GroupSettingsModal;
