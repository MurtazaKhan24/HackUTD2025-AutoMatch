import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Heart, Trash2, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";

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

const Liked = () => {
  const navigate = useNavigate();
  const [likedCars, setLikedCars] = useState<Car[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("likedCars");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure we have an array
        if (Array.isArray(parsed)) {
          setLikedCars(parsed);
        } else {
          console.warn("Liked cars data is not an array, resetting...");
          localStorage.removeItem("likedCars");
          setLikedCars([]);
        }
      } catch (error) {
        console.error("Failed to parse liked cars:", error);
        localStorage.removeItem("likedCars");
        setLikedCars([]);
        toast.error("Failed to load liked cars. Starting fresh.");
      }
    }
  }, []);

  const handleRemove = (carIndex: number) => {
    const updated = likedCars.filter((_, index) => index !== carIndex);
    setLikedCars(updated);
    localStorage.setItem("likedCars", JSON.stringify(updated));
    toast.success("Removed from favorites");
  };

  const handleResetSwipes = () => {
    // Clear the swiped cars history so user can see all cars again
    localStorage.removeItem("swipedCars");
    toast.success("Swipe history reset! You can now see all cars again.");
    navigate("/swipe");
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
              <Heart className="h-8 w-8 fill-automotive-success text-automotive-success" />
              Liked Cars
            </h1>
            <p className="text-white/70 mt-1">{likedCars.length} cars saved</p>
          </div>
          <Button
            variant="outline"
            onClick={handleResetSwipes}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            See All Cars Again
          </Button>
        </div>

        {likedCars.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No liked cars yet</h2>
            <p className="text-muted-foreground mb-6">
              Start swiping to find your perfect car!
            </p>
            <Button onClick={() => navigate("/swipe")}>
              Start Swiping!
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {likedCars.map((car, index) => {
              const displayPrice = car.price?.marketValue || 0;
              const displayImage = car.photos?.[0] || "/placeholder.svg";
              const displayTransmission = car.specs?.transmission || "Unknown";
              const displayYear = typeof car.year === 'string' ? parseInt(car.year) : car.year;
              
              return (
                <Card key={index} className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow">
                  <div className="relative h-48">
                    <img
                      src={displayImage}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={() => handleRemove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl font-bold mb-1">
                      {displayYear} {car.make} {car.model}
                      {car.trim && <span className="text-sm font-normal text-muted-foreground"> {car.trim}</span>}
                    </h3>
                    <p className="text-2xl font-semibold text-automotive-blue mb-3">
                      ${displayPrice.toLocaleString()}
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
                      {car.specs?.mpg && (
                        <>
                          <span>{car.specs.mpg} MPG</span>
                          <span>•</span>
                        </>
                      )}
                      {car.specs?.horsepower && (
                        <>
                          <span>{car.specs.horsepower} HP</span>
                          <span>•</span>
                        </>
                      )}
                      <span className="capitalize">{displayTransmission}</span>
                    </div>
                    {car.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(car.url, '_blank')}
                      >
                        Agent Research
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Liked;
