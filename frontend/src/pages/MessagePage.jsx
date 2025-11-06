// src/pages/MessagePage.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UseAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import messageService from '../services/message';
import chatRoomService from '../services/chatRoom';
import { userService } from '../services/user';
import Loading from '../components/ui/Loading';
import './MessagePage.css';

const MessagePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = UseAuth();
  const { t } = useLanguage();
  
  // State
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  
  // ✅ NEW: Pagination & Add Member state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberSearchSuggestions, setMemberSearchSuggestions] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [roomMembers, setRoomMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(null); // Track which avatar dropdown is open (user_id)

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasInitialized = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 3;
  const isReconnectingRef = useRef(false);
  const handlersRegisteredRef = useRef(false);
  const isLoadingMoreRef = useRef(false); // Prevent duplicate load more

  // ✅ Auto scroll to bottom (only for new messages, not when loading more)
  useEffect(() => {
    if (!loadingMore && messagesEndRef.current && messages.length > 0) {
      // Only auto-scroll if not loading more messages
      const container = messagesContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        // Only scroll if user is near bottom (new message came in)
        if (isNearBottom) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    }
  }, [messages, loadingMore]);

  // ✅ Force scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0 && messagesContainerRef.current) {
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 300);
    }
  }, [loading, messages.length]);

  // ✅ Handle new message
  const handleNewMessage = useCallback((message) => {
    console.log('📨 New message:', message);
    
    if (message.room_id !== parseInt(roomId)) return;

    setMessages(prev => {
      if (prev.find(m => m.id === message.id)) return prev;
      return [...prev, message];
    });
  }, [roomId]);

  // ✅ Handle message deleted
  const handleMessageDeleted = useCallback((data) => {
    console.log('🗑️ Message deleted:', data);
    if (data.room_id !== parseInt(roomId)) return;
    setMessages(prev => prev.filter(m => m.id !== data.message_id));
  }, [roomId]);

  // ✅ Handle message updated
  const handleMessageUpdated = useCallback((message) => {
    console.log('✏️ Message updated:', message);
    if (message.room_id !== parseInt(roomId)) return;
    setMessages(prev => prev.map(m => m.id === message.id ? message : m));
  }, [roomId]);

  // ✅ Handle typing
  const handleUserTyping = useCallback((data) => {
    if (data.room_id !== parseInt(roomId)) return;
    if (data.user_id === user?.id) return;

    setTypingUser(data.username);
    setIsTyping(data.is_typing);

    if (data.is_typing) {
      setTimeout(() => {
        setIsTyping(false);
        setTypingUser(null);
      }, 3000);
    }
  }, [roomId, user]);

  // ✅ Handle reconnect - MUST be defined before setupSocket
  const handleReconnect = useCallback(async () => {
    // Prevent duplicate reconnect attempts
    if (isReconnectingRef.current) {
      console.log('⏳ Reconnection already in progress, skipping...');
      return;
    }

    // If already connected, don't reconnect
    if (messageService.isSocketConnected()) {
      console.log('✅ Socket already connected, skipping reconnect');
      reconnectAttemptRef.current = 0;
      isReconnectingRef.current = false;
      return;
    }

    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      setError(t("connectionLost"));
      return;
    }

    isReconnectingRef.current = true;
    reconnectAttemptRef.current++;
    setError(`Reconnecting (${reconnectAttemptRef.current}/${maxReconnectAttempts})...`);

    await new Promise(r => setTimeout(r, 2000));
    
    try {
      setSocketStatus('connecting');
      console.log('🔌 Reconnecting socket...');

      // Don't disconnect if already connected - this causes infinite loop
      // Only reconnect if not connected
      if (!messageService.isSocketConnected()) {
        // Disconnect any existing socket in bad state
        const socket = messageService.socket;
        if (socket && socket.disconnected) {
          // Socket exists but is disconnected, clean it up
          try {
            messageService.disconnectSocket();
            await new Promise(r => setTimeout(r, 300));
          } catch (e) {
            // Ignore disconnect errors
          }
        }

        // Now reconnect
        await messageService.connectSocket(token);
        await new Promise(r => setTimeout(r, 800)); // Wait longer for reconnection and auth
      }

      if (!messageService.isSocketConnected()) {
        throw new Error('Socket reconnection failed');
      }

      console.log('✅ Socket reconnected');
      setSocketStatus('connected');

      // Wait for session to be ready on backend
      await new Promise(r => setTimeout(r, 500));

      // Rejoin room - but only if not already joining/in room
      console.log(`🎯 Rejoining room ${roomId}...`);
      try {
        await messageService.joinRoom(roomId);
        console.log('✅ Room rejoined');
        reconnectAttemptRef.current = 0;
        setError('');
      } catch (joinErr) {
        console.error('❌ Failed to rejoin room:', joinErr);
        // Don't set error if it's just a duplicate join
        if (!joinErr.message.includes('already')) {
          setError(`Reconnected but failed to rejoin room: ${joinErr.message}`);
        } else {
          reconnectAttemptRef.current = 0;
          setError('');
        }
      }

    } catch (err) {
      console.error('❌ Reconnect failed:', err);
      setSocketStatus('error');
      if (reconnectAttemptRef.current >= maxReconnectAttempts) {
        setError(t("connectionLost"));
      }
    } finally {
      isReconnectingRef.current = false;
    }
  }, [token, roomId]);

  // ✅ Setup socket connection
  const setupSocket = useCallback(async () => {
    if (!token) {
      setError('Authentication required');
      return;
    }

    try {
      setSocketStatus('connecting');
      console.log('🔌 Connecting socket...');

      // ✅ Leave old room if connected and in a different room
      if (messageService.isSocketConnected()) {
        const currentRoom = messageService.getCurrentRoomId();
        if (currentRoom && currentRoom !== parseInt(roomId)) {
          console.log(`🚪 Leaving old room ${currentRoom} before joining ${roomId}`);
          messageService.leaveRoom(currentRoom);
          await new Promise(r => setTimeout(r, 200));
        }
      } else {
        // Disconnect old socket if not connected
        messageService.disconnectSocket();
        await new Promise(r => setTimeout(r, 300));
      }

      // Connect (or already connected)
      if (!messageService.isSocketConnected()) {
        await messageService.connectSocket(token);
        await new Promise(r => setTimeout(r, 500)); // Wait longer for auth to complete
      }

      if (!messageService.isSocketConnected()) {
        throw new Error('Socket connection failed');
      }

      console.log('✅ Socket connected');
      setSocketStatus('connected');

      // Wait a bit more for session to be established on backend
      await new Promise(r => setTimeout(r, 300));

      // ✅ Join room (will auto-leave old room if needed)
      console.log(`🎯 Joining room ${roomId}...`);
      try {
        await messageService.joinRoom(roomId);
        console.log('✅ Room joined');
      } catch (joinErr) {
        console.error('❌ Failed to join room:', joinErr);
        // Don't throw - let it retry
        setError(`${t("failedToJoinRoom")}: ${joinErr.message}`);
      }

      // Register listeners (only once)
      if (!handlersRegisteredRef.current) {
        messageService.on('new_message', handleNewMessage);
        messageService.on('message_deleted', handleMessageDeleted);
        messageService.on('message_updated', handleMessageUpdated);
        messageService.on('user_typing', handleUserTyping);

                 // Store handler references to remove them later
         const onDisconnected = () => {
           console.log('🔌 Socket disconnected');
           
           // Don't trigger reconnect if already reconnecting or if it was a manual disconnect
           if (isReconnectingRef.current) {
             console.log('⏳ Already reconnecting, skipping disconnected handler');
             return;
           }
           
           setSocketStatus('disconnected');
           // Don't reset reconnect flag here - let handleReconnect manage it
           handleReconnect();
         };

        const onConnected = () => {
          console.log('✅ Socket reconnected event received');
          setSocketStatus('connected');
          setError('');
          reconnectAttemptRef.current = 0;
          isReconnectingRef.current = false; // Reset reconnect flag
          
          // Don't auto-rejoin here - let handleReconnect handle it
          // This prevents duplicate joins when both auto-rejoin and manual rejoin happen
        };

        messageService.on('disconnected', onDisconnected);
        messageService.on('connected', onConnected);
        handlersRegisteredRef.current = true;
      }

    } catch (err) {
      console.error('❌ Socket error:', err);
      setSocketStatus('error');
      setError(t("failedToConnect"));
    }
  }, [token, roomId, handleNewMessage, handleMessageDeleted, handleMessageUpdated, handleUserTyping, handleReconnect]);

  // ✅ Initialize room
  const initRoom = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚀 Initializing room...');

      // 1. Get room details
      const roomRes = await chatRoomService.getRoomDetails(roomId);
      const roomData = roomRes.room;
      
      console.log('📋 Room:', roomData.name, {
        isPublic: roomData.is_public,
        isMember: roomData.is_member
      });
      
      // Store members list
      if (roomData.members) {
        setRoomMembers(roomData.members);
      }

      // 2. Auto-join public room
      if (roomData.is_public && !roomData.is_member && !roomData.is_global) {
        console.log('🎯 Auto-joining public room...');
        await chatRoomService.joinRoom(roomId);
        const updated = await chatRoomService.getRoomDetails(roomId);
        setRoom(updated.room);
      } else {
        setRoom(roomData);
      }

      // 3. Load messages (only 10 most recent)
      console.log('📨 Loading messages...');
      const msgRes = await messageService.getRoomMessages(roomId, 1, 10); // Load 10 messages
      setMessages(msgRes.messages || []);
      
      // Check if there are more messages
      const pagination = msgRes.pagination;
      if (pagination) {
        setHasMoreMessages(pagination.page < pagination.pages);
        setCurrentPage(1);
      } else {
        setHasMoreMessages(false);
      }
      
      console.log(`✅ Loaded ${msgRes.messages?.length || 0} messages`);
      
      // Scroll to bottom after initial load - ensure it scrolls properly
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
        // Also try scrolling container
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 200);

      // 4. Setup socket
      await setupSocket();

      console.log('🎉 Initialization complete');

    } catch (err) {
      console.error('❌ Init error:', err);
      setError(err.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId, setupSocket]);

  // ✅ Main effect - reinitialize when roomId changes
  useEffect(() => {
    console.log('📍 MessagePage mounted/roomId changed:', roomId);

    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }

    if (!roomId) {
      setError('Room ID required');
      setLoading(false);
      return;
    }

    // Reset initialization flag when roomId changes
    hasInitialized.current = false;

    // Clear previous room's online users
    setOnlineUsers(new Set());

    // Initialize new room
    hasInitialized.current = true;
    initRoom();

    return () => {
      console.log('🧹 Cleanup for room:', roomId);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      messageService.off('new_message', handleNewMessage);
      messageService.off('message_deleted', handleMessageDeleted);
      messageService.off('message_updated', handleMessageUpdated);
      messageService.off('user_typing', handleUserTyping);

      // Leave room and clear online users
      if (messageService.isSocketConnected() && roomId) {
        messageService.leaveRoom(roomId);
      }
      
      setOnlineUsers(new Set());

      handlersRegisteredRef.current = false; // Reset for next mount
      isReconnectingRef.current = false; // Reset reconnect flag
    };
  }, [roomId]);

  // ✅ Handle typing
  const onTyping = useCallback(() => {
    if (!messageService.isSocketConnected()) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    messageService.sendTyping(roomId, true);

    typingTimeoutRef.current = setTimeout(() => {
      messageService.sendTyping(roomId, false);
    }, 2000);
  }, [roomId]);

  // ✅ Send message
  const handleSend = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    
    try {
      setSending(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      messageService.sendTyping(roomId, false);

      // Send via REST (socket will broadcast)
      await messageService.sendMessage(roomId, content);
      
      setNewMessage('');
      console.log('✅ Message sent');

    } catch (err) {
      console.error('❌ Send error:', err);
      setError(err.message || t("failedToSend") || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  // ✅ Retry connection
  const retry = async () => {
    reconnectAttemptRef.current = 0;
    setError('');
    await setupSocket();
  };

  // ✅ Delete message
  const handleDelete = async (msgId) => {
    if (!window.confirm(t("deleteConfirm"))) return;

    try {
      await messageService.deleteMessage(msgId);
      console.log('✅ Message deleted');
    } catch (err) {
      console.error('❌ Delete error:', err);
      setError(err.message || 'Failed to delete');
    }
  };

  // ✅ Load more messages (infinite scroll)
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreMessages || loadingMore) {
      return;
    }

    isLoadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const container = messagesContainerRef.current;
      const scrollHeightBefore = container ? container.scrollHeight : 0;
      
      const nextPage = currentPage + 1;
      console.log(`📜 Loading page ${nextPage}...`);
      
      const msgRes = await messageService.getRoomMessages(roomId, nextPage, 10);
      
      if (msgRes.messages && msgRes.messages.length > 0) {
        // Messages from backend are already in chronological order (oldest to newest)
        // Prepend older messages to the beginning
        setMessages(prev => [...msgRes.messages, ...prev]);
        setCurrentPage(nextPage);
        
        const pagination = msgRes.pagination;
        if (pagination) {
          setHasMoreMessages(pagination.page < pagination.pages);
        } else {
          setHasMoreMessages(false);
        }
        
        // Preserve scroll position after loading more
        if (container) {
          const scrollHeightAfter = container.scrollHeight;
          const scrollDiff = scrollHeightAfter - scrollHeightBefore;
          container.scrollTop += scrollDiff;
        }
        
        console.log(`✅ Loaded ${msgRes.messages.length} more messages`);
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('❌ Failed to load more messages:', err);
      setError(t("failedToLoadOlderMessages"));
    } finally {
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [roomId, currentPage, hasMoreMessages, loadingMore]);

  // ✅ Scroll handler for infinite scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Check if scrolled near top (within 100px)
      if (container.scrollTop < 100 && hasMoreMessages && !loadingMore && !isLoadingMoreRef.current) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMoreMessages, loadingMore, loadMoreMessages]);

  // ✅ Search members with debounce
  const searchMembersDebounce = useRef(null);
  const handleMemberSearch = useCallback(async (query) => {
    if (searchMembersDebounce.current) {
      clearTimeout(searchMembersDebounce.current);
    }

    if (!query || query.trim().length < 2) {
      setMemberSearchSuggestions([]);
      return;
    }

    searchMembersDebounce.current = setTimeout(async () => {
      try {
        setSearchingMembers(true);
        const response = await userService.searchUsers(query.trim(), 8);
        setMemberSearchSuggestions(response.suggestions || []);
      } catch (err) {
        console.error('❌ Search members error:', err);
        setMemberSearchSuggestions([]);
      } finally {
        setSearchingMembers(false);
      }
    }, 400);
  }, []);

  // ✅ Handle member search input change
  const handleMemberSearchInputChange = (e) => {
    const value = e.target.value;
    setNewMemberUsername(value);
    handleMemberSearch(value);
  };

  // ✅ Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setNewMemberUsername(suggestion.username);
    setMemberSearchSuggestions([]);
  };

  // ✅ Reload room members function
  const reloadRoomMembers = useCallback(async () => {
    if (!roomId) return;
    try {
      const roomRes = await chatRoomService.getRoomDetails(roomId);
      if (roomRes.room?.members) {
        setRoomMembers(roomRes.room.members);
        console.log('✅ Reloaded room members:', roomRes.room.members.length);
      }
    } catch (err) {
      console.error('❌ Failed to reload room members:', err);
    }
  }, [roomId]);

  // ✅ Track online users via socket and auto-reload members
  useEffect(() => {
    if (!messageService.isSocketConnected() || !user || !roomId) return;

    // ✅ Reset online users when roomId changes
    setOnlineUsers(new Set([user.id]));

    const handleUserOnline = async (data) => {
      if (data.room_id === parseInt(roomId)) {
        console.log(`🟢 User ${data.user_id} came online in room ${roomId}`);
        setOnlineUsers(prev => new Set([...prev, data.user_id]));
        // ✅ Reload members list when user comes online (might be new member)
        await reloadRoomMembers();
      }
    };

    const handleUserOffline = (data) => {
      if (data.room_id === parseInt(roomId)) {
        console.log(`🔴 User ${data.user_id} went offline in room ${roomId}`);
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.user_id);
          return newSet;
        });
      }
    };

    // Listen for user presence events
    messageService.on('user_online', handleUserOnline);
    messageService.on('user_offline', handleUserOffline);
    
    // Also listen for room_joined to mark current user online and get list of online users
    const handleRoomJoined = async (data) => {
      if (data.room_id === parseInt(roomId) && user) {
        console.log(`✅ Joined room ${roomId}, setting online users`);
        // Start with current user and add all online users from the room
        const newOnlineUsers = new Set([user.id]);
        
        // Add all online users from the room to the online users set
        if (data.online_users && Array.isArray(data.online_users)) {
          data.online_users.forEach(onlineUser => {
            newOnlineUsers.add(onlineUser.user_id);
          });
          console.log(`✅ Received ${data.online_users.length} online users in room ${data.room_id}`);
        }
        
        setOnlineUsers(newOnlineUsers);
        // ✅ Reload members when joining room
        await reloadRoomMembers();
      }
    };
    messageService.on('room_joined', handleRoomJoined);

    // ✅ Listen for new member joined event
    const handleMemberJoined = async (data) => {
      if (data.room_id === parseInt(roomId)) {
        console.log(`👤 New member ${data.username} joined room ${roomId}`);
        // Reload members list to show new member
        await reloadRoomMembers();
        // Mark user as online
        setOnlineUsers(prev => new Set([...prev, data.user_id]));
      }
    };
    messageService.on('member_joined', handleMemberJoined);

    // ✅ Periodic refresh of members list (every 10 seconds)
    const membersRefreshInterval = setInterval(() => {
      reloadRoomMembers();
    }, 10000);

    return () => {
      messageService.off('user_online', handleUserOnline);
      messageService.off('user_offline', handleUserOffline);
      messageService.off('room_joined', handleRoomJoined);
      messageService.off('member_joined', handleMemberJoined);
      clearInterval(membersRefreshInterval);
      // Clear online users when leaving room
      console.log(`🧹 Cleaning up online users for room ${roomId}`);
      setOnlineUsers(new Set());
    };
  }, [roomId, user, socketStatus, reloadRoomMembers]);

  // ✅ Add member to private room
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberUsername.trim()) return;

    try {
      setAddingMember(true);
      setError('');
      
      await chatRoomService.addMember(roomId, newMemberUsername.trim());
      
      // Refresh room details
      const roomRes = await chatRoomService.getRoomDetails(roomId);
      setRoom(roomRes.room);
      // Update members list
      if (roomRes.room.members) {
        setRoomMembers(roomRes.room.members);
      }
      
      setNewMemberUsername('');
      setShowAddMemberModal(false);
      console.log('✅ Member added successfully');
    } catch (err) {
      console.error('❌ Failed to add member:', err);
      setError(err.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  // Check if user can add members (owner or admin of private room)
  const canAddMembers = room && !room.is_public && !room.is_global && 
    (room.your_role === 'owner' || room.your_role === 'admin');

  // Check if user can delete room (owner only)
  const canDeleteRoom = room && !room.is_global && room.your_role === 'owner';

  // Check if user can kick members (owner or admin)
  const canKickMembers = room && !room.is_global && 
    (room.your_role === 'owner' || room.your_role === 'admin');

  // Handle delete room
  const handleDeleteRoom = async () => {
    if (!window.confirm(`⚠️ ${t("deleteRoomConfirm")} "${room.name}"?\n\n${t("deleteRoomDetails")}\n• ${t("allMessages")}\n• ${t("allMembers")}\n• ${t("theRoomItself")}\n\n${t("cannotBeUndone")}`)) {
      return;
    }

    try {
      await chatRoomService.deleteRoom(roomId);
      navigate('/chat');
    } catch (err) {
      console.error('❌ Failed to delete room:', err);
      setError(err.message || 'Failed to delete room');
    }
  };

  // Handle kick member
  const handleKickMember = async (memberId, memberUsername, e) => {
    e.stopPropagation();
    
    if (!window.confirm(`${t("areYouSureRemove")} "${memberUsername}" ${t("fromThisRoom")}`)) {
      return;
    }

    try {
      await chatRoomService.removeMember(roomId, memberId);
      // Refresh room details to update members list
      const roomRes = await chatRoomService.getRoomDetails(roomId);
      setRoom(roomRes.room);
      if (roomRes.room.members) {
        setRoomMembers(roomRes.room.members);
      }
      console.log('✅ Member kicked successfully');
    } catch (err) {
      console.error('❌ Failed to kick member:', err);
      setError(err.message || 'Failed to remove member');
    }
  };

  // Handle avatar click - show dropdown
  const handleAvatarClick = (e, userId) => {
    e.stopPropagation();
    // Only show dropdown for other users' avatars
    if (userId !== user?.id) {
      setAvatarDropdownOpen(avatarDropdownOpen === userId ? null : userId);
    }
  };

  // Handle view profile
  const handleViewProfile = (username) => {
    setAvatarDropdownOpen(null);
    navigate(`/profile/${username}`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.avatar-dropdown') && !e.target.closest('.avatar-clickable')) {
        setAvatarDropdownOpen(null);
      }
    };

    if (avatarDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [avatarDropdownOpen]);

  // Render loading
  if (loading) {
    return (
      <div className="message-page">
        <Loading message={t("loadingRoom")} />
      </div>
    );
  }

  // Render no room
  if (!room) {
    return (
      <div className="message-page error">
        <div className="error-container">
          <h3>❌ {t("roomNotFound")}</h3>
          <p>{error || t("accessDenied")}</p>
          <button onClick={() => navigate('/chat')} className="btn btn-primary">
            ← {t("backToChat")}
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="message-page">
      {/* Left Sidebar - Members List */}
      <div className="members-sidebar">
        <div className="members-header">
          <h3>👥 {t("members")} ({roomMembers.length})</h3>
        </div>
        <div className="members-list">
          {roomMembers.length === 0 ? (
            <div className="no-members">{t("noMembersYet")}</div>
          ) : (
            roomMembers.map((member) => {
              const isOnline = onlineUsers.has(member.user_id);
              return (
                <div key={member.user_id} className="member-item">
                  <div className="member-avatar-wrapper">
                    <img 
                      src={member.avatar_url || '/default-avatar.png'} 
                      alt={member.username}
                      className="member-avatar"
                    />
                    <div className={`online-indicator ${isOnline ? 'online' : 'offline'}`}></div>
                  </div>
                  <div className="member-info">
                    <div className="member-username">
                      {member.username}
                      {member.user_id === user?.id && ` ${t("you")}`}
                    </div>
                    <div className="member-role">
                      {member.role === 'owner' && `👑 ${t("owner")}`}
                      {member.role === 'admin' && `🛡️ ${t("admin")}`}
                      {member.role === 'member' && `👤 ${t("member")}`}
                    </div>
                  </div>
                  <div className="member-actions">
                    <div className="member-status">
                      {isOnline ? (
                        <span className="status-online">🟢 {t("online")}</span>
                      ) : (
                        <span className="status-offline">⚫ {t("offline")}</span>
                      )}
                    </div>
                    {/* Kick button - only for admin/owner, not for yourself or owner */}
                    {canKickMembers && 
                     member.user_id !== user?.id && 
                     member.role !== 'owner' && (
                      <button
                        onClick={(e) => handleKickMember(member.user_id, member.username, e)}
                        className="kick-member-btn"
                        title={`${t("removeFromRoom")} ${member.username}`}
                      >
                        🚪
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="message-content">
      {/* Header */}
      <div className="message-header">
        <button onClick={() => navigate('/chat')} className="back-btn">
          ← {t("back")}
        </button>
        <div className="room-info">
          <h2>{room.name}</h2>
          <div className="room-meta">
            {room.is_global && <span className="badge global">🌍 {t("global")}</span>}
            {room.is_public && !room.is_global && <span className="badge public">🌐 {t("public")}</span>}
            {!room.is_public && !room.is_global && <span className="badge private">🔒 {t("private")}</span>}
            <span className="members">👥 {room.member_count}</span>
          </div>
        </div>
        
        <div className="header-actions">
          {/* Add Member button - only for private room owner/admin */}
          {canAddMembers && (
            <button 
              onClick={() => setShowAddMemberModal(true)}
              className="btn btn-outline add-member-btn"
              title={t("addMember")}
            >
              + {t("addMember")}
            </button>
          )}
          
          {/* Delete Room button - only for owner */}
          {canDeleteRoom && (
            <button 
              onClick={handleDeleteRoom}
              className="btn btn-danger delete-room-header-btn"
              title={t("deleteRoomHeaderTitle")}
            >
              🗑️ {t("deleteRoomHeader")}
            </button>
          )}
          
          {/* Socket status */}
          <div className={`socket-status ${socketStatus}`}>
            {socketStatus === 'connected' && `🟢 ${t("connected")}`}
            {socketStatus === 'connecting' && `🟡 ${t("connecting")}`}
            {socketStatus === 'disconnected' && `🔴 ${t("disconnected")}`}
            {socketStatus === 'error' && `🔴 ${t("errorStatus")}`}
            {socketStatus === 'disconnected' && (
              <button onClick={retry} className="retry-btn">🔄 {t("retry")}</button>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      {/* Messages */}
      <div className="messages-container" ref={messagesContainerRef}>
        {/* Loading indicator for loading more messages */}
        {loadingMore && (
          <div className="load-more-indicator">
            <span>📜 {t("loadingMoreMessages")}</span>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>💬 {t("noMessages")}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message ${msg.user?.id === user?.id ? 'own' : 'other'}`}
            >
              <div className="avatar-wrapper">
                <img 
                  src={msg.user?.avatar_url || '/default-avatar.png'} 
                  alt={msg.user?.username}
                  className={`avatar ${msg.user?.id !== user?.id ? 'avatar-clickable' : ''}`}
                  onClick={(e) => msg.user?.id !== user?.id && handleAvatarClick(e, msg.user?.id)}
                  style={{ cursor: msg.user?.id !== user?.id ? 'pointer' : 'default' }}
                />
                {avatarDropdownOpen === msg.user?.id && msg.user?.id !== user?.id && (
                  <div className="avatar-dropdown">
                    <button 
                      className="dropdown-item"
                      onClick={() => handleViewProfile(msg.user?.username)}
                    >
                      👤 {t("profile")}
                    </button>
                  </div>
                )}
              </div>
              <div className="message-body">
                <div className="message-info">
                  <span className="username">
                    {msg.user?.username}
                    {msg.user?.id === user?.id && ` ${t("you")}`}
                  </span>
                  <span className="time">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="message-content">
                  {msg.content}
                  {msg.image_url && (
                    <img src={msg.image_url} alt="Attached" className="message-image" />
                  )}
                </div>
                {msg.user?.id === user?.id && (
                  <button 
                    onClick={() => handleDelete(msg.id)}
                    className="delete-btn"
                    title={t("delete") + " " + t("messages").toLowerCase()}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {isTyping && typingUser && (
          <div className="typing-indicator">
            <span>{typingUser} {t("isTyping")}</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSend} className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            onTyping();
          }}
          placeholder={
            socketStatus === 'connected' 
              ? t("typeAMessage") 
              : t("connecting")
          }
          disabled={sending || socketStatus !== 'connected'}
          maxLength={1000}
          className="input"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim() || socketStatus !== 'connected'}
          className="send-btn"
        >
          {sending ? '⏳' : '📤'}
        </button>
      </form>

      {socketStatus !== 'connected' && (
        <div className="connection-warning">
          ⚠️ Not connected to chat
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddMemberModal(false);
          setMemberSearchSuggestions([]);
        }}>
          <div className="modal add-member-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("addMember")}</h3>
              <button 
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMemberSearchSuggestions([]);
                }} 
                className="close-button"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddMember} className="modal-body">
              <div className="form-group search-member-group">
                <label>{t("searchUsers")}</label>
                <div className="member-search-wrapper">
                  <input
                    type="text"
                    value={newMemberUsername}
                    onChange={handleMemberSearchInputChange}
                    placeholder={t("searchUsers")}
                    required
                    autoFocus
                    className="member-search-input"
                  />
                  {searchingMembers && (
                    <div className="search-loading">🔍 {t("loading")}...</div>
                  )}
                  
                  {/* Search Suggestions */}
                  {memberSearchSuggestions.length > 0 && (
                    <div className="member-suggestions">
                      {memberSearchSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="member-suggestion-item"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <img 
                            src={suggestion.avatar_url || '/default-avatar.png'} 
                            alt={suggestion.username}
                            className="suggestion-avatar"
                          />
                          <div className="suggestion-info">
                            <div className="suggestion-username">{suggestion.username}</div>
                          </div>
                          <div className="suggestion-arrow">→</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setMemberSearchSuggestions([]);
                  }} 
                  className="btn btn-secondary"
                >
                  {t("cancel")}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={!newMemberUsername.trim() || addingMember}
                >
                  {addingMember ? t("adding") : t("addMember")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default MessagePage;