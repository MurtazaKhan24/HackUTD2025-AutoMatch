from typing import Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class CarPreferences:
    def __init__(self):
        self.preferences = {
            'makes': {},  # Track make preferences
            'years': {},  # Track year range preferences
            'interactions': []  # Store all interactions
        }
        
    def update_from_interaction(self, car: Dict, liked: bool):
        """Update preferences based on user interaction with a car."""
        make = car.get('make')
        year = int(car.get('year', 0))
        
        # Record interaction
        self.interactions.append({
            'car': car,
            'liked': liked,
            'timestamp': datetime.now().isoformat()
        })
        
        # Update make preferences (exponential moving average)
        if make:
            current = self.preferences['makes'].get(make, 0)
            self.preferences['makes'][make] = current * 0.8 + (1 if liked else -0.2)
            
        # Update year preferences
        if year:
            decade = (year // 10) * 10
            current = self.preferences['years'].get(str(decade), 0)
            self.preferences['years'][str(decade)] = current * 0.8 + (1 if liked else -0.2)
    
    def get_preference_weights(self, cars: List[Dict]) -> List[float]:
        """Calculate preference weights for a list of cars."""
        weights = []
        for car in cars:
            weight = 1.0  # Base weight
            
            # Apply make preference
            make = car.get('make')
            if make in self.preferences['makes']:
                weight *= (1 + self.preferences['makes'][make])
            
            # Apply year preference
            year = int(car.get('year', 0))
            if year:
                decade = (year // 10) * 10
                if str(decade) in self.preferences['years']:
                    weight *= (1 + self.preferences['years'][str(decade)])
            
            weights.append(max(0.1, min(2.0, weight)))  # Clamp between 0.1 and 2.0
        
        return weights
    
    def save(self, filepath: str):
        """Save preferences to file."""
        with open(filepath, 'w') as f:
            json.dump(self.preferences, f)
    
    def load(self, filepath: str):
        """Load preferences from file."""
        try:
            with open(filepath, 'r') as f:
                self.preferences = json.load(f)
        except FileNotFoundError:
            logger.info("No existing preferences found, starting fresh")
            pass
            
    @property
    def interactions(self) -> List[Dict]:
        """Get recorded interactions."""
        return self.preferences['interactions']
