import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FeatureTagInput, FeatureTag } from "@/components/FeatureTagInput";

const PhysicalPreferences = () => {
  const navigate = useNavigate();
  const [bodyType, setBodyType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [features, setFeatures] = useState<FeatureTag[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bodyType || !transmission) {
      toast.error("Please fill in all preferences");
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
      bodyType,
      transmission,
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
            AutoMatch
          </h1>
          <p className="text-muted-foreground">Step 2: Car Preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bodyType" className="text-base font-semibold">
              Body Type
            </Label>
            <Select value={bodyType} onValueChange={setBodyType}>
              <SelectTrigger id="bodyType">
                <SelectValue placeholder="Select body type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedan">Sedan</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="truck">Truck</SelectItem>
                <SelectItem value="coupe">Coupe</SelectItem>
                <SelectItem value="hatchback">Hatchback</SelectItem>
                <SelectItem value="convertible">Convertible</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transmission" className="text-base font-semibold">
              Transmission
            </Label>
            <Select value={transmission} onValueChange={setTransmission}>
              <SelectTrigger id="transmission">
                <SelectValue placeholder="Select transmission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
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
              Start Swiping
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PhysicalPreferences;
