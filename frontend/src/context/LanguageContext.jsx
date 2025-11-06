import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

const translations = {
  en: {
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    confirm: "Confirm",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    back: "Back",
    
    // Settings
    settings: "Settings",
    language: "Language",
    selectLanguage: "Select Language",
    english: "English",
    japanese: "Japanese",
    languageSettings: "Language Settings",
    changeLanguage: "Change Language",
    languageDescription: "Choose your preferred language for the interface",
    
    // Navigation
    home: "Home",
    books: "Books",
    profile: "Profile",
    favorites: "Favorites",
    bookmarks: "Bookmarks",
    history: "History",
    chat: "Chat",
    admin: "Admin",
    logout: "Logout",
    signIn: "Sign In",
    signUp: "Sign Up",
    joinFree: "Join Free",
    hi: "Hi",
    
    // Profile
    username: "Username",
    email: "Email",
    bio: "Bio",
    avatar: "Avatar",
    
    // Books
    bookDetail: "Book Detail",
    addToFavorites: "Add to Favorites",
    removeFromFavorites: "Remove from Favorites",
    addBookmark: "Add Bookmark",
    removeBookmark: "Remove Bookmark",
    
    // Messages
    noMessages: "No messages found",
    sendMessage: "Send Message",
    
    // Admin
    dashboard: "Dashboard",
    users: "Users",
    messages: "Messages",
    reports: "Reports",
    chatbot: "Chatbot",
    
    // HomePage
    welcomeBack: "Welcome back to your",
    sanctuary: "sanctuary",
    continueJourney: "Continue your journey through stories",
    yourLiterarySanctuary: "Your Literary",
    sanctuaryAwaits: "Sanctuary Awaits",
    discoverBooks: "Discover thousands of free books and join a community of passionate readers",
    libraryCurator: "Library Curator",
    readingJourney: "Reading Journey",
    library: "Library",
    administration: "Administration",
    adminPanel: "Admin Panel",
    exploreLibrary: "Explore Library",
    joinCommunity: "Join Community",
    
    // FavoritePage
    myFavoriteBooks: "My Favorite Books",
    yourCollection: "Your collection of favorite books",
    totalBooks: "Total Books",
    noFavoriteBooksYet: "No Favorite Books Yet",
    startExploring: "Start exploring books and add them to favorite!",
    browseBooks: "Browse Books",
    
    // BookmarksPage
    myBookmarks: "My Bookmarks",
    savedPositions: "Your saved reading positions and notes",
    totalBookmarks: "Total Bookmarks",
    noBookmarksYet: "No Bookmarks Yet",
    startReading: "Start reading books and bookmark your favorite pages!",
    page: "Page",
    note: "Note",
    remove: "Remove",
    
    // Common pagination
    previous: "Previous",
    next: "Next",
    pageOf: "Page",
    prev: "PREV",
    
    // BooksPage
    loadingBooks: "Loading books...",
    featuredBooks: "Featured Books",
    latestBooks: "Latest Books",
    bookLibrary: "Book Library",
    books: "books",
    noNewBooksYet: "No new books yet",
    libraryHasNoBooks: "The library has no books yet",
    pleaseCheckBackLater: "Please check back later...",
    deleteBook: "Delete Book",
    areYouSureDelete: "Are you sure you want to delete the book:",
    thisActionCannotBeUndone: "This action cannot be undone!",
    
    // HistoryPage
    readingHistory: "Reading History",
    booksYouReadToday: "Books you read today",
    allReadingHistory: "All reading history",
    noBooksReadToday: "No books read today",
    exploreAndRead: "Explore and read books to see them appear here!",
    viewFullHistory: "View full history",
    backToToday: "Back to Today",
    noReadingHistory: "No reading history",
    startReading: "Start reading to see your history!",
    today: "Today",
    yesterday: "Yesterday",
    unknownAuthor: "Unknown author",
    loadingHistory: "Loading history...",
    
    // ChatPage
    chatRooms: "Chat Rooms",
    createRoom: "Create Room",
    createNewRoom: "Create New Room",
    roomName: "Room Name",
    enterRoomName: "Enter room name",
    description: "Description",
    enterRoomDescription: "Enter room description (optional)",
    roomType: "Room Type",
    publicRoom: "Public Room",
    anyoneCanJoin: "Anyone can join without invitation",
    privateRoom: "Private Room",
    onlyInvitedMembers: "Only invited members can join",
    loadingChatRooms: "Loading chat rooms...",
    myRooms: "My Rooms",
    discoverRooms: "Discover Rooms",
    searchRoomsByName: "Search rooms by name...",
    noRoomsFound: "No rooms found matching",
    youHaventJoinedRooms: "You haven't joined any rooms yet.",
    createYourFirstRoom: "Create Your First Room",
    noPublicRoomsAvailable: "No public rooms available.",
    enterRoom: "Enter Room",
    joinRoom: "Join Room",
    leave: "Leave",
    owner: "Owner",
    admin: "Admin",
    members: "members",
    messages: "messages",
    global: "Global",
    public: "Public",
    private: "Private",
    areYouSureLeave: "Are you sure you want to leave this room?",
    areYouSureDeleteRoom: "Are you sure you want to delete",
    deleteRoomWarning: "This action cannot be undone and will delete all messages and members.",
    failedToLoadRooms: "Failed to load rooms",
    failedToCreateRoom: "Failed to create room",
    failedToJoinRoom: "Failed to join room",
    failedToLeaveRoom: "Failed to leave room",
    failedToDeleteRoom: "Failed to delete room",
    
    // ChatPopUp
    aiBookAssistant: "AI Book Assistant",
    yourComicBookBuddy: "Your Comic Book Buddy!",
    dragging: "(Dragging...)",
    dragMe: "(Drag me!)",
    online: "Online",
    quickQuestions: "Quick Questions:",
    showMeAllBooks: "Show me all books",
    findProgrammingBooks: "Find programming books",
    businessBooks: "Business books",
    romanceNovels: "Romance novels",
    welcomeToAIBookAssistant: "Welcome to AI Book Assistant!",
    askMeAboutBooks: "Ask me anything about books! Drag the header to move me around!",
    browseBooks: "Browse Books",
    findByGenre: "Find by Genre",
    findByAuthor: "Find by Author",
    showMeScienceFiction: "Show me science fiction books",
    booksByAuthor: "Books by Stephen King",
    askMeAboutBooksPlaceholder: "Ask me about books, authors, genres...",
    searchingThroughBookshelves: "Searching through bookshelves...",
    wasThisResponseHelpful: "Was this response helpful?",
    helpful: "Helpful",
    notHelpful: "Not helpful",
    thankYouForPositiveFeedback: "Thank you for your positive feedback!",
    thankYouForFeedback: "Thank you for your feedback!",
    sorryEncounteredError: "Sorry, I encountered an error. Please try again.",
    cannotConnectToAPI: "Cannot connect to API server",
    failedToSubmitFeedback: "Failed to submit feedback. Please try again.",
    foundBooks: "Found",
    
    // MessagePage
    loadingRoom: "Loading room...",
    roomNotFound: "Room not found",
    accessDenied: "Access denied",
    backToChat: "Back to Chat",
    members: "Members",
    noMembersYet: "No members yet",
    you: "(You)",
    member: "Member",
    offline: "Offline",
    removeMemberFromRoom: "Remove",
    areYouSureRemoveMember: "Are you sure you want to remove",
    fromThisRoom: "from this room?",
    failedToAddMember: "Failed to add member",
    failedToRemoveMember: "Failed to remove member",
    addMember: "Add Member",
    searchUsers: "Search users...",
    sendMessage: "Send message",
    typeAMessage: "Type a message...",
    loadMore: "Load more",
    failedToLoadOlderMessages: "Failed to load older messages",
    connectionLost: "Connection lost. Please refresh the page.",
    failedToConnect: "Failed to connect",
    authenticationRequired: "Authentication required",
    typing: "Typing",
    noMessages: "No messages yet. Start the conversation!",
    deleteRoomConfirm: "Are you sure you want to DELETE",
    deleteRoomDetails: "This will permanently delete:",
    allMessages: "All messages",
    allMembers: "All members",
    theRoomItself: "The room itself",
    cannotBeUndone: "This action CANNOT be undone!",
    failedToSend: "Failed to send",
    failedToDelete: "Failed to delete",
    deleteConfirm: "Delete this message?",
    you: "(You)",
    connected: "Connected",
    connecting: "Connecting...",
    disconnected: "Disconnected",
    errorStatus: "Error",
    retry: "Retry",
    deleteRoomHeader: "Delete Room",
    deleteRoomHeaderTitle: "Delete room (owner only)",
    global: "Global",
    public: "Public",
    private: "Private",
    isTyping: "is typing...",
    adding: "Adding...",
    removeFromRoom: "Remove",
    areYouSureRemove: "Are you sure you want to remove",
    fromThisRoom: "from this room?",
  },
  ja: {
    // Common
    save: "保存",
    cancel: "キャンセル",
    delete: "削除",
    edit: "編集",
    close: "閉じる",
    confirm: "確認",
    loading: "読み込み中...",
    error: "エラー",
    success: "成功",
    back: "戻る",
    
    // Settings
    settings: "設定",
    language: "言語",
    selectLanguage: "言語を選択",
    english: "英語",
    japanese: "日本語",
    languageSettings: "言語設定",
    changeLanguage: "言語を変更",
    languageDescription: "インターフェースの言語を選択してください",
    
    // Navigation
    home: "ホーム",
    books: "書籍",
    profile: "プロフィール",
    favorites: "お気に入り",
    bookmarks: "ブックマーク",
    history: "履歴",
    chat: "チャット",
    admin: "管理者",
    logout: "ログアウト",
    signIn: "ログイン",
    signUp: "登録",
    joinFree: "無料登録",
    hi: "こんにちは",
    
    // Profile
    username: "ユーザー名",
    email: "メール",
    bio: "自己紹介",
    avatar: "アバター",
    
    // Books
    bookDetail: "書籍詳細",
    addToFavorites: "お気に入りに追加",
    removeFromFavorites: "お気に入りから削除",
    addBookmark: "ブックマークを追加",
    removeBookmark: "ブックマークを削除",
    
    // Messages
    noMessages: "メッセージが見つかりません",
    sendMessage: "メッセージを送信",
    
    // Admin
    dashboard: "ダッシュボード",
    users: "ユーザー",
    messages: "メッセージ",
    reports: "レポート",
    chatbot: "チャットボット",
    
    // HomePage
    welcomeBack: "おかえりなさい",
    sanctuary: "聖域",
    continueJourney: "物語の旅を続けましょう",
    yourLiterarySanctuary: "あなたの文学的な",
    sanctuaryAwaits: "聖域が待っています",
    discoverBooks: "数千冊の無料書籍を発見し、情熱的な読者のコミュニティに参加しましょう",
    libraryCurator: "図書館キュレーター",
    readingJourney: "読書の旅",
    library: "ライブラリ",
    administration: "管理",
    adminPanel: "管理パネル",
    exploreLibrary: "図書館を探索",
    joinCommunity: "コミュニティに参加",
    
    // FavoritePage
    myFavoriteBooks: "お気に入りの書籍",
    yourCollection: "お気に入りの書籍コレクション",
    totalBooks: "総書籍数",
    noFavoriteBooksYet: "お気に入りの書籍がまだありません",
    startExploring: "書籍を探索して、お気に入りに追加してください！",
    browseBooks: "書籍を閲覧",
    
    // BookmarksPage
    myBookmarks: "ブックマーク",
    savedPositions: "保存された読書位置とメモ",
    totalBookmarks: "総ブックマーク数",
    noBookmarksYet: "ブックマークがまだありません",
    startReading: "書籍を読み始めて、お気に入りのページをブックマークしてください！",
    page: "ページ",
    note: "メモ",
    remove: "削除",
    
    // Common pagination
    previous: "前へ",
    next: "次へ",
    pageOf: "ページ",
    prev: "前",
    
    // BooksPage
    loadingBooks: "書籍を読み込み中...",
    featuredBooks: "おすすめの書籍",
    latestBooks: "最新の書籍",
    bookLibrary: "書籍ライブラリ",
    books: "書籍",
    noNewBooksYet: "新しい書籍はまだありません",
    libraryHasNoBooks: "ライブラリにはまだ書籍がありません",
    pleaseCheckBackLater: "後でもう一度確認してください...",
    deleteBook: "書籍を削除",
    areYouSureDelete: "この書籍を削除してもよろしいですか:",
    thisActionCannotBeUndone: "この操作は元に戻せません！",
    
    // HistoryPage
    readingHistory: "読書履歴",
    booksYouReadToday: "今日読んだ書籍",
    allReadingHistory: "すべての読書履歴",
    noBooksReadToday: "今日読んだ書籍はありません",
    exploreAndRead: "書籍を探索して読むと、ここに表示されます！",
    viewFullHistory: "完全な履歴を表示",
    backToToday: "今日に戻る",
    noReadingHistory: "読書履歴がありません",
    startReading: "読み始めて履歴を確認してください！",
    today: "今日",
    yesterday: "昨日",
    unknownAuthor: "不明な著者",
    loadingHistory: "履歴を読み込み中...",
    
    // ChatPage
    chatRooms: "チャットルーム",
    createRoom: "ルームを作成",
    createNewRoom: "新しいルームを作成",
    roomName: "ルーム名",
    enterRoomName: "ルーム名を入力",
    description: "説明",
    enterRoomDescription: "ルームの説明を入力（オプション）",
    roomType: "ルームタイプ",
    publicRoom: "公開ルーム",
    anyoneCanJoin: "招待なしで誰でも参加できます",
    privateRoom: "プライベートルーム",
    onlyInvitedMembers: "招待されたメンバーのみ参加できます",
    loadingChatRooms: "チャットルームを読み込み中...",
    myRooms: "マイルーム",
    discoverRooms: "ルームを発見",
    searchRoomsByName: "ルーム名で検索...",
    noRoomsFound: "一致するルームが見つかりません",
    youHaventJoinedRooms: "まだルームに参加していません。",
    createYourFirstRoom: "最初のルームを作成",
    noPublicRoomsAvailable: "公開ルームが利用できません。",
    enterRoom: "ルームに入る",
    joinRoom: "ルームに参加",
    leave: "退出",
    owner: "オーナー",
    admin: "管理者",
    members: "メンバー",
    messages: "メッセージ",
    global: "グローバル",
    public: "公開",
    private: "プライベート",
    areYouSureLeave: "このルームを退出してもよろしいですか？",
    areYouSureDeleteRoom: "削除してもよろしいですか",
    deleteRoomWarning: "この操作は元に戻せず、すべてのメッセージとメンバーが削除されます。",
    failedToLoadRooms: "ルームの読み込みに失敗しました",
    failedToCreateRoom: "ルームの作成に失敗しました",
    failedToJoinRoom: "ルームへの参加に失敗しました",
    failedToLeaveRoom: "ルームからの退出に失敗しました",
    failedToDeleteRoom: "ルームの削除に失敗しました",
    
    // ChatPopUp
    aiBookAssistant: "AI書籍アシスタント",
    yourComicBookBuddy: "あなたのコミック本のバディ！",
    dragging: "(ドラッグ中...)",
    dragMe: "(ドラッグしてください！)",
    online: "オンライン",
    quickQuestions: "クイック質問:",
    showMeAllBooks: "すべての書籍を表示",
    findProgrammingBooks: "プログラミング書籍を検索",
    businessBooks: "ビジネス書籍",
    romanceNovels: "ロマンス小説",
    welcomeToAIBookAssistant: "AI書籍アシスタントへようこそ！",
    askMeAboutBooks: "書籍について何でも聞いてください！ヘッダーをドラッグして移動してください！",
    browseBooks: "書籍を閲覧",
    findByGenre: "ジャンルで検索",
    findByAuthor: "著者で検索",
    showMeScienceFiction: "SF書籍を表示",
    booksByAuthor: "スティーブン・キングの書籍",
    askMeAboutBooksPlaceholder: "書籍、著者、ジャンルについて聞いてください...",
    searchingThroughBookshelves: "本棚を検索中...",
    wasThisResponseHelpful: "この回答は役に立ちましたか？",
    helpful: "役に立った",
    notHelpful: "役に立たなかった",
    thankYouForPositiveFeedback: "ポジティブなフィードバックをありがとうございます！",
    thankYouForFeedback: "フィードバックをありがとうございます！",
    sorryEncounteredError: "申し訳ございませんが、エラーが発生しました。もう一度お試しください。",
    cannotConnectToAPI: "APIサーバーに接続できません",
    failedToSubmitFeedback: "フィードバックの送信に失敗しました。もう一度お試しください。",
    foundBooks: "件の書籍が見つかりました",
    
    // MessagePage
    loadingRoom: "ルームを読み込み中...",
    roomNotFound: "ルームが見つかりません",
    accessDenied: "アクセスが拒否されました",
    backToChat: "チャットに戻る",
    members: "メンバー",
    noMembersYet: "メンバーはまだいません",
    you: "(あなた)",
    member: "メンバー",
    offline: "オフライン",
    removeMemberFromRoom: "削除",
    areYouSureRemoveMember: "削除してもよろしいですか",
    fromThisRoom: "このルームから",
    failedToAddMember: "メンバーの追加に失敗しました",
    failedToRemoveMember: "メンバーの削除に失敗しました",
    addMember: "メンバーを追加",
    searchUsers: "ユーザーを検索...",
    sendMessage: "メッセージを送信",
    typeAMessage: "メッセージを入力...",
    loadMore: "さらに読み込む",
    failedToLoadOlderMessages: "古いメッセージの読み込みに失敗しました",
    connectionLost: "接続が失われました。ページを更新してください。",
    failedToConnect: "接続に失敗しました",
    authenticationRequired: "認証が必要です",
    typing: "入力中",
    noMessages: "まだメッセージがありません。会話を始めましょう！",
    deleteRoomConfirm: "削除してもよろしいですか",
    deleteRoomDetails: "これにより以下が永続的に削除されます:",
    allMessages: "すべてのメッセージ",
    allMembers: "すべてのメンバー",
    theRoomItself: "ルーム自体",
    cannotBeUndone: "この操作は元に戻せません！",
    failedToSend: "送信に失敗しました",
    failedToDelete: "削除に失敗しました",
    deleteConfirm: "このメッセージを削除してもよろしいですか？",
    you: "（あなた）",
    connected: "接続済み",
    connecting: "接続中...",
    disconnected: "切断",
    errorStatus: "エラー",
    retry: "再試行",
    deleteRoomHeader: "ルームを削除",
    deleteRoomHeaderTitle: "ルームを削除（オーナーのみ）",
    global: "グローバル",
    public: "公開",
    private: "プライベート",
    isTyping: "が入力中...",
    adding: "追加中...",
    removeFromRoom: "削除",
    areYouSureRemove: "削除してもよろしいですか",
    fromThisRoom: "このルームから？",
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Load from localStorage or default to English
    const savedLanguage = localStorage.getItem("app_language");
    return savedLanguage && (savedLanguage === "en" || savedLanguage === "ja") 
      ? savedLanguage 
      : "en";
  });

  useEffect(() => {
    // Save to localStorage when language changes
    localStorage.setItem("app_language", language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const changeLanguage = (lang) => {
    if (lang === "en" || lang === "ja") {
      setLanguage(lang);
    }
  };

  const value = {
    language,
    changeLanguage,
    t,
    translations: translations[language],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;

