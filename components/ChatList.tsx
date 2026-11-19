
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Chat } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { MessageSquare, User, Search } from 'lucide-react';
import { safeFormatDistanceToNow } from '../lib/date-utils';

interface ChatListProps {
  onChatSelect: (chatId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onChatSelect }) => {
  const [chats, setChats] = useState<(Chat & { otherUser: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatPromises = snapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        const otherUserId = chatData.participants.find((id: string) => id !== auth.currentUser?.uid);
        
        let otherUser = null;
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            otherUser = userDoc.data();
          }
        }

        return {
          id: chatDoc.id,
          ...chatData,
          otherUser
        };
      });

      const resolvedChats = await Promise.all(chatPromises);
      setChats(resolvedChats as (Chat & { otherUser: any })[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, []);

  const filteredChats = chats.filter(chat => 
    chat.otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6A00]"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[24px] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all shadow-sm"
          />
        </div>

        <div className="space-y-3">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <button 
                key={chat.id} 
                onClick={() => onChatSelect(chat.id)}
                className="w-full bg-white p-5 rounded-[28px] border border-slate-100 flex items-center gap-4 hover:border-[#FF6A00] hover:shadow-md transition-all group relative"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                    {chat.otherUser?.photo ? (
                      <img src={chat.otherUser.photo} alt={chat.otherUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <User size={28} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-black text-slate-900 truncate">{chat.otherUser?.name || 'User'}</h4>
                    {chat.updatedAt && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {safeFormatDistanceToNow(chat.updatedAt, { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-500 truncate pr-4">
                    {chat.lastMessage || 'Start a conversation'}
                  </p>
                </div>

                {/* Unread Indicator */}
                {chat.lastMessageRead === false && chat.lastMessageSenderId !== auth.currentUser?.uid && (
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#FF6A00] rounded-full shadow-lg shadow-orange-200" />
                )}
              </button>
            ))
          ) : (
            <div className="bg-white p-12 rounded-[32px] border border-dashed border-slate-200 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No messages found</h3>
              <p className="text-slate-500 text-sm mt-1">Start chatting with workers to see them here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatList;
