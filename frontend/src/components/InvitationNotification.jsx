// src/components/InvitationNotification.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UseAuth } from '../context/AuthContext';
import messageService from '../services/message';
import chatRoomService from '../services/chatRoom';
import './InvitationNotification.css';

const InvitationNotification = () => {
  const [invitations, setInvitations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();
  const { token } = UseAuth();

  useEffect(() => {
    let isMounted = true;
    
    // ✅ Ensure socket is connected for receiving invitations
    const ensureSocketConnection = async () => {
      if (!token) return;
      
      if (!messageService.isSocketConnected()) {
        try {
          console.log('🔌 Connecting socket for invitation notifications...');
          await messageService.connectSocket(token);
          console.log('✅ Socket connected for invitations');
        } catch (err) {
          console.error('❌ Failed to connect socket for invitations:', err);
        }
      }
    };

    // Load invitations on mount
    loadInvitations();

    // ✅ Ensure socket connection
    ensureSocketConnection();

    // ✅ Listen for new invitations via socket
    const handleInvitation = (data) => {
      console.log('📬 New invitation received via socket:', data);
      if (isMounted) {
        // Reload invitations to get latest data
        loadInvitations();
        // Show modal when new invitation arrives
        setShowModal(true);
      }
    };

    // ✅ Listen for socket connection status
    const handleConnected = () => {
      console.log('✅ Socket connected, reloading invitations');
      if (isMounted) {
        loadInvitations();
        // Ensure listener is registered
        messageService.on('room_invitation', handleInvitation);
      }
    };

    // ✅ Set up socket listeners immediately
    // Always register, even if socket not connected yet
    messageService.on('room_invitation', handleInvitation);
    messageService.on('connected', handleConnected);

    // ✅ If already connected, reload
    if (messageService.isSocketConnected()) {
      console.log('✅ Socket already connected, reloading invitations');
      loadInvitations();
    }

    // ✅ Periodic refresh (every 10 seconds) to catch any missed invitations
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        loadInvitations();
      }
    }, 10000);

    return () => {
      isMounted = false;
      messageService.off('room_invitation', handleInvitation);
      messageService.off('connected', handleConnected);
      clearInterval(refreshInterval);
    };
  }, [token]);

  const loadInvitations = async () => {
    try {
      const data = await chatRoomService.getInvitations();
      setInvitations(data.invitations || []);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    }
  };

  const handleAccept = async (invitation) => {
    try {
      setProcessingId(invitation.id);
      const result = await chatRoomService.acceptInvitation(invitation.id);
      
      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      // Navigate to the room
      if (result.room?.id) {
        navigate(`/chat/messages/${result.room.id}`);
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      alert(error.message || 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invitation) => {
    try {
      setProcessingId(invitation.id);
      await chatRoomService.rejectInvitation(invitation.id);
      
      // Remove from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      alert(error.message || 'Failed to reject invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const unreadCount = invitations.length;

  if (unreadCount === 0 && !showModal) {
    return null;
  }

  return (
    <>
      {/* Notification Badge */}
      {unreadCount > 0 && (
        <div 
          className="invitation-badge" 
          onClick={() => setShowModal(true)}
          title={`${unreadCount} new invitation${unreadCount > 1 ? 's' : ''}`}
        >
          <span className="badge-icon">📬</span>
          {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="invitation-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="invitation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invitation-modal-header">
              <h2>Room Invitations</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="invitation-modal-body">
              {invitations.length === 0 ? (
                <div className="no-invitations">
                  <p>No pending invitations</p>
                </div>
              ) : (
                <div className="invitations-list">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="invitation-item">
                      <div className="invitation-info">
                        <div className="invitation-avatar">
                          {invitation.inviter?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="invitation-details">
                          <h3>{invitation.room?.name || 'Private Room'}</h3>
                          <p>
                            <strong>{invitation.inviter?.username || 'Someone'}</strong> invited you to join
                          </p>
                          {invitation.room?.description && (
                            <p className="room-description">{invitation.room.description}</p>
                          )}
                          <span className="invitation-time">
                            {new Date(invitation.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="invitation-actions">
                        <button
                          className="btn-accept"
                          onClick={() => handleAccept(invitation)}
                          disabled={processingId === invitation.id}
                        >
                          {processingId === invitation.id ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleReject(invitation)}
                          disabled={processingId === invitation.id}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InvitationNotification;

