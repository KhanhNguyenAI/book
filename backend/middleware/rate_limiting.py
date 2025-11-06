from functools import wraps
from extensions import limiter

def rate_limit(requests_per_minute=None, requests_per_hour=None, requests_per_day=None):
    """
    Decorator to apply rate limiting to routes.
    
    Args:
        requests_per_minute: Maximum requests per minute
        requests_per_hour: Maximum requests per hour
        requests_per_day: Maximum requests per day
    
    Usage:
        @rate_limit(requests_per_minute=60)
        def my_route():
            ...
    """
    def decorator(f):
        # Build rate limit string
        limits = []
        if requests_per_minute:
            limits.append(f"{requests_per_minute} per minute")
        if requests_per_hour:
            limits.append(f"{requests_per_hour} per hour")
        if requests_per_day:
            limits.append(f"{requests_per_day} per day")
        
        if not limits:
            # Default: no limit if no parameters provided
            return f
        
        limit_string = ", ".join(limits)
        
        # Apply limiter decorator directly
        # limiter.limit() can be used as a decorator
        return limiter.limit(limit_string)(f)
    
    return decorator

