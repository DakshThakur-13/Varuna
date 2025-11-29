import os
from dotenv import load_dotenv

# Load environment variables BEFORE importing redis_client
load_dotenv()

from redis_client import redis_client

def test_redis_connection():
    print("Testing Redis Connection...")
    print(f"REDIS_URL: {os.getenv('REDIS_URL')}")
    
    if redis_client.enabled:
        print("✅ Redis Client is ENABLED")
        
        # Test Set
        print("Attempting to SET a key...")
        success = redis_client.set("test_key", "Hello Varuna", ex=60)
        if success:
            print("✅ SET successful")
        else:
            print("❌ SET failed")
            
        # Test Get
        print("Attempting to GET the key...")
        value = redis_client.get("test_key")
        if value == "Hello Varuna":
            print(f"✅ GET successful: {value}")
        else:
            print(f"❌ GET failed. Expected 'Hello Varuna', got '{value}'")
            
    else:
        print("❌ Redis Client is DISABLED (Connection failed during initialization)")

if __name__ == "__main__":
    test_redis_connection()
