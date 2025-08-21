import React, { useState } from "react";
import { Users, Circle } from "lucide-react";

const contacts = [
  { id: 1, name: 'Jane Doe', status: 'Offline', avatar: '/avatar.png', active: false },
  { id: 2, name: 'John Smith', status: 'Online', avatar: '/avatar.png', active: true },
  { id: 3, name: 'Alice Johnson', status: 'Away', avatar: '/avatar.png', active: false },
];

const statusColor = status => 
  status === "Online" ? "text-green-400"
  : status === "Away" ? "text-yellow-400"
  : "text-zinc-500";

const Sidebar = () => {
  const [selected, setSelected] = useState(contacts[0].id);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-[#372945]/40">
        <Users className="w-6 h-6 text-violet-300" />
        <span className="font-semibold text-white text-lg">Contacts</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            onClick={() => setSelected(contact.id)}
            className={`flex items-center p-4 gap-3 cursor-pointer transition 
              ${selected === contact.id ? "bg-[#382e44]/80" : "hover:bg-[#2c2236]/60"}`}
          >
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-10 h-10 rounded-full object-cover border border-[#382e44]/40"
            />
            <div className="flex flex-col flex-1">
              <span className="font-medium text-white">{contact.name}</span>
              <span className={`text-xs ${statusColor(contact.status)}`}>{contact.status}</span>
            </div>
            <Circle
              className={`w-3 h-3 ${statusColor(contact.status)}`}
              fill={contact.status === "Online" ? "#34d399" : contact.status === "Away" ? "#fbbf24" : "#78716c"}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
