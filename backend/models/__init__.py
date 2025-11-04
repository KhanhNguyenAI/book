# models/__init__.py
from models.user import User
from models.category import Category
from models.author import Author
from models.book import Book
from models.book_page import BookPage
from models.book_author import BookAuthor
from models.book_rating import BookRating
from models.book_comment import BookComment
from models.user_preference import UserPreference
from models.message import Message
from models.message_report import MessageReport
from models.bot_conversation import BotConversation
from models.bookmark import Bookmark
from models.reading_history import ReadingHistory
from models.password_reset import PasswordReset
from models.chapter import Chapter  # THÊM DÒNG NÀY
from models.favorite import Favorite
from models.view_history import ViewHistory 
__all__ = [
    'User', 'Category', 'Author', 'Book', 'BookPage', 
    'BookAuthor', 'BookRating', 'BookComment', 'UserPreference',
    'Message', 'MessageReport', 'BotConversation', 'Bookmark',
    'ReadingHistory', 'PasswordReset', 'Chapter' ,'Favorite',"ViewHistory" # THÊM Chapter
]