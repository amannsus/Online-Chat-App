import React, { useState, useEffect } from 'react';
import { Users, Plus, Settings, Search, LogOut } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import CreateGroupModal from './CreateGroupModal';

const GroupSidebar = () => {
  const { 
    groups, 
    selectedGroup, 
    setSelectedGroup, 
    loadGroups,
    leaveGroup
  } = useChatStore();
  
  const { authUser } = useAuthStore();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leavingGroupId, setLeavingGroupId] = useState(null);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Add safety checks for array operations
  const safeGroups = Array.isArray(groups) ? groups : [];
  
  const filteredGroups = safeGroups.filter(group =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLeaveGroup = async (groupId, groupName) => {
    if (window.confirm(`Are you sure you want to leave "${groupName}"?`)) {
      try {
        setLeavingGroupId(groupId);
        await leaveGroup(groupId);
      } catch (error) {
        console.error('Failed to leave group:', error);
      } finally {
        setLeavingGroupId(null);
      }
    }
  };

  const isGroupAdmin = (group) => {
    return group.admin === authUser._id || group.admin?._id === authUser._id;
  };

  return (
    <div className="w-80 bg-base-200 border-r border-base-300 flex flex-col">
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="size-5" />
            Groups ({safeGroups.length})
          </h2>
          
          <button
            onClick={() => setShowCreateGroup(true)}
            className="btn btn-primary btn-sm"
            title="Create Group"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50 size-4" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10 input-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-base-content/50">
            {safeGroups.length === 0 ? (
              <div>
                <p>No groups yet</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="btn btn-primary btn-sm mt-2"
                >
                  Create Group
                </button>
              </div>
            ) : (
              <p>No groups match your search</p>
            )}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group._id}
              className={`p-4 border-b border-base-300 ${
                selectedGroup?._id === group._id ? 'bg-primary/10' : ''
              }`}
            >
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setSelectedGroup(group)}
              >
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {group.avatar ? (
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-semibold">
                      {group.name?.charAt(0) || 'G'}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {group.name || 'Unknown Group'}
                  </h3>
                  <p className="text-sm text-base-content/70 truncate">
                    {group.members?.length || 0} members
                  </p>
                  {isGroupAdmin(group) && (
                    <span className="text-xs text-primary font-medium">Admin</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-3">
                {!isGroupAdmin(group) && (
                  <button
                    onClick={() => handleLeaveGroup(group._id, group.name)}
                    disabled={leavingGroupId === group._id}
                    className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                    title="Leave Group"
                  >
                    {leavingGroupId === group._id ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <LogOut className="size-3" />
                    )}
                    Leave
                  </button>
                )}
                
                {isGroupAdmin(group) && (
                  <button className="btn btn-ghost btn-xs">
                    <Settings className="size-3" />
                    Settings
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={(newGroup) => {
          setShowCreateGroup(false);
          loadGroups();
        }}
      />
    </div>
  );
};

export default GroupSidebar;
