from abc import ABC, abstractmethod  # Import Abstract Base Class functionality
from typing import List, Dict       # Import type hints for better code documentation

class BaseCrawler(ABC):
    """
    Abstract base class for KiwiSaver fund price crawlers.
    Provides a template for implementing provider-specific crawlers.
    """
    
    def __init__(self, provider_name: str):
        """
        Initialize the crawler with a provider name.
        
        Args:
            provider_name (str): Name of the KiwiSaver provider
        """
        self.provider = provider_name

    @abstractmethod
    def fetch_prices(self) -> List[Dict]:
        """
        Abstract method that must be implemented by child classes to fetch unit prices.
        
        Returns:
            List[Dict]: A list of dictionaries containing fund data with structure:
            [
                {
                    "scheme": str,      # Name of the investment scheme
                    "unit_price": float, # Price per unit
                    "date": str         # Date in YYYY-MM-DD format
                },
                ...
            ]
        """
        pass

    def persist_to_db(self, data: List[Dict]):
        """
        Template method for database operations.
        Can be implemented by child classes to store crawled data.
        
        Args:
            data (List[Dict]): List of fund data dictionaries to be stored
            
        Raises:
            NotImplementedError: If the method is not implemented by child class
        """
        raise NotImplementedError("Database insertion not implemented.")
