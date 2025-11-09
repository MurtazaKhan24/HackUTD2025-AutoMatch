import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

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
}

const mockCars: Car[] = [
  { id: 1, make: "Tesla", model: "Model 3", year: 2023, price: 45000, image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800", mileage: 5000, transmission: "automatic", bodyType: "sedan" },
  { id: 2, make: "BMW", model: "X5", year: 2022, price: 65000, image: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800", mileage: 12000, transmission: "automatic", bodyType: "suv" },
  { id: 3, make: "Ford", model: "Mustang", year: 2023, price: 55000, image: "https://images.unsplash.com/photo-1584345604476-8ec5f8d7c922?w=800", mileage: 3000, transmission: "manual", bodyType: "coupe" },
  { id: 4, make: "Mercedes", model: "C-Class", year: 2022, price: 48000, image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800", mileage: 8000, transmission: "automatic", bodyType: "sedan" },
  { id: 5, make: "Porsche", model: "911", year: 2023, price: 120000, image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800", mileage: 2000, transmission: "automatic", bodyType: "coupe" },
];

const Swipe = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedCars, setLikedCars] = useState<Car[]>([]);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

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

  const handleSwipe = (direction: "left" | "right") => {
    setSwipeDirection(direction);
    
    if (direction === "right") {
      const currentCar = mockCars[currentIndex];
      const updatedLiked = [...likedCars, currentCar];
      setLikedCars(updatedLiked);
      localStorage.setItem("likedCars", JSON.stringify(updatedLiked));
      toast.success(`Added ${currentCar.make} ${currentCar.model} to favorites!`);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < mockCars.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast.success("You've seen all available cars!");
        navigate("/liked");
      }
    }, 300);
  };

  const currentCar = mockCars[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue p-4">
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

        <div className="relative">
          <Card 
            className={`overflow-hidden shadow-elevated transition-all duration-300 ${
              swipeDirection === "left" 
                ? "-translate-x-full opacity-0" 
                : swipeDirection === "right"
                ? "translate-x-full opacity-0"
                : "translate-x-0 opacity-100"
            }`}
          >
            <div className="relative h-96">
              <img
                src={currentCar.image}
                alt={`${currentCar.make} ${currentCar.model}`}
                className="w-full h-full object-cover"
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
            </div>
          </Card>

          <div className="flex justify-center gap-6 mt-8">
            <Button
              size="lg"
              variant="destructive"
              className="h-16 w-16 rounded-full shadow-lg"
              onClick={() => handleSwipe("left")}
            >
              <X className="h-8 w-8" />
            </Button>
            <Button
              size="lg"
              className="h-16 w-16 rounded-full shadow-lg bg-automotive-success hover:bg-automotive-success/90"
              onClick={() => handleSwipe("right")}
            >
              <Heart className="h-8 w-8" />
            </Button>
          </div>

          <p className="text-center text-white/70 mt-6">
            {mockCars.length - currentIndex} cars remaining
          </p>
        </div>
      </div>
    </div>
  );
};

export default Swipe;
