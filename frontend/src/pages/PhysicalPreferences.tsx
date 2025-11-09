import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FeatureTagInput, FeatureTag } from "@/components/FeatureTagInput";
import { MdDirectionsCar, MdAirportShuttle, MdLocalShipping, MdTimeToLeave, MdCarRental, MdOutlineCarRepair } from "react-icons/md";

const PhysicalPreferences = () => {
  const navigate = useNavigate();
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);
  const [features, setFeatures] = useState<FeatureTag[]>([]);

  const handleBodyTypeClick = (type: string) => {
    setBodyTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (bodyTypes.length === 0) {
      toast.error("Please select at least one body type");
      return;
    }

    // Get finance preferences from localStorage
    const financePrefs = localStorage.getItem("financePreferences");
    
    if (!financePrefs) {
      toast.error("Finance preferences missing. Redirecting...");
      navigate("/");
      return;
    }

    // Store combined preferences
    const parsedFinancePrefs = JSON.parse(financePrefs);
    localStorage.setItem("carPreferences", JSON.stringify({
      ...parsedFinancePrefs,
      bodyTypes,
      features
    }));

    toast.success("Preferences saved! Let's find your perfect car");
    navigate("/swipe");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 bg-card shadow-elevated">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-automotive-blue to-automotive-silver bg-clip-text text-transparent mb-2">
            AutoSwipe
          </h1>
          <p className="text-muted-foreground">Step 2: Car Preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bodyType" className="text-base font-semibold">
              Body Type
            </Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              {[
                { key: "sedan", icon: <MdDirectionsCar className="w-8 h-8 mb-1" />, label: "Sedan" },
                { key: "suv", icon: <MdAirportShuttle className="w-8 h-8 mb-1" />, label: "SUV" },
                { key: "truck", icon: <MdLocalShipping className="w-8 h-8 mb-1" />, label: "Truck" },
                { key: "coupe", icon: <MdTimeToLeave className="w-8 h-8 mb-1" />, label: "Coupe" },
                { key: "hatchback", icon: <MdCarRental className="w-8 h-8 mb-1" />, label: "Hatchback" },
                { key: "convertible", icon: <MdOutlineCarRepair className="w-8 h-8 mb-1" />, label: "Convertible" }
              ].map(({ key, icon, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all shadow-sm ${bodyTypes.includes(key) ? "bg-blue-100 border-blue-500" : "bg-white border-gray-200"}`}
                  onClick={() => handleBodyTypeClick(key)}
                  aria-pressed={bodyTypes.includes(key)}
                >
                  {icon}
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Car Features</Label>
            <FeatureTagInput
              value={features}
              onChange={setFeatures}
              maxTags={12}
              placeholder="Type or select car features..."
            />
          </div>

          <div className="flex gap-4">
            <Button 
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-automotive-blue to-automotive-navy text-white hover:opacity-90 transition-opacity"
              size="lg"
            >
              Start Swiping!
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PhysicalPreferences;
