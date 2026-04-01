import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Globe, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "customer"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null,
        role: formData.role
      });
      
      // Show email confirmation message instead of redirecting immediately
      setRegistrationComplete(true);
      toast.success("Account created! Check your email to confirm your account.");
    } catch (error) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <Globe className="h-8 w-8 text-[#0A2463]" />
            <span className="font-bold text-xl tracking-tight text-[#0A2463]" style={{ fontFamily: 'Manrope' }}>
              GLOBAL ACCESS
            </span>
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ fontFamily: 'Manrope' }}>
            Create Account
          </h1>
          <p className="text-muted-foreground mb-8">
            Join Global Access and start shipping today
          </p>

          {registrationComplete ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-green-900 mb-2">
                  ✓ Registration Successful
                </h2>
                <p className="text-green-800 mb-4">
                  We've sent a confirmation email to <strong>{formData.email}</strong>
                </p>
                <p className="text-green-700 text-sm mb-4">
                  Please click the link in the email to confirm your account. Once confirmed, you'll be able to log in.
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-green-700">
                    <strong>Next steps:</strong>
                  </p>
                  <ol className="text-sm text-green-700 list-decimal list-inside space-y-1">
                    <li>Check your email for confirmation link</li>
                    <li>Click the link to verify your email</li>
                    <li>You'll be logged in automatically</li>
                  </ol>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full h-12 bg-[#0A2463] hover:bg-[#1E3B8A]"
                >
                  Go to Login
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Didn't receive an email?{" "}
                  <button
                    onClick={() => setRegistrationComplete(false)}
                    className="text-[#0A2463] font-medium hover:underline"
                  >
                    Try registering again
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="h-12"
                data-testid="register-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-12"
                data-testid="register-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="h-12"
                data-testid="register-phone-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Account Type</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => handleChange("role", value)}
              >
                <SelectTrigger className="h-12" data-testid="register-role-select">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="h-12 pr-12"
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                className="h-12"
                data-testid="register-confirm-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#FF5722] hover:bg-[#FF7043]"
              data-testid="register-submit-btn"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="text-[#0A2463] font-medium hover:underline"
              data-testid="register-login-link"
            >
              Sign in
            </Link>
          </p>
            </>
          )}
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:flex-1 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1644079446600-219068676743)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 hero-gradient opacity-60" />
        <div className="relative z-10 h-full flex items-end p-12">
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Manrope' }}>
              Enterprise Logistics Platform
            </h2>
            <p className="text-white/80">
              Streamline your shipping operations with powerful tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
