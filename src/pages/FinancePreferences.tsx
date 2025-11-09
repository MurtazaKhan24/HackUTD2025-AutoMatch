import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

const FinancePreferences = () => {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState<"monthly" | "total">("total");
  const [budget, setBudget] = useState([50000]);
  const [financing, setFinancing] = useState("");

  const monthlyMin = 200;
  const monthlyMax = 2000;
  const totalMin = 10000;
  const totalMax = 150000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!financing) {
      toast.error("Please select a financing preference");
      return;
    }

    // Store finance preferences in localStorage
    localStorage.setItem("financePreferences", JSON.stringify({
      paymentType,
      budget: budget[0],
      financing
    }));

    navigate("/preferences/physical");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 bg-card shadow-elevated">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-automotive-blue to-automotive-silver bg-clip-text text-transparent mb-2">
            AutoSwipe
          </h1>
          <p className="text-muted-foreground">Step 1: Finance Preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Payment Type</Label>
            <RadioGroup value={paymentType} onValueChange={(value: "monthly" | "total") => {
              setPaymentType(value);
              // Reset budget to appropriate range
              setBudget([value === "monthly" ? 500 : 50000]);
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="font-normal cursor-pointer">Monthly Payment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="total" id="total" />
                <Label htmlFor="total" className="font-normal cursor-pointer">Total Payment</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget" className="text-base font-semibold">
              Maximum Budget: ${budget[0].toLocaleString()}{paymentType === "monthly" ? "/month" : ""}
            </Label>
            <Slider
              id="budget"
              min={paymentType === "monthly" ? monthlyMin : totalMin}
              max={paymentType === "monthly" ? monthlyMax : totalMax}
              step={paymentType === "monthly" ? 50 : 5000}
              value={budget}
              onValueChange={setBudget}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>${(paymentType === "monthly" ? monthlyMin : totalMin).toLocaleString()}</span>
              <span>${(paymentType === "monthly" ? monthlyMax : totalMax).toLocaleString()}</span>
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
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="lease">Lease</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-automotive-blue to-automotive-navy text-white hover:opacity-90 transition-opacity"
            size="lg"
          >
            Next: Car Preferences
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default FinancePreferences;
