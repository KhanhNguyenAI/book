// src/pages/ChatPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UseAuth } from '../context/AuthContext';
import chatRoomService from '../services/chatRoom';
import Loading from '../components/ui/Loading';
import './ChatPage.css';
import HomeButton from '../components/ui/HomeButton';
import InvitationNotification from '../components/InvitationNotification';

const ChatPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = UseAuth();
  
  const [rooms, setRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-rooms');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [error, setError] = useState('');
  const [roomType, setRoomType] = useState('private'); // 'private' hoặc 'public'
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login');
      return;
    }
    loadRooms();
  }, [isAuthenticated, navigate]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError('');

      // Load user's rooms
      const myRoomsResponse = await chatRoomService.getUserRooms();
      setRooms(myRoomsResponse.rooms || []);

      // Load public rooms for discovery
      const publicRoomsResponse = await chatRoomService.getPublicRooms();
      setPublicRooms(publicRoomsResponse.rooms || []);

    } catch (err) {
      console.error('Failed to load rooms:', err);
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

// Sửa handleCreateRoom
const handleCreateRoom = async (e) => {
  e.preventDefault();
  if (!newRoomName.trim()) return;

  try {
    setError('');
    const response = await chatRoomService.createRoom(
      newRoomName.trim(),
      newRoomDescription.trim(),
      roomType === 'public' // ✅ true = public, false = private
    );

    navigate(`/messages/${response.room.id}`);
    
    // Reset form
    setNewRoomName('');
    setNewRoomDescription('');
    setCreatingRoom(false);
    setRoomType('private'); // Reset về private

  } catch (err) {
    console.error('Failed to create room:', err);
    setError(err.message || 'Failed to create room');
  }
};

  const handleJoinRoom = async (roomId) => {
    try {
      // For now, just navigate to the room
      // You might want to add proper join logic if needed
      navigate(`/messages/${roomId}`);
    } catch (err) {
      console.error('Failed to join room:', err);
      setError(err.message || 'Failed to join room');
    }
  };

  const handleLeaveRoom = async (roomId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to leave this room?')) return;

    try {
      await chatRoomService.leaveRoom(roomId);
      // Reload rooms
      loadRooms();
    } catch (err) {
      console.error('Failed to leave room:', err);
      setError(err.message || 'Failed to leave room');
    }
  };

  const handleDeleteRoom = async (roomId, e) => {
    e.stopPropagation();
    
    const room = rooms.find(r => r.id === roomId) || publicRooms.find(r => r.id === roomId);
    const roomName = room?.name || 'this room';
    
    if (!window.confirm(`Are you sure you want to delete "${roomName}"? This action cannot be undone and will delete all messages and members.`)) return;

    try {
      await chatRoomService.deleteRoom(roomId);
      // Reload rooms
      loadRooms();
      // Navigate back to chat page if we're in the room
      navigate('/chat');
    } catch (err) {
      console.error('Failed to delete room:', err);
      setError(err.message || 'Failed to delete room');
    }
  };

  // Filter rooms based on search query
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const filteredPublicRooms = publicRooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  if (loading) {
    return <Loading message="Loading chat rooms..." />;
  }

  return (
    <div className="chat-page">
      <InvitationNotification />
      <HomeButton nav = '/books' top = "8vw" /> 
      <div className="chat-header">
        <h1>Chat Rooms</h1>
        <button 
          onClick={() => setCreatingRoom(true)}
          className="btn btn-primary"
        >
          + Create Room
        </button>
      </div>

      {/* Create Room Modal */}
{creatingRoom && (
  <div className="modal-overlay">
    <div className="modal">
      <div className="modal-header">
        <h3>Create New Room</h3>
        <button onClick={() => setCreatingRoom(false)} className="close-button">×</button>
      </div>
      <form onSubmit={handleCreateRoom} className="modal-body">
        <div className="form-group">
          <label>Room Name *</label>
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Enter room name"
            required
            maxLength={100}
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
            placeholder="Enter room description (optional)"
            rows={3}
            maxLength={500}
          />
        </div>

        {/* ✅ THÊM: Chọn chế độ phòng */}
        <div className="form-group">
          <label>Room Type</label>
          <div className="room-type-selector">
            <div 
              className={`room-type-option ${roomType === 'public' ? 'selected' : ''}`}
              onClick={() => setRoomType('public')}
            >
              <div className="room-type-icon">🌍</div>
              <div className="room-type-info">
                <div className="room-type-title">Public Room</div>
                <div className="room-type-description">Anyone can join without invitation</div>
              </div>
            </div>
            
            <div 
              className={`room-type-option ${roomType === 'private' ? 'selected' : ''}`}
              onClick={() => setRoomType('private')}
            >
              <div className="room-type-icon">🔒</div>
              <div className="room-type-info">
                <div className="room-type-title">Private Room</div>
                <div className="room-type-description">Only invited members can join</div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        <div className="modal-actions">
          <button type="button" onClick={() => setCreatingRoom(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!newRoomName.trim()}>
            Create Room
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Error Banner */}
      {error && !creatingRoom && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search rooms by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'my-rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-rooms')}
        >
          My Rooms ({filteredRooms.length})
        </button>
        <button 
          className={`tab ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          Discover Rooms ({filteredPublicRooms.length})
        </button>
      </div>

      {/* Rooms List */}
      <div className="rooms-container">
        {activeTab === 'my-rooms' ? (
          filteredRooms.length === 0 ? (
            <div className="empty-state">
              <p>
                {searchQuery 
                  ? `No rooms found matching "${searchQuery}"` 
                  : "You haven't joined any rooms yet."}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setCreatingRoom(true)}
                  className="btn btn-primary"
                >
                  Create Your First Room
                </button>
              )}
            </div>
          ) : (
            <div className="rooms-grid">
              {filteredRooms.map(room => (
                <RoomCard 
                  key={room.id}
                  room={room}
                  onJoin={handleJoinRoom}
                  onLeave={handleLeaveRoom}
                  onDelete={handleDeleteRoom}
                  showLeaveButton={room.your_role !== 'owner' && !room.is_global}
                />
              ))}
            </div>
          )
        ) : (
          filteredPublicRooms.length === 0 ? (
            <div className="empty-state">
              <p>
                {searchQuery 
                  ? `No public rooms found matching "${searchQuery}"` 
                  : "No public rooms available."}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setCreatingRoom(true)}
                  className="btn btn-primary"
                >
                  Create a Room
                </button>
              )}
            </div>
          ) : (
            <div className="rooms-grid">
              {filteredPublicRooms.map(room => (
                <RoomCard 
                  key={room.id}
                  room={room}
                  onJoin={handleJoinRoom}
                  isPublic={true}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

// Room Card Component
const RoomCard = ({ room, onJoin, onLeave, onDelete, showLeaveButton = false, isPublic = false }) => {
  const isMember = room.is_member || !isPublic;

  return (
    <div className="room-card" onClick={() => onJoin(room.id)}>
 // Trong RoomCard component
<div className="room-header">
  <h3 className="room-name">{room.name}</h3>
  {room.is_global && <span className="badge global">🌍 Global</span>}
  {!room.is_global && room.is_public && <span className="badge public">🌐 Public</span>}
  {!room.is_global && !room.is_public && <span className="badge private">🔒 Private</span>}
  {room.your_role === 'owner' && <span className="badge owner">Owner</span>}
  {room.your_role === 'admin' && <span className="badge admin">Admin</span>}
</div>
      
      {room.description && (
        <p className="room-description">{room.description}</p>
      )}
      
      {/* Owner Info */}
      {room.owner && (
        <div className="room-owner">
          <span className="owner-label">👑 Owner:</span>
          <span className="owner-name">{room.owner.username}</span>
        </div>
      )}
      
      <div className="room-stats">
        <span className="stat">
          👥 {room.member_count || 0} members
        </span>
        <span className="stat">
          💬 {room.message_count || 0} messages
        </span>
      </div>

      <div className="room-actions">
        <button className="btn btn-primary join-button">
          {isMember ? 'Enter Room' : 'Join Room'}
        </button>
        
        {showLeaveButton && onLeave && (
          <button 
            onClick={(e) => onLeave(room.id, e)}
            className="btn btn-outline leave-button"
          >
            Leave
          </button>
        )}
        
        {/* Delete Room Button - Only for owner */}
        {room.your_role === 'owner' && !room.is_global && onDelete && (
          <button 
            onClick={(e) => onDelete(room.id, e)}
            className="btn btn-danger delete-room-button"
            title="Delete room (owner only)"
          >
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatPage;