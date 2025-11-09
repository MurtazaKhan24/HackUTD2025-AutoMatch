import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useSwipeable } from "react-swipeable";

interface Car {
  make: string;
  model: string;
  year: string | number;
  price?: {
    marketValue?: number;
  };
  photos?: string[];
  url?: string;
  source?: string;
  specs?: {
    mpg?: string;
    horsepower?: number;
    transmission?: string;
    drivetrain?: string;
    engine?: string;
  };
  trim?: string;
  features?: string[];
  pros?: string[];
  cons?: string[];
  safety_rating?: number;
  weight?: number;
}

// Constant for how far a user needs to drag before it counts as a swipe
const SWIPE_THRESHOLD = 100;

const Swipe = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedCars, setLikedCars] = useState<Car[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to track the current drag position and status
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // This state is used for the final exit animation
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    // Load car suggestions from localStorage (already fetched in PhysicalPreferences)
    const suggestions = localStorage.getItem("carSuggestions");
    if (!suggestions) {
      toast.error("No car suggestions found. Please set your preferences first.");
      navigate("/");
      return;
    }

    try {
      const parsedSuggestions = JSON.parse(suggestions);
      setCars(parsedSuggestions);
    } catch (error) {
      console.error("Failed to parse car suggestions:", error);
      toast.error("Failed to load car suggestions. Please try again.");
      navigate("/");
    } finally {
      setLoading(false);
    }

    // Load liked cars from storage
    const stored = localStorage.getItem("likedCars");
    if (stored) {
      setLikedCars(JSON.parse(stored));
    }
  }, [navigate]);

  const completeSwipe = async (direction: "left" | "right") => {
    if (currentIndex >= cars.length) return;
    
    setExitDirection(direction);
    setDragOffset(0); // Reset drag offset so the exit animation takes over
    
    const currentCar = cars[currentIndex];
    
    if (direction === "right") {
      const updatedLiked = [...likedCars, currentCar];
      setLikedCars(updatedLiked);
      localStorage.setItem("likedCars", JSON.stringify(updatedLiked));
      toast.success(`Added ${currentCar.make} ${currentCar.model} to favorites!`);
    }

    // Record the swipe interaction with backend
    try {
      await fetch('http://localhost:5001/api/swipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          car: currentCar,
          liked: direction === "right"
        })
      });
    } catch (error) {
      console.error("Failed to record swipe:", error);
    }

    // Wait for animation to finish before showing next card
    setTimeout(() => {
      setExitDirection(null);
      if (currentIndex < cars.length - 1) {
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
      // Directly map the drag distance to the card's position
      setDragOffset(event.deltaX);
    },
    onSwiped: (event) => {
      setIsDragging(false);
      // Check if the drag distance crossed our threshold
      if (event.deltaX < -SWIPE_THRESHOLD) {
        completeSwipe("left");
      } else if (event.deltaX > SWIPE_THRESHOLD) {
        completeSwipe("right");
      } else {
        // If not, it will snap back because isDragging is now false,
        // and dragOffset will be reset to 0 below.
        setDragOffset(0);
      }
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Finding perfect cars for you...</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (cars.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Cars Found</h2>
          <p className="text-gray-300 mb-6">We couldn't find any cars matching your preferences</p>
          <Button onClick={() => navigate("/")} className="bg-white text-automotive-navy hover:bg-gray-100">
            Update Preferences
          </Button>
        </div>
      </div>
    );
  }

  const currentCar = cars[currentIndex];
  
  // Get display image - use photos array if available, otherwise fallback to placeholder
  const carImage = currentCar.photos && currentCar.photos.length > 0 
    ? currentCar.photos[0] 
    : `https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800`;

  // Calculate rotation based on drag distance (e.g., 15 degrees max tilt)
  const rotation = isDragging ? dragOffset / 20 : 0;

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
          <h1 className="text-2xl font-bold text-white">AutoSwipe</h1>
          <Button
            variant="ghost"
            onClick={() => navigate("/liked")}
            className="text-white hover:bg-white/10"
          >
            Liked ({likedCars.length})
          </Button>
        </div>

        <div className="relative h-[500px] flex items-center justify-center">
          {/* Next card (visible underneath) */}
          {currentIndex < cars.length - 1 && (
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
                // Only apply transition when we are NOT dragging (for smooth snap-back or exit)
                isDragging ? "" : "transition-all duration-300 ease-out"
              } ${
                // Apply exit classes if a swipe was completed
                exitDirection === "left"
                  ? "-translate-x-[150%] -rotate-12 opacity-0"
                  : exitDirection === "right"
                  ? "translate-x-[150%] rotate-12 opacity-0"
                  : ""
              }`}
              style={{
                // If we are dragging, use inline styles for responsive, real-time movement
                // If we aren't dragging and there's no exit direction, it means it snapped back (translate 0)
                transform: isDragging && !exitDirection
                  ? `translateX(${dragOffset}px) rotate(${rotation}deg)`
                  : undefined,
              }}
            >
              <Card className="overflow-hidden shadow-elevated">
                <div className="relative h-96 pointer-events-none select-none">
                  <img
                    src={carImage}
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
                      ${currentCar.price?.marketValue?.toLocaleString() || 'Contact for price'}
                    </p>
                    <div className="flex gap-4 text-sm">
                      {currentCar.specs?.transmission && (
                        <>
                          <span className="capitalize">{currentCar.specs.transmission}</span>
                          {currentCar.trim && <span>•</span>}
                        </>
                      )}
                      {currentCar.trim && (
                        <span className="capitalize">{currentCar.trim}</span>
                      )}
                    </div>
                  </div>

                  {/* Optional: visual cues for Like/Nope while dragging */}
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
            disabled={isDragging || !!exitDirection}
          >
            <X className="h-8 w-8" />
          </Button>
          <Button
            size="lg"
            className="h-16 w-16 rounded-full shadow-lg bg-automotive-success hover:bg-automotive-success/90 z-20"
            onClick={() => completeSwipe("right")}
            disabled={isDragging || !!exitDirection}
          >
            <Heart className="h-8 w-8" />
          </Button>
        </div>

        <p className="text-center text-white/70 mt-6">
          {cars.length - currentIndex} cars remaining
        </p>
      </div>
    </div>
  );
};

export default Swipe;