import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Heart, Trash2, Star, ExternalLink, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchVehicleListingByVIN, searchVehicleListings, VehicleListingDetails } from "@/lib/autodev-api";

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
  vin?: string;
  listingDetails?: VehicleListingDetails;
}

const Liked = () => {
  const navigate = useNavigate();
  const [likedCars, setLikedCars] = useState<Car[]>([]);
  
  // Modal states
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingListingDetails, setLoadingListingDetails] = useState(false);
  const [listingDetails, setListingDetails] = useState<VehicleListingDetails | null>(null);

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

  const handleOpenModal = async (car: Car) => {
    setSelectedCar(car);
    setIsModalOpen(true);
    setListingDetails(null);
    
    // Check if we already have listing details cached
    if (car.listingDetails) {
      setListingDetails(car.listingDetails);
      return;
    }
    
    // Try to fetch listing details from Auto.dev
    setLoadingListingDetails(true);
    try {
      let details: VehicleListingDetails | null = null;
      
      // First try by VIN if available
      if (car.vin) {
        details = await fetchVehicleListingByVIN(car.vin);
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
          Number(car.year),
          car.make,
          car.model,
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
        car.listingDetails = details;
        // Update localStorage
        const updatedCars = likedCars.map(c => 
          c.make === car.make && c.model === car.model && c.year === car.year ? car : c
        );
        localStorage.setItem("likedCars", JSON.stringify(updatedCars));
      }
    } catch (error) {
      console.error("Error fetching listing details:", error);
    } finally {
      setLoadingListingDetails(false);
    }
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
              <Card 
                key={index} 
                className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
                onClick={() => handleOpenModal(car)}
              >
                <div className="relative h-48">
                  <img
                    src={car.photos?.[0] || '/placeholder.svg'}
                    alt={`${car.make} ${car.model}`}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
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
                        {car.specs?.drivetrain && <span>•</span>}
                      </>
                    )}
                    {car.specs?.drivetrain && (
                      <span className="capitalize">{car.specs.drivetrain}</span>
                    )}
                  </div>
                  {car.reviewLink && (
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 mb-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(car.reviewLink, '_blank');
                      }}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Agent Research
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full border-automotive-success text-automotive-success hover:bg-automotive-success hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/purchase', { state: { car } });
                    }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Start Purchase Process
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Car Details Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          {!selectedCar ? (
            <div>Loading...</div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedCar.year} {selectedCar.make} {selectedCar.model}
                  {selectedCar.trim && <span className="text-lg ml-2 text-muted-foreground">{selectedCar.trim}</span>}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-[70vh] w-full pr-4">
                  {/* Image Gallery */}
                  <div className="relative h-64 w-full mb-4 rounded-lg overflow-hidden">
                    <img
                      src={listingDetails?.images?.[0] || selectedCar.photos?.[0] || '/placeholder.svg'}
                      alt={`${selectedCar.make} ${selectedCar.model}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Price */}
                  <p className="text-3xl font-bold text-automotive-blue mb-4">
                    ${listingDetails?.price?.toLocaleString() || selectedCar.price?.marketValue?.toLocaleString() || 'Contact for price'}
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
                          <p className="font-semibold capitalize">{listingDetails?.transmission || selectedCar.specs?.transmission || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-md">
                          <p className="text-muted-foreground text-xs mb-1">Drivetrain</p>
                          <p className="font-semibold capitalize">{listingDetails?.drivetrain || selectedCar.specs?.drivetrain || 'N/A'}</p>
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
                      {(listingDetails?.features && listingDetails.features.length > 0) || (selectedCar.features && selectedCar.features.length > 0) && (
                        <>
                          <h3 className="font-semibold text-lg mb-2 flex items-center">
                            <span className="mr-2">✨</span> Key Features
                          </h3>
                          <ul className="list-disc list-inside space-y-1 mb-4 p-4 bg-slate-50 rounded-md">
                            {(listingDetails?.features || selectedCar.features || []).map((feature, idx) => (
                              <li key={idx}>{feature}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {/* Pros & Cons from Agent Research */}
                      {(selectedCar.pros && selectedCar.pros.length > 0) && (
                        <>
                          <h3 className="font-semibold text-lg mb-2 flex items-center text-green-700">
                            <span className="mr-2">✅</span> Pros
                          </h3>
                          <ul className="list-disc list-inside space-y-1 mb-4 p-4 bg-green-50 rounded-md">
                            {selectedCar.pros.map((pro, idx) => (
                              <li key={idx} className="text-green-800">{pro}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {(selectedCar.cons && selectedCar.cons.length > 0) && (
                        <>
                          <h3 className="font-semibold text-lg mb-2 flex items-center text-red-700">
                            <span className="mr-2">⚠️</span> Cons
                          </h3>
                          <ul className="list-disc list-inside space-y-1 mb-4 p-4 bg-red-50 rounded-md">
                            {selectedCar.cons.map((con, idx) => (
                              <li key={idx} className="text-red-800">{con}</li>
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

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        {selectedCar.reviewLink && (
                          <Button
                            variant="outline"
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 border-none"
                            onClick={() => window.open(selectedCar.reviewLink, '_blank')}
                          >
                            <Star className="w-4 h-4 mr-2" />
                            View Agent Research
                          </Button>
                        )}
                        
                        {(listingDetails?.listingUrl || selectedCar.url) && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(listingDetails?.listingUrl || selectedCar.url, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Full Listing
                          </Button>
                        )}

                        <Button
                          size="lg"
                          className="w-full bg-automotive-success hover:bg-automotive-success/90"
                          onClick={() => {
                            setIsModalOpen(false);
                            navigate('/purchase', { state: { car: selectedCar } });
                          }}
                        >
                          <ShoppingCart className="w-5 w-5 mr-2" />
                          Start Purchase Process
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

export default Liked;
