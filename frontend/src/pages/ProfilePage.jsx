// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UseAuth } from "../context/AuthContext";
import styled, { keyframes } from "styled-components";
import { userService } from "../services/user";
import { postService } from "../services/post";
import HomeButton from "../components/ui/HomeButton";
const ProfilePage = () => {
  const { user, updateUser } = UseAuth();
  const navigate = useNavigate();
  const { username: urlUsername } = useParams();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState({
    username: "",
    email: "",
    avatar_url: "",
    name: "",
    bio: "",
    favorite_books: ""
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isViewingOtherUser, setIsViewingOtherUser] = useState(false);
  
  // Posts/Status state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [uploadingPostImage, setUploadingPostImage] = useState(false);
  const [posting, setPosting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [urlUsername]);

  useEffect(() => {
    if (activeTab === "reference") {
      loadPosts();
    }
  }, [activeTab, urlUsername]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // If URL has username param and it's different from current user, load that user's profile
      if (urlUsername && urlUsername !== user?.username) {
        const response = await userService.getPublicProfile(urlUsername);
        setProfileData(response.user);
        setIsViewingOtherUser(true);
      } else {
        // Load current user's profile
        const response = await userService.getProfile();
        setProfileData(response.user);
        setIsViewingOtherUser(false);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setMessage({ 
        type: "error", 
        text: error.response?.data?.message || "Unable to load profile. Please try again." 
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ THÊM HÀM handleInputChange - QUAN TRỌNG!
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear message when user starts typing
    if (message.text) {
      setMessage({ type: "", text: "" });
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    if (!profileData.username.trim()) {
      setMessage({ type: "error", text: "Username cannot be empty" });
      return;
    }

    if (!profileData.email.trim()) {
      setMessage({ type: "error", text: "Email cannot be empty" });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const response = await userService.updateProfile({
        username: profileData.username,
        email: profileData.email,
        name: profileData.name,
        bio: profileData.bio,
        favorite_books: profileData.favorite_books
      });

      // Cập nhật global auth context
      if (updateUser && typeof updateUser === 'function') {
        updateUser(response.user);
      }
      
  setMessage({ type: "success", text: "✅ Profile updated successfully!" });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ 
        type: "error", 
        text: error.response?.data?.message || "Update failed. Please try again." 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setMessage({ type: "", text: "" });

  console.log('🔄 Starting avatar upload...');
      const response = await userService.updateAvatar(file);
      
      // Update local state
      setProfileData(prev => ({ 
        ...prev, 
        avatar_url: response.avatar_url 
      }));
      
      // Cập nhật global auth context
      if (updateUser && typeof updateUser === 'function') {
        updateUser(response.user);
      }
      
  setMessage({ type: "success", text: "✅ Avatar updated successfully!" });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setMessage({ 
        type: "error", 
        text: error.message || "❌ Avatar upload failed. Please try again." 
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profileData.avatar_url) return;

    try {
      setUploading(true);
      setMessage({ type: "", text: "" });
      
      await userService.deleteAvatar();
      
      // Reload profile data to get updated user info
      await loadProfileData();
      
  setMessage({ type: "success", text: "✅ Avatar removed successfully!" });
    } catch (error) {
      console.error("Error removing avatar:", error);
      setMessage({ 
        type: "error", 
        text: error.message || "❌ Error removing avatar" 
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : "U";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Posts/Status handlers
  const loadPosts = async (reset = false) => {
    try {
      setLoadingPosts(true);
      // Get target user ID
      let targetUserId = user?.id;
      if (isViewingOtherUser && profileData.id) {
        targetUserId = profileData.id;
      }
      
      const currentPage = reset ? 1 : page;
      const response = await postService.getPosts(currentPage, 20, targetUserId);
      
      if (reset) {
        setPosts(response.posts);
        setPage(2);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(response.pagination.has_next);
    } catch (error) {
      console.error("Error loading posts:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to load posts"
      });
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingPosts && hasMore) {
      loadPosts(false);
    }
  };

  const handlePostImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Only image files (PNG, JPG, JPEG, GIF, WebP) are allowed" });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size must be less than 10MB" });
      return;
    }

    try {
      setUploadingPostImage(true);
      setMessage({ type: "", text: "" });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase
      const response = await postService.uploadPostImage(file);
      setPostImage(response.image_url);
      
      setMessage({ type: "success", text: "✅ Image uploaded successfully!" });
    } catch (error) {
      console.error("Error uploading post image:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to upload image"
      });
      setPostImagePreview(null);
      setPostImage(null);
    } finally {
      setUploadingPostImage(false);
      e.target.value = '';
    }
  };

  const handleRemovePostImage = () => {
    setPostImage(null);
    setPostImagePreview(null);
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !postImage) {
      setMessage({ type: "error", text: "Post must have either content or image" });
      return;
    }

    try {
      setPosting(true);
      setMessage({ type: "", text: "" });

      await postService.createPost(postContent, postImage || "");

      // Reset form
      setPostContent("");
      setPostImage(null);
      setPostImagePreview(null);

      // Reload posts
      await loadPosts(true);

      setMessage({ type: "success", text: "✅ Post created successfully!" });
    } catch (error) {
      console.error("Error creating post:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to create post"
      });
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      await postService.deletePost(postId);
      setPosts(prev => prev.filter(post => post.id !== postId));
      setMessage({ type: "success", text: "✅ Post deleted successfully!" });
    } catch (error) {
      console.error("Error deleting post:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to delete post"
      });
    }
  };

  const formatPostTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <NatureContainer>
        <LoadingSpinner>
          <div className="nature-spinner"></div>
          <p>Loading profile...</p>
        </LoadingSpinner>
      </NatureContainer>
    );
  }

  return (
    <NatureContainer>
      <HomeButton nav="/books" />
      <NatureCard>
        {/* Nature Background Elements */}
        <div className="nature-bg">
          <div className="leaf leaf-1">🍃</div>
          <div className="leaf leaf-2">🌿</div>
          <div className="leaf leaf-3">🍂</div>
          <div className="flower flower-1">🌸</div>
          <div className="flower flower-2">🌼</div>
        </div>

        {/* Profile Header */}
        <ProfileHeader>
          <AvatarSection>
            <AvatarContainer>
              {profileData.avatar_url ? (
                <AvatarImage src={profileData.avatar_url} alt="Profile" />
              ) : (
                <AvatarPlaceholder>
                  {getInitials(profileData.username)}
                </AvatarPlaceholder>
              )}
              
              {!isViewingOtherUser && (
                <AvatarOverlay className={uploading ? "uploading" : ""}>
                  {uploading ? (
                    <UploadingSpinner>⏳</UploadingSpinner>
                  ) : (
                    <>
                      <AvatarUploadLabel htmlFor="avatar-upload" title="Upload new avatar">
                        📷
                      </AvatarUploadLabel>
                      {profileData.avatar_url && (
                        <RemoveAvatarButton 
                          onClick={handleRemoveAvatar}
                          title="Remove avatar"
                        >
                          🗑️
                        </RemoveAvatarButton>
                      )}
                    </>
                  )}
                  <AvatarUploadInput
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </AvatarOverlay>
              )}
            </AvatarContainer>
            
            <UserInfo>
              <UserName>{profileData.username || "User"}</UserName>
              <UserRole className={profileData.role}>
                {profileData.role === 'admin' ? '👑 Admin' : '👤 Reader'}
              </UserRole>
              <UserSince>
                Member since {formatDate(profileData.created_at || user?.created_at)}
              </UserSince>
            </UserInfo>
          </AvatarSection>
        </ProfileHeader>

        {/* Message Display */}
        {message.text && (
          <MessageBox type={message.type}>
            {message.text}
          </MessageBox>
        )}

        {/* Navigation Tabs */}
        <TabNavigation>
          <TabButton 
              $active={activeTab === "profile"} 
              onClick={() => setActiveTab("profile")}
            >
              👤 Profile
            </TabButton>
            <TabButton 
              $active={activeTab === "preferences"} 
              onClick={() => setActiveTab("preferences")}
            >
              ⭐ Preferences
            </TabButton>
            <TabButton 
              $active={activeTab === "activity"} 
              onClick={() => setActiveTab("activity")}
            >
              📚 Activity
            </TabButton>
            <TabButton 
              $active={activeTab === "reference"} 
              onClick={() => setActiveTab("reference")}
            >
              📝 Status
            </TabButton>
        </TabNavigation>

        {/* Profile Tab Content */}
        {activeTab === "profile" && (
          <TabContent>
            <SectionTitle>Personal Info</SectionTitle>
            {isViewingOtherUser ? (
              <ViewOnlyProfile>
                <FormGroup>
                  <NatureLabel>
                    <span className="label-icon">👤</span>
                    Username
                  </NatureLabel>
                  <ViewOnlyText>{profileData.username}</ViewOnlyText>
                </FormGroup>
                {profileData.name && (
                  <FormGroup>
                    <NatureLabel>
                      <span className="label-icon">✏️</span>
                      Full Name
                    </NatureLabel>
                    <ViewOnlyText>{profileData.name}</ViewOnlyText>
                  </FormGroup>
                )}
                {profileData.bio && (
                  <FormGroup>
                    <NatureLabel>
                      <span className="label-icon">📝</span>
                      Biography
                    </NatureLabel>
                    <ViewOnlyText style={{ whiteSpace: 'pre-wrap' }}>{profileData.bio}</ViewOnlyText>
                  </FormGroup>
                )}
                {profileData.favorite_books && (
                  <FormGroup>
                    <NatureLabel>
                      <span className="label-icon">📚</span>
                      Favorite Books
                    </NatureLabel>
                    <ViewOnlyText style={{ whiteSpace: 'pre-wrap' }}>{profileData.favorite_books}</ViewOnlyText>
                  </FormGroup>
                )}
                <ActionButtons>
                  <CancelButton type="button" onClick={() => navigate(-1)}>
                    ← Back
                  </CancelButton>
                </ActionButtons>
              </ViewOnlyProfile>
            ) : (
              <ProfileForm onSubmit={handleSaveProfile}>
                <FormGroup>
                  <NatureLabel>
                    <span className="label-icon">👤</span>
                    Username
                  </NatureLabel>
                  <NatureInput
                    type="text"
                    name="username"
                    value={profileData.username}
                    onChange={handleInputChange} 
                    placeholder="Enter username..."
                    disabled={saving}
                  />
                </FormGroup>

                <FormGroup>
                  <NatureLabel>
                    <span className="label-icon">📧</span>
                    Email address
                  </NatureLabel>
                  <NatureInput
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleInputChange} 
                    placeholder="Enter email address..."
                    disabled={saving}
                  />
                </FormGroup>

                <FormGroup>
                  <NatureLabel>
                    <span className="label-icon">🖼️</span>
                    Avatar
                  </NatureLabel>
                  <AvatarHelpText>
                    {profileData.avatar_url ? (
                      <>
                        ✅ Avatar uploaded to cloud
                        <br />
                        <small>Click the camera icon to change</small>
                      </>
                    ) : (
                      "Click the camera icon to upload an avatar"
                    )}
                  </AvatarHelpText>
                </FormGroup>

                <FormGroup>
                  <NatureLabel>
                    <span className="label-icon">✏️</span>
                    Full Name
                  </NatureLabel>
                  <NatureInput
                    type="text"
                    name="name"
                    value={profileData.name || ""}
                    onChange={handleInputChange} 
                    placeholder="Enter your full name..."
                    disabled={saving}
                  />
                </FormGroup>

                <FormGroup>
                  <NatureLabel>
                    <span className="label-icon">📝</span>
                    Biography
                  </NatureLabel>
                  <NatureTextarea
                    name="bio"
                    value={profileData.bio || ""}
                    onChange={handleInputChange} 
                    placeholder="Write a little about yourself..."
                    disabled={saving}
                    rows={4}
                  />
                </FormGroup>

                <FormGroup>
                  <NatureLabel>
                    <span className="label-icon">📚</span>
                    Favorite Books
                  </NatureLabel>
                  <NatureTextarea
                    name="favorite_books"
                    value={profileData.favorite_books || ""}
                    onChange={handleInputChange} 
                    placeholder="Share about book genres or authors you love..."
                    disabled={saving}
                    rows={3}
                  />
                </FormGroup>

                <ActionButtons>
                  <SaveButton type="submit" disabled={saving || uploading}>
                    {saving ? (
                      <LoadingSpinnerSmall>
                        <div className="spinner"></div>
                        Saving...
                      </LoadingSpinnerSmall>
                    ) : (
                      <>
                        💾 Save changes
                      </>
                    )}
                  </SaveButton>
                  <CancelButton type="button" onClick={() => navigate("/books") }>
                    📚 Back to Library
                  </CancelButton>
                </ActionButtons>
              </ProfileForm>
            )}
          </TabContent>
        )}

        {/* Preferences Tab Content */}
        {activeTab === "preferences" && (
          <TabContent>
              <SectionTitle>Reading Preferences</SectionTitle>
              <ComingSoon>
                <div className="icon">🌱</div>
                <h3>Feature coming soon</h3>
                <p>Managing favorite categories and reading preferences is coming soon!</p>
              </ComingSoon>
            </TabContent>
        )}

        {/* Activity Tab Content */}
        {activeTab === "activity" && (
          <TabContent>
              <SectionTitle>Reading Activity</SectionTitle>
              <ComingSoon>
                <div className="icon">📖</div>
                <h3>Your reading journey</h3>
                <p>Tracking reading history and statistics will be available here soon!</p>
                <ActivityButtons>
                  <NavButton onClick={() => navigate("/users/history")}>
                    📚 Reading History
                  </NavButton>
                  <NavButton onClick={() => navigate("/bookmarks")}>
                    🔖 Bookmarks
                  </NavButton>
                </ActivityButtons>
              </ComingSoon>
            </TabContent>
        )}

        {/* Reference Tab Content - Posts/Status */}
        {activeTab === "reference" && (
          <TabContent>
            <SectionTitle>📝 Reference</SectionTitle>
            
            {/* Create Post Form - Only for current user */}
            {!isViewingOtherUser && (
              <PostCreateForm>
                <PostCreateHeader>
                  <PostAvatar>
                    {user?.avatar_url ? (
                      <PostAvatarImage src={user.avatar_url} alt={user.username} />
                    ) : (
                      <PostAvatarPlaceholder>
                        {user?.username?.charAt(0).toUpperCase() || "U"}
                      </PostAvatarPlaceholder>
                    )}
                  </PostAvatar>
                  <PostInputWrapper>
                    <PostTextarea
                      placeholder="What's on your mind?"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      rows={3}
                    />
                  </PostInputWrapper>
                </PostCreateHeader>

                {postImagePreview && (
                  <PostImagePreview>
                    <PostPreviewImage src={postImagePreview} alt="Preview" />
                    <RemoveImageButton onClick={handleRemovePostImage}>×</RemoveImageButton>
                  </PostImagePreview>
                )}

                <PostActions>
                  <ImageUploadLabel htmlFor="post-image-upload" disabled={uploadingPostImage}>
                    {uploadingPostImage ? "⏳ Uploading..." : "📷 Photo"}
                  </ImageUploadLabel>
                  <PostImageInput
                    id="post-image-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePostImageSelect}
                    disabled={uploadingPostImage || posting}
                  />
                  <PostButton
                    onClick={handleCreatePost}
                    disabled={posting || uploadingPostImage || (!postContent.trim() && !postImage)}
                  >
                    {posting ? "⏳ Posting..." : "📤 Post"}
                  </PostButton>
                </PostActions>
              </PostCreateForm>
            )}

            {/* Posts Feed */}
            <PostsFeed>
              {loadingPosts ? (
                <LoadingSpinner>
                  <div className="nature-spinner"></div>
                  <p>Loading posts...</p>
                </LoadingSpinner>
              ) : posts.length === 0 ? (
                <EmptyFeed>
                  <div className="icon">📭</div>
                  <h3>No posts yet</h3>
                  <p>{isViewingOtherUser ? "This user hasn't posted anything yet." : "Start sharing your thoughts!"}</p>
                </EmptyFeed>
              ) : (
                posts.map((post) => (
                  <PostCard key={post.id}>
                    <PostHeader>
                      <PostUserAvatar>
                        {post.user?.avatar_url ? (
                          <PostUserAvatarImage src={post.user.avatar_url} alt={post.user.username} />
                        ) : (
                          <PostUserAvatarPlaceholder>
                            {post.user?.username?.charAt(0).toUpperCase() || "U"}
                          </PostUserAvatarPlaceholder>
                        )}
                      </PostUserAvatar>
                      <PostUserInfo>
                        <PostUserName>{post.user?.username || "Unknown"}</PostUserName>
                        <PostTime>{formatPostTime(post.created_at)}</PostTime>
                      </PostUserInfo>
                      {!isViewingOtherUser && post.user_id === user?.id && (
                        <DeletePostButton onClick={() => handleDeletePost(post.id)} title="Delete post">
                          🗑️
                        </DeletePostButton>
                      )}
                    </PostHeader>
                    
                    {post.content && (
                      <PostContent>{post.content}</PostContent>
                    )}
                    
                    {post.image_url && (
                      <PostImageContainer>
                        <PostImage src={post.image_url} alt="Post" />
                      </PostImageContainer>
                    )}
                  </PostCard>
                ))
              )}
              
              {hasMore && !loadingPosts && posts.length > 0 && (
                <LoadMoreButton onClick={handleLoadMore}>
                  Load More
                </LoadMoreButton>
              )}
            </PostsFeed>
          </TabContent>
        )}
      </NatureCard>
    </NatureContainer>
  );
};

// Animations
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const leafFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(5deg); }
`;

const leafFall = keyframes`
  0% { transform: translateY(-100px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 0.7; }
  100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
`;

// Styled Components
const NatureContainer = styled.div`
  min-height: 100vh;
  width : 100vw;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(135deg, #e8f4f4 0%, #c8e6c9 50%, #a5d6a7 100%);
  padding: 2rem;
  position: relative;
  overflow-x: hidden;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const NatureCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2.5rem;
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  max-width: 600px;
  width: 100%;
  position: relative;
  animation: ${fadeInUp} 0.8s ease-out;
  

  .nature-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
    border-radius: 24px;

    .leaf, .flower {
      position: absolute;
      font-size: 18px;
      opacity: 0.1;
      animation: ${leafFall} 20s linear infinite;
    }

    .leaf-1 { left: 5%; animation-delay: 0s; }
    .leaf-2 { left: 25%; animation-delay: 5s; }
    .leaf-3 { left: 75%; animation-delay: 10s; }
    .flower-1 { left: 15%; animation-delay: 2s; }
    .flower-2 { left: 85%; animation-delay: 7s; }
  }
`;

const ProfileHeader = styled.div`
  margin-bottom: 2rem;
`;

const AvatarSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
`;

const AvatarContainer = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(129, 178, 20, 0.3);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #81b214, #4caf50);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 3rem;
  font-weight: 600;
`;

const AvatarOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover, &.uploading {
    opacity: 1;
  }
`;

const AvatarUploadLabel = styled.label`
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  transition: transform 0.2s ease;
  margin: 0 0.25rem;

  &:hover {
    transform: scale(1.1);
  }
`;

const RemoveAvatarButton = styled.button`
  background: rgba(244, 67, 54, 0.9);
  border: none;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.3s ease;
  margin: 0 0.25rem;

  &:hover {
    background: rgba(244, 67, 54, 1);
    transform: scale(1.1);
  }
`;

const AvatarUploadInput = styled.input`
  display: none;
`;

const UploadingSpinner = styled.div`
  font-size: 2rem;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.h1`
  color: #2d3436;
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 600;
`;

const UserRole = styled.span`
  display: inline-block;
  padding: 0.5rem 1.2rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  background: rgba(129, 178, 20, 0.1);
  color: #2d3436;
  border: 1.5px solid rgba(129, 178, 20, 0.2);
  margin-bottom: 0.5rem;

  &.admin {
    background: rgba(255, 193, 7, 0.15);
    color: #b38b00;
    border-color: rgba(255, 193, 7, 0.3);
  }
`;

const UserSince = styled.p`
  color: #636e72;
  margin: 0;
  font-size: 0.9rem;
`;

const MessageBox = styled.div`
  padding: 1rem 1.5rem;
  border-radius: 16px;
  margin-bottom: 1.5rem;
  font-weight: 500;
  background: ${props => props.type === "success" 
    ? "rgba(76, 175, 80, 0.1)" 
    : "rgba(244, 67, 54, 0.1)"};
  border: 1.5px solid ${props => props.type === "success" 
    ? "rgba(76, 175, 80, 0.3)" 
    : "rgba(244, 67, 54, 0.3)"};
  color: ${props => props.type === "success" ? "#2d3436" : "#e74c3c"};
  text-align: center;
`;

const TabNavigation = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(129, 178, 20, 0.2);
  padding-bottom: 0.5rem;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  background: ${props => props.$active ? 'rgba(129, 178, 20, 0.1)' : 'transparent'};
  color: ${props => props.$active ? '#2d3436' : '#636e72'};
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1.5px solid ${props => props.$active ? 'rgba(129, 178, 20, 0.3)' : 'transparent'};
  white-space: nowrap;

  &:hover {
    background: rgba(129, 178, 20, 0.1);
    color: #2d3436;
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }
`;

const TabContent = styled.div`
  animation: ${fadeInUp} 0.5s ease-out;
`;

const SectionTitle = styled.h2`
  color: #2d3436;
  margin: 0 0 1.5rem 0;
  font-size: 1.4rem;
  font-weight: 600;
  border-left: 4px solid #81b214;
  padding-left: 1rem;
`;

const ProfileForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const NatureLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #2d3436;
  font-size: 0.95rem;

  .label-icon {
    font-size: 1.1rem;
  }
`;

const NatureInput = styled.input`
  padding: 1rem 1.2rem;
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 16px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  color: #2d3436;
  transition: all 0.3s ease;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #81b214;
    box-shadow: 0 0 0 3px rgba(129, 178, 20, 0.1);
    background: rgba(255, 255, 255, 0.95);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #b2bec3;
  }
`;

const NatureTextarea = styled.textarea`
  padding: 1rem 1.2rem;
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 16px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  color: #2d3436;
  transition: all 0.3s ease;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #81b214;
    box-shadow: 0 0 0 3px rgba(129, 178, 20, 0.1);
    background: rgba(255, 255, 255, 0.95);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #b2bec3;
  }
`;

const AvatarHelpText = styled.div`
  font-size: 0.9rem;
  color: #636e72;
  line-height: 1.4;
  padding: 0.75rem;
  background: rgba(129, 178, 20, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(129, 178, 20, 0.1);
  
  small {
    font-size: 0.8rem;
    opacity: 0.7;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SaveButton = styled.button`
  background: linear-gradient(135deg, #81b214, #4caf50);
  border: none;
  border-radius: 16px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(129, 178, 20, 0.3);
  flex: 1;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(129, 178, 20, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled.button`
  background: rgba(108, 117, 125, 0.1);
  border: 1.5px solid rgba(108, 117, 125, 0.3);
  border-radius: 16px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 500;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;

  &:hover {
    background: rgba(108, 117, 125, 0.2);
    transform: translateY(-2px);
  }
`;

const ComingSoon = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #636e72;

  .icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
    opacity: 0.6;
  }

  h3 {
    margin: 0 0 1rem 0;
    color: #2d3436;
    font-weight: 600;
    font-size: 1.3rem;
  }

  p {
    margin: 0;
    line-height: 1.6;
    font-size: 1rem;
  }
`;

const ActivityButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  flex-wrap: wrap;
`;

const NavButton = styled.button`
  background: rgba(129, 178, 20, 0.1);
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 16px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #2d3436;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(129, 178, 20, 0.2);
    transform: translateY(-2px);
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 2rem;

  .nature-spinner {
    width: 50px;
    height: 50px;
    border: 3px solid transparent;
    border-top: 3px solid #81b214;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  p {
    color: #636e72;
    margin: 0;
    font-size: 1.1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingSpinnerSmall = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
`;

const ViewOnlyProfile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ViewOnlyText = styled.div`
  padding: 1rem 1.2rem;
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 16px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  color: #2d3436;
  font-family: inherit;
  line-height: 1.6;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
`;

// Post/Status Styled Components
const PostCreateForm = styled.div`
  background: rgba(255, 255, 255, 0.8);
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const PostCreateHeader = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const PostAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(129, 178, 20, 0.3);
`;

const PostAvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PostAvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #81b214, #4caf50);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
`;

const PostInputWrapper = styled.div`
  flex: 1;
`;

const PostTextarea = styled.textarea`
  width: 100%;
  padding: 1rem;
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 12px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  background: rgba(255, 255, 255, 0.9);
  color: #2d3436;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #81b214;
    box-shadow: 0 0 0 3px rgba(129, 178, 20, 0.1);
  }

  &::placeholder {
    color: #b2bec3;
  }
`;

const PostImagePreview = styled.div`
  position: relative;
  margin: 1rem 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1.5px solid rgba(129, 178, 20, 0.3);
`;

const PostPreviewImage = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  display: block;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(244, 67, 54, 0.9);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(244, 67, 54, 1);
    transform: scale(1.1);
  }
`;

const PostActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
`;

const ImageUploadLabel = styled.label`
  padding: 0.75rem 1.5rem;
  background: rgba(129, 178, 20, 0.1);
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  color: #2d3436;
  transition: all 0.3s ease;
  display: inline-block;

  &:hover:not(:disabled) {
    background: rgba(129, 178, 20, 0.2);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PostImageInput = styled.input`
  display: none;
`;

const PostButton = styled.button`
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #81b214, #4caf50);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(129, 178, 20, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const PostsFeed = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PostCard = styled.div`
  background: rgba(255, 255, 255, 0.8);
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  animation: ${fadeInUp} 0.5s ease-out;
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  position: relative;
`;

const PostUserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(129, 178, 20, 0.3);
`;

const PostUserAvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PostUserAvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #81b214, #4caf50);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
`;

const PostUserInfo = styled.div`
  flex: 1;
`;

const PostUserName = styled.div`
  font-weight: 600;
  color: #2d3436;
  font-size: 1rem;
`;

const PostTime = styled.div`
  font-size: 0.85rem;
  color: #636e72;
  margin-top: 0.25rem;
`;

const DeletePostButton = styled.button`
  background: rgba(244, 67, 54, 0.1);
  border: 1.5px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(244, 67, 54, 0.2);
    transform: scale(1.1);
  }
`;

const PostContent = styled.div`
  color: #2d3436;
  font-size: 1rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 1rem;
`;

const PostImageContainer = styled.div`
  margin-top: 1rem;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(129, 178, 20, 0.2);
`;

const PostImage = styled.img`
  width: 100%;
  max-height: 500px;
  object-fit: cover;
  display: block;
`;

const EmptyFeed = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: #636e72;

  .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    color: #2d3436;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

const LoadMoreButton = styled.button`
  padding: 1rem 2rem;
  background: rgba(129, 178, 20, 0.1);
  border: 1.5px solid rgba(129, 178, 20, 0.3);
  border-radius: 12px;
  color: #2d3436;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 1rem auto;
  display: block;

  &:hover {
    background: rgba(129, 178, 20, 0.2);
    transform: translateY(-2px);
  }
`;

export default ProfilePage;