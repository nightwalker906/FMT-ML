"""
=============================================================================
Serper AI Search Service
=============================================================================

This module provides integration with Serper AI for real-time web search.
Used to gather relevant resources and information for study plan generation.

Serper API Documentation: https://serper.dev/docs

Author: FMT Development Team
Date: January 2026
=============================================================================
"""

import os
import requests
import logging
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Serper API configuration
SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")
SERPER_ENDPOINT = "https://google.serper.dev/search"

if SERPER_API_KEY:
    logger.info(f"✅ Serper API key loaded: {SERPER_API_KEY[:10]}...")
else:
    logger.warning("❌ SERPER_API_KEY not configured. Search functionality will be disabled.")


class SerperSearchService:
    """
    Service class for interacting with Serper API.
    Provides methods to search for academic resources and study materials.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Serper service.
        
        Args:
            api_key: Optional API key override (defaults to environment variable)
        """
        self.api_key = api_key or SERPER_API_KEY
        self.endpoint = SERPER_ENDPOINT
        
        if not self.api_key:
            raise ValueError(
                "SERPER_API_KEY is not configured. "
                "Please add your Serper API key to the .env file. "
                "Get a free key at: https://serper.dev"
            )
    
    def search(self, query: str, num_results: int = 10) -> List[Dict[str, Any]]:
        """
        Perform a search query using Serper API.
        
        Args:
            query: Search query string
            num_results: Number of results to retrieve (default 10)
            
        Returns:
            List of search results with title, link, and snippet
            
        Raises:
            Exception: If API call fails
        """
        try:
            headers = {
                "X-API-KEY": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "q": query,
                "num": num_results,
                "autocorrect": True,
                "page": 1
            }
            
            logger.info(f"Searching Serper for: {query}")
            
            response = requests.post(
                self.endpoint,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                results = []
                
                # Extract organic search results
                if "organic" in data:
                    for result in data["organic"][:num_results]:
                        results.append({
                            "title": result.get("title", ""),
                            "link": result.get("link", ""),
                            "snippet": result.get("snippet", ""),
                            "position": result.get("position", 0)
                        })
                
                logger.info(f"Found {len(results)} results for: {query}")
                return results
            else:
                logger.error(f"Serper API error: {response.status_code} - {response.text}")
                raise Exception(f"Serper API returned status {response.status_code}")
                
        except requests.exceptions.Timeout:
            logger.error(f"Serper API timeout for query: {query}")
            raise Exception("Serper API request timed out")
        except requests.exceptions.RequestException as e:
            logger.error(f"Serper API request error: {str(e)}")
            raise Exception(f"Serper API request failed: {str(e)}")
        except Exception as e:
            logger.error(f"Serper search error: {str(e)}")
            raise
    
    def search_academic_resources(self, topic: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search for academic resources on a specific topic.
        
        Args:
            topic: Academic topic to search for
            num_results: Number of results to retrieve
            
        Returns:
            List of relevant academic resources
        """
        # Add academic search qualifiers
        query = f"{topic} tutorial guide educational resource site:edu OR site:org OR site:com"
        return self.search(query, num_results)
    
    def search_practice_problems(self, topic: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search for practice problems and exercises on a topic.
        
        Args:
            topic: Topic to search practice problems for
            num_results: Number of results to retrieve
            
        Returns:
            List of practice problem resources
        """
        query = f"{topic} practice problems exercises solutions"
        return self.search(query, num_results)
    
    def search_learning_resources(self, topic: str, num_results: int = 8) -> List[Dict[str, Any]]:
        """
        Comprehensive search for learning resources on a topic.
        
        Args:
            topic: Topic to search resources for
            num_results: Number of results to retrieve
            
        Returns:
            List of learning resources
        """
        query = f"{topic} learning guide course tutorial video lecture"
        return self.search(query, num_results)
    
    def get_search_summary(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """
        Get a summary of search results with key information.
        
        Args:
            query: Search query
            num_results: Number of results to retrieve
            
        Returns:
            Dictionary with search summary including titles and snippets
        """
        results = self.search(query, num_results)
        
        summary = {
            "query": query,
            "total_results": len(results),
            "results": [
                {
                    "title": r["title"],
                    "url": r["link"],
                    "description": r["snippet"][:150] + "..." if len(r["snippet"]) > 150 else r["snippet"]
                }
                for r in results
            ]
        }
        
        return summary


def search_for_study_resources(topic: str, search_type: str = "general") -> List[Dict[str, Any]]:
    """
    Convenience function to search for study resources.
    
    Args:
        topic: Topic to search for
        search_type: Type of search - "general", "academic", "practice", "videos"
        
    Returns:
        List of search results
    """
    try:
        service = SerperSearchService()
        
        if search_type == "academic":
            return service.search_academic_resources(topic)
        elif search_type == "practice":
            return service.search_practice_problems(topic)
        elif search_type == "learning":
            return service.search_learning_resources(topic)
        else:
            return service.search(f"{topic} tutorial guide", num_results=8)
            
    except Exception as e:
        logger.error(f"Failed to search for {topic}: {str(e)}")
        return []
