# models/__init__.py
from backend.models.user import User
from backend.models.category import Category
from backend.models.author import Author
from backend.models.book import Book
from backend.models.book_page import BookPage
from backend.models.book_author import BookAuthor
from backend.models.book_rating import BookRating
from backend.models.book_comment import BookComment
from backend.models.user_preference import UserPreference
from backend.models.message import Message
from backend.models.message_report import MessageReport
from backend.models.bot_conversation import BotConversation
from backend.models.bookmark import Bookmark
from backend.models.reading_history import ReadingHistory
from backend.models.password_reset import PasswordReset
from backend.models.chapter import Chapter  # THÊM DÒNG NÀY
from backend.models.favorite import Favorite
from backend.models.view_history import ViewHistory 
__all__ = [
    'User', 'Category', 'Author', 'Book', 'BookPage', 
    'BookAuthor', 'BookRating', 'BookComment', 'UserPreference',
    'Message', 'MessageReport', 'BotConversation', 'Bookmark',
    'ReadingHistory', 'PasswordReset', 'Chapter' ,'Favorite',"ViewHistory" # THÊM Chapter
]