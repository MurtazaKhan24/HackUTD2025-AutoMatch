# Dynamic Preference Learning with Embeddings

## Overview
Build a system where user swipe interactions (left/right) create a personalized preference model that improves future car suggestions.

---

## Architecture

### 1. **Embedding Storage Structure**
```json
{
  "user_id": "anonymous_user_123",
  "created_at": "2025-11-09T12:00:00Z",
  "updated_at": "2025-11-09T14:30:00Z",
  "preferences": {
    "liked_cars": [
      {
        "make": "Toyota",
        "model": "Camry",
        "year": 2020,
        "embedding": [0.23, -0.45, 0.67, ...],  // 384-dim vector
        "features": ["luxury", "reliable", "hybrid"],
        "price": 28000,
        "timestamp": "2025-11-09T13:15:00Z"
      }
    ],
    "disliked_cars": [
      {
        "make": "Ford",
        "model": "F150",
        "year": 2019,
        "embedding": [-0.15, 0.32, -0.28, ...],
        "features": ["truck", "rugged", "tow_package"],
        "price": 35000,
        "timestamp": "2025-11-09T13:20:00Z"
      }
    ],
    "preference_vector": [0.18, -0.22, 0.45, ...],  // Learned preference
    "feature_weights": {
      "luxury": 0.85,
      "reliable": 0.92,
      "hybrid": 0.78,
      "truck": -0.65,
      "rugged": -0.45
    }
  },
  "metrics": {
    "total_swipes": 25,
    "like_rate": 0.36,
    "avg_price_liked": 32500,
    "avg_price_disliked": 28000,
    "preferred_body_styles": ["sedan", "coupe"],
    "avoided_body_styles": ["truck", "van"]
  }
}
```

---

## Implementation Strategies

### **Option 1: Sentence Transformer Embeddings (Best for Semantic Understanding)**

**Approach:**
- Use `sentence-transformers` library with models like `all-MiniLM-L6-v2` (384 dimensions)
- Generate embeddings from car descriptions: `"{year} {make} {model} {features} {body_style}"`
- Calculate cosine similarity between new cars and user's preference vector

**Pros:**
- ✅ Semantic understanding of car characteristics
- ✅ Works well with text descriptions
- ✅ Relatively fast (< 50ms per embedding)
- ✅ Can use pre-trained models

**Implementation:**
```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')

def car_to_text(car):
    """Convert car to description for embedding."""
    features = ' '.join(car.get('features', []))
    return f"{car['year']} {car['make']} {car['model']} {features} {car.get('body_style', '')}"

def generate_embedding(car):
    """Generate embedding vector for a car."""
    text = car_to_text(car)
    return model.encode(text)

def update_preference_vector(liked_embeddings, disliked_embeddings):
    """Calculate user's preference vector."""
    # Average of liked cars minus average of disliked cars
    liked_mean = np.mean(liked_embeddings, axis=0) if liked_embeddings else np.zeros(384)
    disliked_mean = np.mean(disliked_embeddings, axis=0) if disliked_embeddings else np.zeros(384)
    
    # Weight liked more heavily
    return (liked_mean * 1.5) - (disliked_mean * 0.5)

def score_car(car_embedding, preference_vector):
    """Score a car based on user preferences."""
    from sklearn.metrics.pairwise import cosine_similarity
    return cosine_similarity([car_embedding], [preference_vector])[0][0]
```

---

### **Option 2: Feature-Based Embeddings (Interpretable)**

**Approach:**
- Create a fixed feature space (e.g., 100 dimensions for common car attributes)
- Each dimension represents a feature (luxury, sporty, eco-friendly, etc.)
- Build embeddings from feature presence/absence

**Pros:**
- ✅ Very interpretable (know exactly why a car scored high)
- ✅ Fast to compute
- ✅ Easy to debug
- ✅ Can manually tune feature importance

**Implementation:**
```python
import numpy as np

# Define feature space
FEATURE_DIMENSIONS = {
    'luxury': 0, 'sporty': 1, 'reliable': 2, 'eco_friendly': 3,
    'spacious': 4, 'compact': 5, 'modern': 6, 'practical': 7,
    # ... up to 100 features
}

def build_feature_embedding(car):
    """Build embedding from car features."""
    embedding = np.zeros(len(FEATURE_DIMENSIONS))
    
    for feature in car.get('features', []):
        if feature in FEATURE_DIMENSIONS:
            embedding[FEATURE_DIMENSIONS[feature]] = 1.0
    
    # Add continuous features (normalized)
    embedding[50] = min(car.get('price', 0) / 100000, 1.0)  # Price
    embedding[51] = min(car.get('year', 2020) - 1990) / 35  # Age
    embedding[52] = 1.0 if car.get('hybrid') else 0.0
    
    return embedding

def calculate_feature_weights(liked_cars, disliked_cars):
    """Learn which features matter most."""
    weights = np.zeros(len(FEATURE_DIMENSIONS))
    
    for car in liked_cars:
        embedding = build_feature_embedding(car)
        weights += embedding * 1.0  # Positive weight
    
    for car in disliked_cars:
        embedding = build_feature_embedding(car)
        weights -= embedding * 0.5  # Negative weight
    
    # Normalize
    return weights / (len(liked_cars) + len(disliked_cars))
```

---

### **Option 3: Hybrid Approach (Recommended)**

**Combine both methods:**
1. Use sentence transformers for semantic understanding
2. Add explicit feature weights for interpretability
3. Combine scores with weighted average

```python
def hybrid_score(car, preference_vector, feature_weights):
    """Combined semantic + feature-based scoring."""
    # Semantic similarity (0-1)
    embedding = generate_embedding(car)
    semantic_score = cosine_similarity([embedding], [preference_vector])[0][0]
    
    # Feature-based score (0-1)
    feature_score = 0
    feature_count = 0
    for feature in car.get('features', []):
        if feature in feature_weights:
            feature_score += feature_weights[feature]
            feature_count += 1
    
    feature_score = feature_score / max(feature_count, 1)
    
    # Combine: 60% semantic, 40% features
    return (semantic_score * 0.6) + (feature_score * 0.4)
```

---

## Integration Flow

### **1. On Swipe Event**
```python
@app.route('/api/swipe', methods=['POST'])
def record_swipe():
    data = request.json
    car = data['car']
    direction = data['direction']  # 'left' or 'right'
    
    # Generate embedding
    embedding = generate_embedding(car)
    
    # Load user preferences
    prefs = load_preferences()
    
    # Update embeddings
    if direction == 'right':
        prefs['liked_cars'].append({
            'car': car,
            'embedding': embedding.tolist(),
            'timestamp': datetime.now().isoformat()
        })
    else:
        prefs['disliked_cars'].append({
            'car': car,
            'embedding': embedding.tolist(),
            'timestamp': datetime.now().isoformat()
        })
    
    # Recalculate preference vector
    prefs['preference_vector'] = update_preference_vector(
        [c['embedding'] for c in prefs['liked_cars']],
        [c['embedding'] for c in prefs['disliked_cars']]
    )
    
    # Update feature weights
    prefs['feature_weights'] = calculate_feature_weights(
        [c['car'] for c in prefs['liked_cars']],
        [c['car'] for c in prefs['disliked_cars']]
    )
    
    # Save (locally, not to git)
    save_preferences(prefs)
    
    return jsonify({'status': 'success'})
```

### **2. On Car Search**
```python
def rank_cars_with_preferences(cars, user_preferences):
    """Re-rank cars based on learned preferences."""
    if not user_preferences.get('preference_vector'):
        return cars  # No preferences yet, return as-is
    
    preference_vector = np.array(user_preferences['preference_vector'])
    feature_weights = user_preferences.get('feature_weights', {})
    
    scored_cars = []
    for car in cars:
        score = hybrid_score(car, preference_vector, feature_weights)
        scored_cars.append({
            **car,
            'preference_score': score
        })
    
    # Sort by combined score (original weight + preference score)
    scored_cars.sort(
        key=lambda c: (c.get('weight', 0.5) * 0.4) + (c.get('preference_score', 0) * 0.6),
        reverse=True
    )
    
    return scored_cars
```

---

## Advanced Features

### **1. Temporal Decay**
Recent preferences matter more than old ones:
```python
def apply_temporal_decay(preferences, decay_rate=0.95):
    """Weight recent swipes more heavily."""
    now = datetime.now()
    
    for item in preferences['liked_cars']:
        timestamp = datetime.fromisoformat(item['timestamp'])
        days_old = (now - timestamp).days
        item['weight'] = decay_rate ** days_old
    
    # Recalculate with weights
    weighted_embeddings = [
        item['embedding'] * item['weight'] 
        for item in preferences['liked_cars']
    ]
```

### **2. Collaborative Filtering**
Learn from similar users (privacy-preserving):
```python
def find_similar_users(user_vector, all_users_vectors):
    """Find users with similar preferences."""
    similarities = cosine_similarity([user_vector], all_users_vectors)
    return np.argsort(similarities[0])[-5:]  # Top 5 similar users

def recommend_from_similar_users(user_prefs, similar_users_prefs):
    """What did similar users like that you haven't seen?"""
    # Aggregate liked cars from similar users
    # Filter out already-swiped cars
    # Return top recommendations
```

### **3. Active Learning**
Ask clarifying questions when uncertain:
```python
def detect_uncertainty(car, preference_vector):
    """Detect when model is uncertain."""
    score = score_car(car, preference_vector)
    
    # If score is near 0 (neither clearly liked nor disliked)
    if -0.1 < score < 0.1:
        return {
            'uncertain': True,
            'question': f"Would you like a {car['year']} {car['make']} {car['model']}?",
            'options': ['Yes', 'No', 'Maybe']
        }
    
    return {'uncertain': False}
```

### **4. Diversity Injection**
Prevent filter bubble by showing diverse options:
```python
def inject_diversity(ranked_cars, diversity_rate=0.2):
    """Insert diverse cars to prevent echo chamber."""
    # Every 5th car, show something different
    diverse_cars = []
    for i, car in enumerate(ranked_cars):
        diverse_cars.append(car)
        
        if (i + 1) % 5 == 0:
            # Insert a low-scored but interesting car
            diverse_car = get_diverse_option(ranked_cars, car)
            diverse_cars.append(diverse_car)
    
    return diverse_cars
```

---

## Files to Create

1. **`backend/app/services/embeddings.py`** - Embedding generation and management
2. **`backend/app/services/preference_learning.py`** - Preference vector updates
3. **`backend/app/models/user_preferences.py`** - Data models
4. **`backend/data/embeddings.json`** - User embeddings (gitignored)
5. **`backend/requirements.txt`** - Add `sentence-transformers`, `scikit-learn`

---

## Quick Start Implementation

**Phase 1: Basic Embeddings (Week 1)**
- ✅ Install sentence-transformers
- ✅ Generate embeddings for cars on swipe
- ✅ Store in `backend/data/embeddings.json` (gitignored)

**Phase 2: Preference Learning (Week 2)**
- ✅ Calculate preference vector from liked/disliked
- ✅ Re-rank search results with preference scores
- ✅ Add preference_score to car cards

**Phase 3: Advanced Features (Week 3+)**
- ✅ Temporal decay
- ✅ Feature weight visualization
- ✅ Active learning questions
- ✅ Diversity injection

---

## Privacy & Data Handling

- ✅ All embeddings stored **locally only** (gitignored)
- ✅ No PII collected
- ✅ User can clear history anytime
- ✅ Option to export/import preferences
- ✅ Transparent about what's learned

---

## Performance Considerations

- Cache embeddings for common cars
- Batch process embeddings (generate 100 at once)
- Use quantized models for faster inference
- Store embeddings as numpy arrays, not JSON (faster)
- Consider using FAISS for large-scale similarity search

---

## Testing Strategy

1. **Unit tests**: Embedding generation, scoring functions
2. **Integration tests**: End-to-end swipe → preference update
3. **A/B testing**: Compare with/without preference learning
4. **User studies**: Measure satisfaction improvement

---

## Next Steps

1. Install dependencies: `pip install sentence-transformers scikit-learn`
2. Create `backend/app/services/embeddings.py`
3. Update swipe endpoint to record embeddings
4. Add preference re-ranking to search
5. Add UI to show "Why this car?" explanations

Let me know which approach you'd like to start with! 🚀
