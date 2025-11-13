// src/pages/ChatPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UseAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import chatRoomService from '../services/chatRoom';
import Loading from '../components/ui/Loading';
import './ChatPage.css';
import InvitationNotification from '../components/InvitationNotification';

const ChatPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = UseAuth();
  const { t } = useLanguage();
  
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
      setError(err.message || t("failedToLoadRooms"));
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

    navigate(`/chat/messages/${response.room.id}`);
    
    // Reset form
    setNewRoomName('');
    setNewRoomDescription('');
    setCreatingRoom(false);
    setRoomType('private'); // Reset về private

  } catch (err) {
    console.error('Failed to create room:', err);
      setError(err.message || t("failedToCreateRoom"));
  }
};

  const handleJoinRoom = async (roomId) => {
    try {
      // For now, just navigate to the room
      // You might want to add proper join logic if needed
      navigate(`/chat/messages/${roomId}`);
    } catch (err) {
      console.error('Failed to join room:', err);
      setError(err.message || t("failedToJoinRoom"));
    }
  };

  const handleLeaveRoom = async (roomId, e) => {
    e.stopPropagation();
    
    if (!window.confirm(t("areYouSureLeave"))) return;

    try {
      await chatRoomService.leaveRoom(roomId);
      // Reload rooms
      loadRooms();
    } catch (err) {
      console.error('Failed to leave room:', err);
      setError(err.message || t("failedToLeaveRoom"));
    }
  };

  const handleDeleteRoom = async (roomId, e) => {
    e.stopPropagation();
    
    const room = rooms.find(r => r.id === roomId) || publicRooms.find(r => r.id === roomId);
    const roomName = room?.name || 'this room';
    
    if (!window.confirm(`${t("areYouSureDeleteRoom")} "${roomName}"? ${t("deleteRoomWarning")}`)) return;

    try {
      await chatRoomService.deleteRoom(roomId);
      // Reload rooms
      loadRooms();
      // Navigate back to chat page if we're in the room
      navigate('/chat');
    } catch (err) {
      console.error('Failed to delete room:', err);
      setError(err.message || t("failedToDeleteRoom"));
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
    return <Loading message={t("loadingChatRooms")} />;
  }

  return (
    <div className="chat-page">
      <InvitationNotification />
      <div className="chat-header">
        <h1>{t("chatRooms")}</h1>
        <button 
          onClick={() => setCreatingRoom(true)}
          className="btn btn-primary"
        >
          + {t("createRoom")}
        </button>
      </div>

      {/* Create Room Modal */}
{creatingRoom && (
  <div className="modal-overlay">
    <div className="modal">
      <div className="modal-header">
        <h3>{t("createNewRoom")}</h3>
        <button onClick={() => setCreatingRoom(false)} className="close-button">×</button>
      </div>
      <form onSubmit={handleCreateRoom} className="modal-body">
        <div className="form-group">
          <label>{t("roomName")} *</label>
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder={t("enterRoomName")}
            required
            maxLength={100}
          />
        </div>
        
        <div className="form-group">
          <label>{t("description")}</label>
          <textarea
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
            placeholder={t("enterRoomDescription")}
            rows={3}
            maxLength={500}
          />
        </div>

        {/* ✅ THÊM: Chọn chế độ phòng */}
        <div className="form-group">
          <label>{t("roomType")}</label>
          <div className="room-type-selector">
            <div 
              className={`room-type-option ${roomType === 'public' ? 'selected' : ''}`}
              onClick={() => setRoomType('public')}
            >
              <div className="room-type-icon">🌍</div>
              <div className="room-type-info">
                <div className="room-type-title">{t("publicRoom")}</div>
                <div className="room-type-description">{t("anyoneCanJoin")}</div>
              </div>
            </div>
            
            <div 
              className={`room-type-option ${roomType === 'private' ? 'selected' : ''}`}
              onClick={() => setRoomType('private')}
            >
              <div className="room-type-icon">🔒</div>
              <div className="room-type-info">
                <div className="room-type-title">{t("privateRoom")}</div>
                <div className="room-type-description">{t("onlyInvitedMembers")}</div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        <div className="modal-actions">
          <button type="button" onClick={() => setCreatingRoom(false)} className="btn btn-secondary">
            {t("cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={!newRoomName.trim()}>
            {t("createRoom")}
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
            placeholder={t("searchRoomsByName")}
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
          {t("myRooms")} ({filteredRooms.length})
        </button>
        <button 
          className={`tab ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          {t("discoverRooms")} ({filteredPublicRooms.length})
        </button>
      </div>

      {/* Rooms List */}
      <div className="rooms-container">
        {activeTab === 'my-rooms' ? (
          filteredRooms.length === 0 ? (
            <div className="empty-state">
              <p>
                {searchQuery 
                  ? `${t("noRoomsFound")} "${searchQuery}"` 
                  : t("youHaventJoinedRooms")}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setCreatingRoom(true)}
                  className="btn btn-primary"
                >
                  {t("createYourFirstRoom")}
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
                  ? `${t("noRoomsFound")} "${searchQuery}"` 
                  : t("noPublicRoomsAvailable")}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setCreatingRoom(true)}
                  className="btn btn-primary"
                >
                  {t("createRoom")}
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