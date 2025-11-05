// src/services/chatRoom.js - FIXED VERSION
import api from './axios';

class ChatRoomService {
  async getRoomDetails(roomId) {
    try {
      console.log(`🔍 Fetching room details for: ${roomId}`);
      
      // ✅ Sử dụng endpoint đúng: /rooms/{roomId}
      const response = await api.get(`/rooms/${roomId}`);
      
      console.log(`✅ Room details received:`, response.data);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to fetch room ${roomId}:`, error);
      
      if (error.response) {
        const { status, data } = error.response;
        throw new Error(data?.message || `Server error: ${status}`);
      }
      
      throw new Error(error.message || 'Network error');
    }
  }

  async getPublicRooms(page = 1, perPage = 10) {
    try {
      console.log(`🏠 Fetching public rooms page ${page}...`);
      
      const response = await api.get('/rooms/public', {
        params: { page, per_page: perPage }
      });
      
      console.log(`✅ Loaded ${response.data.rooms?.length || 0} public rooms`);
      return response.data;
      
    } catch (error) {
      console.error('❌ Failed to fetch public rooms:', error);
      throw new Error(error.message || 'Failed to load rooms');
    }
  }

  async getUserRooms() {
    try {
      console.log(`👤 Fetching user's rooms...`);
      
      const response = await api.get('/rooms');
      
      console.log(`✅ Loaded ${response.data.rooms?.length || 0} user rooms`);
      return response.data;
      
    } catch (error) {
      console.error('❌ Failed to fetch user rooms:', error);
      throw new Error(error.message || 'Failed to load your rooms');
    }
  }

  async createRoom(name, description = '', isPublic = true) {
    try {
      console.log(`🆕 Creating room: ${name} (${isPublic ? 'public' : 'private'})`);
      
      const response = await api.post('/rooms', {
        name,
        description,
        is_public: isPublic
      });
      
      console.log('✅ Room created successfully:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Failed to create room:', error);
      
      // Extract error message from response
      let errorMessage = 'Failed to create room';
      
      if (error.response?.data?.error) {
        // Backend returns {error: message}
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        // Some endpoints return {message: ...}
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async joinRoom(roomId) {
    try {
      console.log(`🎯 Joining room: ${roomId}`);
      
      const response = await api.post(`/rooms/${roomId}/join`);
      
      console.log('✅ Joined room successfully');
      return response.data;
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      throw new Error(error.message || 'Failed to join room');
    }
  }

  async leaveRoom(roomId) {
    try {
      console.log(`👋 Leaving room: ${roomId}`);
      
      const response = await api.post(`/rooms/${roomId}/leave`);
      
      console.log('✅ Left room successfully');
      return response.data;
      
    } catch (error) {
      console.error('❌ Failed to leave room:', error);
      throw new Error(error.message || 'Failed to leave room');
    }
  }

  async addMember(roomId, username) {
    try {
      console.log(`👤 Adding member to room ${roomId}: ${username}`);
      
      const response = await api.post(`/rooms/${roomId}/members`, {
        username: username.trim()
      });

      console.log(`✅ Member ${username} added to room ${roomId}`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to add member to room ${roomId}:`, error);
      
      // Extract error message from response
      let errorMessage = 'Failed to add member';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async getGlobalRoom() {
    try {
      console.log(`🌐 Fetching global room`);
      
      const response = await api.get('/rooms/global');
      
      console.log(`✅ Global room loaded`);
      return response.data;
      
    } catch (error) {
      console.error('❌ Failed to get global room:', error);
      throw new Error(error.message || 'Failed to load global room');
    }
  }

  async deleteRoom(roomId) {
    try {
      console.log(`🗑️ Deleting room: ${roomId}`);
      
      const response = await api.delete(`/rooms/${roomId}`);
      
      console.log(`✅ Room ${roomId} deleted successfully`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to delete room ${roomId}:`, error);
      
      let errorMessage = 'Failed to delete room';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async removeMember(roomId, memberId) {
    try {
      console.log(`👢 Removing member ${memberId} from room ${roomId}`);
      
      const response = await api.delete(`/rooms/${roomId}/members/${memberId}`);
      
      console.log(`✅ Member ${memberId} removed from room ${roomId}`);
      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to remove member from room:`, error);
      
      let errorMessage = 'Failed to remove member';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  // ✅ Invitation methods
  async getInvitations() {
    try {
      console.log(`📬 Fetching invitations...`);
      
      const response = await api.get('/invitations');
      
      console.log(`✅ Loaded ${response.data.count || 0} invitations`);
      return response.data;
      
    } catch (error) {
      console.error('❌ Failed to fetch invitations:', error);
      throw new Error(error.message || 'Failed to load invitations');
    }
  }

  async acceptInvitation(invitationId) {
    try {
      console.log(`✅ Accepting invitation: ${invitationId}`);
      
      const response = await api.post(`/invitations/${invitationId}/accept`);
      
      console.log('✅ Invitation accepted');
      return response.data;
      
    } catch (error) {
      console.error('❌ Failed to accept invitation:', error);
      
      let errorMessage = 'Failed to accept invitation';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  async rejectInvitation(invitationId) {
    try {
      console.log(`❌ Rejecting invitation: ${invitationId}`);
      
      const response = await api.post(`/invitations/${invitationId}/reject`);
      
      console.log('✅ Invitation rejected');
      return response.data;
      
    } catch (error) {
      console.error('❌ Failed to reject invitation:', error);
      
      let errorMessage = 'Failed to reject invitation';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      throw new Error(errorMessage);
    }
  }
}

export default new ChatRoomService();