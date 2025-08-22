import React, { useState, useRef, useEffect } from 'react';
import { X, Users, Settings } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const { authUser } = useAuthStore();
  const { contacts, createGroup } = useChatStore();
  
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageRetentionDays, setMessageRetentionDays] = useState(30);
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const modalRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim() || selectedContacts.length === 0) {
      return;
    }

    setIsCreating(true);
    
    try {
      const groupData = {
        name: groupName.trim(),
        description: description.trim(),
        members: selectedContacts,
        messageRetentionDays: parseInt(messageRetentionDays),
        autoDeleteMessages
      };

      const newGroup = await createGroup(groupData);
      onGroupCreated(newGroup);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setGroupName('');
    setDescription('');
    setSelectedContacts([]);
    setSearchQuery('');
    setMessageRetentionDays(30);
    setAutoDeleteMessages(false);
  };

  const toggleContact = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const filteredContacts = contacts.filter(contact =>
    contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedContacts.includes(contact._id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Create New Group</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Description (Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description"
                className="textarea textarea-bordered w-full"
                rows="3"
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
                    disabled={!autoDeleteMessages}
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

            <div>
              <label className="label">
                <span className="label-text">Add Members</span>
              </label>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="input input-bordered w-full mb-3"
              />
              
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
                {filteredContacts.map(contact => (
                  <div
                    key={contact._id}
                    className="flex items-center gap-3 p-2 hover:bg-base-200 rounded cursor-pointer"
                    onClick={() => toggleContact(contact._id)}
                  >
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {contact.profilePic ? (
                        <img 
                          src={contact.profilePic} 
                          alt={contact.fullName} 
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-sm">
                          {contact.fullName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="flex-1">{contact.fullName}</span>
                  </div>
                ))}
                
                {filteredContacts.length === 0 && searchQuery && (
                  <p className="text-center text-base-content/50 py-4">
                    No contacts found
                  </p>
                )}
              </div>
            </div>

            {selectedContacts.length > 0 && (
              <div>
                <label className="label">
                  <span className="label-text">Selected Members ({selectedContacts.length})</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map(contactId => {
                    const contact = contacts.find(c => c._id === contactId);
                    return (
                      <div
                        key={contactId}
                        className="badge badge-primary gap-2"
                      >
                        {contact?.fullName}
                        <button
                          type="button"
                          onClick={() => toggleContact(contactId)}
                          className="btn btn-ghost btn-xs"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost flex-1"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={!groupName.trim() || selectedContacts.length === 0 || isCreating}
              >
                {isCreating ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Create Group'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
