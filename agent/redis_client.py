"""
Redis Client for Caching and Deduplication
Uses Upstash Redis or standard Redis
"""

import os
import json
from typing import Optional, Any
import redis
from config import get_settings

class RedisManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisManager, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        settings = get_settings()
        # Default to localhost if not provided, or use UPSTASH_REDIS_REST_URL if using HTTP client
        # Here we use the standard redis client which works with Upstash connection strings
        redis_url = settings.redis_url
        
        try:
            self.client = redis.from_url(redis_url, decode_responses=True)
            # Test connection
            self.client.ping()
            self.enabled = True
            print(f"✅ Redis connected: {redis_url}")
        except Exception as e:
            print(f"⚠️ Redis connection failed: {e}. Caching disabled.")
            self.enabled = False

    def get(self, key: str) -> Optional[str]:
        if not self.enabled:
            return None
        try:
            return self.client.get(key)
        except Exception as e:
            print(f"Redis GET error: {e}")
            return None

    def set(self, key: str, value: str, ex: int = 3600) -> bool:
        """Set key with expiry (default 1 hour)"""
        if not self.enabled:
            return False
        try:
            return self.client.set(key, value, ex=ex)
        except Exception as e:
            print(f"Redis SET error: {e}")
            return False

    def exists(self, key: str) -> bool:
        if not self.enabled:
            return False
        try:
            return self.client.exists(key) > 0
        except Exception as e:
            print(f"Redis EXISTS error: {e}")
            return False

    def cache_json(self, key: str, data: Any, ex: int = 300) -> bool:
        """Cache a JSON serializable object"""
        try:
            return self.set(key, json.dumps(data), ex=ex)
        except Exception:
            return False

    def get_json(self, key: str) -> Optional[Any]:
        """Retrieve and parse a JSON object"""
        data = self.get(key)
        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                return None
        return None

# Global instance
redis_client = RedisManager()
