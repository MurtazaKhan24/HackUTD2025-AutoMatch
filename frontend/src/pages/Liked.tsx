import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Home, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  price: number;
  image: string;
  mileage: number;
  transmission: string;
  bodyType: string;
  // Added hardcoded details
  engine?: string;
  horsepower?: number;
  torque?: number;
  fuelEconomy?: string;
  safetyRating?: number;
  features?: string[];
  dealerNote?: string;
}

// Helper to render stars
const renderStars = (rating: number) => {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
};

// Function to add consistent fake details
const addFakeDetails = (car: Car) => {
  const baseId = car.id % 5; // Use ID to make details consistent
  switch (baseId) {
    case 1: // Tesla
      return {
        ...car,
        engine: "Dual Electric Motor", horsepower: 450, torque: 471, fuelEconomy: "131 MPGe", safetyRating: 5,
        features: ["Autopilot", "Panoramic Glass Roof", "15-inch Touchscreen", "Sentry Mode"],
        dealerNote: "Like new, owner upgrading to Model S. Clean title and zero emissions!"
      };
    case 2: // BMW
      return {
        ...car,
        engine: "3.0L 6-Cylinder Turbo", horsepower: 335, torque: 331, fuelEconomy: "25 MPG Hwy", safetyRating: 5,
        features: ["Heated Seats", "Apple CarPlay", "Lane Keep Assist", "Panoramic Sunroof"],
        dealerNote: "One-owner lease return. All maintenance records available. Excellent condition."
      };
    case 3: // Ford
      return {
        ...car,
        engine: "5.0L V8", horsepower: 450, torque: 410, fuelEconomy: "24 MPG Hwy", safetyRating: 5,
        features: ["B&O Sound System", "Digital Instrument Cluster", "MagnaRide Damping", "Active Valve Exhaust"],
        dealerNote: "Barely driven! This GT Premium is a thrill to drive. Owner moving out of country."
      };
    case 4: // Mercedes
      return {
        ...car,
        engine: "2.0L 4-Cylinder Turbo", horsepower: 255, torque: 295, fuelEconomy: "31 MPG Hwy", safetyRating: 5,
        features: ["MBUX Infotainment", "Burmester Surround Sound", "Heated Seats", "Blind Spot Assist"],
        dealerNote: "Certified Pre-Owned. Comes with an additional 1-year unlimited mileage warranty."
      };
    case 0: // Porsche (id 5 % 5 = 0)
      return {
        ...car,
        engine: "3.0L 6-Cylinder Twin-Turbo", horsepower: 379, torque: 331, fuelEconomy: "23 MPG Hwy", safetyRating: 4,
        features: ["PASM", "Sport Chrono Package", "Leather Interior", "Bose Surround Sound"],
        dealerNote: "A true icon. This Carrera is in pristine condition. No track days. Serious inquiries only."
      };
    default:
      return car;
  }
};


const Liked = () => {
  const navigate = useNavigate();
  const [likedCars, setLikedCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("likedCars");
    if (stored) {
      const cars: Car[] = JSON.parse(stored);
      // Add fake details to each car
      const carsWithDetails = cars.map(addFakeDetails);
      setLikedCars(carsWithDetails);
    }
  }, []);

  const handleRemove = (e: React.MouseEvent, carId: number) => {
    e.stopPropagation(); // Stop the click from opening the modal
    const updated = likedCars.filter(car => car.id !== carId);
    setLikedCars(updated);
    // Update local storage with the *original* car data, not the one with fake details
    const originalCars = updated.map(({ engine, horsepower, torque, fuelEconomy, safetyRating, features, dealerNote, ...originalCar }) => originalCar);
    localStorage.setItem("likedCars", JSON.stringify(originalCars));
    toast.success("Removed from garage");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue p-4">
      <div className="max-w-6xl mx-auto pt-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/swipe")}
            className="text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Home className="h-8 w-8 text-white" />
              Garage
            </h1>
            <p className="text-white/70 mt-1">{likedCars.length} cars saved</p>
          </div>
        </div>

        {likedCars.length === 0 ? (
          <Card className="p-12 text-center">
            <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No cars in your garage yet</h2>
            <p className="text-muted-foreground mb-6">
              Start swiping to find your perfect car!
            </p>
            <Button onClick={() => navigate("/swipe")}>
              Start Swiping
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {likedCars.map((car) => (
              <Card
                key={car.id}
                className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                onClick={() => setSelectedCar(car)}
              >
                <div className="relative h-48">
                  <img
                    src={car.image}
                    alt={`${car.make} ${car.model}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full z-10"
                    onClick={(e) => handleRemove(e, car.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-1">
                    {car.year} {car.make} {car.model}
                  </h3>
                  <p className="text-2xl font-semibold text-automotive-blue mb-3">
                    ${car.price.toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{car.mileage.toLocaleString()} miles</span>
                    <span>•</span>
                    <span className="capitalize">{car.transmission}</span>
                    <span>•</span>
                    <span className="capitalize">{car.bodyType}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* --- Car Details Dialog --- */}
        <Dialog open={!!selectedCar} onOpenChange={(isOpen) => !isOpen && setSelectedCar(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[90svh] flex flex-col">
            {!selectedCar ? (
              <div>Loading...</div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedCar.year} {selectedCar.make} {selectedCar.model}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0"> {/* Wrapper for scroll area */}
                  <ScrollArea className="h-[70vh] w-full pr-4">
                    <div className="relative h-64 w-full mb-4">
                      <img
                        src={selectedCar.image}
                        alt={`${selectedCar.make} ${selectedCar.model}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                    <p className="text-3xl font-bold text-automotive-blue mb-4">
                      ${selectedCar.price.toLocaleString()}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-6">
                      <span>{selectedCar.mileage.toLocaleString()} miles</span>
                      <span>•</span>
                      <span className="capitalize">{selectedCar.transmission}</span>
                      <span>•</span>
                      <span className="capitalize">{selectedCar.bodyType}</span>
                    </div>

                    <h3 className="font-semibold text-lg mb-2">Specifications</h3>
                    <ul className="list-disc list-inside space-y-1 mb-4 p-4 bg-slate-50 rounded-md">
                      <li><strong>Engine:</strong> {selectedCar.engine}</li>
                      <li><strong>Horsepower:</strong> {selectedCar.horsepower} hp</li>
                      <li><strong>Torque:</strong> {selectedCar.torque} lb-ft</li>
                      <li><strong>Fuel Economy:</strong> {selectedCar.fuelEconomy}</li>
                      <li><strong>Safety Rating:</strong> {renderStars(selectedCar.safetyRating || 5)}</li>
                    </ul>

                    <h3 className="font-semibold text-lg mb-2">Key Features</h3>
                    <ul className="list-disc list-inside space-y-1 mb-4 p-4 bg-slate-50 rounded-md">
                      {selectedCar.features?.map(feature => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>

                    <h3 className="font-semibold text-lg mb-2">Dealer's Note</h3>
                    <p className="text-sm text-muted-foreground bg-slate-50 p-4 rounded-md">
                      {selectedCar.dealerNote}
                    </p>
                  </ScrollArea>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Liked;