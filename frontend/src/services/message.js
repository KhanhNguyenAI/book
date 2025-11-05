// services/message.js - FIXED TOKEN PASSING
import api from './axios';
import { io } from 'socket.io-client';

class MessageService {
  constructor() {
    this.socket = null;
    this.isConnecting = false;
    this.eventListeners = new Map();
    this.currentRoomId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isJoiningRoom = false; // Flag to prevent duplicate joins
    this.joinRoomQueue = null; // Queue for pending join operations
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      listeners.delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in listener ${event}:`, error);
        }
      });
    }
  }

  // ✅ CRITICAL FIX: Pass token in query string AND auth
  async connectSocket(token) {
    if (this.isConnecting) {
      console.log('⏳ Connection already in progress...');
      return;
    }

    if (this.socket?.connected) {
      console.log('✅ Socket already connected');
      return;
    }

    try {
      this.isConnecting = true;
      console.log('🔌 Starting socket connection...');

      // Clean token
      const cleanToken = token?.startsWith('Bearer ') ? token.slice(7) : token;
      
      if (!cleanToken) {
        throw new Error('No authentication token provided');
      }

      console.log('🔑 Token preview:', cleanToken.substring(0, 30) + '...');

      const socketUrl = 'http://localhost:5000';

      // ✅ CRITICAL: Pass token in BOTH query string AND auth
      this.socket = io(`${socketUrl}/chat`, {
        query: {
          token: cleanToken  // ✅ This is what backend reads!
        },
        auth: { 
          token: cleanToken  // ✅ Backup method
        },
        extraHeaders: {
          'Authorization': `Bearer ${cleanToken}`  // ✅ Another backup
        },
        transports: ['websocket', 'polling'],
        reconnection: false, // ✅ Disable auto-reconnect - use manual reconnect instead
        timeout: 10000,
        forceNew: true
      });

      console.log('🔗 Socket config:', {
        url: `${socketUrl}/chat`,
        hasQuery: true,
        hasAuth: true,
        hasHeaders: true
      });

      this.setupSocketHandlers();
      await this.waitForConnection();

      console.log('✅ Socket connected successfully');
      this.reconnectAttempts = 0;

    } catch (error) {
      console.error('❌ Socket connection failed:', error);
      this.isConnecting = false;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 12000);

      const onConnect = () => {
        clearTimeout(timeout);
        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onError);
        resolve();
      };

      const onError = (error) => {
        clearTimeout(timeout);
        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onError);
        reject(error);
      };

      if (this.socket.connected) {
        clearTimeout(timeout);
        resolve();
      } else {
        this.socket.once('connect', onConnect);
        this.socket.once('connect_error', onError);
      }
    });
  }

  setupSocketHandlers() {
    if (!this.socket) return;

    // Remove existing handlers to prevent duplicates
    this.socket.off('connect');
    this.socket.off('disconnect');
    this.socket.off('connect_error');
    this.socket.off('unauthorized');
    this.socket.off('room_joined');
    this.socket.off('room_left');
    this.socket.off('room_error');
    this.socket.off('new_message');
    this.socket.off('message_deleted');
    this.socket.off('message_updated');
    this.socket.off('user_typing');
    this.socket.off('room_invitation');
    this.socket.off('member_joined');
    this.socket.off('user_online');
    this.socket.off('user_offline');
    this.socket.off('error');

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      console.log('📡 Socket ID:', this.socket.id);
      this.reconnectAttempts = 0;
      this.isJoiningRoom = false; // Reset join flag on reconnect
      this.emit('connected', { socketId: this.socket.id });

      // Don't auto-rejoin here - let the component handle it
      // This prevents duplicate joins when both auto-rejoin and manual rejoin happen
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.emit('disconnected', { reason });

      // Don't auto-reconnect here - let the component handle it
      // This prevents conflicts with manual reconnect logic
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.reconnectAttempts++;
      this.emit('connect_error', error);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        this.emit('max_reconnect_attempts');
      }
    });

    this.socket.on('unauthorized', (data) => {
      console.error('❌ Unauthorized:', data);
      this.emit('unauthorized', data);
    });

    this.socket.on('room_joined', (data) => {
      console.log('✅ Room joined:', data);
      this.emit('room_joined', data);
    });

    this.socket.on('room_left', (data) => {
      console.log('👋 Room left:', data);
      this.emit('room_left', data);
    });

    this.socket.on('room_error', (data) => {
      console.error('❌ Room error:', data);
      this.emit('room_error', data);
    });

    this.socket.on('new_message', (data) => {
      console.log('📨 New message received:', data);
      this.emit('new_message', data);
    });

    this.socket.on('message_deleted', (data) => {
      console.log('🗑️ Message deleted:', data);
      this.emit('message_deleted', data);
    });

    this.socket.on('message_updated', (data) => {
      console.log('✏️ Message updated:', data);
      this.emit('message_updated', data);
    });

    this.socket.on('user_typing', (data) => {
      this.emit('user_typing', data);
    });

    // ✅ Listen for room invitation
    this.socket.on('room_invitation', (data) => {
      console.log('📬 Room invitation received:', data);
      this.emit('room_invitation', data);
    });

    // ✅ Listen for member joined
    this.socket.on('member_joined', (data) => {
      console.log('👤 Member joined:', data);
      this.emit('member_joined', data);
    });

    // ✅ Listen for user online/offline
    this.socket.on('user_online', (data) => {
      this.emit('user_online', data);
    });

    this.socket.on('user_offline', (data) => {
      this.emit('user_offline', data);
    });

    this.socket.on('error', (data) => {
      console.error('❌ Socket error:', data);
      this.emit('error', data);
    });
  }

  async joinRoom(roomId) {
    if (!this.isSocketConnected()) {
      throw new Error('Socket not connected');
    }

    // Prevent duplicate join attempts
    if (this.isJoiningRoom && this.currentRoomId === parseInt(roomId)) {
      console.log(`⏳ Already joining room ${roomId}, waiting...`);
      // Wait for current join to complete
      while (this.isJoiningRoom) {
        await new Promise(r => setTimeout(r, 100));
      }
      // Check if we successfully joined
      if (this.currentRoomId === parseInt(roomId)) {
        console.log(`✅ Already in room ${roomId}`);
        return { success: true, room_id: parseInt(roomId) };
      }
    }

    // If already in this room, return success
    if (this.currentRoomId === parseInt(roomId) && !this.isJoiningRoom) {
      console.log(`✅ Already in room ${roomId}`);
      return { success: true, room_id: parseInt(roomId) };
    }

    this.isJoiningRoom = true;
    console.log(`🎯 Joining room: ${roomId}`);

    try {
      const result = await new Promise((resolve, reject) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            this.isJoiningRoom = false;
            this.socket.off('room_joined', onRoomJoined);
            this.socket.off('room_error', onRoomError);
            reject(new Error('Room join timeout'));
          }
        }, 8000); // Increased timeout for reconnection scenarios

        const onRoomJoined = (data) => {
          if (!resolved && data.room_id === parseInt(roomId)) {
            resolved = true;
            clearTimeout(timeout);
            this.socket.off('room_joined', onRoomJoined);
            this.socket.off('room_error', onRoomError);
            this.currentRoomId = parseInt(roomId);
            this.isJoiningRoom = false;
            console.log('✅ Successfully joined room:', roomId);
            resolve(data);
          }
        };

        const onRoomError = (data) => {
          // Match by room_id if provided, or accept if no room_id (general error)
          const matches = data.room_id === parseInt(roomId) || data.room_id === null || data.room_id === undefined;
          if (!resolved && matches) {
            resolved = true;
            clearTimeout(timeout);
            this.socket.off('room_joined', onRoomJoined);
            this.socket.off('room_error', onRoomError);
            this.isJoiningRoom = false;
            console.error('❌ Failed to join room:', data.message);
            reject(new Error(data.message || 'Failed to join room'));
          }
        };

        this.socket.once('room_joined', onRoomJoined);
        this.socket.once('room_error', onRoomError);

        this.socket.emit('join_room', { room_id: parseInt(roomId) }, (response) => {
          if (resolved) return;
          
          if (response?.error || response?.success === false) {
            resolved = true;
            clearTimeout(timeout);
            this.socket.off('room_joined', onRoomJoined);
            this.socket.off('room_error', onRoomError);
            this.isJoiningRoom = false;
            console.error('❌ Failed to join room:', response.error || response.message);
            reject(new Error(response.error || response.message || 'Failed to join room'));
          } else if (response?.success === true) {
            // Callback indicates success, but wait for room_joined event for consistency
            // If event doesn't come, we'll still have the callback response
            setTimeout(() => {
              if (!resolved) {
                // If event hasn't fired yet, accept the callback
                resolved = true;
                clearTimeout(timeout);
                this.socket.off('room_joined', onRoomJoined);
                this.socket.off('room_error', onRoomError);
                this.currentRoomId = parseInt(roomId);
                this.isJoiningRoom = false;
                console.log('✅ Successfully joined room (via callback):', roomId);
                resolve(response);
              }
            }, 500);
          }
        });
      });

      return result;
    } catch (error) {
      this.isJoiningRoom = false;
      throw error;
    }
  }

  getCurrentRoomId() {
    return this.currentRoomId;
  }

  leaveRoom(roomId) {
    if (this.isSocketConnected()) {
      console.log(`🚪 Leaving room: ${roomId}`);
      this.socket.emit('leave_room', { room_id: parseInt(roomId) });
      
      if (this.currentRoomId === parseInt(roomId)) {
        this.currentRoomId = null;
      }
    }
  }

  sendMessageViaSocket(roomId, content, imageUrl = null, parentId = null) {
    if (!this.isSocketConnected()) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout'));
      }, 5000);

      this.socket.emit('send_message', {
        room_id: parseInt(roomId),
        content: content.trim(),
        image_url: imageUrl,
        parent_id: parentId
      }, (response) => {
        clearTimeout(timeout);

        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  sendTyping(roomId, isTyping) {
    if (this.isSocketConnected()) {
      this.socket.emit('typing', {
        room_id: parseInt(roomId),
        is_typing: isTyping
      });
    }
  }

  isSocketConnected() {
    return this.socket?.connected === true;
  }

  disconnectSocket(clearRoomId = false) {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      
      if (this.currentRoomId) {
        this.leaveRoom(this.currentRoomId);
      }

      this.socket.disconnect();
      this.socket = null;
      
      // Only clear currentRoomId if explicitly requested (e.g., when leaving a room)
      // Otherwise, keep it for automatic rejoin on reconnect
      if (clearRoomId) {
        this.currentRoomId = null;
      }
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // REST API methods
  async getRoomMessages(roomId, page = 1, perPage = 50) {
    try {
      const response = await api.get(`/messages/room/${roomId}`, {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching room ${roomId} messages:`, error);
      throw error;
    }
  }

  async sendMessage(roomId, content, imageUrl = null, parentId = null) {
    try {
      const response = await api.post('/messages', {
        room_id: parseInt(roomId),
        content: content.trim(),
        image_url: imageUrl,
        parent_id: parentId
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  async updateMessage(messageId, content, imageUrl = null) {
    try {
      const response = await api.put(`/messages/${messageId}`, {
        content: content.trim(),
        image_url: imageUrl
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId) {
    try {
      const response = await api.delete(`/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }
  }

  async getMessageReplies(messageId, page = 1, perPage = 20) {
    try {
      const response = await api.get(`/messages/${messageId}/replies`, {
        params: { page, per_page: perPage }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching replies:', error);
      throw error;
    }
  }

  async uploadImage(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  }
}

export default new MessageService();