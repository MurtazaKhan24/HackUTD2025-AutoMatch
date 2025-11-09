import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Heart, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

// Use the same interface as Swipe page
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
  reviewLink?: string;
}

const Liked = () => {
  const navigate = useNavigate();
  const [likedCars, setLikedCars] = useState<Car[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("likedCars");
    if (stored) {
      try {
        setLikedCars(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse liked cars:", error);
        setLikedCars([]);
      }
    }
  }, []);

  const handleRemove = (index: number) => {
    const updated = likedCars.filter((_, i) => i !== index);
    setLikedCars(updated);
    localStorage.setItem("likedCars", JSON.stringify(updated));
    toast.success("Removed from favorites");
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
            {likedCars.map((car, index) => (
              <Card key={index} className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow">
                <div className="relative h-48">
                  <img
                    src={car.photos?.[0] || '/placeholder.svg'}
                    alt={`${car.make} ${car.model}`}
                    className="w-full h-full object-cover"
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
                    {car.year} {car.make} {car.model}
                    {car.trim && <span className="text-base ml-2 text-gray-500">{car.trim}</span>}
                  </h3>
                  <p className="text-2xl font-semibold text-automotive-blue mb-3">
                    ${car.price?.marketValue?.toLocaleString() || 'Contact for price'}
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
                    {car.specs?.transmission && (
                      <>
                        <span className="capitalize">{car.specs.transmission}</span>
                        <span>•</span>
                      </>
                    )}
                    {car.specs?.mpg && (
                      <>
                        <span>{car.specs.mpg} MPG</span>
                        <span>•</span>
                      </>
                    )}
                    {car.specs?.drivetrain && (
                      <span className="capitalize">{car.specs.drivetrain}</span>
                    )}
                  </div>
                  {car.reviewLink && (
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      onClick={() => window.open(car.reviewLink, '_blank')}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Agent Research
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Liked;
