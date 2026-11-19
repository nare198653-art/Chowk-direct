
import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Message } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { motion } from 'motion/react';
import { 
  Send, 
  ChevronLeft, 
  MoreVertical, 
  User,
  Phone,
  Video,
  X,
  Mic,
  VideoOff,
  PhoneOff,
  Check,
  CheckCheck
} from 'lucide-react';
import { safeFormat } from '../lib/date-utils';

interface ChatRoomProps {
  chatId: string;
  onBack: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ chatId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [calling, setCalling] = useState<'audio' | 'video' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Listen for typing status
    const chatRef = doc(db, 'chats', chatId);
    const unsubscribeChat = onSnapshot(chatRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const typingStatus = data.typing || {};
        const otherId = data.participants.find((id: string) => id !== auth.currentUser?.uid);
        if (otherId) {
          setOtherUserTyping(!!typingStatus[otherId]);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`);
    });

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);

      // Mark unread messages as read
      const unreadMsgs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.senderId !== auth.currentUser?.uid && !data.read;
      });

      if (unreadMsgs.length > 0) {
        const batch = writeBatch(db);
        unreadMsgs.forEach(msgDoc => {
          batch.update(msgDoc.ref, { read: true });
        });
        // Also update the chat document's lastMessageRead status
        batch.update(doc(db, 'chats', chatId), { lastMessageRead: true });
        batch.commit();
      } else {
        // Even if no unread messages in snapshot, ensure the chat doc is marked as read
        // if the last message was from the other user
        const checkChatRead = async () => {
          const chatDoc = await getDoc(doc(db, 'chats', chatId));
          if (chatDoc.exists()) {
            const data = chatDoc.data();
            if (data.lastMessageSenderId !== auth.currentUser?.uid && data.lastMessageRead === false) {
              await updateDoc(doc(db, 'chats', chatId), { lastMessageRead: true });
            }
          }
        };
        checkChatRead();
      }

      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    });

    // Fetch other user info
    const fetchOtherUser = async () => {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const participants = chatDoc.data().participants;
        const otherId = participants.find((id: string) => id !== auth.currentUser?.uid);
        if (otherId) {
          const userDoc = await getDoc(doc(db, 'users', otherId));
          if (userDoc.exists()) {
            setOtherUser(userDoc.data());
          }
        }
      }
    };

    fetchOtherUser();
    return () => {
      unsubscribe();
      unsubscribeChat();
    };
  }, [chatId]);

  const updateTypingStatus = async (typing: boolean) => {
    if (!auth.currentUser || !auth.currentUser.uid) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`typing.${auth.currentUser.uid}`]: typing
      });
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      updateTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTypingStatus(false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const text = newMessage;
    setNewMessage('');
    setIsTyping(false);
    updateTypingStatus(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const messageData = {
        chatId: chatId || "unknown",
        senderId: auth.currentUser.uid,
        text,
        read: false,
        createdAt: serverTimestamp(),
      };
      
      console.log(`Sending message to chat ${chatId}:`, messageData);
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

      // Update chat last message
      const lastMessageData = {
        lastMessage: text,
        lastMessageSenderId: auth.currentUser.uid,
        lastMessageRead: false,
        updatedAt: serverTimestamp()
      };
      
      console.log(`Updating chat ${chatId} last message:`, lastMessageData);
      
      await setDoc(doc(db, 'chats', chatId), lastMessageData, { merge: true });

    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
              {otherUser?.photo ? (
                <img src={otherUser.photo} className="w-full h-full object-cover" />
              ) : (
                <User className="text-slate-400" size={20} />
              )}
            </div>
            <div>
              <h3 className="font-black text-slate-900">{otherUser?.name || 'Loading...'}</h3>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Online Now</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCalling('audio')}
            className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors"
          >
            <Phone size={20} />
          </button>
          <button 
            onClick={() => setCalling('video')}
            className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors"
          >
            <Video size={20} />
          </button>
          <button className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
          const showTimestamp = index === 0 || 
            (msg.createdAt?.seconds - messages[index-1].createdAt?.seconds > 300);

          return (
            <div key={msg.id} className="space-y-2">
              {showTimestamp && msg.createdAt && (
                <div className="flex justify-center my-4">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                    {safeFormat(msg.createdAt, 'hh:mm a')}
                  </span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[80%] space-y-1">
                  <div
                    className={`px-5 py-3 rounded-[24px] text-sm font-medium shadow-sm relative ${
                      isMe 
                        ? 'bg-slate-900 text-white rounded-tr-none' 
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {isMe && (
                    <div className="flex justify-end pr-2">
                      {msg.read ? (
                        <CheckCheck size={14} className="text-emerald-500" />
                      ) : (
                        <Check size={14} className="text-slate-300" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
        
        {otherUserTyping && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-400"
          >
            <div className="flex gap-1 bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm">
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
            </div>
          </motion.div>
        )}
        
        <div ref={scrollRef} />
      </div>

      <div className="p-6 bg-white border-t border-slate-100">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={handleTyping}
            className="flex-1 px-6 py-4 bg-slate-50 border-none rounded-[24px] focus:ring-2 focus:ring-[#FF6A00]/20 transition-all"
          />
          <button
            type="submit"
            className="p-4 bg-[#FF6A00] text-white rounded-[24px] shadow-lg shadow-orange-200 hover:scale-105 active:scale-95 transition-all"
          >
            <Send size={24} />
          </button>
        </form>
      </div>

      {/* Calling Overlay */}
      {calling && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-between p-12 text-center animate-in fade-in duration-300">
          <div className="pt-12">
            <div className="w-32 h-32 rounded-[40px] bg-slate-800 overflow-hidden border-4 border-white/10 mx-auto mb-8 shadow-2xl">
              {otherUser?.photo ? (
                <img src={otherUser.photo} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <User size={64} />
                </div>
              )}
            </div>
            <h2 className="text-3xl font-black text-white mb-2">{otherUser?.name || 'User'}</h2>
            <p className="text-emerald-500 font-bold uppercase tracking-widest text-sm animate-pulse">
              {calling === 'audio' ? 'Voice Calling...' : 'Video Calling...'}
            </p>
          </div>

          {calling === 'video' && (
            <div className="flex-1 w-full max-w-sm rounded-[32px] bg-slate-800/50 my-12 relative overflow-hidden border border-white/5">
              <div className="absolute inset-0 flex items-center justify-center">
                <VideoOff size={64} className="text-slate-700" />
              </div>
              <div className="absolute bottom-6 right-6 w-32 h-44 bg-slate-700 rounded-2xl border-2 border-white/10 shadow-xl" />
            </div>
          )}

          <div className="flex items-center gap-8 pb-12">
            <button className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-colors">
              <Mic size={24} />
            </button>
            <button 
              onClick={() => setCalling(null)}
              className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-90"
            >
              <PhoneOff size={32} />
            </button>
            <button className="w-16 h-16 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-colors">
              <VideoOff size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
