import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  price: number;
  image: string;
  mileage: number;
  transmission: string;
  bodyType: string;
  engine?: string;
  horsepower?: number;
  torque?: number;
  fuelEconomy?: string;
  safetyRating?: number;
  features?: string[];
  dealerNote?: string;
}

interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

const Finance = () => {
  const navigate = useNavigate();
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  
  // User inputs
  const [downPayment, setDownPayment] = useState("");
  const [loanTerm, setLoanTerm] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [tradeInValue, setTradeInValue] = useState("");
  
  // Calculated values (to be filled by backend later)
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [totalLoanAmount, setTotalLoanAmount] = useState<number>(0);
  const [estimatedAPR, setEstimatedAPR] = useState<number>(0);
  const [totalInterest, setTotalInterest] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  
  // Amortization schedule
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationRow[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("selectedCar");
    if (stored) {
      setSelectedCar(JSON.parse(stored));
    } else {
      toast.error("No car selected. Redirecting...");
      navigate("/liked");
    }
  }, [navigate]);

  const handleCalculate = () => {
    // Validation
    if (!downPayment || !loanTerm || !creditScore) {
      toast.error("Please fill in all required fields");
      return;
    }

    // TODO: Backend calculation logic here
    // For now, just show a toast
    toast.success("Calculating financing options...");
    
    // Mock calculation (replace with actual backend call)
    const loanAmount = selectedCar ? selectedCar.price - parseFloat(downPayment) - parseFloat(tradeInValue || "0") : 0;
    setTotalLoanAmount(loanAmount);
    
    // Mock values - replace with backend calculations
    setMonthlyPayment(500);
    setEstimatedAPR(5.5);
    setTotalInterest(2500);
    setTotalCost(loanAmount + 2500);
    
    // Mock amortization schedule
    const mockSchedule: AmortizationRow[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      payment: 500,
      principal: 450,
      interest: 50,
      balance: loanAmount - (450 * (i + 1))
    }));
    setAmortizationSchedule(mockSchedule);
  };

  const handleFinalize = () => {
    // Store financing details
    const financingDetails = {
      car: selectedCar,
      downPayment: parseFloat(downPayment),
      loanTerm: parseInt(loanTerm),
      creditScore,
      tradeInValue: parseFloat(tradeInValue || "0"),
      monthlyPayment,
      totalLoanAmount,
      estimatedAPR,
      totalInterest,
      totalCost
    };
    
    localStorage.setItem("financingDetails", JSON.stringify(financingDetails));
    toast.success("Financing details saved!");
    
    // Navigate to next step (e.g., contact dealer, finalize purchase, etc.)
    // navigate("/finalize");
  };

  if (!selectedCar) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-black p-6">
      <div className="max-w-7xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/liked")}
            className="text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-bold text-white">Finance Your Car</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Car Details */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <img
                src={selectedCar.image}
                alt={`${selectedCar.year} ${selectedCar.make} ${selectedCar.model}`}
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">
                  {selectedCar.year} {selectedCar.make} {selectedCar.model}
                </h2>
                <p className="text-3xl font-bold text-primary mb-4">
                  ${selectedCar.price.toLocaleString()}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mileage:</span>
                    <span className="font-medium">{selectedCar.mileage.toLocaleString()} mi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transmission:</span>
                    <span className="font-medium">{selectedCar.transmission}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Body Type:</span>
                    <span className="font-medium">{selectedCar.bodyType}</span>
                  </div>
                  {selectedCar.engine && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Engine:</span>
                      <span className="font-medium">{selectedCar.engine}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Financing Summary */}
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Financing Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Estimated Monthly Payment</span>
                  <span className="text-xl font-bold">
                    ${monthlyPayment > 0 ? monthlyPayment.toLocaleString() : "--"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Total Loan Amount</span>
                  <span className="font-semibold">
                    ${totalLoanAmount > 0 ? totalLoanAmount.toLocaleString() : "--"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Estimated APR</span>
                  <span className="font-semibold">
                    {estimatedAPR > 0 ? `${estimatedAPR}%` : "--"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Total Interest Paid</span>
                  <span className="font-semibold">
                    ${totalInterest > 0 ? totalInterest.toLocaleString() : "--"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t pt-3">
                  <span className="font-medium">Total Cost</span>
                  <span className="text-xl font-bold">
                    ${totalCost > 0 ? totalCost.toLocaleString() : "--"}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - User Inputs */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Financing Details</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="downPayment">Down Payment *</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    placeholder="Enter down payment"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loanTerm">Loan Term (months) *</Label>
                  <Select value={loanTerm} onValueChange={setLoanTerm}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select loan term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="36">36 months</SelectItem>
                      <SelectItem value="48">48 months</SelectItem>
                      <SelectItem value="60">60 months</SelectItem>
                      <SelectItem value="72">72 months</SelectItem>
                      <SelectItem value="84">84 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creditScore">Estimated Credit Score *</Label>
                  <Select value={creditScore} onValueChange={setCreditScore}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select credit score range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent (750+)</SelectItem>
                      <SelectItem value="good">Good (700-749)</SelectItem>
                      <SelectItem value="fair">Fair (650-699)</SelectItem>
                      <SelectItem value="poor">Poor (600-649)</SelectItem>
                      <SelectItem value="verypoor">Very Poor (&lt;600)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tradeIn">Trade-In Value (Optional)</Label>
                  <Input
                    id="tradeIn"
                    type="number"
                    placeholder="Enter trade-in value"
                    value={tradeInValue}
                    onChange={(e) => setTradeInValue(e.target.value)}
                  />
                </div>

                <Button onClick={handleCalculate} className="w-full">
                  Calculate Financing
                </Button>
              </div>
            </Card>

            {/* Amortization Schedule */}
            {amortizationSchedule.length > 0 && (
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Amortization Schedule</h3>
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Principal</TableHead>
                        <TableHead>Interest</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {amortizationSchedule.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell>{row.month}</TableCell>
                          <TableCell>${row.payment.toFixed(2)}</TableCell>
                          <TableCell>${row.principal.toFixed(2)}</TableCell>
                          <TableCell>${row.interest.toFixed(2)}</TableCell>
                          <TableCell>${row.balance.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Finalize Button */}
        {monthlyPayment > 0 && (
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={handleFinalize}>
              Proceed to Finalize Purchase
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Finance;