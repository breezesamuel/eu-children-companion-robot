#!/usr/bin/env python3
"""Shared pagination utilities for all modules"""

def paginate(items: list, page: int = 1, page_size: int = 25) -> dict:
    if page < 1: page = 1
    if page_size < 1: page_size = 25
    if page_size > 100: page_size = 100
    total = len(items)
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    end = min(start + page_size, total)
    return {
        "items": items[start:end],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
            "has_prev": page > 1,
            "has_next": page < total_pages,
        }
    }
