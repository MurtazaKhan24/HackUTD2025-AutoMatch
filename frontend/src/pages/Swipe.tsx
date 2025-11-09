import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, X, ChevronLeft, ExternalLink, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useSwipeable } from "react-swipeable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchVehicleListingByVIN, searchVehicleListings, VehicleListingDetails } from "@/lib/autodev-api";

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
  vin?: string;
  listingDetails?: VehicleListingDetails;
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
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingListingDetails, setLoadingListingDetails] = useState(false);
  const [listingDetails, setListingDetails] = useState<VehicleListingDetails | null>(null);

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
      if (isModalOpen) return;
      // Directly map the drag distance to the card's position
      setDragOffset(event.deltaX);
    },
    onSwiped: (event) => {
      setIsDragging(false);
      if (isModalOpen) return;
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
    onTap: () => {
      // Open modal on tap
      if (!isDragging) {
        handleOpenModal();
      }
      setIsDragging(false);
      setDragOffset(0);
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  const handleOpenModal = async () => {
    setIsModalOpen(true);
    
    // Check if we already have listing details cached
    if (currentCar.listingDetails) {
      setListingDetails(currentCar.listingDetails);
      return;
    }
    
    // Try to fetch listing details from Auto.dev
    setLoadingListingDetails(true);
    try {
      let details: VehicleListingDetails | null = null;
      
      // First try by VIN if available
      if (currentCar.vin) {
        details = await fetchVehicleListingByVIN(currentCar.vin);
      }
      
      // If no VIN or VIN lookup failed, try searching by year/make/model
      if (!details) {
        const financePrefs = localStorage.getItem("financePreferences");
        let zipcode = "75080"; // Default zipcode
        if (financePrefs) {
          try {
            const prefs = JSON.parse(financePrefs);
            zipcode = prefs.zipcode || zipcode;
          } catch (e) {
            console.error("Failed to parse finance preferences");
          }
        }
        
        const listings = await searchVehicleListings(
          Number(currentCar.year),
          currentCar.make,
          currentCar.model,
          zipcode,
          50
        );
        
        if (listings && listings.length > 0) {
          details = listings[0]; // Use the first match
        }
      }
      
      if (details) {
        setListingDetails(details);
        // Cache it in the car object
        currentCar.listingDetails = details;
      }
    } catch (error) {
      console.error("Error fetching listing details:", error);
    } finally {
      setLoadingListingDetails(false);
    }
  };

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
                    <div className="flex items-center gap-2 mt-3 text-sm bg-black/30 rounded-full px-3 py-1 w-fit">
                      <Info className="h-4 w-4" />
                      <span>Tap for details</span>
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

      {/* Car Details Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          {!currentCar ? (
            <div>Loading...</div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {currentCar.year} {currentCar.make} {currentCar.model}
                  {currentCar.trim && <span className="text-lg ml-2 text-muted-foreground">{currentCar.trim}</span>}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-[70vh] w-full pr-4">
                  {/* Image Gallery */}
                  <div className="relative h-64 w-full mb-4 rounded-lg overflow-hidden">
                    <img
                      src={listingDetails?.images?.[0] || carImage}
                      alt={`${currentCar.make} ${currentCar.model}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Price */}
                  <p className="text-3xl font-bold text-automotive-blue mb-4">
                    ${listingDetails?.price?.toLocaleString() || currentCar.price?.marketValue?.toLocaleString() || 'Contact for price'}
                  </p>

                  {loadingListingDetails && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-automotive-blue" />
                      <span className="ml-2 text-muted-foreground">Loading detailed information...</span>
                    </div>
                  )}

                  {!loadingListingDetails && (
                    <>
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                        <div className="bg-slate-50 p-3 rounded-md">
                          <p className="text-muted-foreground text-xs mb-1">Mileage</p>
                          <p className="font-semibold">{listingDetails?.mileage?.toLocaleString() || 'N/A'} miles</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-md">
                          <p className="text-muted-foreground text-xs mb-1">Transmission</p>
                          <p className="font-semibold capitalize">{listingDetails?.transmission || currentCar.specs?.transmission || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-md">
                          <p className="text-muted-foreground text-xs mb-1">Drivetrain</p>
                          <p className="font-semibold capitalize">{listingDetails?.drivetrain || currentCar.specs?.drivetrain || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-md">
                          <p className="text-muted-foreground text-xs mb-1">Fuel Type</p>
                          <p className="font-semibold capitalize">{listingDetails?.fuelType || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Engine & Performance */}
                      {(listingDetails?.engine || listingDetails?.horsepower || listingDetails?.torque) && (
                        <>
                          <h3 className="font-semibold text-lg mb-2 flex items-center">
                            <span className="mr-2">⚙️</span> Engine & Performance
                          </h3>
                          <ul className="list-disc list-inside space-y-1 mb-4 p-4 bg-slate-50 rounded-md">
                            {listingDetails.engine && <li><strong>Engine:</strong> {listingDetails.engine}</li>}
                            {listingDetails.horsepower && <li><strong>Horsepower:</strong> {listingDetails.horsepower} hp</li>}
                            {listingDetails.torque && <li><strong>Torque:</strong> {listingDetails.torque} lb-ft</li>}
                            {(listingDetails.mpgCity || listingDetails.mpgHighway) && (
                              <li>
                                <strong>Fuel Economy:</strong> {listingDetails.mpgCity || 'N/A'} city / {listingDetails.mpgHighway || 'N/A'} hwy MPG
                              </li>
                            )}
                          </ul>
                        </>
                      )}

                      {/* Colors */}
                      {(listingDetails?.exteriorColor || listingDetails?.interiorColor) && (
                        <>
                          <h3 className="font-semibold text-lg mb-2 flex items-center">
                            <span className="mr-2">🎨</span> Colors
                          </h3>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {listingDetails.exteriorColor && (
                              <div className="bg-slate-50 p-3 rounded-md">
                                <p className="text-muted-foreground text-xs mb-1">Exterior</p>
                                <p className="font-semibold capitalize">{listingDetails.exteriorColor}</p>
                              </div>
                            )}
                            {listingDetails.interiorColor && (
                              <div className="bg-slate-50 p-3 rounded-md">
                                <p className="text-muted-foreground text-xs mb-1">Interior</p>
                                <p className="font-semibold capitalize">{listingDetails.interiorColor}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Features */}
                      {(listingDetails?.features && listingDetails.features.length > 0) || (currentCar.features && currentCar.features.length > 0) && (
                        <>
                          <h3 className="font-semibold text-lg mb-2 flex items-center">
                            <span className="mr-2">✨</span> Key Features
                          </h3>
                          <ul className="list-disc list-inside space-y-1 mb-4 p-4 bg-slate-50 rounded-md">
                            {(listingDetails?.features || currentCar.features || []).map((feature, idx) => (
                              <li key={idx}>{feature}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {/* Description */}
                      {listingDetails?.description && (
                        <>
                          <h3 className="font-semibold text-lg mb-2 flex items-center">
                            <span className="mr-2">📝</span> Description
                          </h3>
                          <p className="text-sm text-muted-foreground bg-slate-50 p-4 rounded-md mb-4">
                            {listingDetails.description}
                          </p>
                        </>
                      )}

                      {/* Dealer Info */}
                      {listingDetails?.dealerName && (
                        <>
                          <h3 className="font-semibold text-lg mb-2 flex items-center">
                            <span className="mr-2">🏪</span> Dealer Information
                          </h3>
                          <div className="bg-slate-50 p-4 rounded-md mb-4">
                            <p className="font-semibold mb-1">{listingDetails.dealerName}</p>
                            {listingDetails.dealerAddress && (
                              <p className="text-sm text-muted-foreground mb-1">{listingDetails.dealerAddress}</p>
                            )}
                            {listingDetails.cityState && (
                              <p className="text-sm text-muted-foreground mb-1">{listingDetails.cityState}</p>
                            )}
                            {listingDetails.dealerPhone && (
                              <p className="text-sm text-muted-foreground">
                                📞 {listingDetails.dealerPhone}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {/* View Full Listing Button */}
                      {(listingDetails?.listingUrl || currentCar.url) && (
                        <Button
                          className="w-full mb-4"
                          onClick={() => window.open(listingDetails?.listingUrl || currentCar.url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Full Listing
                        </Button>
                      )}

                      {/* Swipe Actions in Modal */}
                      <div className="flex gap-3">
                        <Button
                          size="lg"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setIsModalOpen(false);
                            setTimeout(() => completeSwipe("left"), 100);
                          }}
                        >
                          <X className="h-5 w-5 mr-2" />
                          Pass
                        </Button>
                        <Button
                          size="lg"
                          className="flex-1 bg-automotive-success hover:bg-automotive-success/90"
                          onClick={() => {
                            setIsModalOpen(false);
                            setTimeout(() => completeSwipe("right"), 100);
                          }}
                        >
                          <Heart className="h-5 w-5 mr-2" />
                          Like
                        </Button>
                      </div>
                    </>
                  )}
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