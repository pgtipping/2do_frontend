import math
import re
from collections import Counter
from typing import List, Dict, Set

class SemanticSimilarity:
    def __init__(self):
        self.documents: List[str] = []
        self.vocab: Set[str] = set()
        self.idf_scores: Dict[str, float] = {}
        
    def preprocess(self, text: str) -> List[str]:
        """Clean and tokenize text."""
        text = text.lower()
        words = re.findall(r'\w+', text)
        return words
    
    def fit(self, documents: List[str]) -> None:
        """Calculate IDF scores for the document collection."""
        self.documents = documents
        doc_count = len(documents)
        
        word_doc_count: Dict[str, int] = Counter()
        
        for doc in documents:
            words = set(self.preprocess(doc))
            self.vocab.update(words)
            
            for word in words:
                word_doc_count[word] += 1
        
        self.idf_scores = {
            word: math.log(doc_count / count)
            for word, count in word_doc_count.items()
        }
    
    def get_tf_idf_vector(self, text: str) -> Dict[str, float]:
        """Calculate TF-IDF vector for a text."""
        words = self.preprocess(text)
        word_count = Counter(words)
        
        tf_idf = {}
        for word in self.vocab:
            tf = word_count[word] / len(words) if word in word_count else 0
            idf = self.idf_scores.get(word, 0)
            tf_idf[word] = tf * idf
            
        return tf_idf
    
    def cosine_similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        """Calculate cosine similarity between two vectors."""
        dot_product = sum(vec1.get(word, 0) * vec2.get(word, 0) for word in self.vocab)
        
        mag1 = math.sqrt(sum(score ** 2 for score in vec1.values()))
        mag2 = math.sqrt(sum(score ** 2 for score in vec2.values()))
        
        if mag1 == 0 or mag2 == 0:
            return 0
            
        return dot_product / (mag1 * mag2)
    
    def compare_texts(self, text1: str, text2: str) -> float:
        """Compare two texts and return similarity score."""
        vec1 = self.get_tf_idf_vector(text1)
        vec2 = self.get_tf_idf_vector(text2)
        
        return self.cosine_similarity(vec1, vec2)

def main():
    # Example usage
    documents = [
        "The quick brown fox jumps over the lazy dog",
        "A fast brown fox leaps over a sleepy canine",
        "The weather is nice today",
        "Today has beautiful weather",
        "Python programming is fun",
        "Coding with Python is enjoyable"
    ]
    
    similarity = SemanticSimilarity()
    similarity.fit(documents)
    
    test_pairs = [
        ("The weather is nice", "Today has beautiful weather"),
        ("Python programming", "Coding with Python"),
        ("The quick fox", "A slow cat"),
    ]
    
    print("Semantic Similarity Scores:")
    print("-" * 50)
    for text1, text2 in test_pairs:
        score = similarity.compare_texts(text1, text2)
        print(f"\nText 1: {text1}")
        print(f"Text 2: {text2}")
        print(f"Similarity Score: {score:.4f}")

if __name__ == "__main__":
    main()
