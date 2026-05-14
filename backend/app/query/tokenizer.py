import re

def tokenize(query_string: str) -> list:
    if not query_string or not query_string.strip():
        return []
    
    # Pre-process: remove newlines and extra spaces
    query_string = query_string.replace('\n', ' ').strip()
    
    # Split by spaces but keep quoted strings together
    # Also ignore keywords like AND / OR for now as the compiler treats everything as AND
    tokens = re.findall(r'(?:[^\s"]|"(?:\\.|[^"])*")+', query_string)
    
    # Filter out keywords (we treat implicit space as AND)
    return [t for t in tokens if t.upper() not in ('AND', 'OR')]
