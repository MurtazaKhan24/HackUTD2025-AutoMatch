import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Heart, X, ChevronLeft, Info, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { useSwipeable } from "react-swipeable";
import { CarDetails } from "@/types/car";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Carousel } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

// Constant for how far a user needs to drag before it counts as a swipe
const SWIPE_THRESHOLD = 100;

const CarCard = ({ 
  car, 
  style,
  isDragging,
  dragOffset,
  exitDirection 
}: { 
  car: CarDetails;
  style?: React.CSSProperties;
  isDragging: boolean;
  dragOffset: number;
  exitDirection: "left" | "right" | null;
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const dragStyle: React.CSSProperties = isDragging
    ? {
        transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
        transition: 'none'
      }
    : exitDirection
    ? {
        transform: `translateX(${exitDirection === "left" ? -1000 : 1000}px) rotate(${exitDirection === "left" ? -50 : 50}deg)`,
        transition: 'transform 0.3s ease'
      }
    : {
        transform: 'none',
        transition: 'transform 0.3s ease'
      };

  return (
    <Card className="w-[350px] h-[600px] absolute" style={{ ...style, ...dragStyle }}>
      <CardHeader className="relative p-0 h-[300px]">
        <Carousel className="w-full h-full">
          {(car.photos || [car.image]).map((photo, index) => (
            <div 
              key={index} 
              className="w-full h-full bg-cover bg-center rounded-t-lg"
              style={{ backgroundImage: `url(${photo})` }}
            />
          ))}
        </Carousel>
        <Badge 
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/60"
          variant="secondary"
        >
          ${car.price?.marketValue?.toLocaleString() ?? 'N/A'}
        </Badge>
      </CardHeader>
      <CardContent className="p-6">
        <CardTitle className="text-2xl mb-2">
          {car.year} {car.make} {car.model}
          {car.trim && <span className="text-lg ml-2 text-gray-500">{car.trim}</span>}
        </CardTitle>
        
        <div className="flex gap-2 mb-4">
          {car.specs?.mpg && (
            <Badge variant="outline">{car.specs.mpg} MPG</Badge>
          )}
          {car.specs?.transmission && (
            <Badge variant="outline">{car.specs.transmission}</Badge>
          )}
          {car.specs?.drivetrain && (
            <Badge variant="outline">{car.specs.drivetrain}</Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mb-4">
                <Info className="w-4 h-4 mr-2" />
                More Details
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{car.year} {car.make} {car.model} {car.trim}</DialogTitle>
                <DialogDescription>
                  <div className="mt-4 space-y-4">
                    {car.specs?.engine && (
                      <div>
                        <h4 className="font-semibold">Engine</h4>
                        <p>{car.specs.engine}</p>
                      </div>
                    )}
                    
                    {car.features?.length > 0 && (
                      <div>
                        <h4 className="font-semibold">Key Features</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {car.features.slice(0, 6).map((feature, i) => (
                            <Badge key={i} variant="secondary">{feature}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold flex items-center">
                          <ThumbsUp className="w-4 h-4 mr-2 text-green-500" />
                          Pros
                        </h4>
                        <ul className="list-disc list-inside mt-2">
                          {car.pros?.slice(0, 3).map((pro, i) => (
                            <li key={i} className="text-sm">{pro}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center">
                          <ThumbsDown className="w-4 h-4 mr-2 text-red-500" />
                          Cons
                        </h4>
                        <ul className="list-disc list-inside mt-2">
                          {car.cons?.slice(0, 3).map((con, i) => (
                            <li key={i} className="text-sm">{con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    {car.safety_rating && (
                      <div>
                        <h4 className="font-semibold flex items-center">
                          <Star className="w-4 h-4 mr-2 text-yellow-500" />
                          Safety Rating
                        </h4>
                        <div className="flex items-center mt-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-5 h-5",
                                i < car.safety_rating 
                                  ? "text-yellow-500 fill-yellow-500" 
                                  : "text-gray-300"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          {car.reviewLink && (
            <Button 
              variant="default" 
              size="sm" 
              className="mb-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => window.open(car.reviewLink, '_blank')}
            >
              <Star className="w-4 h-4 mr-2" />
              Agent Research
            </Button>
          )}
        </div>

        <p className="text-gray-600 line-clamp-3">
          {car.pros?.[0] || `${car.year} ${car.make} ${car.model} ${car.trim || ''}`}
        </p>
      </CardContent>
    </Card>
  );
};

const Swipe = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedCars, setLikedCars] = useState<CarDetails[]>([]);
  const [cars, setCars] = useState<CarDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMetadata, setSearchMetadata] = useState<{
    llm_reasoning?: string;
    attempts?: number;
    query?: string;
    search_strategy?: string;
  } | null>(null);
  
  // State to track the current drag position and status
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // This state is used for the final exit animation
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    const preferences = localStorage.getItem("carPreferences");
    if (!preferences) {
      toast.error("Please set your preferences first");
      navigate("/");
      return;
    }

    // Load initial suggestions
    const loadSuggestions = async () => {
      try {
        const response = await fetch('/api/search/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(JSON.parse(preferences))
        });

        if (!response.ok) throw new Error('Failed to load suggestions');
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        setCars(data.suggestions);
        setSearchMetadata({
          llm_reasoning: data.llm_reasoning,
          attempts: data.attempts,
          query: data.query,
          search_strategy: data.search_strategy
        });
        setLoading(false);
      } catch (error) {
        toast.error("Failed to load car suggestions");
        console.error(error);
      }
    };

    loadSuggestions();

    // Load liked cars from storage
    const stored = localStorage.getItem("likedCars");
    if (stored) {
      setLikedCars(JSON.parse(stored));
    }
  }, [navigate]);

  const completeSwipe = async (direction: "left" | "right") => {
    if (currentIndex >= cars.length) return;
    
    setExitDirection(direction);
    setDragOffset(0);
    
    const currentCar = cars[currentIndex];
    
    if (direction === "right") {
      const updatedLiked = [...likedCars, currentCar];
      setLikedCars(updatedLiked);
      localStorage.setItem("likedCars", JSON.stringify(updatedLiked));
      toast.success(`Added ${currentCar.make} ${currentCar.model} to favorites!`);
    }

    // Record the swipe interaction
    try {
      await fetch('/api/swipe', {
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
      setDragOffset(event.deltaX);
    },
    onSwiped: (event) => {
      setIsDragging(false);
      if (event.deltaX < -SWIPE_THRESHOLD) {
        completeSwipe("left");
      } else if (event.deltaX > SWIPE_THRESHOLD) {
        completeSwipe("right");
      } else {
        setDragOffset(0);
      }
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* AI Search Insights */}
      {searchMetadata && searchMetadata.llm_reasoning && (
        <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              AI Search Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Strategy:</span>
              <p className="text-gray-600 italic mt-1">{searchMetadata.llm_reasoning}</p>
            </div>
            <div className="flex gap-4 text-xs text-gray-500 mt-2">
              {searchMetadata.attempts && (
                <span>Attempts: {searchMetadata.attempts}</span>
              )}
              {searchMetadata.search_strategy && (
                <Badge variant="secondary" className="text-xs">
                  {searchMetadata.search_strategy}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col items-center justify-center relative mt-4">
        <div {...handlers} className="touch-none">
          {cars[currentIndex] && (
            <CarCard
              car={cars[currentIndex]}
              isDragging={isDragging}
              dragOffset={dragOffset}
              exitDirection={exitDirection}
            />
          )}
        </div>

        <div className="flex gap-4 mt-8">
          <Button
            size="lg"
            variant="outline"
            className="rounded-full p-6"
            onClick={() => completeSwipe("left")}
          >
            <X className="w-6 h-6 text-red-500" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full p-6"
            onClick={() => completeSwipe("right")}
          >
            <Heart className="w-6 h-6 text-green-500" />
          </Button>
        </div>
      </div>
    </div>
  );
};