# """
# Ultra-Smart RAG Book Chatbot with Hybrid Search & Advanced Features
# FIXED: Proper app context handling
# """

# import os
# import json
# import logging
# import threading
# import time
# from datetime import datetime
# from collections import deque
# from decimal import Decimal
# import numpy as np
# import re

# from flask import Blueprint, request, g, current_app, has_app_context
# from backend.middleware.auth_middleware import login_required
# from backend.extensions import db
# from backend.models.book import Book
# from backend.models.bot_conversation import BotConversation
# from backend.utils.error_handler import create_error_response
# from chromadb import PersistentClient
# from sentence_transformers import SentenceTransformer
# from tenacity import retry, stop_after_attempt, wait_fixed
# from sqlalchemy.orm import joinedload
# import google.generativeai as genai
# from rank_bm25 import BM25Okapi

# logger = logging.getLogger(__name__)
# bot_bp = Blueprint('bot', __name__)

# # ============================================
# # METRICS SYSTEM
# # ============================================

# class ChatbotMetrics:
#     """Advanced metrics tracking system"""
#     def __init__(self):
#         self.queries = deque(maxlen=1000)
#         self.lock = threading.Lock()
#         self.start_time = datetime.now()
    
#     def log_query(self, query: str, response_time: float, best_score: float, 
#                   results_count: int, intent: str, used_history: bool):
#         with self.lock:
#             self.queries.append({
#                 'timestamp': datetime.now().isoformat(),
#                 'query': query[:100],
#                 'time_ms': response_time,
#                 'score': best_score,
#                 'results': results_count,
#                 'intent': intent,
#                 'used_history': used_history
#             })
    
#     def get_stats(self) -> dict:
#         with self.lock:
#             if not self.queries:
#                 return {
#                     'total_queries': 0,
#                     'avg_time_ms': 0,
#                     'avg_score': 0,
#                     'uptime_hours': 0
#                 }
            
#             queries_list = list(self.queries)
#             uptime = (datetime.now() - self.start_time).total_seconds() / 3600
            
#             return {
#                 'total_queries': len(queries_list),
#                 'avg_time_ms': round(np.mean([q['time_ms'] for q in queries_list]), 2),
#                 'avg_score': round(np.mean([q['score'] for q in queries_list]), 3),
#                 'low_score_rate': round(sum(1 for q in queries_list if q['score'] < 0.3) / len(queries_list) * 100, 1),
#                 'history_usage_rate': round(sum(q['used_history'] for q in queries_list) / len(queries_list) * 100, 1),
#                 'uptime_hours': round(uptime, 2),
#                 'intents': self._get_intent_stats(queries_list),
#                 'recent_queries': [
#                     {'query': q['query'], 'score': q['score'], 'intent': q['intent']} 
#                     for q in queries_list[-5:]
#                 ]
#             }
    
#     def _get_intent_stats(self, queries_list):
#         intents = {}
#         for q in queries_list:
#             intent = q.get('intent', 'unknown')
#             intents[intent] = intents.get(intent, 0) + 1
#         return intents

# # ============================================
# # HYBRID SEARCH ENGINE
# # ============================================

# class HybridBookSearchEngine:
#     """Combines Vector Search (Chroma) + BM25 for superior results"""
    
#     def __init__(self, vector_db_path: str, model_name='all-MiniLM-L6-v2'):
#         self.vector_db_path = vector_db_path
#         self.model = SentenceTransformer(model_name)
#         self.vector_db = None
#         self.collection = None
#         self.bm25 = None
#         self.documents = []
#         self.tokenized_docs = []
#         self._initialized = False
        
#         # Setup vector DB without loading books yet
#         self._setup_vector_db_only()
    
#     def _setup_vector_db_only(self):
#         """Initialize Chroma WITHOUT loading books (called during __init__)"""
#         try:
#             os.makedirs(self.vector_db_path, exist_ok=True)
#             self.vector_db = PersistentClient(path=self.vector_db_path)
            
#             # Get or create collection
#             try:
#                 self.collection = self.vector_db.get_collection(name="books")
#                 logger.info(f"Loaded existing collection with {self.collection.count()} books")
#             except:
#                 self.collection = self.vector_db.create_collection(
#                     name="books",
#                     metadata={"hnsw:space": "cosine"}
#                 )
#                 logger.info("Created new books collection")
            
#             logger.info("Vector DB initialized (books not loaded yet)")
                
#         except Exception as e:
#             logger.error(f"Failed to setup vector DB: {e}")
#             raise
    
#     def ensure_initialized(self):
#         """Lazy load books when first needed (must be called with app context)"""
#         if self._initialized:
#             return
        
#         if not has_app_context():
#             logger.warning("Cannot initialize books without app context")
#             return
        
#         try:
#             # Check if we need to rebuild
#             if os.getenv('REBUILD_VECTOR_DB', 'false').lower() == 'true':
#                 self._rebuild_indices()
#             else:
#                 # Just load documents for BM25
#                 self._load_documents_for_bm25()
            
#             self._initialized = True
#             logger.info("Search engine fully initialized")
            
#         except Exception as e:
#             logger.error(f"Failed to initialize search engine: {e}")
    
#     def _load_documents_for_bm25(self):
#         """Load books for BM25 index (requires app context)"""
#         try:
#             if not has_app_context():
#                 logger.warning("Cannot load books without app context")
#                 return
            
#             books = Book.query.options(
#                 joinedload(Book.category),
#                 joinedload(Book.book_authors)
#             ).all()
            
#             self.documents = books
#             texts = [
#                 f"{book.title} {book.author or ''} {book.category.name if book.category else ''} {book.description or ''}"
#                 for book in books
#             ]
#             self.tokenized_docs = [self._tokenize(text) for text in texts]
#             self.bm25 = BM25Okapi(self.tokenized_docs)
            
#             logger.info(f"Loaded {len(books)} books for BM25")
#         except Exception as e:
#             logger.error(f"Failed to load books for BM25: {e}")
    
#     @retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
#     def _rebuild_indices(self):
#         """Rebuild both Vector DB and BM25 index (requires app context)"""
#         try:
#             if not has_app_context():
#                 raise RuntimeError("Cannot rebuild indices without app context")
            
#             # Clear existing collection
#             try:
#                 self.vector_db.delete_collection(name="books")
#             except:
#                 pass
            
#             self.collection = self.vector_db.create_collection(
#                 name="books",
#                 metadata={"hnsw:space": "cosine"}
#             )
            
#             # Load books
#             books = Book.query.options(
#                 joinedload(Book.category),
#                 joinedload(Book.book_authors)
#             ).all()
            
#             if not books:
#                 logger.warning("No books found for indexing")
#                 return
            
#             self.documents = books
            
#             # Prepare data
#             documents = []
#             metadatas = []
#             ids = []
#             texts_for_bm25 = []
            
#             for book in books:
#                 # Rich text for vector search
#                 text = f"{book.title} {book.description or ''} {book.author or ''} {book.category.name if book.category else ''}"
#                 documents.append(text)
#                 texts_for_bm25.append(text)
                
#                 # Metadata
#                 metadatas.append({
#                     'book_id': book.id,
#                     'title': book.title,
#                     'author': book.author or '',
#                     'category_id': book.category_id or 0,
#                     'category_name': book.category.name if book.category else '',
#                     'publication_year': book.publication_year or 0,
#                     'isbn': book.isbn or '',
#                     'description': (book.description or '')[:300]
#                 })
#                 ids.append(str(book.id))
            
#             # Build vector index
#             embeddings = self.model.encode(documents, show_progress_bar=False).tolist()
#             self.collection.add(
#                 documents=documents,
#                 embeddings=embeddings,
#                 metadatas=metadatas,
#                 ids=ids
#             )
            
#             # Build BM25 index
#             self.tokenized_docs = [self._tokenize(text) for text in texts_for_bm25]
#             self.bm25 = BM25Okapi(self.tokenized_docs)
            
#             logger.info(f"Successfully rebuilt indices with {len(books)} books")
            
#         except Exception as e:
#             logger.error(f"Failed to rebuild indices: {e}")
#             raise
    
#     def _tokenize(self, text: str) -> list:
#         """Simple tokenization"""
#         return text.lower().split()
    
#     def hybrid_search(self, query: str, top_k: int = 10, alpha: float = 0.7) -> list:
#         """
#         Hybrid search combining vector similarity and BM25
#         alpha: weight for vector search (1-alpha for BM25)
#         """
#         # Ensure initialized before searching
#         self.ensure_initialized()
        
#         if not self.documents or not self.bm25:
#             logger.warning("Search engine not fully initialized")
#             return []
        
#         try:
#             # 1. Vector Search (Chroma)
#             chroma_results = self.collection.query(
#                 query_texts=[query],
#                 n_results=min(top_k * 2, len(self.documents)),
#                 include=["metadatas", "distances"]
#             )
            
#             if not chroma_results['metadatas'][0]:
#                 return []
            
#             # Process vector results
#             vector_results = {}
#             for meta, dist in zip(chroma_results['metadatas'][0], chroma_results['distances'][0]):
#                 book_id = meta['book_id']
#                 similarity = max(0, 1 - dist)  # Convert distance to similarity
#                 vector_results[book_id] = {
#                     'metadata': meta,
#                     'vector_score': similarity
#                 }
            
#             # 2. BM25 Search
#             tokenized_query = self._tokenize(query)
#             bm25_scores = self.bm25.get_scores(tokenized_query)
            
#             # Normalize BM25 scores
#             max_bm25 = bm25_scores.max()
#             if max_bm25 > 0:
#                 bm25_scores = bm25_scores / max_bm25
            
#             # 3. Combine scores
#             combined_results = []
#             for i, book in enumerate(self.documents):
#                 book_id = book.id
#                 bm25_score = bm25_scores[i]
                
#                 if book_id in vector_results:
#                     # Book found in both
#                     vector_score = vector_results[book_id]['vector_score']
#                     final_score = alpha * vector_score + (1 - alpha) * bm25_score
                    
#                     combined_results.append({
#                         'book_id': book_id,
#                         'metadata': vector_results[book_id]['metadata'],
#                         'vector_score': round(vector_score, 3),
#                         'bm25_score': round(float(bm25_score), 3),
#                         'final_score': round(final_score, 3)
#                     })
            
#             # Sort by final score
#             combined_results.sort(key=lambda x: x['final_score'], reverse=True)
#             return combined_results[:top_k]
            
#         except Exception as e:
#             logger.error(f"Hybrid search error: {e}")
#             return []
    
#     def get_stats(self) -> dict:
#         """Get search engine statistics"""
#         try:
#             return {
#                 'vector_db_count': self.collection.count() if self.collection else 0,
#                 'bm25_docs': len(self.documents),
#                 'model_dimension': self.model.get_sentence_embedding_dimension(),
#                 'initialized': self._initialized
#             }
#         except Exception as e:
#             logger.error(f"Failed to get stats: {e}")
#             return {'error': str(e)}

# # ============================================
# # INTELLIGENT CHATBOT
# # ============================================

# class IntelligentRAGBookChatbot:
#     """Ultra-smart RAG chatbot with advanced features"""
    
#     def __init__(self):
#         logger.info("Initializing Intelligent RAG Book Chatbot...")
        
#         self.vector_db_path = os.getenv('VECTOR_DB_PATH', './vector_store')
        
#         # Initialize components
#         self.search_engine = HybridBookSearchEngine(self.vector_db_path)
#         self.metrics = ChatbotMetrics()
        
#         # Initialize Gemini
#         genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
#         self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
#         logger.info("Intelligent RAG Book Chatbot ready!")
    
#     def _detect_language(self, text: str) -> str:
#         """Detect language of input text (Japanese, Vietnamese, English)"""
#         # Check for Japanese characters (Hiragana, Katakana, Kanji)
#         japanese_pattern = re.compile(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]')
#         if japanese_pattern.search(text):
#             return 'ja'
        
#         # Check for Vietnamese specific characters
#         vietnamese_pattern = re.compile(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]')
#         if vietnamese_pattern.search(text.lower()):
#             return 'vi'
        
#         # Default to English
#         return 'en'
    
#     def _analyze_intent(self, query: str) -> dict:
#         """Fast intent classification using keywords (Japanese, Vietnamese, English)"""
#         query_lower = query.lower()
        
#         # Multilingual keyword-based intent detection
#         recommendation_keywords = [
#             # English
#             'recommend', 'suggest', 'should read', 'good book', 'what book',
#             # Vietnamese
#             'gợi ý', 'đề xuất', 'nên đọc', 'sách hay', 'sách nào',
#             # Japanese
#             'おすすめ', '推薦', 'お勧め', 'いい本', '本を探して'
#         ]
        
#         search_keywords = [
#             # English
#             'find', 'search', 'looking for', 'where is', 'do you have',
#             # Vietnamese
#             'tìm', 'có sách', 'tìm kiếm', 'có không', 'ở đâu',
#             # Japanese
#             '探して', '検索', 'ありますか', 'どこ', '見つけ'
#         ]
        
#         comparison_keywords = [
#             # English
#             'compare', 'difference', 'vs', 'versus', 'better than',
#             # Vietnamese
#             'so sánh', 'khác nhau', 'hơn', 'tốt hơn', 'khác gì',
#             # Japanese
#             '比較', '違い', '対', 'より', 'どっち'
#         ]
        
#         question_keywords = [
#             # English
#             'what', 'when', 'why', 'how', 'who', 'which',
#             # Vietnamese
#             'là gì', 'như thế nào', 'tại sao', 'ai', 'khi nào', 'ở đâu',
#             # Japanese
#             '何', 'いつ', 'なぜ', 'どう', '誰', 'どれ', 'どこ'
#         ]
        
#         for keyword in recommendation_keywords:
#             if keyword in query_lower:
#                 return {'intent': 'recommendation', 'confidence': 0.9}
        
#         for keyword in search_keywords:
#             if keyword in query_lower:
#                 return {'intent': 'search', 'confidence': 0.9}
        
#         for keyword in comparison_keywords:
#             if keyword in query_lower:
#                 return {'intent': 'comparison', 'confidence': 0.8}
        
#         for keyword in question_keywords:
#             if keyword in query_lower:
#                 return {'intent': 'question', 'confidence': 0.7}
        
#         return {'intent': 'general', 'confidence': 0.6}
    
#     def _get_user_history(self, user_id: int, limit: int = 3) -> list:
#         """Get recent conversation history"""
#         try:
#             if not has_app_context():
#                 return []
            
#             history = BotConversation.query.filter_by(user_id=user_id)\
#                 .order_by(BotConversation.created_at.desc())\
#                 .limit(limit).all()
#             return [(h.user_message, h.bot_response[:150]) for h in reversed(history)]
#         except Exception as e:
#             logger.error(f"Failed to get history: {e}")
#             return []
    
#     def _build_context(self, results: list, intent: str) -> str:
#         """Build rich context from search results"""
#         if not results:
#             return ""
        
#         context_parts = []
#         for i, item in enumerate(results[:5], 1):
#             meta = item['metadata']
#             context_parts.append(
#                 f"{i}. {meta['title']} by {meta['author']}\n"
#                 f"   Category: {meta['category_name']} | Year: {meta['publication_year']}\n"
#                 f"   Score: {item['final_score']} (Vector: {item['vector_score']}, BM25: {item['bm25_score']})\n"
#                 f"   {meta['description'][:150]}...\n"
#             )
        
#         return "\n".join(context_parts)
    
#     def _build_prompt(self, query: str, context: str, intent: str, history: list, language: str) -> str:
#         """Build intelligent prompt based on intent and language"""
        
#         history_text = ""
#         if history:
#             history_text = "\n\nRECENT CONVERSATION:\n" + "\n".join([
#                 f"User: {h[0]}\nBot: {h[1]}..." for h in history[-2:]
#             ])
        
#         # Language-specific instructions
#         language_instructions = {
#             'en': {
#                 'system': 'You are a smart, concise book recommendation assistant.',
#                 'respond': 'Be brief and to the point (50-100 words). Only mention 2-3 most relevant books.',
#                 'recommendation': """Quick recommendations:
# - List 2-3 best matches only
# - One sentence per book explaining why
# - No lengthy explanations""",
#                 'search': """Find their book fast:
# - State if found or not
# - Give title, author, 1 sentence description
# - If not found: suggest 1 similar book""",
#                 'comparison': """Quick comparison:
# - Compare only key differences
# - Which is better for what purpose
# - Keep it under 80 words""",
#                 'question': """Direct answer:
# - Answer the question directly first
# - Add 1-2 supporting details
# - No unnecessary context""",
#                 'general': """Friendly but brief:
# - Answer concisely
# - Ask 1 clarifying question if needed
# - Suggest 1-2 books max"""
#             },
#             'vi': {
#                 'system': 'Bạn là trợ lý tư vấn sách thông minh, trả lời ngắn gọn.',
#                 'respond': 'Trả lời ngắn gọn, đi thẳng vào vấn đề (50-100 từ). Chỉ đề cập 2-3 cuốn sách liên quan nhất.',
#                 'recommendation': """Gợi ý nhanh:
# - Chỉ liệt kê 2-3 cuốn phù hợp nhất
# - Mỗi cuốn 1 câu giải thích
# - Không giải thích dài dòng""",
#                 'search': """Tìm sách nhanh:
# - Nói rõ tìm thấy hay không
# - Cho tên, tác giả, 1 câu mô tả
# - Nếu không có: gợi ý 1 cuốn tương tự""",
#                 'comparison': """So sánh nhanh:
# - Chỉ so sánh điểm khác biệt chính
# - Cuốn nào tốt hơn cho mục đích gì
# - Dưới 80 từ""",
#                 'question': """Trả lời trực tiếp:
# - Trả lời câu hỏi ngay
# - Thêm 1-2 chi tiết hỗ trợ
# - Không lan man""",
#                 'general': """Thân thiện nhưng ngắn gọn:
# - Trả lời súc tích
# - Hỏi 1 câu làm rõ nếu cần
# - Gợi ý tối đa 1-2 cuốn"""
#             },
#             'ja': {
#                 'system': 'あなたは簡潔で賢い本のおすすめアシスタントです。',
#                 'respond': '簡潔に要点をまとめて回答（50-100語）。最も関連性の高い本を2-3冊のみ紹介。',
#                 'recommendation': """素早くおすすめ:
# - 最適な2-3冊のみリスト
# - 各本につき1文で説明
# - 長い説明は不要""",
#                 'search': """素早く本を見つける:
# - 見つかったか否かを明示
# - タイトル、著者、1文で説明
# - 見つからない場合: 類似本を1冊提案""",
#                 'comparison': """素早く比較:
# - 主な違いのみ比較
# - どちらが何に適しているか
# - 80語以内""",
#                 'question': """直接回答:
# - まず質問に直接答える
# - 1-2の補足詳細を追加
# - 不要な文脈は省く""",
#                 'general': """親しみやすく簡潔に:
# - 簡潔に回答
# - 必要なら1つ確認質問
# - 最大1-2冊提案"""
#             }
#         }
        
#         lang_config = language_instructions.get(language, language_instructions['en'])
        
#         prompt = f"""{lang_config['system']}

# USER'S QUESTION: "{query}"
# INTENT: {intent}

# TOP MATCHING BOOKS:
# {context}
# {history_text}

# INSTRUCTIONS:
# {lang_config.get(intent, lang_config['general'])}

# CRITICAL RULES:
# - Maximum 100 words total
# - Only mention 2-3 most relevant books
# - One short sentence per book
# - Be direct and actionable
# - No fluff or repetition

# {lang_config['respond']}"""
        
#         return prompt
    
#     def generate_response(self, user_query: str, user_id: int = None) -> dict:
#         """Generate intelligent response with metrics and multilingual support"""
#         start_time = time.time()
        
#         try:
#             # Validate input
#             if not user_query or not user_query.strip():
#                 return {
#                     'status': 'error',
#                     'response': 'Please enter a question'
#                 }
            
#             query = user_query.strip()
            
#             # Detect language
#             language = self._detect_language(query)
            
#             # Analyze intent
#             intent_data = self._analyze_intent(query)
#             intent = intent_data['intent']
            
#             # Get user history
#             history = []
#             if user_id:
#                 history = self._get_user_history(user_id)
            
#             # Hybrid search
#             top_k = {'recommendation': 8, 'search': 3, 'comparison': 6}.get(intent, 5)
#             results = self.search_engine.hybrid_search(query, top_k=top_k, alpha=0.7)
            
#             best_score = results[0]['final_score'] if results else 0
            
#             # Generate response
#             if not results:
#                 response_text = self._generate_fallback_response(query, intent, language)
#             else:
#                 context = self._build_context(results, intent)
#                 prompt = self._build_prompt(query, context, intent, history, language)
                
#                 response = self.gemini_model.generate_content(
#                     prompt,
#                     generation_config=genai.types.GenerationConfig(
#                         temperature=0.7,
#                         top_p=0.9,
#                         max_output_tokens=800
#                     )
#                 )
#                 response_text = response.text.strip()
            
#             # Calculate metrics
#             response_time = (time.time() - start_time) * 1000
            
#             # Log metrics
#             self.metrics.log_query(
#                 query=query,
#                 response_time=response_time,
#                 best_score=best_score,
#                 results_count=len(results),
#                 intent=intent,
#                 used_history=len(history) > 0
#             )
            
#             # Save conversation
#             if user_id and has_app_context():
#                 self._save_conversation(user_id, query, response_text, intent_data, results, language)
            
#             return {
#                 'status': 'success',
#                 'response': response_text,
#                 'metadata': {
#                     'language': language,
#                     'intent': intent,
#                     'confidence': intent_data['confidence'],
#                     'books_found': len(results),
#                     'best_score': round(best_score, 3),
#                     'response_time_ms': round(response_time, 2),
#                     'used_history': len(history) > 0,
#                     'top_books': [
#                         {
#                             'title': r['metadata']['title'],
#                             'author': r['metadata']['author'],
#                             'score': r['final_score']
#                         } for r in results[:3]
#                     ]
#                 }
#             }
            
#         except Exception as e:
#             logger.error(f"Generate response error: {e}", exc_info=True)
#             return {
#                 'status': 'error',
#                 'response': 'Sorry, an error occurred. Please try again.'
#             }
    
#     def _generate_fallback_response(self, query: str, intent: str, language: str) -> str:
#         """Generate helpful fallback when no books found (multilingual)"""
#         fallbacks = {
#             'en': {
#                 'recommendation': "I'd love to recommend books! Could you tell me more about:\n- Preferred genres?\n- Favorite authors?\n- Themes you enjoy?",
#                 'search': "I couldn't find that book. Could you provide:\n- Full title or author name?\n- Publication year?\n- Alternative spellings?",
#                 'comparison': "I need more specific books to compare. Could you mention exact titles?",
#                 'question': "I don't have information about that. Could you ask about books in our database?",
#                 'general': "I'm here to help you discover great books! What are you interested in reading?"
#             },
#             'vi': {
#                 'recommendation': "Tôi rất muốn gợi ý sách cho bạn! Bạn có thể cho tôi biết thêm về:\n- Thể loại yêu thích?\n- Tác giả ưa thích?\n- Chủ đề bạn thích?",
#                 'search': "Tôi không tìm thấy cuốn sách đó. Bạn có thể cung cấp:\n- Tên đầy đủ hoặc tên tác giả?\n- Năm xuất bản?\n- Cách viết khác?",
#                 'comparison': "Tôi cần tên sách cụ thể hơn để so sánh. Bạn có thể nói rõ tên sách không?",
#                 'question': "Tôi không có thông tin về điều đó. Bạn có thể hỏi về sách trong cơ sở dữ liệu của chúng tôi không?",
#                 'general': "Tôi ở đây để giúp bạn khám phá những cuốn sách hay! Bạn quan tâm đến việc đọc gì?"
#             },
#             'ja': {
#                 'recommendation': "本をおすすめしたいです！もっと教えてください：\n- 好きなジャンル？\n- お気に入りの著者？\n- 興味のあるテーマ？",
#                 'search': "その本が見つかりませんでした。以下を教えてください：\n- 完全なタイトルまたは著者名？\n- 出版年？\n- 別のスペル？",
#                 'comparison': "比較するには、より具体的な本のタイトルが必要です。正確なタイトルを教えてください。",
#                 'question': "その情報はありません。データベースにある本について質問してください。",
#                 'general': "素晴らしい本を見つけるお手伝いをします！何を読みたいですか？"
#             }
#         }
        
#         lang_fallbacks = fallbacks.get(language, fallbacks['en'])
#         return lang_fallbacks.get(intent, lang_fallbacks['general'])
    
#     def _save_conversation(self, user_id: int, query: str, response: str, intent_data: dict, results: list, language: str):
#         """Save conversation with rich metadata"""
#         try:
#             if not has_app_context():
#                 logger.warning("Cannot save conversation without app context")
#                 return
            
#             conversation = BotConversation(
#                 user_id=user_id,
#                 user_message=query,
#                 bot_response=response,
#                 metadata=json.dumps({
#                     'language': language,
#                     'intent': intent_data.get('intent'),
#                     'confidence': intent_data.get('confidence'),
#                     'results_count': len(results),
#                     'best_score': results[0]['final_score'] if results else 0,
#                     'timestamp': datetime.utcnow().isoformat()
#                 })
#             )
#             db.session.add(conversation)
#             db.session.commit()
#         except Exception as e:
#             logger.error(f"Save conversation error: {e}")
    
#     def get_stats(self) -> dict:
#         """Get comprehensive statistics"""
#         search_stats = self.search_engine.get_stats()
#         metrics_stats = self.metrics.get_stats()
        
#         return {
#             'search_engine': search_stats,
#             'metrics': metrics_stats,
#             'status': 'healthy'
#         }

# # ============================================
# # INITIALIZE CHATBOT
# # ============================================

# def init_rag_chatbot():
#     """Initialize chatbot - safe to call outside app context"""
#     return IntelligentRAGBookChatbot()

# # ============================================
# # FLASK ROUTES
# # ============================================

# @bot_bp.route('/bot/chatbot', methods=['POST'])
# @login_required
# def chatbot():
#     """Main chat endpoint"""
#     try:
#         if not hasattr(current_app, 'rag_chatbot') or current_app.rag_chatbot is None:
#             return create_error_response("Chatbot not initialized", 503)
        
#         data = request.get_json()
#         if not data or 'message' not in data:
#             return create_error_response("Missing message in request", 400)
        
#         user_query = data['message']
#         user_id = g.user.id
        
#         result = current_app.rag_chatbot.generate_response(user_query, user_id)
#         return result, 200 if result['status'] == 'success' else 400
        
#     except Exception as e:
#         logger.error(f"Chatbot endpoint error: {e}")
#         return create_error_response(str(e), 500)

# @bot_bp.route('/bot/history', methods=['GET'])
# @login_required
# def get_chat_history():
#     """Get user's chat history"""
#     try:
#         user_id = g.user.id
#         limit = request.args.get('limit', 20, type=int)
        
#         history = BotConversation.query.filter_by(user_id=user_id)\
#             .order_by(BotConversation.created_at.desc())\
#             .limit(limit).all()
        
#         return {
#             'status': 'success',
#             'history': [{
#                 'id': h.id,
#                 'user_message': h.user_message,
#                 'bot_response': h.bot_response,
#                 'created_at': h.created_at.isoformat(),
#                 'metadata': json.loads(h.metadata) if h.metadata else {}
#             } for h in reversed(history)],
#             'total': len(history)
#         }, 200
        
#     except Exception as e:
#         logger.error(f"History error: {e}")
#         return create_error_response(str(e), 500)

# @bot_bp.route('/bot/stats', methods=['GET'])
# @login_required
# def get_bot_stats():
#     """Get comprehensive chatbot statistics"""
#     try:
#         if not hasattr(current_app, 'rag_chatbot') or current_app.rag_chatbot is None:
#             return create_error_response("Chatbot not initialized", 503)
        
#         stats = current_app.rag_chatbot.get_stats()
        
#         total_conversations = BotConversation.query.count()
#         user_conversations = BotConversation.query.filter_by(user_id=g.user.id).count()
        
#         stats['conversations'] = {
#             'total': total_conversations,
#             'yours': user_conversations
#         }
        
#         return {'status': 'success', 'stats': stats}, 200
        
#     except Exception as e:
#         logger.error(f"Stats error: {e}")
#         return create_error_response(str(e), 500)

# @bot_bp.route('/bot/rebuild', methods=['POST'])
# @login_required
# def rebuild_indices():
#     """Rebuild search indices (admin only)"""
#     try:
#         if not hasattr(current_app, 'rag_chatbot') or current_app.rag_chatbot is None:
#             return create_error_response("Chatbot not initialized", 503)
        
#         # Add admin check here
#         current_app.rag_chatbot.search_engine._rebuild_indices()
#         return {'status': 'success', 'message': 'Indices rebuilt successfully'}, 200
#     except Exception as e:
#         logger.error(f"Rebuild error: {e}")
#         return create_error_response(str(e), 500)