export interface Car {
  make: string;
  model: string;
  year: number;
  url?: string;
  source?: string;
}

export interface CarDetails extends Car {
  specs: {
    mpg: string;
    horsepower: number;
    transmission: string;
    drivetrain: string;
    engine: string;
  };
  features: string[];
  pros: string[];
  cons: string[];
  photos: string[];
  safety_rating: number;
  weight: number;  // Preference weight
  trim: string;
  price: {
    marketValue: number;
  };
}
