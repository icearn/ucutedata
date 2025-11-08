import importlib  # For dynamically importing modules
import pkgutil    # For iterating over installed modules
import crawlers   # Custom package containing crawler implementations
from utils.db import insert_unit_prices
from dotenv import load_dotenv

def discover_crawlers():
    """
    Dynamically discovers and loads all crawler classes from the crawlers package.
    Returns a list of crawler classes that implement the fetch_prices method.
    """
    crawler_classes = []
    # Iterate through all modules in the crawlers package
    for _, module_name, _ in pkgutil.iter_modules(crawlers.__path__):
        # Skip the base module to avoid loading abstract base classes
        if module_name == "base":
            continue
        # Dynamically import the crawler module
        module = importlib.import_module(f"crawlers.{module_name}")
        # Inspect all attributes in the module
        for attr in dir(module):
            obj = getattr(module, attr)
            # Check if the attribute is a class and has fetch_prices method
            if isinstance(obj, type) and hasattr(obj, 'fetch_prices'):
                crawler_classes.append(obj)
    return crawler_classes

def run_crawlers():
    """
    Main function to execute all discovered crawlers.
    Runs each crawler and prints the results or any errors that occur.
    """
    # Get list of all crawler classes
    crawler_classes = discover_crawlers()

    # Iterate through each crawler class
    for crawler_cls in crawler_classes:
        crawler = crawler_cls()
        print(f"\nRunning crawler for {crawler.provider}...")
        try:
            # Attempt to fetch prices using the crawler
            prices = crawler.fetch_prices()
            if not prices:
                print(f"No data returned for {crawler.provider}.")
                continue
            print(f"Fetched {len(prices)} entries.")
            # Preview the first 5 entries of the results
            for entry in prices[:5]:
                print(entry)
            insert_unit_prices(crawler.provider, prices)
        except Exception as e:
            # Handle any errors that occur during crawling
            print(f"Error during crawling {crawler.provider}: {e}")

# Execute run_crawlers() if this file is run directly
if __name__ == "__main__":
    run_crawlers()
