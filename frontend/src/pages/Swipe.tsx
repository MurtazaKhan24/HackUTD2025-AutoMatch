import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useSwipeable } from "react-swipeable";
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
  engine: string;
  horsepower: number;
  torque: number;
  fuelEconomy: string;
  safetyRating: number;
  features: string[];
  dealerNote: string;
}

const mockCars: Car[] = [
  { 
    id: 1, make: "Tesla", model: "Model 3", year: 2023, price: 45000, image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800", mileage: 5000, transmission: "automatic", bodyType: "sedan",
    engine: "Dual Electric Motor", horsepower: 450, torque: 471, fuelEconomy: "131 MPGe", safetyRating: 5,
    features: ["Autopilot", "Panoramic Glass Roof", "15-inch Touchscreen", "Sentry Mode"],
    dealerNote: "Like new, owner upgrading to Model S. Clean title and zero emissions!"
  },
  { 
    id: 2, make: "BMW", model: "X5", year: 2022, price: 65000, image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800", mileage: 12000, transmission: "automatic", bodyType: "suv",
    engine: "3.0L 6-Cylinder Turbo", horsepower: 335, torque: 331, fuelEconomy: "25 MPG Hwy", safetyRating: 5,
    features: ["Heated Seats", "Apple CarPlay", "Lane Keep Assist", "Panoramic Sunroof"],
    dealerNote: "One-owner lease return. All maintenance records available. Excellent condition."
  },
  { 
    id: 3, make: "Ford", model: "Mustang", year: 2023, price: 55000, image: "https://images.unsplash.com/photo-1584345604476-8ec5f8d7c922?w=800", mileage: 3000, transmission: "manual", bodyType: "coupe",
    engine: "5.0L V8", horsepower: 450, torque: 410, fuelEconomy: "24 MPG Hwy", safetyRating: 5,
    features: ["B&O Sound System", "Digital Instrument Cluster", "MagnaRide Damping", "Active Valve Exhaust"],
    dealerNote: "Barely driven! This GT Premium is a thrill to drive. Owner moving out of country."
  },
  { 
    id: 4, make: "Mercedes", model: "C-Class", year: 2022, price: 48000, image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800", mileage: 8000, transmission: "automatic", bodyType: "sedan",
    engine: "2.0L 4-Cylinder Turbo", horsepower: 255, torque: 295, fuelEconomy: "31 MPG Hwy", safetyRating: 5,
    features: ["MBUX Infotainment", "Burmester Surround Sound", "Heated Seats", "Blind Spot Assist"],
    dealerNote: "Certified Pre-Owned. Comes with an additional 1-year unlimited mileage warranty."
  },
  { 
    id: 5, make: "Porsche", model: "911", year: 2023, price: 120000, image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800", mileage: 2000, transmission: "automatic", bodyType: "coupe",
    engine: "3.0L 6-Cylinder Twin-Turbo", horsepower: 379, torque: 331, fuelEconomy: "23 MPG Hwy", safetyRating: 4,
    features: ["PASM", "Sport Chrono Package", "Leather Interior", "Bose Surround Sound"],
    dealerNote: "A true icon. This Carrera is in pristine condition. No track days. Serious inquiries only."
  },
];

// Constant for how far a user needs to drag before it counts as a swipe
const SWIPE_THRESHOLD = 100;
// We no longer need TAP_THRESHOLD, the library's `onTap` handles it

const Swipe = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedCars, setLikedCars] = useState<Car[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    const preferences = localStorage.getItem("carPreferences");
    if (!preferences) {
      toast.error("Please set your preferences first");
      navigate("/");
    }

    const stored = localStorage.getItem("likedCars");
    if (stored) {
      setLikedCars(JSON.parse(stored));
    }
  }, [navigate]);

  const completeSwipe = (direction: "left" | "right") => {
    setExitDirection(direction);
    setDragOffset(0); 
    
    if (direction === "right") {
      const currentCar = mockCars[currentIndex];
      const updatedLiked = [...likedCars, currentCar];
      setLikedCars(updatedLiked);
      localStorage.setItem("likedCars", JSON.stringify(updatedLiked));
      toast.success(`Added ${currentCar.make} ${currentCar.model} to favorites!`);
    }

    setTimeout(() => {
      setExitDirection(null);
      if (currentIndex < mockCars.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast.success("You've seen all available cars!");
        navigate("/liked");
      }
    }, 300);
  };

  const handlers = useSwipeable({
    onSwipeStart: () => {
      setIsDragging(true);
    },
    onSwiping: (event) => {
      if (isModalOpen) return;
      setDragOffset(event.deltaX);
    },
    onSwiped: (event) => {
      setIsDragging(false);
      if (isModalOpen) return;

      // This function now ONLY handles SWIPES
      if (event.deltaX < -SWIPE_THRESHOLD) {
        completeSwipe("left");
      } else if (event.deltaX > SWIPE_THRESHOLD) {
        completeSwipe("right");
      } else {
        // Swipe was not far enough, snap back
        setDragOffset(0);
      }
    },
    // --- THIS IS THE FIX ---
    // This handler fires for taps (movement less than 'delta' prop, default 10px)
    onTap: () => {
      // Only open the modal if we weren't dragging
      if (!isDragging) {
        setIsModalOpen(true);
      }
      // Reset states just in case
      setIsDragging(false);
      setDragOffset(0);
    },
    // --- END FIX ---
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  const currentCar = mockCars[currentIndex];
  const rotation = isDragging ? dragOffset / 20 : 0;
  
  const renderStars = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue p-4 overflow-hidden">
      <div className="max-w-lg mx-auto pt-8">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold text-white">AutoMatch</h1>
          <Button
            variant="ghost"
            onClick={() => navigate("/liked")}
            className="text-white hover:bg-white/10"
          >
            Garage ({likedCars.length})
          </Button>
        </div>

        <div className="relative h-[500px] flex items-center justify-center">
          {/* Next card (visible underneath) */}
          {currentIndex < mockCars.length - 1 && (
            <Card className="absolute w-full max-w-md mx-auto overflow-hidden shadow-elevated scale-95 opacity-50 -z-10">
               <div className="relative h-96 bg-gray-800">
                  {/* Placeholder for next card to give depth */}
               </div>
            </Card>
          )}

          {/* Current active card */}
          {currentCar && (
            <div
              {...handlers}
              className={`absolute w-full max-w-md mx-auto cursor-grab active:cursor-grabbing z-10 ${
                isDragging ? "" : "transition-all duration-300 ease-out"
              } ${
                exitDirection === "left"
                  ? "-translate-x-[150%] -rotate-12 opacity-0"
                  : exitDirection === "right"
                  ? "translate-x-[150%] rotate-12 opacity-0"
                  : ""
              }`}
              style={{
                transform: isDragging && !exitDirection
                  ? `translateX(${dragOffset}px) rotate(${rotation}deg)`
                  : undefined,
              }}
            >
              <Card className="overflow-hidden shadow-elevated">
                <div className="relative h-96 pointer-events-none select-none">
                  <img
                    src={currentCar.image}
                    alt={`${currentCar.make} ${currentCar.model}`}
                    className="w-full h-full object-cover"
                    draggable="false"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h2 className="text-3xl font-bold mb-2">
                      {currentCar.year} {currentCar.make} {currentCar.model}
                    </h2>
                    <p className="text-2xl font-semibold mb-2">
                      ${currentCar.price.toLocaleString()}
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span>{currentCar.mileage.toLocaleString()} miles</span>
                      <span>•</span>
                      <span className="capitalize">{currentCar.transmission}</span>
                      <span>•</span>
                      <span className="capitalize">{currentCar.bodyType}</span>
                    </div>
                  </div>

                  {/* Visual cues for Like/Nope while dragging */}
                  {isDragging && (
                    <>
                      <div 
                        className={`absolute top-4 right-4 border-4 border-automotive-deny text-automotive-deny rounded px-4 py-2 font-bold text-2xl transform rotate-12 transition-opacity duration-200 ${
                          dragOffset < -50 ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        NOPE
                      </div>
                      <div 
                        className={`absolute top-4 left-4 border-4 border-automotive-success text-automotive-success rounded px-4 py-2 font-bold text-2xl transform -rotate-12 transition-opacity duration-200 ${
                          dragOffset > 50 ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        LIKE
                      </div>
                    </>
                  )}

                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-6 mt-8">
          <Button
            size="lg"
            variant="destructive"
            className="h-16 w-16 rounded-full shadow-lg z-20"
            onClick={() => completeSwipe("left")}
            disabled={isDragging || !!exitDirection || isModalOpen}
          >
            <X className="h-8 w-8" />
          </Button>
          <Button
            size="lg"
            className="h-16 w-16 rounded-full shadow-lg bg-automotive-success hover:bg-automotive-success/90 z-20"
            onClick={() => completeSwipe("right")}
            disabled={isDragging || !!exitDirection || isModalOpen}
          >
            <Heart className="h-8 w-8" />
          </Button>
        </div>

        <p className="text-center text-white/70 mt-6">
          {mockCars.length - currentIndex} cars remaining
        </p>
      </div>

      {/* --- Car Details Dialog --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90svh] flex flex-col">
          {!currentCar ? (
            <div>Loading...</div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{currentCar.year} {currentCar.make} {currentCar.model}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0"> {/* Wrapper for scroll area */}
                <ScrollArea className="h-[70vh] w-full pr-4">
                  <div className="relative h-64 w-full mb-4">
                    <img
                      src={currentCar.image}
                      alt={`${currentCar.make} ${currentCar.model}`}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                  <p className="text-3xl font-bold text-automotive-blue mb-4">
                    ${currentCar.price.toLocaleString()}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-6">
                    <span>{currentCar.mileage.toLocaleString()} miles</span>
                    <span>•</span>
                    <span className="capitalize">{currentCar.transmission}</span>
                    <span>•</span>
                    <span className="capitalize">{currentCar.bodyType}</span>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">Specifications</h3>
                  <ul className="list-disc list-inside space-y-1 mb-4 p-4 bg-slate-50 rounded-md">
                    <li><strong>Engine:</strong> {currentCar.engine}</li>
                    <li><strong>Horsepower:</strong> {currentCar.horsepower} hp</li>
                    <li><strong>Torque:</strong> {currentCar.torque} lb-ft</li>
                    <li><strong>Fuel Economy:</strong> {currentCar.fuelEconomy}</li>
                    <li><strong>Safety Rating:</strong> {renderStars(currentCar.safetyRating || 5)}</li>
                  </ul>

                  <h3 className="font-semibold text-lg mb-2">Key Features</h3>
                  <ul className="list-disc list-inside space-y-1 mb-4 p-4 bg-slate-50 rounded-md">
                    {currentCar.features?.map(feature => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>

                  <h3 className="font-semibold text-lg mb-2">Dealer's Note</h3>
                  <p className="text-sm text-muted-foreground bg-slate-50 p-4 rounded-md">
                    {currentCar.dealerNote}
                  </p>
                </ScrollArea>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Swipe;