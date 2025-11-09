import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "sonner";

const FinancePreferences = () => {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState<"monthly" | "total">("total");
  const [budget, setBudget] = useState([50000]);
  const [financing, setFinancing] = useState<'finance' | 'cash'>('finance');
  const [loanTerm, setLoanTerm] = useState(60); // months, default 60
  const [downPayment, setDownPayment] = useState(0);

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
    
    // Clear liked cars and swiped cars when starting a new preference session
    localStorage.removeItem("likedCars");
    localStorage.removeItem("swipedCars");
    
    localStorage.setItem("financePreferences", JSON.stringify({
      paymentType,
      budget: budget[0],
      financing,
      loanTerm,
      downPayment
    }));
    navigate("/preferences/physical");

    // Fire off price estimate in the background
    const financeData = {
      budget: budget[0],
      payment: financing === 'finance' ? 'loan' : 'cash',
      state: 'TX', // TODO: get from user or location
      zipcode: '75080', // TODO: get from user or location
      down_payment: downPayment.toString(),
      apr: financing === 'finance' ? '5.9' : '0', // TODO: get from user if needed
      term_months: financing === 'finance' ? loanTerm.toString() : '0'
    };
    fetch("http://127.0.0.1:5001/api/price/target", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(financeData)
    })
      .then(res => res.json())
      .then(result => {
        if (result.target_listing_price) {
          toast.success(`Agent Estimated OTD price: $${Number(result.target_listing_price).toLocaleString()}`);
        } else {
          toast.error("Could not calculate estimated price.");
        }
      })
      .catch(() => {
        toast.error("Error contacting backend for price estimate.");
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 bg-card shadow-elevated">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-automotive-blue to-automotive-silver bg-clip-text text-transparent mb-2">
            AutoSwipe
          </h1>
          <p className="text-muted-foreground">Democratizing Auto Finance</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Financing type toggle */}
            <div className="flex items-center justify-between w-full mb-2">
              <Label className="text-base font-semibold">Financing Preference</Label>
              <Toggle
                pressed={financing === 'finance'}
                onPressedChange={(pressed: boolean) => {
                  const value = pressed ? 'finance' : 'cash';
                  setFinancing(value);
                  if (value === 'cash') {
                    setPaymentType('total');
                    setBudget([50000]);
                  } else {
                    setBudget([paymentType === 'monthly' ? 500 : 50000]);
                  }
                }}
                aria-label="Toggle financing type"
                className="w-44 h-12 flex items-center justify-between px-3 rounded-full bg-gradient-to-r from-automotive-navy to-automotive-blue border border-automotive-silver shadow-lg"
              >
                <span className={financing === 'cash' ? 'text-white font-bold' : 'text-automotive-silver font-medium'}>Cash</span>
                <span className={financing === 'finance' ? 'text-white font-bold' : 'text-automotive-silver font-medium'}>Finance</span>
              </Toggle>
            </div>
            {/* Show payment type toggle only when user chooses Finance */}
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

          {/* Down payment input only for financing */}
          {financing === "finance" && (
            <div className="space-y-2">
              <Label htmlFor="downPayment" className="text-base font-semibold">
                Down Payment: ${downPayment.toLocaleString()}
              </Label>
              <input
                id="downPayment"
                type="number"
                min={0}
                step={500}
                value={downPayment}
                onChange={e => setDownPayment(Number(e.target.value))}
                className="w-full px-4 py-2 rounded border border-automotive-silver focus:outline-none focus:ring-2 focus:ring-automotive-blue"
                placeholder="Enter down payment amount"
              />
            </div>
          )}

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
