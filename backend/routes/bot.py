"""
Enhanced RAG Chatbot API for Book Database - Smart Version
"""

import os
import json
import hashlib
from decimal import Decimal
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import psycopg2
from psycopg2.extras import RealDictCursor
from sentence_transformers import SentenceTransformer
from chromadb import Client, Settings
import numpy as np
from typing import List, Dict, Optional, Tuple
import logging
from collections import deque
import re
from rank_bm25 import BM25Okapi
import threading
from datetime import datetime
import time
from langdetect import detect, DetectorFactory
from langdetect.lang_detect_exception import LangDetectException
from flask import Blueprint
# Set seed for consistent language detection
DetectorFactory.seed = 0

load_dotenv()

# ============================================
# CONFIGURATION
# ============================================

VECTOR_DB_PATH = os.getenv('VECTOR_DB_PATH', './vector_store')
REBUILD_VECTOR_DB = os.getenv('REBUILD_VECTOR_DB', 'false').lower() == 'true'

# ============================================
# LOGGING
# ============================================

def safe_log_message(message):
    """Remove emojis from log messages for Windows compatibility"""
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE)
    return emoji_pattern.sub('', message)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('book_chatbot.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# ============================================
# LANGUAGE DETECTOR (USING LANGDETECT)
# ============================================

class LanguageDetector:
    """Language detection using langdetect library"""
    
    def __init__(self):
        self.supported_languages = {
            'vi': 'Vietnamese',
            'en': 'English', 
            'ja': 'Japanese',
            'zh-cn': 'Chinese',
            'ko': 'Korean',
            'fr': 'French',
            'es': 'Spanish',
            'de': 'German'
        }
    
    def detect_language(self, text: str) -> Dict:
        """Detect language using langdetect with fallback"""
        if not text or len(text.strip()) < 2:
            return {
                'primary_language': 'en',
                'confidence': 0.5,
                'method': 'fallback_short_text'
            }
        
        try:
            # Use langdetect for accurate detection
            detected_lang = detect(text)
            
            # Map to supported languages or default to English
            if detected_lang in self.supported_languages:
                primary_lang = detected_lang
                confidence = 0.9
                method = 'langdetect'
            else:
                primary_lang = 'en'
                confidence = 0.7
                method = 'langdetect_unsupported'
            
            return {
                'primary_language': primary_lang,
                'language_name': self.supported_languages.get(primary_lang, 'English'),
                'confidence': confidence,
                'method': method,
                'detected_code': detected_lang
            }
            
        except LangDetectException as e:
            logger.warning(f"LangDetect error: {e}, using fallback detection")
            return self._fallback_detection(text)
        except Exception as e:
            logger.error(f"Unexpected language detection error: {e}")
            return {
                'primary_language': 'en',
                'language_name': 'English',
                'confidence': 0.5,
                'method': 'fallback_error'
            }
    
    def _fallback_detection(self, text: str) -> Dict:
        """Fallback detection when langdetect fails"""
        text_lower = text.lower()
        
        # Vietnamese character patterns
        vi_chars = re.findall(r'[áàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]', text)
        if vi_chars:
            return {
                'primary_language': 'vi',
                'language_name': 'Vietnamese',
                'confidence': 0.8,
                'method': 'fallback_vietnamese_chars'
            }
        
        # Japanese characters
        ja_chars = re.findall(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]', text)
        if ja_chars:
            return {
                'primary_language': 'ja',
                'language_name': 'Japanese',
                'confidence': 0.8,
                'method': 'fallback_japanese_chars'
            }
        
        # Chinese characters
        zh_chars = re.findall(r'[\u4E00-\u9FFF]', text)
        if zh_chars:
            return {
                'primary_language': 'zh-cn',
                'language_name': 'Chinese',
                'confidence': 0.8,
                'method': 'fallback_chinese_chars'
            }
        
        # Korean characters
        ko_chars = re.findall(r'[\uAC00-\uD7A3]', text)
        if ko_chars:
            return {
                'primary_language': 'ko',
                'language_name': 'Korean',
                'confidence': 0.8,
                'method': 'fallback_korean_chars'
            }
        
        # Default to English
        return {
            'primary_language': 'en',
            'language_name': 'English',
            'confidence': 0.6,
            'method': 'fallback_default'
        }

# ============================================
# PROMPT MANAGER WITH MULTILINGUAL SUPPORT FOR BOOKS
# ============================================

class MultilingualBookPromptManager:
    """Manage prompts in different languages for books"""
    
    def __init__(self):
        self.prompts = {
            'vi': {
                'system_role': "Bạn là trợ lý thư viện chuyên nghiệp. Dựa vào thông tin sách dưới đây, hãy trả lời câu hỏi:",
                'books_header': "SÁCH:",
                'question_header': "CÂU HỎI:",
                'response_instruction': "Trả lời ngắn gọn, thân thiện (2-3 câu) bằng tiếng Việt:",
                'no_books': "Xin lỗi, hiện chúng tôi không có sách phù hợp với yêu cầu của bạn."
            },
            'en': {
                'system_role': "You are a professional library assistant. Based on the book information below, please answer the question:",
                'books_header': "BOOKS:",
                'question_header': "QUESTION:",
                'response_instruction': "Respond briefly and friendly (2-3 sentences) in English:",
                'no_books': "Sorry, we currently don't have books that match your request."
            },
            'ja': {
                'system_role': "あなたはプロの図書館アシスタントです。以下の書籍情報に基づいて質問に答えてください:",
                'books_header': "書籍:",
                'question_header': "質問:",
                'response_instruction': "簡潔で親しみやすい回答を（2-3文）日本語で:",
                'no_books': "申し訳ありませんが、現在ご要望に合った書籍はございません。"
            },
            'zh-cn': {
                'system_role': "您是一名专业的图书馆助理。请根据以下图书信息回答问题：",
                'books_header': "图书:",
                'question_header': "问题:",
                'response_instruction': "用中文简短友好地回答（2-3句话）：",
                'no_books': "抱歉，我们目前没有符合您要求的图书。"
            }
        }
        
        # Default to English for unsupported languages
        self.default_lang = 'en'
    
    def _format_book_info(self, book: Dict, index: int, language: str) -> str:
        """Format book information according to language"""
        authors = book.get('author', book.get('authors', 'Unknown Author'))
        title = book.get('title', 'Unknown Title')
        description = book.get('description', '')[:200]
        category = book.get('category_name', '')
        rating = book.get('average_rating', 0)
        rating_count = book.get('rating_count', 0)
        view_count = book.get('view_count', 0)
        year = book.get('publication_year', 0)
        series = book.get('series_name', '')
        chapter_count = book.get('chapter_count', 0)
        page_count = book.get('page_count', 0)
        
        # Language-specific labels
        labels = {
            'vi': {
                'by': '-',
                'category': 'Thể loại',
                'series': 'Series',
                'rating': 'Đánh giá',
                'reviews': 'đánh giá',
                'views': 'Lượt xem',
                'chapters': 'Số chương',
                'pages': 'Số trang',
                'description': 'Mô tả'
            },
            'en': {
                'by': 'by',
                'category': 'Category',
                'series': 'Series',
                'rating': 'Rating',
                'reviews': 'reviews',
                'views': 'Views',
                'chapters': 'Chapters',
                'pages': 'Pages',
                'description': 'Description'
            },
            'ja': {
                'by': '著者:',
                'category': 'カテゴリー',
                'series': 'シリーズ',
                'rating': '評価',
                'reviews': 'レビュー',
                'views': '閲覧数',
                'chapters': '章数',
                'pages': 'ページ数',
                'description': '説明'
            },
            'zh-cn': {
                'by': '作者:',
                'category': '类别',
                'series': '系列',
                'rating': '评分',
                'reviews': '评价',
                'views': '浏览次数',
                'chapters': '章节数',
                'pages': '页数',
                'description': '描述'
            }
        }
        
        lang_labels = labels.get(language, labels['en'])
        
        # Build book info
        book_info = f"{index}. {title}"
        if authors and authors != 'Unknown Author':
            book_info += f" {lang_labels['by']} {authors}"
        if year:
            book_info += f" ({year})"
        if category:
            book_info += f"\n   {lang_labels['category']}: {category}"
        if series:
            book_info += f"\n   {lang_labels['series']}: {series}"
        if rating > 0:
            book_info += f"\n   {lang_labels['rating']}: {rating:.1f}/5"
            if rating_count > 0:
                book_info += f" ({rating_count} {lang_labels['reviews']})"
        if view_count > 0:
            book_info += f"\n   {lang_labels['views']}: {view_count}"
        if chapter_count > 0:
            book_info += f"\n   {lang_labels['chapters']}: {chapter_count}"
        if page_count > 0:
            book_info += f"\n   {lang_labels['pages']}: {page_count}"
        if description:
            book_info += f"\n   {lang_labels['description']}: {description}..."
        
        return book_info
    
    def get_prompt(self, query: str, books: List[Dict], language: str) -> str:
        """Generate prompt in the appropriate language với đầy đủ thông tin sách"""
        lang_data = self.prompts.get(language, self.prompts[self.default_lang])
        
        books_text = ""
        # Hiển thị nhiều sách hơn (lên đến 10 sách)
        for i, item in enumerate(books[:10], 1):
            book = item['book']
            book_info = self._format_book_info(book, i, language)
            books_text += book_info + "\n\n"
        
        # Instruction text based on language
        instruction_additions = {
            'vi': "Hãy sử dụng tất cả thông tin có sẵn về sách (tiêu đề, tác giả, thể loại, đánh giá, mô tả, series, năm xuất bản, số chương, số trang) để trả lời câu hỏi một cách chi tiết và chính xác.",
            'en': "Please use all available information about the books (title, author, category, rating, description, series, publication year, number of chapters, number of pages) to answer the question in detail and accurately.",
            'ja': "利用可能なすべての書籍情報（タイトル、著者、カテゴリー、評価、説明、シリーズ、出版年、章数、ページ数）を使用して、質問に詳細かつ正確に答えてください。",
            'zh-cn': "请使用所有可用的书籍信息（标题、作者、类别、评分、描述、系列、出版年份、章节数、页数）来详细准确地回答问题。"
        }
        
        instruction_text = instruction_additions.get(language, instruction_additions['en'])
        
        prompt = f"""{lang_data['system_role']}

{lang_data['books_header']}
{books_text}

{lang_data['question_header']} {query}

{lang_data['response_instruction']}
{instruction_text}"""
        
        return prompt
    
    def get_no_books_response(self, language: str) -> str:
        """Get no books response in appropriate language"""
        return self.prompts.get(language, self.prompts[self.default_lang])['no_books']

# ============================================
# SIMPLE METRICS
# ============================================

class SimpleMetrics:
    def __init__(self):
        self.queries = deque(maxlen=100)
        self.lock = threading.Lock()
    
    def log(self, query: str, response_time: float, score: float, used_reasoning: bool, language: str):
        with self.lock:
            self.queries.append({
                'timestamp': datetime.now().isoformat(),
                'query': query[:100],
                'time_ms': response_time,
                'score': score,
                'used_reasoning': used_reasoning,
                'language': language
            })
    
    def get_stats(self) -> Dict:
        with self.lock:
            if not self.queries:
                return {'total_queries': 0, 'avg_time_ms': 0, 'avg_score': 0, 'reasoning_rate': 0, 'low_score_count': 0}
            
            queries_list = list(self.queries)
            languages = [q['language'] for q in queries_list]
            
            return {
                'total_queries': len(queries_list),
                'avg_time_ms': round(np.mean([q['time_ms'] for q in queries_list]), 2),
                'avg_score': round(np.mean([q['score'] for q in queries_list]), 3),
                'reasoning_rate': round(sum(q['used_reasoning'] for q in queries_list) / len(queries_list) * 100, 1),
                'low_score_count': sum(1 for q in queries_list if q['score'] < 0.3),
                'language_distribution': {
                    lang: languages.count(lang) for lang in set(languages)
                },
                'recent_queries': [{'query': q['query'], 'score': q['score'], 'language': q['language']} for q in queries_list[-5:]]
            }

# ============================================
# PostgreSQL CONNECTION FOR BOOKS
# ============================================

class PostgreSQLBookManager:
    def __init__(self):
        # Sử dụng DATABASE_URL từ environment variables
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL is not set in environment variables")
        
        # Parse DATABASE_URL thành các tham số kết nối
        try:
            # Format: postgresql://username:password@host:port/database
            if database_url.startswith('postgres://'):
                database_url = database_url.replace('postgres://', 'postgresql://', 1)
            
            self.conn_params = {
                'dsn': database_url
            }
        except Exception as e:
            logger.error(f"Error parsing DATABASE_URL: {e}")
            raise
        
        self._test_connection()
    
    def _test_connection(self):
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            conn.close()
            logger.info("PostgreSQL connection successful")
        except Exception as e:
            logger.error(f"PostgreSQL connection failed: {e}")
            raise
    
    def get_connection(self):
        return psycopg2.connect(**self.conn_params)
    
    def execute_query(self, query: str, params: tuple = None, fetch: bool = True):
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params)
            
            if fetch:
                results = cursor.fetchall()
                return [dict(row) for row in results]
            else:
                conn.commit()
                return None
        except Exception as e:
            logger.error(f"Database query error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def load_all_books(self) -> List[Dict]:
        try:
            query = """
            SELECT 
                b.id, b.title, b.isbn, b.publication_year, 
                b.description, b.pdf_path, b.image_path, b.cover_image,
                b.category_id, b.created_at, b.view_count, b.volume_number,
                b.total_volumes, b.chapter_count, b.page_count, b.book_type,
                b.series_name,
                c.name as category_name,
                COUNT(br.book_id) as rating_count,
                COALESCE(AVG(br.rating), 0) as average_rating,
                COALESCE(STRING_AGG(a.name, ', '), 'Unknown Author') as authors
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN book_authors ba ON b.id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.id
            LEFT JOIN book_ratings br ON b.id = br.book_id
            GROUP BY b.id, c.name
            ORDER BY b.id
            """
            books = self.execute_query(query)
            
            # Format the books data
            formatted_books = []
            for book in books:
                formatted_book = {
                    'id': book['id'],
                    'title': book['title'],
                    # SỬA QUAN TRỌNG: Sử dụng authors thay vì author
                    'authors': book['authors'],  # Đây là authors từ STRING_AGG
                    'isbn': book['isbn'],
                    'publication_year': book['publication_year'],
                    'description': book['description'],
                    'pdf_path': book['pdf_path'],
                    'image_path': book['image_path'],
                    'cover_image': book['cover_image'],
                    'category_id': book['category_id'],
                    'created_at': book['created_at'],
                    'view_count': book['view_count'],
                    'volume_number': book['volume_number'],
                    'total_volumes': book['total_volumes'],
                    'chapter_count': book['chapter_count'],
                    'page_count': book['page_count'],
                    'book_type': book['book_type'],
                    'series_name': book['series_name'],
                    'category_name': book['category_name'],
                    'average_rating': float(book['average_rating']),
                    'rating_count': book['rating_count']
                }
                formatted_books.append(formatted_book)
            
            logger.info(f"Loaded {len(formatted_books)} books from PostgreSQL")
            return formatted_books
        except Exception as e:
            logger.error(f"Failed to load books: {e}")
            return []
# ============================================
# HYBRID SEARCH ENGINE FOR BOOKS WITH VECTOR DB MANAGEMENT
# ============================================

class BookHybridSearchEngine:
    def __init__(self, db_manager: PostgreSQLBookManager, 
                 model_name='sentence-transformers/all-MiniLM-L6-v2'):
        logger.info(f"Loading embedding model: {model_name}")
        
        self.model = SentenceTransformer(model_name)
        self.db = db_manager
        
        # Chroma setup với quản lý Vector DB
        self.chroma_dir = VECTOR_DB_PATH
        os.makedirs(self.chroma_dir, exist_ok=True)
        
        self.chroma_client = Client(Settings(
            persist_directory=self.chroma_dir,
            anonymized_telemetry=False
        ))
        
        self.documents = []
        self.tokenized_docs = []
        self.bm25 = None
        
        self._initialize_vector_db()
        
        logger.info("Book Hybrid Search ready")
    
    def _initialize_vector_db(self):
        """Khởi tạo Vector DB với kiểm tra REBUILD_VECTOR_DB"""
        
        # Kiểm tra xem collection đã tồn tại chưa
        collection_exists = False
        try:
            existing_collections = self.chroma_client.list_collections()
            collection_exists = any(collection.name == "books" for collection in existing_collections)
        except:
            collection_exists = False
        
        if REBUILD_VECTOR_DB or not collection_exists:
            logger.info(f"REBUILD_VECTOR_DB={REBUILD_VECTOR_DB}, rebuilding vector database...")
            self._rebuild_vector_db()
        else:
            logger.info("Loading existing vector database...")
            self._load_existing_vector_db()
    
    def _rebuild_vector_db(self):
        """Xây dựng lại toàn bộ Vector DB từ đầu"""
        # Xóa collection cũ nếu tồn tại
        try:
            self.chroma_client.delete_collection("books")
            logger.info("Deleted old collection")
        except:
            pass
        
        # Tạo collection mới
        self.collection = self.chroma_client.create_collection(
            name="books",
            metadata={"hnsw:space": "cosine"}
        )
        
        self._build_indices()
    
    def _load_existing_vector_db(self):
        """Tải Vector DB đã tồn tại"""
        try:
            self.collection = self.chroma_client.get_collection("books")
            books = self.db.load_all_books()
            self.documents = books
            
            # Build BM25 từ dữ liệu hiện có - Cập nhật để bao gồm nhiều metadata hơn
            texts = []
            for book in books:
                authors = book.get('authors', 'Unknown Author')
                rating_info = f"rating {book.get('average_rating', 0):.1f}" if book.get('average_rating', 0) > 0 else ""
                rating_count_info = f"{book.get('rating_count', 0)} reviews" if book.get('rating_count', 0) > 0 else ""
                series_info = f"series {book.get('series_name', '')}" if book.get('series_name') else ""
                year_info = f"year {book.get('publication_year', '')}" if book.get('publication_year') else ""
                texts.append(f"{book['title']} {authors} {book.get('description', '')} {book.get('category_name', '')} {series_info} {year_info} {rating_info} {rating_count_info}")
            self.tokenized_docs = [text.lower().split() for text in texts]
            self.bm25 = BM25Okapi(self.tokenized_docs)
            
            logger.info(f"Loaded existing vector database with {len(books)} books")
        except Exception as e:
            logger.warning(f"Failed to load existing vector database: {e}, rebuilding...")
            self._rebuild_vector_db()
    
    def _convert_decimal_to_float(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self._convert_decimal_to_float(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_decimal_to_float(item) for item in obj]
        else:
            return obj
    
    def _build_indices(self):
        """Xây dựng indices từ dữ liệu books"""
        books = self.db.load_all_books()
        if not books:
            logger.warning("No books loaded from database")
            return
        
        self.documents = books
        logger.info("Building Chroma index from scratch...")
        
        # Prepare data
        texts = []
        metadatas = []
        ids = []
        
        for book in books:
            authors = book.get('authors', 'Unknown Author')
            # Mở rộng text embedding để bao gồm nhiều thông tin hơn
            rating_info = f"rating {book.get('average_rating', 0):.1f}" if book.get('average_rating', 0) > 0 else ""
            rating_count_info = f"{book.get('rating_count', 0)} reviews" if book.get('rating_count', 0) > 0 else ""
            view_info = f"viewed {book.get('view_count', 0)} times" if book.get('view_count', 0) > 0 else ""
            chapter_info = f"{book.get('chapter_count', 0)} chapters" if book.get('chapter_count', 0) > 0 else ""
            page_info = f"{book.get('page_count', 0)} pages" if book.get('page_count', 0) > 0 else ""
            series_info = f"part of series {book.get('series_name', '')}" if book.get('series_name') else ""
            year_info = f"published {book.get('publication_year', '')}" if book.get('publication_year') else ""
            
            text = f"{book['title']} by {authors} {book.get('category_name', '')} {book.get('description', '')} {series_info} {year_info} {rating_info} {rating_count_info} {view_info} {chapter_info} {page_info}"
            texts.append(text)
            
            # Mở rộng metadata để bao gồm nhiều thông tin hơn
            processed_book = {
                'id': book['id'],
                'title': book['title'] or '',
                'author': authors,
                'publication_year': book.get('publication_year') or 0,
                'description': book.get('description') or '',
                'category_name': book.get('category_name') or '',
                'average_rating': float(book.get('average_rating', 0) or 0),
                'rating_count': int(book.get('rating_count', 0) or 0),
                'view_count': int(book.get('view_count', 0) or 0),
                'chapter_count': int(book.get('chapter_count', 0) or 0),
                'page_count': int(book.get('page_count', 0) or 0),
                'series_name': book.get('series_name') or '',
                'isbn': book.get('isbn') or '',
                'book_type': book.get('book_type') or ''
            }
            metadatas.append(processed_book)
            ids.append(str(book['id']))
        
        # Get actual dimension
        actual_dimension = self.model.get_sentence_embedding_dimension()
        logger.info(f"Model dimension: {actual_dimension}")
        
        # Add to Chroma
        embeddings = self.model.encode(texts, show_progress_bar=False).tolist()
        self.collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        
        logger.info(f"Chroma index built with {len(books)} books")
        
        # Build BM25 - Cải thiện để bao gồm nhiều metadata hơn
        texts = []
        for book in books:
            authors = book.get('authors', 'Unknown Author')
            rating_info = f"rating {book.get('average_rating', 0):.1f}" if book.get('average_rating', 0) > 0 else ""
            rating_count_info = f"{book.get('rating_count', 0)} reviews" if book.get('rating_count', 0) > 0 else ""
            series_info = f"series {book.get('series_name', '')}" if book.get('series_name') else ""
            year_info = f"year {book.get('publication_year', '')}" if book.get('publication_year') else ""
            texts.append(f"{book['title']} {authors} {book.get('description', '')} {book.get('category_name', '')} {series_info} {year_info} {rating_info} {rating_count_info}")
        
        self.tokenized_docs = [text.lower().split() for text in texts]
        self.bm25 = BM25Okapi(self.tokenized_docs)
        logger.info("BM25 index built")
    
    def hybrid_search(self, query: str, top_k: int = 10, alpha: float = 0.7) -> List[Dict]:
        if not self.documents:
            return []
        
        try:
            # Vector search
            chroma_results = self.collection.query(
                query_texts=[query],
                n_results=min(top_k * 2, len(self.documents)),
                include=["metadatas", "distances"]
            )
            
            if not chroma_results['metadatas'][0]:
                return []
            
            vector_results = []
            for meta, dist in zip(chroma_results['metadatas'][0], chroma_results['distances'][0]):
                similarity = 1 - dist
                vector_results.append({
                    'book': meta,
                    'similarity': max(0, similarity)
                })
            
            # BM25 scores
            tokenized_query = query.lower().split()
            bm25_scores = self.bm25.get_scores(tokenized_query)
            
            max_bm25 = bm25_scores.max()
            if max_bm25 > 0:
                bm25_scores = bm25_scores / max_bm25
            
            id_to_bm25 = {doc['id']: bm25_scores[i] for i, doc in enumerate(self.documents)}
            
            # Combine scores
            for res in vector_results:
                doc_id = res['book']['id']
                bm25_score = id_to_bm25.get(doc_id, 0)
                res['score'] = alpha * res['similarity'] + (1 - alpha) * bm25_score
            
            vector_results.sort(key=lambda x: x['score'], reverse=True)
            return vector_results[:top_k]
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
    
    def get_vector_db_info(self) -> Dict:
        """Get information about the vector database"""
        try:
            count = self.collection.count()
            return {
                'vector_db_path': VECTOR_DB_PATH,
                'rebuild_vector_db': REBUILD_VECTOR_DB,
                'total_documents': count,
                'status': 'loaded'
            }
        except Exception as e:
            return {
                'vector_db_path': VECTOR_DB_PATH,
                'rebuild_vector_db': REBUILD_VECTOR_DB,
                'total_documents': 0,
                'status': 'error',
                'error': str(e)
            }

# ============================================
# MULTILINGUAL BOOK CHATBOT
# ============================================

class MultilingualBookChatbot:
    def __init__(self):
        logger.info("Initializing Multilingual Book Chatbot...")
        
        try:
            self.db = PostgreSQLBookManager()
            self.search_engine = BookHybridSearchEngine(self.db)
            self.language_detector = LanguageDetector()
            self.prompt_manager = MultilingualBookPromptManager()
            
            # Simple response generator
            self.api_key = os.getenv('GEMINI_API_KEY')
            if not self.api_key:
                raise ValueError("GEMINI_API_KEY required")
            
            try:
                from google import genai
                self.llm_client = genai.Client(api_key=self.api_key)
                self.client_type = 'new'
            except:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.llm_client = genai.GenerativeModel('gemini-2.5-flash')
                self.client_type = 'old'
                
            self.sessions = {}
            self.metrics = SimpleMetrics()
            
            logger.info("Multilingual Book Chatbot ready!")
            
        except Exception as e:
            logger.error(f"Failed to initialize chatbot: {e}")
            raise
    
    def generate_response(self, prompt: str) -> str:
        try:
            if self.client_type == 'new':
                response = self.llm_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt
                )
                return response.text.strip()
            else:
                response = self.llm_client.generate_content(prompt)
                return response.text.strip()
        except Exception as e:
            logger.error(f"LLM error: {e}")
            return "Xin lỗi, có lỗi khi tạo phản hồi."
    
    def chat(self, query: str, session_id: str = "default") -> Dict:
        start_time = time.time()
        
        try:
            if not query or not query.strip():
                return {'status': 'error', 'response': 'Vui lòng nhập câu hỏi về sách'}
            
            query = query.strip()
            
            # Detect language
            lang_result = self.language_detector.detect_language(query)
            detected_lang = lang_result['primary_language']
            confidence = lang_result['confidence']
            
            logger.info(f"Detected language: {detected_lang} (confidence: {confidence})")
            
            # Search books - Tăng top_k để lấy nhiều sách hơn
            results = self.search_engine.hybrid_search(query, top_k=15)
            best_score = results[0]['score'] if results else 0
            
            if results:
                # Create multilingual prompt
                prompt = self.prompt_manager.get_prompt(query, results, detected_lang)
                response_text = self.generate_response(prompt)
            else:
                # No books found response in appropriate language
                response_text = self.prompt_manager.get_no_books_response(detected_lang)
            
            # Metrics
            response_time = (time.time() - start_time) * 1000
            self.metrics.log(query, response_time, best_score, False, detected_lang)
            
            return {
                'status': 'success',
                'response': response_text,
                'metadata': {
                    'books_found': len(results),
                    'best_score': round(best_score, 3),
                    'response_time_ms': round(response_time, 2),
                    'language_detected': detected_lang,
                    'language_confidence': confidence,
                    'language_name': lang_result.get('language_name', 'Unknown')
                }
            }
            
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return {
                'status': 'error',
                'response': 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.'
            }
    
    def get_vector_db_stats(self) -> Dict:
        """Get vector database statistics for health check"""
        try:
            vector_db_info = self.search_engine.get_vector_db_info()
            stats = self.search_engine.collection.count()
            return {
                'total_books': stats,
                'chroma_status': 'connected',
                'collection_name': 'books',
                'vector_db_info': vector_db_info
            }
        except Exception as e:
            logger.error(f"Error getting vector DB stats: {e}")
            return {
                'total_books': 0,
                'chroma_status': 'error',
                'error': str(e),
                'vector_db_info': {
                    'vector_db_path': VECTOR_DB_PATH,
                    'rebuild_vector_db': REBUILD_VECTOR_DB,
                    'status': 'error'
                }
            }
    
    def rebuild_vector_db(self) -> Dict:
        """Rebuild vector database manually"""
        try:
            logger.info("Manual vector database rebuild requested")
            self.search_engine._rebuild_vector_db()
            return {
                'status': 'success',
                'message': 'Vector database rebuilt successfully',
                'total_books': len(self.search_engine.documents)
            }
        except Exception as e:
            logger.error(f"Error rebuilding vector database: {e}")
            return {
                'status': 'error',
                'message': f'Failed to rebuild vector database: {str(e)}'
            }

# ============================================
# FLASK ROUTES - TẠO BLUEPRINT
# ============================================
# ============================================
# FLASK ROUTES - TẠO BLUEPRINT
# ============================================

# Tạo Blueprint
bot_bp = Blueprint('bot', __name__)

# Khởi tạo chatbot (sẽ được khởi tạo trong app context)
chatbot = None

def init_rag_chatbot():
    """Khởi tạo chatbot - được gọi từ app.py"""
    global chatbot
    try:
        chatbot = MultilingualBookChatbot()
        logger.info("RAG Chatbot initialized successfully")
        return chatbot
    except Exception as e:
        logger.error(f"Failed to initialize RAG chatbot: {e}")
        raise

# Import và sử dụng login_required từ auth module của bạn
from middleware.auth_middleware import login_required
from extensions import db
from models.bot_conversation import BotConversation
# Routes cho Blueprint
@bot_bp.route('/')
def home():
    # Public endpoint - không cần login
    vector_db_info = {
        'vector_db_path': VECTOR_DB_PATH,
        'rebuild_vector_db': REBUILD_VECTOR_DB,
        'status': 'configured'
    }
    
    return jsonify({
        "name": "Multilingual Book Chatbot API",
        "status": "running",
        "vector_db_config": vector_db_info,
        "features": {
            "language_detection": "Supported (vi, en, ja, zh-cn, ko, fr, es, de)",
            "search": "Hybrid Book Search (Vector + BM25)",
            "llm": "Gemini 2.5 Flash",
            "data_source": "Book Database",
            "vector_db_management": "Enabled"
        },
        "endpoints": {
            "chat": "POST /chat",
            "health": "GET /health",
            "books": "GET /books",
            "stats": "GET /stats",
            "detect_language": "POST /detect-language",
            "vector_db_info": "GET /vector-db-info",
            "rebuild_vector_db": "POST /rebuild-vector-db"
        }
    })

@bot_bp.route('/health')
def health():
    # Public endpoint
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@bot_bp.route('/books')
@login_required
def get_books():
    try:
        if not chatbot:
            return jsonify({"status": "error", "message": "Chatbot not initialized"}), 500
        
        books = chatbot.db.load_all_books()
        return jsonify({
            "status": "success",
            "books": books,
            "total": len(books)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to load books"}), 500

@bot_bp.route('/stats')
@login_required
def get_stats():
    try:
        if not chatbot:
            return jsonify({"status": "error", "message": "Chatbot not initialized"}), 500
        
        stats = chatbot.metrics.get_stats()
        return jsonify({
            "status": "success",
            "statistics": stats
        })
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to get stats"}), 500

@bot_bp.route('/detect-language', methods=['POST'])
@login_required
def detect_language_endpoint():
    try:
        if not chatbot:
            return jsonify({"status": "error", "message": "Chatbot not initialized"}), 500
        
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"status": "error", "message": "Missing 'text' field"}), 400
        
        text = data['text']
        result = chatbot.language_detector.detect_language(text)
        
        return jsonify({
            "status": "success",
            "detection_result": result
        })
        
    except Exception as e:
        logger.error(f"Language detection error: {e}")
        return jsonify({"status": "error", "message": "Language detection failed"}), 500

@bot_bp.route('/chat', methods=['POST'])
@login_required
def chat_endpoint():
    try:
        if not chatbot:
            return jsonify({"status": "error", "message": "Chatbot not initialized"}), 500
        
        data = request.json
        if not data or 'message' not in data:
            return jsonify({"status": "error", "message": "Missing message"}), 400
        
        message = data['message']
        session_id = data.get('session_id', 'default')
        
        result = chatbot.chat(message, session_id)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        return jsonify({"status": "error", "message": "Internal error"}), 500

@bot_bp.route('/vector-db-info', methods=['GET'])
@login_required
def get_vector_db_info():
    try:
        if not chatbot:
            return jsonify({"status": "error", "message": "Chatbot not initialized"}), 500
        
        vector_db_info = chatbot.search_engine.get_vector_db_info()
        return jsonify({
            "status": "success",
            "vector_db_info": vector_db_info
        })
    except Exception as e:
        logger.error(f"Vector DB info error: {e}")
        return jsonify({"status": "error", "message": "Failed to get vector DB info"}), 500

@bot_bp.route('/rebuild-vector-db', methods=['POST'])
@login_required
def rebuild_vector_db_endpoint():
    try:
        if not chatbot:
            return jsonify({"status": "error", "message": "Chatbot not initialized"}), 500
        
        result = chatbot.rebuild_vector_db()
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Rebuild vector DB error: {e}")
        return jsonify({"status": "error", "message": "Failed to rebuild vector database"}), 500

@bot_bp.route('/feedback', methods=['POST'])
@login_required
def submit_feedback():
    """Save bot conversation feedback (only saves when user provides feedback)"""
    try:
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "Missing data"}), 400
        
        user_message = data.get('user_message')
        bot_response = data.get('bot_response')
        is_positive = data.get('is_positive')
        
        # Validate required fields
        if not user_message or not bot_response:
            return jsonify({"status": "error", "message": "Missing user_message or bot_response"}), 400
        
        if is_positive is None:
            return jsonify({"status": "error", "message": "Missing is_positive field"}), 400
        
        # Get current user from g (set by login_required)
        user_id = g.user.id
        
        # Create and save bot conversation
        conversation = BotConversation(
            user_id=user_id,
            user_message=user_message,
            bot_response=bot_response,
            is_positive=bool(is_positive)
        )
        
        db.session.add(conversation)
        db.session.commit()
        
        logger.info(f"Feedback saved for user {user_id}: is_positive={is_positive}")
        
        return jsonify({
            "status": "success",
            "message": "Feedback saved successfully",
            "conversation_id": conversation.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Save feedback error: {e}")
        return jsonify({"status": "error", "message": "Failed to save feedback"}), 500

# Export Blueprint