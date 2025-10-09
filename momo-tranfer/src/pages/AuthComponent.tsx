import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Globe, MapPin } from "lucide-react";
import { CountryDetectionService } from "../services/countryDetection";
import type { CountryInfo } from "../services/countryDetection";

export const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<CountryInfo | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const navigate = useNavigate();

  // Auto-detect country on component mount
  useEffect(() => {
    detectUserCountry();
  }, []);

  const detectUserCountry = async () => {
    setIsDetectingLocation(true);
    try {
      const country = await CountryDetectionService.detectCountry();
      setDetectedCountry(country);
      if (country) {
        toast.success(`📍 Detected location: ${country.flag} ${country.name}`);
      }
    } catch (error) {
      console.warn('Country detection failed:', error);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Update country when phone number changes
  useEffect(() => {
    if (phoneNumber.length > 3) {
      const country = CountryDetectionService.detectFromPhoneNumber(phoneNumber);
      if (country && country.code !== detectedCountry?.code) {
        setDetectedCountry(country);
        toast.success(`📱 Country updated: ${country.flag} ${country.name}`);
      }
    }
  }, [phoneNumber, detectedCountry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    // Validate phone number
    const isValid = CountryDetectionService.validatePhoneNumber(phoneNumber, detectedCountry?.code);
    if (!isValid) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      toast.success(`Welcome to ${detectedCountry?.mobileMoneyProvider || 'MoMo Transfer'}! 🎉`);
      navigate("/dashboard", { 
        state: { 
          country: detectedCountry,
          phoneNumber: CountryDetectionService.formatPhoneNumber(phoneNumber, detectedCountry?.code)
        } 
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">Sign in to your MoMo Transfer account</p>
          
          {/* Country Detection Display */}
          {detectedCountry && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">{detectedCountry.flag}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900">{detectedCountry.name}</p>
                  <p className="text-xs text-blue-600">{detectedCountry.mobileMoneyProvider}</p>
                </div>
                {isDetectingLocation && (
                  <MapPin className="w-4 h-4 text-blue-500 animate-pulse" />
                )}
              </div>
            </div>
          )}
          
          {/* Manual Country Selection */}
          <button
            type="button"
            onClick={detectUserCountry}
            disabled={isDetectingLocation}
            className="mt-2 text-xs text-blue-600 hover:text-cyan-500 transition-colors flex items-center justify-center space-x-1"
          >
            <Globe className="w-3 h-3" />
            <span>{isDetectingLocation ? 'Detecting...' : 'Detect Location'}</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input 
              type="tel" 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)} 
              placeholder="+256 781 234 567" 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/50" 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 mt-6"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
        
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button 
              onClick={() => navigate("/register")} 
              className="text-blue-600 hover:text-cyan-500 font-medium transition-colors"
            >
              Sign up here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
