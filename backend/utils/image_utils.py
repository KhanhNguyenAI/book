"""
Image utility functions for converting images to WebP format
"""

import io
import logging
from PIL import Image
from werkzeug.datastructures import FileStorage

logger = logging.getLogger(__name__)

def convert_image_to_webp(file: FileStorage, quality: int = 80) -> tuple:
    """
    Convert uploaded image to WebP format
    
    Args:
        file: FileStorage object from request
        quality: WebP quality (1-100, default 80)
    
    Returns:
        tuple: (webp_bytes, filename_with_webp_ext, success: bool)
    """
    try:
        # Read file content
        file.seek(0)
        img = Image.open(file)
        
        # Get original filename without extension
        original_filename = file.filename
        if '.' in original_filename:
            filename_without_ext = original_filename.rsplit('.', 1)[0]
        else:
            filename_without_ext = original_filename
        
        # Convert RGBA/PNG to RGB
        if img.mode in ('RGBA', 'LA', 'P'):
            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                rgb_img.paste(img, mask=img.split()[-1])
            else:
                rgb_img.paste(img)
            img = rgb_img
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Save as WebP to bytes
        webp_buffer = io.BytesIO()
        img.save(webp_buffer, 'WEBP', quality=quality, method=6)
        webp_buffer.seek(0)
        
        # Generate new filename
        new_filename = f"{filename_without_ext}.webp"
        
        logger.info(f"Image converted to WebP: {original_filename} → {new_filename}")
        
        return webp_buffer.getvalue(), new_filename, True
        
    except Exception as e:
        logger.error(f"Error converting image to WebP: {str(e)}")
        return None, None, False

def get_image_size_reduction(original_size: int, new_size: int) -> float:
    """
    Calculate size reduction percentage
    
    Args:
        original_size: Original file size in bytes
        new_size: New file size in bytes
    
    Returns:
        float: Reduction percentage
    """
    if original_size == 0:
        return 0
    return ((original_size - new_size) / original_size) * 100

