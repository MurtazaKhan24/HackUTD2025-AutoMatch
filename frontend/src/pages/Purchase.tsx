import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Phone, Mail, FileText, Calculator, Shield, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Car {
  make: string;
  model: string;
  year: string | number;
  vin?: string;
  price?: {
    marketValue?: number;
  };
  photos?: string[];
  url?: string;
  actualListingUrl?: string;
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
}

interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

interface FinancePreferences {
  paymentType?: string;
  budget?: number;
  financing?: string;
  loanTerm?: number;
  downPayment?: number;
  zipcode?: string;
  creditScore?: string;
}

interface FinancingOption {
  institution: string;
  rate: number;
  snippet: string;
  link: string;
  source: string;
}

interface FinancingData {
  options: FinancingOption[];
  summary: string;
  best_rate: number | null;
  recommendation: string;
  zipcode: string;
}

interface InspectionOption {
  name: string;
  snippet: string;
  link: string;
  price: number | null;
  rating: number | null;
  phone: string | null;
  source: string;
}

interface InspectionData {
  options: InspectionOption[];
  summary: string;
  typical_price_range: string;
  recommendation: string;
  zipcode: string;
}

interface InsuranceOption {
  provider: string;
  snippet: string;
  link: string;
  monthly_rate: number | null;
  rating: number | null;
  phone: string | null;
  source: string;
}

interface InsuranceData {
  options: InsuranceOption[];
  summary: string;
  rate_factors: string;
  recommendation: string;
  zipcode: string;
}

interface RecallInfo {
  date: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
}

interface VehicleHistoryData {
  recalls: RecallInfo[];
  complaints: { component: string; count: number; }[];
  total_complaints?: number;
  safety_ratings: any;
  links: {
    carfax: string | null;
    autocheck: string | null;
    nhtsa: string | null;
  };
  summary: string;
}

const Purchase = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const car = location.state?.car as Car;
  const { toast } = useToast();
  
  const [financePrefs, setFinancePrefs] = useState<FinancePreferences | null>(null);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [totalLoanAmount, setTotalLoanAmount] = useState<number>(0);
  const [estimatedAPR, setEstimatedAPR] = useState<number>(0);
  const [totalInterest, setTotalInterest] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [amortizationSchedule, setAmortizationSchedule] = useState<AmortizationRow[]>([]);
  const [showFullSchedule, setShowFullSchedule] = useState<boolean>(false);
  const [financingData, setFinancingData] = useState<FinancingData | null>(null);
  const [loadingFinancing, setLoadingFinancing] = useState<boolean>(false);
  const [inspectionData, setInspectionData] = useState<InspectionData | null>(null);
  const [loadingInspection, setLoadingInspection] = useState<boolean>(false);
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);
  const [loadingInsurance, setLoadingInsurance] = useState<boolean>(false);
  
  const [vehicleHistoryData, setVehicleHistoryData] = useState<VehicleHistoryData | null>(null);
  const [loadingVehicleHistory, setLoadingVehicleHistory] = useState<boolean>(false);
  
  // Visibility states - controls whether data is shown to user
  const [showFinancing, setShowFinancing] = useState<boolean>(false);
  const [showInspection, setShowInspection] = useState<boolean>(false);
  const [showInsurance, setShowInsurance] = useState<boolean>(false);
  const [showVehicleHistory, setShowVehicleHistory] = useState<boolean>(false);
  
  // Dropdown states for each section
  const [showAllFinancing, setShowAllFinancing] = useState<boolean>(false);
  const [showAllInspection, setShowAllInspection] = useState<boolean>(false);
  const [showAllInsurance, setShowAllInsurance] = useState<boolean>(false);
  const [showAllRecalls, setShowAllRecalls] = useState<boolean>(false);

  useEffect(() => {
    // Load finance preferences from localStorage
    const stored = localStorage.getItem("financePreferences");
    const carKey = car ? `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_') : null;
    
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        setFinancePrefs(prefs);
        
        // Check if we have saved financing data with a best rate
        let savedBestRate = null;
        if (carKey) {
          const storedFinancing = localStorage.getItem(`financing_${carKey}`);
          if (storedFinancing) {
            try {
              const financingData = JSON.parse(storedFinancing);
              savedBestRate = financingData.best_rate;
              setFinancingData(financingData);
            } catch (error) {
              console.error("Failed to parse financing data:", error);
            }
          }
        }
        
        // Calculate financing if we have car price and preferences
        // Use saved best rate if available, otherwise use default
        if (car?.price?.marketValue && prefs.budget) {
          calculateFinancing(car.price.marketValue, prefs, savedBestRate);
        }
      } catch (error) {
        console.error("Failed to parse finance preferences:", error);
      }
    }
    
    // Load persisted agent data from localStorage or fetch in background
    if (carKey) {
      // Load inspection data
      const storedInspection = localStorage.getItem(`inspection_${carKey}`);
      if (storedInspection) {
        try {
          setInspectionData(JSON.parse(storedInspection));
        } catch (error) {
          console.error("Failed to parse inspection data:", error);
        }
      }
      
      // Load insurance data
      const storedInsurance = localStorage.getItem(`insurance_${carKey}`);
      if (storedInsurance) {
        try {
          setInsuranceData(JSON.parse(storedInsurance));
        } catch (error) {
          console.error("Failed to parse insurance data:", error);
        }
      }
      
      // Load vehicle history data
      const storedHistory = localStorage.getItem(`vehicle_history_${carKey}`);
      if (storedHistory) {
        try {
          setVehicleHistoryData(JSON.parse(storedHistory));
        } catch (error) {
          console.error("Failed to parse vehicle history data:", error);
        }
      }
    }
    
    // Preload all agent data in background if not already cached
    if (car && financePrefs?.zipcode) {
      preloadAgentData();
    }
  }, [car]);
  
  // Preload all 4 agent APIs in the background
  const preloadAgentData = async () => {
    const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
    
    // Preload financing options (if not already loaded)
    if (!financingData && financePrefs?.zipcode) {
      preloadFinancingOptions();
    }
    
    // Preload inspection services (if not already loaded)
    if (!inspectionData && financePrefs?.zipcode) {
      preloadInspectionOptions();
    }
    
    // Preload insurance quotes (if not already loaded)
    if (!insuranceData && financePrefs?.zipcode) {
      preloadInsuranceOptions();
    }
    
    // Preload vehicle history (if not already loaded)
    if (!vehicleHistoryData) {
      preloadVehicleHistory();
    }
  };
  
  const preloadFinancingOptions = async () => {
    if (!financePrefs?.zipcode) return;
    
    try {
      const response = await fetch('http://localhost:5001/api/financing/local-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipcode: financePrefs.zipcode,
          credit_score: financePrefs.creditScore || 'good',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch financing options: ${response.statusText}`);
      }

      const data = await response.json();
      setFinancingData(data);
      
      // Persist to localStorage
      const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
      localStorage.setItem(`financing_${carKey}`, JSON.stringify(data));
      
      // Update APR if we found a better rate
      if (data.best_rate && data.best_rate > 0) {
        setEstimatedAPR(data.best_rate);
        if (car?.price?.marketValue && financePrefs) {
          calculateFinancing(car.price.marketValue, { ...financePrefs }, data.best_rate);
        }
      }
      
      console.log('✓ Financing options preloaded');
    } catch (error) {
      console.error('Error preloading financing options:', error);
    }
  };
  
  const preloadInspectionOptions = async () => {
    if (!financePrefs?.zipcode) return;
    
    try {
      const carType = car.make && car.model 
        ? `${car.year} ${car.make} ${car.model}`
        : "sedan";

      const response = await fetch('http://localhost:5001/api/inspection/local-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipcode: financePrefs.zipcode,
          car_type: carType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inspection services: ${response.statusText}`);
      }

      const data = await response.json();
      setInspectionData(data);

      // Persist to localStorage
      const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
      localStorage.setItem(`inspection_${carKey}`, JSON.stringify(data));
      
      console.log('✓ Inspection services preloaded');
    } catch (error) {
      console.error('Error preloading inspection services:', error);
    }
  };
  
  const preloadInsuranceOptions = async () => {
    if (!financePrefs?.zipcode) return;
    
    try {
      const carDetails = car.make && car.model 
        ? `${car.year} ${car.make} ${car.model}`
        : "sedan";

      const response = await fetch('http://localhost:5001/api/insurance/local-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipcode: financePrefs.zipcode,
          car_details: carDetails,
          driver_age: 30, // Could be added to user preferences
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch insurance quotes: ${response.statusText}`);
      }

      const data = await response.json();
      setInsuranceData(data);

      // Persist to localStorage
      const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
      localStorage.setItem(`insurance_${carKey}`, JSON.stringify(data));
      
      console.log('✓ Insurance quotes preloaded');
    } catch (error) {
      console.error('Error preloading insurance quotes:', error);
    }
  };
  
  const preloadVehicleHistory = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/vehicle-history/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vin: null, // VIN would come from car data if available
          year: car.year,
          make: car.make,
          model: car.model,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vehicle history: ${response.statusText}`);
      }

      const data = await response.json();
      setVehicleHistoryData(data);

      // Persist to localStorage
      const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
      localStorage.setItem(`vehicle_history_${carKey}`, JSON.stringify(data));
      
      console.log('✓ Vehicle history preloaded');
    } catch (error) {
      console.error('Error preloading vehicle history:', error);
    }
  };

  const calculateFinancing = (carPrice: number, prefs: FinancePreferences, customAPR?: number) => {
    // Use user's preferences for calculation
    const downPaymentAmount = prefs.downPayment || 0;
    const loanTermMonths = prefs.loanTerm || 60;
    
    // Calculate loan amount
    const loanAmount = carPrice - downPaymentAmount;
    setTotalLoanAmount(loanAmount);
    
    // Estimate APR based on credit (simplified - would come from backend in production)
    const apr = customAPR || 5.5; // Mock APR - should be calculated based on credit score
    setEstimatedAPR(apr);
    
    // Calculate monthly payment using loan formula
    const monthlyRate = apr / 100 / 12;
    const payment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) / 
                    (Math.pow(1 + monthlyRate, loanTermMonths) - 1);
    setMonthlyPayment(payment);
    
    // Calculate total interest and cost
    const totalPayments = payment * loanTermMonths;
    const interest = totalPayments - loanAmount;
    setTotalInterest(interest);
    setTotalCost(totalPayments + downPaymentAmount);
    
    // Generate amortization schedule (first 12 months)
    const schedule: AmortizationRow[] = [];
    let remainingBalance = loanAmount;
    
    for (let month = 1; month <= Math.min(12, loanTermMonths); month++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = payment - interestPayment;
      remainingBalance -= principalPayment;
      
      schedule.push({
        month,
        payment,
        principal: principalPayment,
        interest: interestPayment,
        balance: remainingBalance
      });
    }
    
    setAmortizationSchedule(schedule);
  };

  const handleViewManufacturerSite = () => {
    if (!car) return;
    
    // Get manufacturer website based on car make
    const manufacturerWebsites: { [key: string]: string } = {
      'toyota': 'https://www.toyota.com',
      'honda': 'https://www.honda.com',
      'ford': 'https://www.ford.com',
      'chevrolet': 'https://www.chevrolet.com',
      'chevy': 'https://www.chevrolet.com',
      'nissan': 'https://www.nissanusa.com',
      'mazda': 'https://www.mazdausa.com',
      'subaru': 'https://www.subaru.com',
      'hyundai': 'https://www.hyundaiusa.com',
      'kia': 'https://www.kia.com',
      'volkswagen': 'https://www.vw.com',
      'vw': 'https://www.vw.com',
      'bmw': 'https://www.bmwusa.com',
      'mercedes': 'https://www.mbusa.com',
      'mercedes-benz': 'https://www.mbusa.com',
      'audi': 'https://www.audiusa.com',
      'lexus': 'https://www.lexus.com',
      'acura': 'https://www.acura.com',
      'infiniti': 'https://www.infinitiusa.com',
      'jeep': 'https://www.jeep.com',
      'ram': 'https://www.ramtrucks.com',
      'dodge': 'https://www.dodge.com',
      'chrysler': 'https://www.chrysler.com',
      'buick': 'https://www.buick.com',
      'gmc': 'https://www.gmc.com',
      'cadillac': 'https://www.cadillac.com',
      'tesla': 'https://www.tesla.com',
      'volvo': 'https://www.volvocars.com/us',
      'porsche': 'https://www.porsche.com/usa',
      'genesis': 'https://www.genesis.com',
      'mini': 'https://www.miniusa.com',
      'lincoln': 'https://www.lincoln.com',
      'alfa romeo': 'https://www.alfaromeousa.com',
      'fiat': 'https://www.fiatusa.com',
      'jaguar': 'https://www.jaguarusa.com',
      'land rover': 'https://www.landroverusa.com',
      'maserati': 'https://www.maserati.com/us',
      'mitsubishi': 'https://www.mitsubishicars.com',
      'bentley': 'https://www.bentleymotors.com',
      'rolls-royce': 'https://www.rolls-roycemotorcars.com',
      'ferrari': 'https://www.ferrari.com',
      'lamborghini': 'https://www.lamborghini.com',
      'aston martin': 'https://www.astonmartin.com',
      'lotus': 'https://www.lotuscars.com',
      'mclaren': 'https://cars.mclaren.com',
    };
    
    const makeLower = car.make.toLowerCase().trim();
    const manufacturerUrl = manufacturerWebsites[makeLower];
    
    if (manufacturerUrl) {
      window.open(manufacturerUrl, '_blank');
      toast({
        title: "Opening Manufacturer Website",
        description: `Visit ${car.make}'s official website for more information.`,
      });
    } else {
      // Fallback to search for the car
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(car.year + ' ' + car.make + ' ' + car.model)}`;
      window.open(searchUrl, '_blank');
      toast({
        title: "Searching Online",
        description: `Finding more information about the ${car.year} ${car.make} ${car.model}.`,
      });
    }
  };

  const fetchFinancingOptions = async () => {
    // Simply show the data if it's already loaded
    if (financingData) {
      setShowFinancing(true);
      toast({
        title: "Financing Options Ready",
        description: `Found ${financingData.options?.length || 0} local financing options.`,
      });
      return;
    }
    
    // Otherwise fetch it now
    if (!financePrefs?.zipcode) {
      toast({
        title: "Missing Information",
        description: "Please set your zipcode in finance preferences first.",
        variant: "destructive",
      });
      return;
    }

    setLoadingFinancing(true);
    toast({
      title: "Searching for Financing Options",
      description: "Finding local banks and credit unions with competitive rates...",
    });

    try {
      const response = await fetch('http://localhost:5001/api/financing/local-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipcode: financePrefs.zipcode,
          credit_score: financePrefs.creditScore || 'good',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch financing options: ${response.statusText}`);
      }

      const data = await response.json();
      setFinancingData(data);
      setShowFinancing(true);
      
      // Persist to localStorage
      const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
      localStorage.setItem(`financing_${carKey}`, JSON.stringify(data));
      
      // Update APR if we found a better rate
      if (data.best_rate && data.best_rate > 0) {
        setEstimatedAPR(data.best_rate);
        if (car?.price?.marketValue && financePrefs) {
          calculateFinancing(car.price.marketValue, { ...financePrefs }, data.best_rate);
        }
      }

      toast({
        title: "Financing Options Found",
        description: `Found ${data.options?.length || 0} local financing options.`,
      });
    } catch (error) {
      console.error('Error fetching financing options:', error);
      toast({
        title: "Error",
        description: "Failed to fetch financing options. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingFinancing(false);
    }
  };

  const fetchInspectionOptions = async () => {
    // Simply show the data if it's already loaded
    if (inspectionData) {
      setShowInspection(true);
      toast({
        title: "Inspection Services Ready",
        description: `Found ${inspectionData.options?.length || 0} local inspection services.`,
      });
      return;
    }
    
    // Otherwise fetch it now
    if (!financePrefs?.zipcode) {
      toast({
        title: "Missing Information",
        description: "Please set your zipcode in finance preferences first.",
        variant: "destructive",
      });
      return;
    }

    setLoadingInspection(true);
    toast({
      title: "Finding Inspection Services",
      description: "Searching for certified mechanics and inspection services near you...",
    });

    try {
      const carType = car.make && car.model 
        ? `${car.year} ${car.make} ${car.model}`
        : "sedan";

      const response = await fetch('http://localhost:5001/api/inspection/local-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipcode: financePrefs.zipcode,
          car_type: carType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inspection services: ${response.statusText}`);
      }

      const data = await response.json();
      setInspectionData(data);
      setShowInspection(true);

      // Persist to localStorage
      const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
      localStorage.setItem(`inspection_${carKey}`, JSON.stringify(data));

      toast({
        title: "Inspection Services Found",
        description: `Found ${data.options?.length || 0} local inspection services.`,
      });
    } catch (error) {
      console.error('Error fetching inspection services:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inspection services. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingInspection(false);
    }
  };

  const fetchInsuranceOptions = async () => {
    // Simply show the data if it's already loaded
    if (insuranceData) {
      setShowInsurance(true);
      toast({
        title: "Insurance Quotes Ready",
        description: `Found ${insuranceData.options?.length || 0} insurance providers.`,
      });
      return;
    }
    
    // Otherwise fetch it now
    if (!financePrefs?.zipcode) {
      toast({
        title: "Missing Information",
        description: "Please set your zipcode in finance preferences first.",
        variant: "destructive",
      });
      return;
    }

    setLoadingInsurance(true);
    toast({
      title: "Getting Insurance Quotes",
      description: "Comparing rates from local insurance providers...",
    });

    try {
      const carDetails = car.make && car.model 
        ? `${car.year} ${car.make} ${car.model}`
        : "sedan";

      const response = await fetch('http://localhost:5001/api/insurance/local-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipcode: financePrefs.zipcode,
          car_details: carDetails,
          driver_age: 30, // Could be added to user preferences
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch insurance quotes: ${response.statusText}`);
      }

      const data = await response.json();
      setInsuranceData(data);
      setShowInsurance(true);

      // Persist to localStorage
      const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
      localStorage.setItem(`insurance_${carKey}`, JSON.stringify(data));

      toast({
        title: "Insurance Quotes Found",
        description: `Found ${data.options?.length || 0} insurance providers.`,
      });
    } catch (error) {
      console.error('Error fetching insurance quotes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch insurance quotes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingInsurance(false);
    }
  };

  const fetchVehicleHistory = async () => {
    // Simply show the data if it's already loaded
    if (vehicleHistoryData) {
      setShowVehicleHistory(true);
      const recallCount = vehicleHistoryData.recalls?.length || 0;
      toast({
        title: "Vehicle History Ready",
        description: recallCount > 0 
          ? `Found ${recallCount} recall(s) for this vehicle.` 
          : "No active recalls found.",
        variant: recallCount > 0 ? "destructive" : "default",
      });
      return;
    }
    
    // Otherwise fetch it now
    setLoadingVehicleHistory(true);
    toast({
      title: "Getting Vehicle History",
      description: "Checking for recalls and safety information...",
    });

    try {
      const response = await fetch('http://localhost:5001/api/vehicle-history/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vin: null, // VIN would come from car data if available
          year: car.year,
          make: car.make,
          model: car.model,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch vehicle history: ${response.statusText}`);
      }

      const data = await response.json();
      setVehicleHistoryData(data);
      setShowVehicleHistory(true);

      // Persist to localStorage
      const carKey = `${car.year}_${car.make}_${car.model}`.replace(/\s+/g, '_');
      localStorage.setItem(`vehicle_history_${carKey}`, JSON.stringify(data));

      const recallCount = data.recalls?.length || 0;
      toast({
        title: "Vehicle History Retrieved",
        description: recallCount > 0 
          ? `Found ${recallCount} recall(s) for this vehicle.` 
          : "No active recalls found.",
        variant: recallCount > 0 ? "destructive" : "default",
      });
    } catch (error) {
      console.error('Error fetching vehicle history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vehicle history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingVehicleHistory(false);
    }
  };

  if (!car) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue p-4 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">No car selected</h2>
          <p className="text-muted-foreground mb-6">
            Please select a car from your liked cars to start the purchase process.
          </p>
          <Button onClick={() => navigate("/liked")}>
            Go to Liked Cars
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-automotive-navy via-automotive-dark to-automotive-blue p-4">
      <div className="max-w-4xl mx-auto pt-8">
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">
              Purchase Process
            </h1>
            <p className="text-white/70 mt-1">
              {car.year} {car.make} {car.model} {car.trim}
            </p>
          </div>
        </div>

        {/* Car Summary Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="relative h-64 md:h-auto">
              <img
                src={car.photos?.[0] || '/placeholder.svg'}
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2">
                {car.year} {car.make} {car.model}
              </h2>
              {car.trim && (
                <p className="text-lg text-muted-foreground mb-4">{car.trim}</p>
              )}
              <p className="text-3xl font-semibold text-automotive-red mb-4">
                ${car.price?.marketValue?.toLocaleString() || 'Contact for price'}
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                {car.specs?.engine && (
                  <p><strong>Engine:</strong> {car.specs.engine}</p>
                )}
                {car.specs?.transmission && (
                  <p><strong>Transmission:</strong> {car.specs.transmission}</p>
                )}
                {car.specs?.drivetrain && (
                  <p><strong>Drivetrain:</strong> {car.specs.drivetrain}</p>
                )}
              </div>
              <Button 
                className="w-full mt-4" 
                onClick={handleViewManufacturerSite}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit {car.make} Website
              </Button>
            </div>
          </div>
        </Card>

        {/* Financing Summary - Only show for finance, not cash */}
        {financePrefs && car.price?.marketValue && financePrefs.financing === 'finance' && (
          <Card className="mb-6 p-6">
            <h3 className="text-2xl font-bold mb-4">Your Financing Summary</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Adjust your down payment and loan term to see how it affects your monthly payment
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Vehicle Price</span>
                  <span className="font-semibold">
                    ${car.price.marketValue.toLocaleString()}
                  </span>
                </div>
                
                {/* Editable Down Payment */}
                <div className="py-2 border-b">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">Down Payment</span>
                    <span className="font-semibold">
                      ${financePrefs.downPayment?.toLocaleString() || 0}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={car.price.marketValue}
                    step="1000"
                    value={financePrefs.downPayment || 0}
                    onChange={(e) => {
                      const newDownPayment = Number(e.target.value);
                      const updatedPrefs = { ...financePrefs, downPayment: newDownPayment };
                      setFinancePrefs(updatedPrefs);
                      calculateFinancing(car.price.marketValue, updatedPrefs, estimatedAPR);
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>$0</span>
                    <span>${(car.price.marketValue).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Loan Amount</span>
                  <span className="font-semibold">
                    ${totalLoanAmount > 0 ? totalLoanAmount.toLocaleString(undefined, {maximumFractionDigits: 0}) : '--'}
                  </span>
                </div>
                
                {/* Editable Loan Term */}
                <div className="py-2 border-b">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">Loan Term</span>
                    <span className="font-semibold">
                      {financePrefs.loanTerm || '--'} months
                    </span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="84"
                    step="12"
                    value={financePrefs.loanTerm || 60}
                    onChange={(e) => {
                      const newLoanTerm = Number(e.target.value);
                      const updatedPrefs = { ...financePrefs, loanTerm: newLoanTerm };
                      setFinancePrefs(updatedPrefs);
                      calculateFinancing(car.price.marketValue, updatedPrefs, estimatedAPR);
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>12 mo</span>
                    <span>84 mo</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Estimated APR</span>
                  <span className="font-semibold">
                    {estimatedAPR > 0 ? `${estimatedAPR.toFixed(2)}%` : '--'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Monthly Payment</span>
                  <span className="text-2xl font-bold text-automotive-red">
                    ${monthlyPayment > 0 ? monthlyPayment.toLocaleString(undefined, {maximumFractionDigits: 2}) : '--'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Total Interest</span>
                  <span className="font-semibold">
                    ${totalInterest > 0 ? totalInterest.toLocaleString(undefined, {maximumFractionDigits: 0}) : '--'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-t-2 pt-3">
                  <span className="font-semibold">Total Cost</span>
                  <span className="text-xl font-bold">
                    ${totalCost > 0 ? totalCost.toLocaleString(undefined, {maximumFractionDigits: 0}) : '--'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}
        
        {/* Cash Purchase Summary - Show for cash payments */}
        {financePrefs && car.price?.marketValue && financePrefs.financing === 'cash' && (
          <Card className="mb-6 p-6">
            <h3 className="text-2xl font-bold mb-4">Cash Purchase Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b">
                <span className="text-lg text-muted-foreground">Vehicle Price</span>
                <span className="text-2xl font-bold text-automotive-red">
                  ${car.price.marketValue.toLocaleString()}
                </span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-700 mb-1">Cash Purchase Benefits</p>
                <ul className="text-sm text-green-600 space-y-1">
                  <li>✓ No interest payments</li>
                  <li>✓ No monthly loan obligations</li>
                  <li>✓ Stronger negotiating position</li>
                  <li>✓ Immediate full ownership</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Financing Options from Agent */}
        {showFinancing && financingData && financingData.options.length > 0 && (
          <Card className="mb-6 p-6">
            <h3 className="text-2xl font-bold mb-2">Local Financing Options</h3>
            <p className="text-muted-foreground mb-4">{financingData.summary}</p>
            
            {financingData.best_rate && (
              <div className="bg-automotive-success/10 border border-automotive-success/20 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-automotive-success mb-1">Best Rate Found</p>
                <p className="text-3xl font-bold text-automotive-success">{financingData.best_rate.toFixed(2)}% APR</p>
                <p className="text-sm text-muted-foreground mt-2">{financingData.recommendation}</p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Available Options:</h4>
              {financingData.options.slice(0, showAllFinancing ? financingData.options.length : 2).map((option, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-4 hover:border-automotive-red/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold text-lg">{option.institution}</h5>
                    <span className="text-2xl font-bold text-automotive-red">
                      {option.rate.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{option.snippet}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(option.link, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Learn More
                  </Button>
                </div>
              ))}
              {financingData.options.length > 2 && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-2"
                  onClick={() => setShowAllFinancing(!showAllFinancing)}
                >
                  {showAllFinancing ? 'Show Less' : `Show All ${financingData.options.length} Options`}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Amortization Schedule */}
        {amortizationSchedule.length > 0 && (
          <Card className="mb-6 p-6">
            <h3 className="text-xl font-bold mb-4">Payment Schedule (First Year)</h3>
            <div className="overflow-auto">
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
                  {amortizationSchedule.slice(0, showFullSchedule ? amortizationSchedule.length : 4).map((row) => (
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
            {amortizationSchedule.length > 4 && (
              <Button 
                variant="ghost" 
                className="w-full mt-4"
                onClick={() => setShowFullSchedule(!showFullSchedule)}
              >
                {showFullSchedule ? 'Show Less' : `Show All ${amortizationSchedule.length} Months`}
              </Button>
            )}
          </Card>
        )}

        {/* Inspection Services from Agent */}
        {showInspection && inspectionData && inspectionData.options.length > 0 && (
          <Card className="mb-6 p-6">
            <h3 className="text-2xl font-bold mb-2">Local Inspection Services</h3>
            <p className="text-muted-foreground mb-4">{inspectionData.summary}</p>
            
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-purple-600 mb-1">Typical Price Range</p>
              <p className="text-2xl font-bold text-purple-600">{inspectionData.typical_price_range}</p>
              <p className="text-sm text-muted-foreground mt-2">{inspectionData.recommendation}</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Available Services:</h4>
              {inspectionData.options.slice(0, showAllInspection ? inspectionData.options.length : 2).map((option, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold text-lg">{option.name}</h5>
                    {option.price && (
                      <span className="text-xl font-bold text-purple-600">
                        ${option.price.toFixed(0)}
                      </span>
                    )}
                  </div>
                  {option.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-semibold">{option.rating.toFixed(1)}/5</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mb-3">{option.snippet}</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(option.link, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      Visit Website
                    </Button>
                    {option.phone && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `tel:${option.phone}`}
                      >
                        <Phone className="w-3 h-3 mr-2" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {inspectionData.options.length > 2 && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-2"
                  onClick={() => setShowAllInspection(!showAllInspection)}
                >
                  {showAllInspection ? 'Show Less' : `Show All ${inspectionData.options.length} Services`}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Insurance Options from Agent */}
        {showInsurance && insuranceData && insuranceData.options.length > 0 && (
          <Card className="mb-6 p-6">
            <h3 className="text-2xl font-bold mb-2">Insurance Quotes</h3>
            <p className="text-muted-foreground mb-4">{insuranceData.summary}</p>
            
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-orange-600 mb-1">Rate Factors</p>
              <p className="text-sm text-muted-foreground mb-2">{insuranceData.rate_factors}</p>
              <p className="text-sm font-semibold text-orange-600">{insuranceData.recommendation}</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-lg">Available Providers:</h4>
              {insuranceData.options.slice(0, showAllInsurance ? insuranceData.options.length : 2).map((option, index) => (
                <div 
                  key={index} 
                  className="border rounded-lg p-4 hover:border-orange-500/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-semibold text-lg">{option.provider}</h5>
                    {option.monthly_rate && (
                      <div className="text-right">
                        <span className="text-2xl font-bold text-orange-600">
                          ${option.monthly_rate.toFixed(0)}
                        </span>
                        <span className="text-sm text-muted-foreground">/mo</span>
                      </div>
                    )}
                  </div>
                  {option.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-semibold">{option.rating.toFixed(1)}/5</span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mb-3">{option.snippet}</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(option.link, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-2" />
                      Get Quote
                    </Button>
                    {option.phone && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.location.href = `tel:${option.phone}`}
                      >
                        <Phone className="w-3 h-3 mr-2" />
                        Call Agent
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {insuranceData.options.length > 2 && (
                <Button 
                  variant="ghost" 
                  className="w-full mt-2"
                  onClick={() => setShowAllInsurance(!showAllInsurance)}
                >
                  {showAllInsurance ? 'Show Less' : `Show All ${insuranceData.options.length} Providers`}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Vehicle History Data */}
        {showVehicleHistory && vehicleHistoryData && (
          <Card className="mb-6 p-6">
            <h3 className="text-2xl font-bold mb-2">Vehicle History & Safety</h3>
            <p className="text-muted-foreground mb-4">{vehicleHistoryData.summary}</p>
            
            {/* Recalls Section */}
            {vehicleHistoryData.recalls && vehicleHistoryData.recalls.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-red-700">Active Recalls Found</p>
                    <p className="text-2xl font-bold text-red-700">{vehicleHistoryData.recalls.length} Recall(s)</p>
                  </div>
                </div>
                
                <div className="space-y-3 mt-4">
                  {vehicleHistoryData.recalls.slice(0, showAllRecalls ? vehicleHistoryData.recalls.length : 2).map((recall, index) => (
                    <div key={index} className="bg-white rounded p-3 border border-red-100">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm">{recall.component}</p>
                        <span className="text-xs text-muted-foreground">{recall.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{recall.summary}</p>
                      {recall.consequence && (
                        <p className="text-xs text-red-600"><strong>Risk:</strong> {recall.consequence}</p>
                      )}
                      {recall.remedy && (
                        <p className="text-xs text-green-600 mt-1"><strong>Fix:</strong> {recall.remedy}</p>
                      )}
                    </div>
                  ))}
                  {vehicleHistoryData.recalls.length > 2 && (
                    <Button 
                      variant="ghost" 
                      className="w-full mt-2"
                      onClick={() => setShowAllRecalls(!showAllRecalls)}
                    >
                      {showAllRecalls ? 'Show Less' : `Show All ${vehicleHistoryData.recalls.length} Recalls`}
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {/* Complaints Summary */}
            {vehicleHistoryData.complaints && vehicleHistoryData.complaints.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-yellow-700 mb-2">
                  Consumer Complaints: {vehicleHistoryData.total_complaints || 0}
                </p>
                <div className="space-y-1">
                  {vehicleHistoryData.complaints.slice(0, 3).map((complaint, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{complaint.component}</span>
                      <span className="font-semibold">{complaint.count} reports</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* External Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {vehicleHistoryData.links.carfax && (
                <Button 
                  variant="outline"
                  onClick={() => window.open(vehicleHistoryData.links.carfax!, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  CARFAX Report
                </Button>
              )}
              {vehicleHistoryData.links.autocheck && (
                <Button 
                  variant="outline"
                  onClick={() => window.open(vehicleHistoryData.links.autocheck!, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  AutoCheck Report
                </Button>
              )}
              {vehicleHistoryData.links.nhtsa && (
                <Button 
                  variant="outline"
                  onClick={() => window.open(vehicleHistoryData.links.nhtsa!, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  NHTSA Safety Info
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Purchase Steps */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Step 1: Get Pre-Approved */}
          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-automotive-blue/10">
                <Calculator className="h-6 w-6 text-automotive-blue" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Get Pre-Approved</h3>
                <p className="text-muted-foreground mb-4">
                  Get pre-approved for financing to strengthen your negotiating position.
                </p>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={fetchFinancingOptions}
                  disabled={loadingFinancing || showFinancing}
                >
                  {loadingFinancing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : showFinancing ? (
                    '✓ Options Shown'
                  ) : financingData ? (
                    'View Financing Options'
                  ) : (
                    'Find Financing Options'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Step 2: Vehicle History Report */}
          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-automotive-success/10">
                <FileText className="h-6 w-6 text-automotive-success" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Vehicle History</h3>
                <p className="text-muted-foreground mb-4">
                  Get a detailed vehicle history report before making an offer.
                </p>
                <Button className="w-full" variant="outline" onClick={fetchVehicleHistory} disabled={loadingVehicleHistory || showVehicleHistory}>
                  {loadingVehicleHistory ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : showVehicleHistory ? (
                    '✓ Report Shown'
                  ) : vehicleHistoryData ? (
                    'View Vehicle History'
                  ) : (
                    'Get Vehicle History Report'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Step 3: Schedule Inspection */}
          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <CheckCircle className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Pre-Purchase Inspection</h3>
                <p className="text-muted-foreground mb-4">
                  Have a trusted mechanic inspect the vehicle before purchase.
                </p>
                <Button className="w-full" variant="outline" onClick={fetchInspectionOptions} disabled={loadingInspection || showInspection}>
                  {loadingInspection ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finding...
                    </>
                  ) : showInspection ? (
                    '✓ Services Shown'
                  ) : inspectionData ? (
                    'View Inspection Services'
                  ) : (
                    'Find Inspectors Near You'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Step 4: Insurance Quote */}
          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Shield className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Get Insurance Quote</h3>
                <p className="text-muted-foreground mb-4">
                  Compare insurance rates before finalizing your purchase.
                </p>
                <Button className="w-full" variant="outline" onClick={fetchInsuranceOptions} disabled={loadingInsurance || showInsurance}>
                  {loadingInsurance ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Getting Quotes...
                    </>
                  ) : showInsurance ? (
                    '✓ Quotes Shown'
                  ) : insuranceData ? (
                    'View Insurance Quotes'
                  ) : (
                    'Compare Insurance'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Contact Dealer */}
        <Card className="p-6">
          <h3 className="text-2xl font-semibold mb-4">Ready to Contact the Dealer?</h3>
          <p className="text-muted-foreground mb-6">
            We'll help you prepare with negotiation tips and fair price estimates.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Button className="w-full" size="lg">
              <Phone className="w-4 h-4 mr-2" />
              Call Dealer
            </Button>
            <Button className="w-full" size="lg" variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Email Dealer
            </Button>
          </div>
        </Card>

        {/* Helpful Resources */}
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-semibold mb-4">Helpful Resources</h3>
          <div className="space-y-3">
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => window.open('https://www.consumerreports.org/cars/buying-a-car/how-to-negotiate-car-price/', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              📝 Negotiation Tips and Strategies
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => window.open('https://www.bankrate.com/loans/auto-loans/auto-loan-calculator/', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              💰 Financing Calculator
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => window.open('https://www.edmunds.com/car-buying/10-steps-to-buying-a-new-car.html', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              📋 Purchase Checklist
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => window.open('https://www.ftc.gov/business-guidance/resources/buying-used-car', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              ⚖️ Your Rights as a Buyer
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Purchase;
