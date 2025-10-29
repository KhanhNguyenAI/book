from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.extensions import db

from backend.models.book import Book
from backend.models.category import Category
from backend.models.author import Author
from backend.models.book_author import BookAuthor
from backend.models.book_rating import BookRating
from backend.models.book_comment import BookComment
from backend.models.book_page import BookPage
from backend.models.bookmark import Bookmark
from backend.models.reading_history import ReadingHistory
from backend.models.user import User
from backend.models.user_preference import UserPreference
from backend.models.favorite import Favorite
from backend.models.chapter import Chapter  # Thêm Chapter
from sqlalchemy import or_, func
from datetime import datetime
from sqlalchemy.orm import joinedload
from urllib.parse import urlparse
from backend.utils.error_handler import create_error_response
from backend.middleware.auth_middleware import sanitize_input, admin_required
import logging

logger = logging.getLogger(__name__)
book_bp = Blueprint('book', __name__)

# Helper function to serialize book data
# Helper function to serialize book data
# Helper function to serialize book data - ĐỔI TÊN FUNCTION
def book_to_dict(book, include_details=False, current_user_id=None):
    """Convert Book object to dict with enhanced search support"""
    print(f"🔍 BLUEPRINT book_to_dict CALLED - Book: {book.id}, User: {current_user_id}")
    
    # Calculate average rating
    avg_rating = db.session.query(func.avg(BookRating.rating))\
        .filter_by(book_id=book.id).scalar() or 0.0
    
    # Enhanced authors handling for search
    authors_list = []
    authors_str = ""
    if book.authors:
        authors_list = [{'id': author.id, 'name': author.name} for author in book.authors]
        authors_str = ", ".join([author.name for author in book.authors])
    
    # Check favorite status
    is_favorite = False
    if current_user_id:
        favorite = Favorite.query.filter_by(
            user_id=current_user_id,
            book_id=book.id
        ).first()
        is_favorite = favorite is not None
    
    # Base book data
    data = {
        'id': book.id,
        'title': book.title,
        'authors': authors_str,
        'authors_list': authors_list,  # For detailed search results
        'average_rating': float(avg_rating),
        'book_type': book.book_type or 'single',
        'category_id': book.category_id,
        'category_name': book.category.name if book.category else '',
        'chapter_count': book.chapter_count or 0,
        'cover_image': book.cover_image or '',
        'created_at': book.created_at.isoformat() if book.created_at else None,
        'description': book.description or '',
        'image_path': book.image_path or None,
        'isbn': book.isbn or '',
        'page_count': book.page_count or 0,
        'pdf_path': book.pdf_path or '',
        'publication_year': book.publication_year or 0,
        'rating_count': BookRating.query.filter_by(book_id=book.id).count(),
        'series_name': book.series_name or None,
        'total_volumes': book.total_volumes or 1,
        'view_count': book.view_count or 0,
        'volume_number': book.volume_number or 1,
        'is_favorite': is_favorite
    }
    
    # Add detailed information if requested
    if include_details:
        data.update({
            'chapters_count': Chapter.query.filter_by(book_id=book.id).count(),
            'comments_count': BookComment.query.filter_by(book_id=book.id).count(),
            'bookmarks_count': Bookmark.query.filter_by(book_id=book.id).count(),
        })
    
    print(f"✅ FINAL DATA - Book {book.id} has 'is_favorite': {data['is_favorite']}")
    return data
# ============================================
# BOOK LISTING & SEARCH
# ============================================

@book_bp.route('/', methods=['GET'])
@jwt_required(optional=True)
def get_books():
    """Get books with IMPROVED search functionality
    
    Search supports:
    - Book title (highest priority)
    - Author names (medium priority)  
    - Book description (lowest priority)
    - Multiple keywords
    - Fuzzy matching
    
    Query params:
    - search: Search term (searches title, author, description)
    - category_id: Filter by category
    - page: Page number (default: 1)
    - per_page: Items per page (default: 20)
    - limit: Max results (for suggestions, overrides per_page)
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Pagination params
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        limit = request.args.get('limit', type=int)  # For search suggestions
        
        # Search & filter params
        search_term = request.args.get('search', '').strip()
        category_id = request.args.get('category_id', type=int)
        
        # Base query with eager loading
        books_query = Book.query.options(
            joinedload(Book.category), 
            joinedload(Book.authors)
        )
        
        # ============================================
        # IMPROVED SEARCH WITH RANKING
        # ============================================
        if search_term:
            logger.info(f"🔍 Searching for: '{search_term}'")
            
            # Split search term into keywords
            keywords = search_term.lower().split()
            
            # Build search conditions with priority
            title_conditions = []
            author_conditions = []
            desc_conditions = []
            
            for keyword in keywords:
                keyword_pattern = f'%{keyword}%'
                
                # Priority 1: Title match
                title_conditions.append(Book.title.ilike(keyword_pattern))
                
                # Priority 2: Author match
                author_conditions.append(Author.name.ilike(keyword_pattern))
                
                # Priority 3: Description match
                desc_conditions.append(Book.description.ilike(keyword_pattern))
            
            # Join with authors for search
            books_query = books_query.join(Book.authors, isouter=True)
            
            # Combine all conditions with OR
            search_filter = or_(
                *title_conditions,
                *author_conditions, 
                *desc_conditions
            )
            
            books_query = books_query.filter(search_filter).distinct()
            
            # ============================================
            # RANKING: Sort by relevance
            # ============================================
            # Books matching title should appear first
            # Then author matches, then description matches
            
            from sqlalchemy import case
            
            # Create ranking score
            ranking_score = case(
                # Exact title match = highest score
                (Book.title.ilike(f'%{search_term}%'), 3),
                # Author match = medium score
                (Author.name.ilike(f'%{search_term}%'), 2),
                # Description match = lowest score
                (Book.description.ilike(f'%{search_term}%'), 1),
                else_=0
            )
            
            # Order by score desc, then by view count
            books_query = books_query.order_by(
                ranking_score.desc(),
                Book.view_count.desc()
            )
        else:
            # No search term: order by popularity
            books_query = books_query.order_by(Book.view_count.desc())
        
        # ============================================
        # CATEGORY FILTER
        # ============================================
        if category_id:
            books_query = books_query.filter(Book.category_id == category_id)
        
        # ============================================
        # PAGINATION or LIMIT
        # ============================================
        if limit:
            # For search suggestions: just limit results
            books_list = books_query.limit(limit).all()
            
            return jsonify({
                'status': 'success',
                'books': [
                    book_to_dict(book, include_details=False, current_user_id=current_user_id)
                    for book in books_list
                ],
                'search_info': {
                    'term': search_term,
                    'results_count': len(books_list),
                    'limited': True,
                    'limit': limit
                } if search_term else None
            }), 200
        else:
            # Normal pagination
            paginated = books_query.paginate(page=page, per_page=per_page, error_out=False)
            books_list = paginated.items
            
            books_data = [
                book_to_dict(book, include_details=False, current_user_id=current_user_id)
                for book in books_list
            ]
            
            response_data = {
                'status': 'success',
                'books': books_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                }
            }
            
            if search_term:
                response_data['search_info'] = {
                    'term': search_term,
                    'results_count': paginated.total,
                    'keywords': keywords if search_term else []
                }
            
            return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error fetching books: {str(e)}", exc_info=True)
        return create_error_response(str(e), 500)
    
from backend.routes.book import book_to_dict as blueprint_book_to_dict
@book_bp.route('/search', methods=['GET'])
@jwt_required(optional=True)
def search_books():
    """Advanced book search with multiple fields and ranking
    
    Query params:
    - q: Main search query (searches title, description)
    - author: Author name to filter by
    - category_id: Category to filter by
    - year_from: Min publication year
    - year_to: Max publication year
    - min_rating: Minimum average rating
    - page: Page number
    - per_page: Items per page
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Get params
        search_term = request.args.get('q', '').strip()
        author_name = request.args.get('author', '').strip()
        category_id = request.args.get('category_id', type=int)
        year_from = request.args.get('year_from', type=int)
        year_to = request.args.get('year_to', type=int)
        min_rating = request.args.get('min_rating', type=float)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        if not search_term and not author_name and not category_id:
            return create_error_response(
                'At least one search parameter required (q, author, or category_id)', 
                400
            )
        
        # Base query
        books_query = Book.query.options(
            joinedload(Book.category), 
            joinedload(Book.authors)
        )
        
        # Build conditions
        conditions = []
        
        # Search in title and description
        if search_term:
            keywords = search_term.lower().split()
            for keyword in keywords:
                pattern = f'%{keyword}%'
                conditions.append(
                    or_(
                        Book.title.ilike(pattern),
                        Book.description.ilike(pattern)
                    )
                )
        
        # Author filter
        if author_name:
            books_query = books_query.join(Book.authors)
            conditions.append(Author.name.ilike(f'%{author_name}%'))
        
        # Category filter
        if category_id:
            conditions.append(Book.category_id == category_id)
        
        # Year range filter
        if year_from:
            conditions.append(Book.publication_year >= year_from)
        if year_to:
            conditions.append(Book.publication_year <= year_to)
        
        # Apply all conditions
        if conditions:
            books_query = books_query.filter(and_(*conditions))
        
        # Rating filter (requires subquery)
        if min_rating:
            rated_books = db.session.query(
                BookRating.book_id,
                func.avg(BookRating.rating).label('avg_rating')
            ).group_by(BookRating.book_id)\
             .having(func.avg(BookRating.rating) >= min_rating)\
             .subquery()
            
            books_query = books_query.join(
                rated_books,
                Book.id == rated_books.c.book_id
            )
        
        # Distinct to avoid duplicates from joins
        books_query = books_query.distinct()
        
        # Order by relevance and popularity
        books_query = books_query.order_by(Book.view_count.desc())
        
        # Paginate
        paginated = books_query.paginate(page=page, per_page=per_page, error_out=False)
        
        books_data = [
            book_to_dict(book, current_user_id=current_user_id) 
            for book in paginated.items
        ]
        
        response_data = {
            'status': 'success',
            'books': books_data,
            'search_metadata': {
                'term': search_term,
                'author': author_name,
                'category_id': category_id,
                'year_from': year_from,
                'year_to': year_to,
                'min_rating': min_rating,
                'results_count': paginated.total
            },
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }
        
        logger.info(f"Advanced search completed: {len(books_data)} results")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}", exc_info=True)
        return create_error_response(str(e), 500)
@book_bp.route('/suggestions', methods=['GET'])
@jwt_required(optional=True)
def get_search_suggestions():
    """Fast search suggestions for autocomplete
    
    Query params:
    - q: Search query (min 2 chars)
    - limit: Max results (default: 8)
    """
    try:
        current_user_id = get_jwt_identity()
        
        query = request.args.get('q', '').strip()
        limit = request.args.get('limit', 20, type=int)
        
        if not query or len(query) < 2:
            return jsonify({
                'status': 'success',
                'suggestions': []
            }), 200
        
        # Search in title and author (fast query)
        books_query = Book.query.options(
            joinedload(Book.authors)
        ).join(Book.authors, isouter=True)
        
        # Match beginning of words for faster suggestions
        pattern = f'%{query}%'
        
        books_query = books_query.filter(
            or_(
                Book.title.ilike(pattern),
                Author.name.ilike(pattern)
            )
        ).distinct()
        
        # Order by popularity
        books_query = books_query.order_by(Book.view_count.desc())
        
        # Limit results
        books = books_query.limit(limit).all()
        
        suggestions = [
            {
                'id': book.id,
                'title': book.title,
                'authors': [{'id': a.id, 'name': a.name} for a in book.authors],
                'cover_image': book.cover_image,
                'rating': float(db.session.query(func.avg(BookRating.rating))
                               .filter_by(book_id=book.id).scalar() or 0),
                'categories': [{'id': book.category.id, 'name': book.category.name}] 
                             if book.category else []
            }
            for book in books
        ]
        
        return jsonify({
            'status': 'success',
            'query': query,
            'suggestions': suggestions,
            'count': len(suggestions)
        }), 200
        
    except Exception as e:
        logger.error(f"Suggestions error: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'success',
            'suggestions': []
        }), 200  # Return empty on error for better UX
        
@book_bp.route('/<int:book_id>', methods=['GET'])
@jwt_required(optional=True)
def get_book(book_id):
    """Get book details"""
    try:
        current_user_id = get_jwt_identity()
        
        book = Book.query.options(joinedload(Book.category), joinedload(Book.authors))\
            .get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        book.view_count += 1
        db.session.commit()
        
        logger.info(f"Retrieved book details: {book.title} (ID: {book_id})")
        return jsonify({
            'status': 'success',
            'book': blueprint_book_to_dict(book, include_details=True, current_user_id=current_user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error fetching book {book_id}: {str(e)}")
        return create_error_response(str(e), 500)
# ============================================
# BOOK READING & HISTORY
# ============================================

@book_bp.route('/<int:book_id>/read', methods=['GET'])
@jwt_required()
def read_book(book_id):
    """Read book pages
    GET /api/books/<id>/read?page=1
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to read book: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        page_num = request.args.get('page', 1, type=int)
        if page_num < 1:
            logger.warning(f"Invalid page number: {page_num}")
            return create_error_response('Invalid page number', 400)
        
        # Update reading history
        history = ReadingHistory.query.filter_by(
            user_id=current_user_id,
            book_id=book_id
        ).first()
        
        if not history:
            history = ReadingHistory(
                user_id=current_user_id,
                book_id=book_id,
                last_page=page_num,
                last_read_at=datetime.utcnow()
            )
            db.session.add(history)
        else:
            history.last_page = page_num
            history.last_read_at = datetime.utcnow()
        
        db.session.commit()
        
        # Get page content
        page = BookPage.query.filter_by(
            book_id=book_id,
            page_num=page_num
        ).first()
        
        logger.info(f"User {current_user_id} read book {book_id}, page {page_num}")
        return jsonify({
            'status': 'success',
            'book': {
                'id': book.id,
                'title': book.title
            },
            'page': {
                'page_num': page.page_num if page else page_num,
                'image_url': page.image_url or '' if page else None,
                'content_text': page.content_text or '' if page else None,
                'content_type': page.content_type if page else 'image'
            } if page else None,
            'reading_progress': {
                'last_page': history.last_page,
                'last_read_at': history.last_read_at.isoformat() if history.last_read_at else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error reading book {book_id} for user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/<int:book_id>/page/<int:page_number>', methods=['POST'])
@jwt_required()
def update_reading_history(book_id, page_number):
    """Update reading history
    POST /api/books/<book_id>/page/<page_number>
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to update history: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        if page_number < 1:
            logger.warning(f"Invalid page number: {page_number}")
            return create_error_response('Invalid page number', 400)
        
        history = ReadingHistory.query.filter_by(
            user_id=current_user_id,
            book_id=book_id
        ).first()
        
        if not history:
            history = ReadingHistory(
                user_id=current_user_id,
                book_id=book_id,
                last_page=page_number,
                last_read_at=datetime.utcnow()
            )
            db.session.add(history)
        else:
            history.last_page = page_number
            history.last_read_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"Updated reading history for user {current_user_id}, book {book_id}, page {page_number}")
        return jsonify({
            'status': 'success',
            'message': 'Reading history updated',
            'reading_progress': {
                'last_page': history.last_page,
                'last_read_at': history.last_read_at.isoformat() if history.last_read_at else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating history for book {book_id}, user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# BOOKMARKS
# ============================================

@book_bp.route('/<int:book_id>/bookmark', methods=['POST'])
@jwt_required()
def add_bookmark(book_id):
    """Add or update bookmark
    POST /api/books/<id>/bookmark
    {
        "page_number": 42,
        "mark_note": "Interesting chapter"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to add bookmark: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        data = request.get_json()
        page_number = data.get('page_number', 1)
        mark_note = sanitize_input(data.get('mark_note', '').strip())  # Sanitize note
        
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        if not isinstance(page_number, int) or page_number < 1:
            logger.warning(f"Invalid page number: {page_number}")
            return create_error_response('Invalid page number', 400)
        
        bookmark = Bookmark.query.filter_by(
            user_id=current_user_id,
            book_id=book_id
        ).first()
        
        if bookmark:
            bookmark.page_number = page_number
            bookmark.mark_note = mark_note
            bookmark.updated_at = datetime.utcnow()
        else:
            bookmark = Bookmark(
                user_id=current_user_id,
                book_id=book_id,
                page_number=page_number,
                mark_note=mark_note,
                created_at=datetime.utcnow()
            )
            db.session.add(bookmark)
        
        db.session.commit()
        
        logger.info(f"Bookmark saved for user {current_user_id}, book {book_id}, page {page_number}")
        return jsonify({
            'status': 'success',
            'message': 'Bookmark saved',
            'bookmark': {
                'id': bookmark.id,
                'page_number': bookmark.page_number,
                'mark_note': bookmark.mark_note,
                'created_at': bookmark.created_at.isoformat() if bookmark.created_at else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding bookmark for book {book_id}, user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/bookmarks', methods=['GET'])
@jwt_required()
def get_bookmarks():
    """Get user's bookmarks with pagination
    GET /api/books/bookmarks?page=1&per_page=20
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to get bookmarks: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        bookmarks_query = Bookmark.query.filter_by(user_id=current_user_id)\
            .options(joinedload(Bookmark.book).joinedload(Book.category))\
            .order_by(Bookmark.created_at.desc())
        
        paginated = bookmarks_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        for bookmark in paginated.items:
            result.append({
                'id': bookmark.id,
                'book': book_to_dict(bookmark.book),
                'page_number': bookmark.page_number,
                'mark_note': bookmark.mark_note or '',
                'created_at': bookmark.created_at.isoformat() if bookmark.created_at else None
            })
        
        logger.info(f"Retrieved {len(result)} bookmarks for user {current_user_id}")
        return jsonify({
            'status': 'success',
            'bookmarks': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching bookmarks for user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/bookmarks/<int:bookmark_id>', methods=['DELETE'])
@jwt_required()
def delete_bookmark(bookmark_id):
    """Delete bookmark
    DELETE /api/books/bookmarks/<id>
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to delete bookmark: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        bookmark = Bookmark.query.filter_by(
            id=bookmark_id,
            user_id=current_user_id
        ).first()
        
        if not bookmark:
            logger.warning(f"Bookmark not found: {bookmark_id}")
            return create_error_response('Bookmark not found', 404)
        
        db.session.delete(bookmark)
        db.session.commit()
        
        logger.info(f"Bookmark {bookmark_id} deleted by user {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Bookmark deleted'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting bookmark {bookmark_id} for user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# RATINGS & COMMENTS
# ============================================

@book_bp.route('/<int:book_id>/ratings', methods=['GET'])
def get_book_ratings(book_id):
    """Get book ratings with pagination
    GET /api/books/<id>/ratings?page=1&per_page=20
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        ratings_query = BookRating.query.filter_by(book_id=book_id)\
            .options(joinedload(BookRating.user))\
            .order_by(BookRating.created_at.desc())
        
        paginated = ratings_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        for rating in paginated.items:
            result.append({
                'id': rating.id,
                'rating': rating.rating,
                'review': rating.review or '',
                'user': {
                    'id': rating.user.id,
                    'username': rating.user.username,
                    'avatar_url': rating.user.avatar_url or ''
                } if rating.user else None,
                'created_at': rating.created_at.isoformat() if rating.created_at else None
            })
        
        logger.info(f"Retrieved {len(result)} ratings for book {book_id}")
        return jsonify({
            'status': 'success',
            'ratings': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching ratings for book {book_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/<int:book_id>/ratings', methods=['POST'])
@jwt_required()
def rate_book(book_id):
    """Rate a book
    POST /api/books/<id>/ratings
    {
        "rating": 5,
        "review": "Great book!"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to rate book: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        data = request.get_json()
        rating_value = data.get('rating')
        review = sanitize_input(data.get('review', '').strip())  # Sanitize review
        
        if not rating_value or not (1 <= rating_value <= 5):
            logger.warning(f"Invalid rating value: {rating_value}")
            return create_error_response('Rating must be between 1 and 5', 400)
        
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        existing = BookRating.query.filter_by(
            user_id=current_user_id,
            book_id=book_id
        ).first()
        
        if existing:
            existing.rating = rating_value
            existing.review = review
            existing.updated_at = datetime.utcnow()
        else:
            rating = BookRating(
                user_id=current_user_id,
                book_id=book_id,
                rating=rating_value,
                review=review,
                created_at=datetime.utcnow()
            )
            db.session.add(rating)
        
        db.session.commit()
        
        logger.info(f"Rating saved for book {book_id} by user {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Rating saved'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error rating book {book_id} by user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/<int:book_id>/comments', methods=['GET'])
def get_book_comments(book_id):
    """Get book comments with pagination
    GET /api/books/<id>/comments?page=1&per_page=20
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        comments_query = BookComment.query.filter_by(
            book_id=book_id,
            parent_id=None
        ).options(joinedload(BookComment.user))\
         .order_by(BookComment.created_at.desc())
        
        paginated = comments_query.paginate(page=page, per_page=per_page, error_out=False)
        
        def comment_to_dict(comment):
            replies = BookComment.query.filter_by(parent_id=comment.id)\
                .options(joinedload(BookComment.user))\
                .order_by(BookComment.created_at.asc()).all()
            
            return {
                'id': comment.id,
                'content': comment.content,
                'user': {
                    'id': comment.user.id,
                    'username': comment.user.username,
                    'avatar_url': comment.user.avatar_url or ''
                } if comment.user else None,
                'created_at': comment.created_at.isoformat() if comment.created_at else None,
                'replies': [comment_to_dict(reply) for reply in replies]
            }
        
        result = [comment_to_dict(c) for c in paginated.items]
        
        logger.info(f"Retrieved {len(result)} comments for book {book_id}")
        return jsonify({
            'status': 'success',
            'comments': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching comments for book {book_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/<int:book_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(book_id):
    """Add comment to book
    POST /api/books/<id>/comments
    {
        "content": "Great book!",
        "parent_id": null
    }
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to comment: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        data = request.get_json()
        content = sanitize_input(data.get('content', '').strip())  # Sanitize content
        
        if not content:
            logger.warning("Empty comment content")
            return create_error_response('Content required', 400)
        
        if len(content) > 1000:  # Giới hạn độ dài comment
            logger.warning("Comment too long")
            return create_error_response('Comment must be under 1000 characters', 400)
        
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        parent_id = data.get('parent_id')
        if parent_id:
            parent = BookComment.query.get(parent_id)
            if not parent or parent.book_id != book_id:
                logger.warning(f"Invalid parent comment: {parent_id}")
                return create_error_response('Invalid parent comment', 400)
        
        comment = BookComment(
            book_id=book_id,
            user_id=current_user_id,
            content=content,
            parent_id=parent_id,
            created_at=datetime.utcnow()
        )
        
        db.session.add(comment)
        db.session.commit()
        
        logger.info(f"Comment added to book {book_id} by user {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Comment added',
            'comment': {
                'id': comment.id,
                'content': comment.content,
                'parent_id': comment.parent_id,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'avatar_url': user.avatar_url or ''
                },
                'created_at': comment.created_at.isoformat() if comment.created_at else None
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding comment to book {book_id} by user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    """Delete comment (own or admin)
    DELETE /api/books/comments/<id>
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to delete comment: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        comment = BookComment.query.get(comment_id)
        if not comment:
            logger.warning(f"Comment not found: {comment_id}")
            return create_error_response('Comment not found', 404)
        
        if comment.user_id != current_user_id and user.role != 'admin':
            logger.warning(f"Unauthorized attempt to delete comment {comment_id} by user {current_user_id}")
            return create_error_response('Unauthorized', 403)
        
        db.session.delete(comment)
        db.session.commit()
        
        logger.info(f"Comment {comment_id} deleted by user {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Comment deleted'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting comment {comment_id} by user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# CATEGORIES & POPULAR BOOKS
# ============================================

@book_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all categories from database"""
    try:
        categories = Category.query.all()
        
        logger.info(f"Retrieved {len(categories)} categories")
        return jsonify({
            'status': 'success',
            'categories': [
                {
                    'id': c.id,
                    'name': c.name,
                    'description': c.description or ''
                } for c in categories
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/categories/<int:category_id>/popular', methods=['GET'])
@jwt_required(optional=True)  # THÊM DECORATOR NÀY
def get_popular_by_category(category_id):
    """Get popular books by category
    GET /api/books/categories/<id>/popular?limit=10
    """
    try:
        current_user_id = get_jwt_identity()  # THÊM DÒNG NÀY
        
        limit = request.args.get('limit', 10, type=int)
        
        category = Category.query.get(category_id)
        if not category:
            logger.warning(f"Category not found: {category_id}")
            return create_error_response('Category not found', 404)
        
        books = Book.query.filter_by(category_id=category_id)\
            .options(joinedload(Book.authors))\
            .order_by(Book.view_count.desc())\
            .limit(limit).all()
        
        # SỬA: Thêm current_user_id
        result = [book_to_dict(book, current_user_id=current_user_id) for book in books]
        
        logger.info(f"Retrieved {len(result)} popular books for category {category_id}")
        return jsonify({
            'status': 'success',
            'category': category.name,
            'books': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching popular books for category {category_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/popular', methods=['GET'])
@jwt_required(optional=True)
def get_popular_books():
    """Get popular books overall"""
    try:
        current_user_id = get_jwt_identity()  # LẤY USER ID
        
        limit = request.args.get('limit', 10, type=int)
        
        books = Book.query.options(joinedload(Book.category), joinedload(Book.authors))\
            .order_by(Book.view_count.desc())\
            .limit(limit).all()
        
        # SỬA: Thêm current_user_id vào book_to_dict
        result = [book_to_dict(book, current_user_id=current_user_id) for book in books]
        
        logger.info(f"Retrieved {len(result)} popular books")
        return jsonify({
            'status': 'success',
            'books': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching popular books: {str(e)}")
        return create_error_response(str(e), 500)
    

@book_bp.route('/favorite-books', methods=['GET'])
@jwt_required()
def get_favorite_books():
    """Get popular books from user's favorite categories"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            return create_error_response('Account is banned', 403)
        
        limit = request.args.get('limit', 10, type=int)
        
        # FIX: Sửa column name - có thể là 'is_notification_enabled' thay vì 'is_notification_enable'
        try:
            category_ids = [pref.category_id for pref in UserPreference.query.filter_by(
                user_id=current_user_id,
                is_notification_enabled=True  # THỬ VỚI 'enabled'
            ).all()]
        except:
            # Nếu vẫn lỗi, thử cách khác
            try:
                category_ids = [pref.category_id for pref in UserPreference.query.filter_by(
                    user_id=current_user_id
                ).all() if getattr(pref, 'is_notification_enabled', False) or getattr(pref, 'is_notification_enable', False)]
            except:
                category_ids = []
        
        if not category_ids:
            return jsonify({
                'status': 'success',
                'books': [],
                'message': 'No favorite categories found'
            }), 200
        
        books = Book.query.filter(Book.category_id.in_(category_ids))\
            .options(joinedload(Book.category), joinedload(Book.authors))\
            .order_by(Book.view_count.desc())\
            .limit(limit).all()
        
        # SỬA: Đảm bảo có current_user_id
        result = [book_to_dict(book, current_user_id=current_user_id) for book in books]
        
        logger.info(f"Retrieved {len(result)} favorite books for user {current_user_id}")
        return jsonify({
            'status': 'success',
            'books': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching favorite books for user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)
# ============================================
# ADMIN: CREATE & UPDATE BOOK
# ============================================

"""
Optimized Create Book - Accept category_name or category_id
Frontend-friendly version
"""

@book_bp.route('/', methods=['POST'])
@admin_required
def create_book():
    """Create new book (admin only)
    POST /api/books
    {
        "title": "Book Title",
        "authors": ["Author Name 1", "Author Name 2"],
        "description": "Book description",
        "category_name": "Fiction",  // Can use name instead of ID!
        "isbn": "978-0-123456-78-9",
        "publication_year": 2024,
        "series_name": "Series Name",
        "cover_image": "https://example.com/cover.jpg",
        "pdf_path": "https://example.com/book.pdf"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return create_error_response('JSON data required', 400)
        
        # ============================================
        # EXTRACT FIELDS
        # ============================================
        
        title = sanitize_input(data.get('title', '').strip())
        author_names = data.get('authors', [])
        description = sanitize_input(data.get('description', '').strip())
        
        # Support both category_name and category_id
        category_name = data.get('category_name', '').strip()
        category_id = data.get('category_id')
        
        isbn = data.get('isbn', '').strip()
        publication_year = data.get('publication_year')
        series_name = sanitize_input(data.get('series_name', '').strip())
        cover_image = data.get('cover_image', '').strip()
        pdf_path = data.get('pdf_path', '').strip()
        
        logger.info(f"Creating book: {title}, category_name: {category_name}, category_id: {category_id}")
        
        # ============================================
        # VALIDATE REQUIRED FIELDS
        # ============================================
        
        if not title:
            return create_error_response('Book title is required', 400)
        
        if not category_name and not category_id:
            return create_error_response('Category name or category ID is required', 400)
        
        # ============================================
        # HANDLE CATEGORY (Name or ID)
        # ============================================
        
        category = None
        
        if category_name:
            # Try to find category by name (case-insensitive)
            category = Category.query.filter(
                func.lower(Category.name) == func.lower(category_name)
            ).first()
            
            if not category:
                # Auto-create category if not exists
                logger.info(f"Category '{category_name}' not found, creating new one")
                category = Category(
                    name=category_name,
                    description=f"{category_name} books"
                )
                db.session.add(category)
                db.session.flush()
                logger.info(f"Created category: {category_name} (ID: {category.id})")
        
        elif category_id:
            # Use category ID
            category = Category.query.get(category_id)
            if not category:
                # Get available categories for error message
                available = Category.query.all()
                if available:
                    cat_list = ', '.join([f"{c.id}: {c.name}" for c in available])
                    return create_error_response(
                        f'Category ID {category_id} not found. Available: {cat_list}',
                        400
                    )
                else:
                    return create_error_response(
                        'No categories found. Use category_name to auto-create.',
                        400
                    )
        
        logger.info(f"Using category: {category.name} (ID: {category.id})")
        
        # ============================================
        # CHECK DUPLICATE TITLE
        # ============================================
        
        if Book.query.filter_by(title=title).first():
            return create_error_response('Book with this title already exists', 400)
        
        # ============================================
        # VALIDATE AUTHORS
        # ============================================
        
        if not author_names or not isinstance(author_names, list):
            return create_error_response('Authors must be a list of names', 400)
        
        author_names = [str(name).strip() for name in author_names if name]
        if not author_names:
            return create_error_response('At least one author is required', 400)
        
        # ============================================
        # VALIDATE URLS (if provided)
        # ============================================
        
        for url, field_name in [(cover_image, 'cover_image'), (pdf_path, 'pdf_path')]:
            if url:
                try:
                    parsed = urlparse(url)
                    if not parsed.scheme or not parsed.netloc:
                        return create_error_response(f'Invalid {field_name} URL', 400)
                except:
                    return create_error_response(f'Invalid {field_name} URL format', 400)
        
        # ============================================
        # VALIDATE PUBLICATION YEAR (if provided)
        # ============================================
        
        if publication_year:
            current_year = datetime.now().year
            if not isinstance(publication_year, int) or publication_year < 1000 or publication_year > current_year + 1:
                return create_error_response(
                    f'Invalid publication_year. Must be between 1000 and {current_year + 1}',
                    400
                )
        
        # ============================================
        # PROCESS AUTHORS (Create if not exists)
        # ============================================
        
        authors = []
        for author_name in author_names:
            author = Author.query.filter(
                func.lower(Author.name) == func.lower(author_name)
            ).first()
            
            if not author:
                author = Author(name=author_name)
                db.session.add(author)
                db.session.flush()
                logger.info(f"Created author: {author_name} (ID: {author.id})")
            
            authors.append(author)
        
        logger.info(f"Processed {len(authors)} authors")
        
        # ============================================
        # CREATE BOOK
        # ============================================
        
        book = Book(
            title=title,
            description=description if description else None,
            category_id=category.id,
            isbn=isbn if isbn else None,
            publication_year=publication_year,
            series_name=series_name if series_name else None,
            cover_image=cover_image if cover_image else None,
            pdf_path=pdf_path if pdf_path else None,
            view_count=0,
            created_at=datetime.utcnow()
        )
        
        db.session.add(book)
        db.session.flush()
        logger.info(f"Book created: ID {book.id}")
        
        # ============================================
        # LINK AUTHORS TO BOOK
        # ============================================
        
        for author in authors:
            book_author = BookAuthor(
                book_id=book.id,
                author_id=author.id
            )
            db.session.add(book_author)
        
        # ============================================
        # COMMIT ALL CHANGES
        # ============================================
        
        db.session.commit()
        logger.info(f"✅ Book created successfully: {title} (ID: {book.id})")
        
        # ============================================
        # RELOAD WITH RELATIONSHIPS
        # ============================================
        
        book = Book.query.options(
            joinedload(Book.category),
            joinedload(Book.authors)
        ).get(book.id)
        
        return jsonify({
            'status': 'success',
            'message': 'Book created successfully',
            'book': book_to_dict(book, include_details=True)
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating book: {e}", exc_info=True)
        db.session.rollback()
        return create_error_response(f'Failed to create book: {str(e)}', 500)


# ============================================
# HELPER: GET OR CREATE CATEGORY
# ============================================

def get_or_create_category(category_name=None, category_id=None):
    """
    Get existing category or create new one
    Returns: (category, was_created)
    """
    if category_id:
        category = Category.query.get(category_id)
        if category:
            return category, False
        return None, False
    
    if category_name:
        category = Category.query.filter(
            func.lower(Category.name) == func.lower(category_name)
        ).first()
        
        if category:
            return category, False
        
        # Create new category
        category = Category(
            name=category_name,
            description=f"{category_name} books"
        )
        db.session.add(category)
        db.session.flush()
        return category, True
    
    return None, False


# ============================================
# USAGE EXAMPLES
# ============================================

"""
EXAMPLE 1: Using category_name (Recommended for Frontend)
----------------------------------------------------------
POST /api/books
{
  "title": "Relentless",
  "authors": ["Tim Grover"],
  "category_name": "Self-Help",  // Auto-creates if not exists
  "description": "From Good to Great to Unstoppable",
  "publication_year": 2013
}


EXAMPLE 2: Using category_id (Traditional)
----------------------------------------------------------
POST /api/books
{
  "title": "Relentless",
  "authors": ["Tim Grover"],
  "category_id": 5,
  "description": "From Good to Great to Unstoppable"
}


EXAMPLE 3: Full request with all fields
----------------------------------------------------------
POST /api/books
{
  "title": "The Great Book",
  "authors": ["John Doe", "Jane Smith"],
  "category_name": "Fiction",
  "description": "An amazing story",
  "isbn": "978-0-123456-78-9",
  "publication_year": 2024,
  "series_name": "Great Series",
  "cover_image": "https://example.com/cover.jpg",
  "pdf_path": "https://example.com/book.pdf"
}


CURL EXAMPLES:
----------------------------------------------------------
# Using category name
curl -X POST http://localhost:5000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Relentless",
    "authors": ["Tim Grover"],
    "category_name": "Self-Help",
    "description": "Unstoppable mindset"
  }'

# Using category ID
curl -X POST http://localhost:5000/api/books \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Relentless",
    "authors": ["Tim Grover"],
    "category_id": 5,
    "description": "Unstoppable mindset"
  }'


FRONTEND INTEGRATION (React):
----------------------------------------------------------
const createBook = async (bookData) => {
  const response = await fetch('/api/books', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: bookData.title,
      authors: bookData.authors,
      category_name: bookData.categoryName,  // Just use name!
      description: bookData.description,
      publication_year: bookData.year,
      cover_image: bookData.coverImage
    })
  });
  
  return response.json();
};

// Usage
createBook({
  title: "New Book",
  authors: ["Author Name"],
  categoryName: "Fiction",  // No need to lookup ID!
  description: "Great book"
});


BENEFITS:
----------------------------------------------------------
✅ Frontend doesn't need to fetch categories first
✅ Auto-creates categories if missing
✅ Case-insensitive matching
✅ Backward compatible (still accepts category_id)
✅ Cleaner frontend code
✅ Better UX - just type category name
"""
@book_bp.route('/<int:book_id>', methods=['PUT'])
@admin_required
def update_book(book_id):
    """Update book (admin only)
    PUT /api/books/<book_id>
    {
        "title": "Updated Book Title",
        "author_ids": [1, 2],
        "description": "Updated description",
        "category_id": 2,
        "isbn": "978-0-123456-78-9",
        "publication_year": 2024,
        "series_name": "Updated Series",
        "cover_image": "https://example.com/new_cover.jpg",
        "pdf_path": "https://example.com/new_book.pdf"
    }
    """
    try:
        current_user_id = get_jwt_identity()
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        data = request.get_json()
        if not data:
            logger.warning("No JSON data provided")
            return create_error_response('JSON data required', 400)
        
        new_title = sanitize_input(data.get('title', '').strip())
        if new_title and new_title != book.title:
            if Book.query.filter(Book.title == new_title, Book.id != book_id).first():
                logger.warning(f"Book title exists: {new_title}")
                return create_error_response('Book with this title already exists', 400)
            book.title = new_title
        
        if 'author_ids' in data:
            author_ids = data.get('author_ids', [])
            authors = Author.query.filter(Author.id.in_(author_ids)).all()
            if len(authors) != len(author_ids):
                logger.warning(f"Invalid author_ids: {author_ids}")
                return create_error_response('One or more author IDs are invalid', 400)
            BookAuthor.query.filter_by(book_id=book_id).delete()
            for author_id in author_ids:
                book_author = BookAuthor(book_id=book_id, author_id=author_id)
                db.session.add(book_author)
        
        if 'description' in data:
            book.description = sanitize_input(data.get('description', '').strip()) or None
        
        if 'category_id' in data:
            category_id = data.get('category_id')
            category = Category.query.get(category_id)
            if not category:
                logger.warning(f"Invalid category_id: {category_id}")
                return create_error_response('Invalid category_id', 400)
            book.category_id = category_id
        
        if 'isbn' in data:
            book.isbn = data.get('isbn', '').strip() or None
        
        if 'publication_year' in data:
            pub_year = data.get('publication_year')
            if pub_year:
                current_year = datetime.now().year
                if not isinstance(pub_year, int) or pub_year < 1000 or pub_year > current_year + 1:
                    logger.warning(f"Invalid publication_year: {pub_year}")
                    return create_error_response(
                        f'Invalid publication_year. Must be between 1000 and {current_year + 1}', 400
                    )
            book.publication_year = pub_year
        
        if 'series_name' in data:
            book.series_name = sanitize_input(data.get('series_name', '').strip()) or None
        
        if 'cover_image' in data:
            cover_image = data.get('cover_image', '').strip()
            if cover_image:
                try:
                    parsed = urlparse(cover_image)
                    if not parsed.scheme or not parsed.netloc:
                        logger.warning(f"Invalid cover_image URL: {cover_image}")
                        return create_error_response('Invalid cover_image URL', 400)
                except Exception:
                    logger.warning(f"Invalid cover_image URL format: {cover_image}")
                    return create_error_response('Invalid cover_image URL format', 400)
            book.cover_image = cover_image or None
        
        if 'pdf_path' in data:
            pdf_path = data.get('pdf_path', '').strip()
            if pdf_path:
                try:
                    parsed = urlparse(pdf_path)
                    if not parsed.scheme or not parsed.netloc:
                        logger.warning(f"Invalid pdf_path URL: {pdf_path}")
                        return create_error_response('Invalid pdf_path URL', 400)
                except Exception:
                    logger.warning(f"Invalid pdf_path URL format: {pdf_path}")
                    return create_error_response('Invalid pdf_path URL format', 400)
            book.pdf_path = pdf_path or None
        
        db.session.commit()
        
        logger.info(f"Book {book_id} updated by user {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Book updated successfully',
            'book': book_to_dict(book, include_details=True)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        if 'unique' in str(e).lower() and 'title' in str(e).lower():
            logger.warning(f"Book title exists: {new_title}")
            return create_error_response('Book with this title already exists', 400)
        logger.error(f"Error updating book {book_id} by user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# FAVORITES MANAGEMENT
# ============================================

@book_bp.route('/<int:book_id>/favorite', methods=['POST'])
@jwt_required()
def add_favorite(book_id):
    """Add book to favorites
    POST /api/books/<id>/favorite
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to add favorite: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        existing = Favorite.query.filter_by(
            user_id=current_user_id,
            book_id=book_id
        ).first()
        
        if existing:
            logger.info(f"Book {book_id} already in favorites for user {current_user_id}")
            return jsonify({
                'status': 'success',
                'message': 'Book already in favorites',
                'is_favorite': True
            }), 200
        
        favorite = Favorite(
            user_id=current_user_id,
            book_id=book_id,
            created_at=datetime.utcnow()
        )
        db.session.add(favorite)
        db.session.commit()
        
        logger.info(f"Book {book_id} added to favorites for user {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Book added to favorites',
            'is_favorite': True
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding favorite book {book_id} for user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/<int:book_id>/favorite', methods=['DELETE'])
@jwt_required()
def remove_favorite(book_id):
    """Remove book from favorites
    DELETE /api/books/<id>/favorite
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to remove favorite: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        favorite = Favorite.query.filter_by(
            user_id=current_user_id,
            book_id=book_id
        ).first()
        
        if not favorite:
            logger.info(f"Book {book_id} not in favorites for user {current_user_id}")
            return jsonify({
                'status': 'success',
                'message': 'Book not in favorites',
                'is_favorite': False
            }), 200
        
        db.session.delete(favorite)
        db.session.commit()
        
        logger.info(f"Book {book_id} removed from favorites for user {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Book removed from favorites',
            'is_favorite': False
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error removing favorite book {book_id} for user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    """Get user's favorite books
    GET /api/books/favorites?page=1&per_page=20
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to get favorites: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        favorites_query = Favorite.query.filter_by(user_id=current_user_id)\
            .options(joinedload(Favorite.book).joinedload(Book.category).joinedload(Book.authors))\
            .order_by(Favorite.created_at.desc())
        
        paginated = favorites_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        for favorite in paginated.items:
            result.append({
                'id': favorite.id,
                'book': book_to_dict(favorite.book, include_details=True),
                'added_at': favorite.created_at.isoformat() if favorite.created_at else None
            })
        
        logger.info(f"Retrieved {len(result)} favorite books for user {current_user_id}")
        return jsonify({
            'status': 'success',
            'favorites': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching favorites for user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/<int:book_id>/favorite/status', methods=['GET'])
@jwt_required()
def get_favorite_status(book_id):
    """Check if book is in user's favorites
    GET /api/books/<id>/favorite/status
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.is_banned:
            logger.info(f"Banned user attempted to check favorite status: {current_user_id}")
            return create_error_response('Account is banned', 403)
        
        favorite = Favorite.query.filter_by(
            user_id=current_user_id,
            book_id=book_id
        ).first()
        
        logger.info(f"Checked favorite status for book {book_id} by user {current_user_id}")
        return jsonify({
            'status': 'success',
            'is_favorite': favorite is not None
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking favorite status for book {book_id} by user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)

# ============================================
# CHAPTER MANAGEMENT
# ============================================

@book_bp.route('/<int:book_id>/chapters', methods=['GET'])
def get_book_chapters(book_id):
    """Get chapters of a book
    GET /api/books/<id>/chapters?page=1&per_page=20
    """
    try:
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        chapters_query = Chapter.query.filter_by(book_id=book_id)\
            .order_by(Chapter.chapter_number.asc())
        
        paginated = chapters_query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        for chapter in paginated.items:
            result.append({
                'id': chapter.id,
                'book_id': chapter.book_id,
                'chapter_number': chapter.chapter_number,
                'title': chapter.title or '',
                'content': chapter.content or '',
                'created_at': chapter.created_at.isoformat() if chapter.created_at else None
            })
        
        logger.info(f"Retrieved {len(result)} chapters for book {book_id}")
        return jsonify({
            'status': 'success',
            'chapters': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching chapters for book {book_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/<int:book_id>/chapters/<int:chapter_id>', methods=['GET'])
def get_chapter(book_id, chapter_id):
    """Get specific chapter details
    GET /api/books/<id>/chapters/<chapter_id>
    """
    try:
        chapter = Chapter.query.filter_by(id=chapter_id, book_id=book_id).first()
        if not chapter:
            logger.warning(f"Chapter {chapter_id} not found for book {book_id}")
            return create_error_response('Chapter not found', 404)
        
        logger.info(f"Retrieved chapter {chapter_id} for book {book_id}")
        return jsonify({
            'status': 'success',
            'chapter': {
                'id': chapter.id,
                'book_id': chapter.book_id,
                'chapter_number': chapter.chapter_number,
                'title': chapter.title or '',
                'content': chapter.content or '',
                'created_at': chapter.created_at.isoformat() if chapter.created_at else None
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching chapter {chapter_id} for book {book_id}: {str(e)}")
        return create_error_response(str(e), 500)

@book_bp.route('/<int:book_id>/chapters', methods=['POST'])
@admin_required
def create_chapter(book_id):
    """Create new chapter for a book (admin only)
    POST /api/books/<id>/chapters
    {
        "chapter_number": 1,
        "title": "Chapter One",
        "content": "Chapter content..."
    }
    """
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        if not data:
            logger.warning("No JSON data provided")
            return create_error_response('JSON data required', 400)
        
        book = Book.query.get(book_id)
        if not book:
            logger.warning(f"Book not found: {book_id}")
            return create_error_response('Book not found', 404)
        
        chapter_number = data.get('chapter_number')
        title = sanitize_input(data.get('title', '').strip())
        content = sanitize_input(data.get('content', '').strip())
        
        if not chapter_number or not isinstance(chapter_number, int) or chapter_number < 1:
            logger.warning(f"Invalid chapter_number: {chapter_number}")
            return create_error_response('Invalid chapter number', 400)
        
        if not title:
            logger.warning("Missing chapter title")
            return create_error_response('Chapter title is required', 400)
        
        if Chapter.query.filter_by(book_id=book_id, chapter_number=chapter_number).first():
            logger.warning(f"Chapter number {chapter_number} exists for book {book_id}")
            return create_error_response('Chapter number already exists for this book', 400)
        
        chapter = Chapter(
            book_id=book_id,
            chapter_number=chapter_number,
            title=title,
            content=content or None,
            created_at=datetime.utcnow()
        )
        db.session.add(chapter)
        db.session.commit()
        
        logger.info(f"Chapter {chapter_number} created for book {book_id} by user {current_user_id}")
        return jsonify({
            'status': 'success',
            'message': 'Chapter created successfully',
            'chapter': {
                'id': chapter.id,
                'book_id': chapter.book_id,
                'chapter_number': chapter.chapter_number,
                'title': chapter.title,
                'content': chapter.content or '',
                'created_at': chapter.created_at.isoformat() if chapter.created_at else None
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        if 'unique' in str(e).lower() and 'chapter_number' in str(e).lower():
            logger.warning(f"Chapter number exists: {chapter_number}")
            return create_error_response('Chapter number already exists for this book', 400)
        logger.error(f"Error creating chapter for book {book_id} by user {current_user_id}: {str(e)}")
        return create_error_response(str(e), 500)
    

@book_bp.route('/debug-favorites', methods=['GET'])
@jwt_required()
def debug_favorites():
    """Debug favorite functionality"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all favorites for this user
        user_favorites = Favorite.query.filter_by(user_id=current_user_id).all()
        favorite_book_ids = [fav.book_id for fav in user_favorites]
        
        # Get some books
        books = Book.query.limit(5).all()
        
        debug_results = []
        for book in books:
            book_dict = book_to_dict(book, current_user_id=current_user_id)
            debug_results.append({
                'book_id': book.id,
                'book_title': book.title,
                'is_favorite_in_response': book_dict.get('is_favorite'),
                'is_in_favorites_table': book.id in favorite_book_ids,
                'full_response_sample': book_dict  # Show the actual response
            })
        
        return jsonify({
            'user_id': current_user_id,
            'user_favorites_count': len(user_favorites),
            'favorite_book_ids': favorite_book_ids,
            'debug_results': debug_results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# Thêm route test nhanh
@book_bp.route('/test-fix', methods=['GET'])
@jwt_required()
def test_fix():
    """Test the fixed book_to_dict"""
    try:
        current_user_id = get_jwt_identity()
        book = Book.query.get(3)
        
        # Sử dụng function từ BLUEPRINT (không phải từ model)
        book_dict = book_to_dict(book, current_user_id=current_user_id)
        
        return jsonify({
            'has_is_favorite': 'is_favorite' in book_dict,
            'is_favorite_value': book_dict.get('is_favorite'),
            'book_data': book_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@book_bp.route('/test-new-function', methods=['GET'])
@jwt_required()
def test_new_function():
    """Test the new book_to_dict function"""
    try:
        current_user_id = get_jwt_identity()
        print(f"🧪 TEST NEW FUNCTION - User: {current_user_id}")
        
        book = Book.query.get(3)
        
        # Sử dụng function mới
        book_dict = book_to_dict(book, current_user_id=current_user_id)
        
        return jsonify({
            'status': 'success',
            'message': 'Testing NEW book_to_dict function',
            'has_is_favorite': 'is_favorite' in book_dict,
            'is_favorite_value': book_dict.get('is_favorite'),
            'all_fields': list(book_dict.keys()),
            'book_data': book_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    


@book_bp.route('/debug-which-function', methods=['GET'])
@jwt_required()
def debug_which_function():
    """Check which to_dict is being called"""
    import inspect
    
    current_user_id = get_jwt_identity()
    book = Book.query.first()
    
    # Test blueprint function
    from backend.routes.book import book_to_dict as blueprint_func
    blueprint_result = blueprint_func(book, current_user_id=current_user_id)
    
    # Test model method (if exists)
    model_result = None
    if hasattr(book, 'book_to_dict'):
        try:
            model_result = book.book_to_dict(current_user_id=current_user_id)
        except TypeError:
            model_result = {"error": "Model to_dict doesn't accept current_user_id"}
    
    return jsonify({
        'blueprint_function': {
            'has_is_favorite': 'is_favorite' in blueprint_result,
            'is_favorite_value': blueprint_result.get('is_favorite'),
            'source': inspect.getsourcefile(blueprint_func)
        },
        'model_method': {
            'exists': hasattr(book, 'book_to_dict'),
            'result': model_result
        }
    })