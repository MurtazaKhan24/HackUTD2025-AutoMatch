import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "sonner";

const FinancePreferences = () => {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState<"monthly" | "total">("total");
  const [budget, setBudget] = useState([50000]);
  const [financing, setFinancing] = useState("");
  const [loanTerm, setLoanTerm] = useState(60); // months, default 60

  const monthlyMin = 200;
  const monthlyMax = 2000;
  const totalMin = 10000;
  const totalMax = 150000;
  const loanTermMin = 12;
  const loanTermMax = 84;

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
            {/* Show a single rocker/toggle only when user chooses Finance */}
            {financing === "finance" && (
              <div className="flex items-center justify-between w-full mb-2">
                <Label className="text-base font-semibold">Payment Type</Label>
                <Toggle
                  pressed={paymentType === "monthly"}
                  onPressedChange={(pressed: boolean) => {
                    const value = pressed ? "monthly" : "total";
                    setPaymentType(value);
                    setBudget([value === "monthly" ? 500 : 50000]);
                  }}
                  aria-label="Toggle payment type"
                  className="w-44 h-12 flex items-center justify-between px-3 rounded-full bg-gradient-to-r from-automotive-navy to-automotive-blue border border-automotive-silver shadow-lg"
                >
                  <span className={paymentType === "monthly" ? "text-white font-bold" : "text-automotive-silver font-medium"}>Monthly</span>
                  <span className={paymentType === "total" ? "text-white font-bold" : "text-automotive-silver font-medium"}>Total</span>
                </Toggle>
              </div>
            )}
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

          {/* Loan term slider only for financing */}
          {financing === "finance" && (
            <div className="space-y-2">
              <Label htmlFor="loanTerm" className="text-base font-semibold">
                Loan Term: {loanTerm} months
              </Label>
              <Slider
                id="loanTerm"
                min={loanTermMin}
                max={loanTermMax}
                step={12}
                value={[loanTerm]}
                onValueChange={val => setLoanTerm(val[0])}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{loanTermMin} months</span>
                <span>{loanTermMax} months</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="financing" className="text-base font-semibold">
              Financing Preference
            </Label>
            <Select value={financing} onValueChange={value => {
              setFinancing(value);
              if (value === "cash") {
                setPaymentType("total");
                setBudget([50000]); // reset to total default
              }
              if (value === "lease") {
                setPaymentType("total");
                setBudget([50000]);
              }
              if (value === "finance") {
                // keep current paymentType, but reset budget to default for current type
                setBudget([paymentType === "monthly" ? 500 : 50000]);
              }
            }}>
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
