import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const Preferences = () => {
  const navigate = useNavigate();
  const [budget, setBudget] = useState([50000]);
  const [financing, setFinancing] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [transmission, setTransmission] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!financing || !bodyType || !transmission) {
      toast.error("Please fill in all preferences");
      return;
    }

    // Store preferences in localStorage
    localStorage.setItem("carPreferences", JSON.stringify({
      budget: budget[0],
      financing,
      bodyType,
      transmission
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
          <p className="text-muted-foreground">Find your dream car, one swipe at a time</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="budget" className="text-base font-semibold">
              Maximum Budget: ${budget[0].toLocaleString()}
            </Label>
            <Slider
              id="budget"
              min={10000}
              max={150000}
              step={5000}
              value={budget}
              onValueChange={setBudget}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$10,000</span>
              <span>$150,000</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="financing" className="text-base font-semibold">
              Financing Preference
            </Label>
            <Select value={financing} onValueChange={setFinancing}>
              <SelectTrigger id="financing">
                <SelectValue placeholder="Select financing option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash Purchase</SelectItem>
                <SelectItem value="lease">Lease</SelectItem>
                <SelectItem value="finance">Finance (Loan)</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-automotive-blue to-automotive-navy text-white hover:opacity-90 transition-opacity"
            size="lg"
          >
            Start Swiping
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Preferences;
