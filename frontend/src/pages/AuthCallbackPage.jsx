import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Supabase automatically exchanges the token in URL for a session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth error:", error);
          throw error;
        }

        if (data.session) {
          // Email confirmed and logged in
          toast.success("Email confirmed! Welcome to Global Access.");
          navigate("/dashboard", { replace: true });
        } else {
          // No session - might still need to confirm
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email_confirmed_at) {
            toast.success("Email confirmed! Please log in.");
          } else {
            toast.info("Checking email confirmation...");
          }
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Email confirmation error:", err);
        setError(err.message);
        toast.error("Email confirmation failed: " + err.message);
        // Redirect to login after 2 seconds
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Email Confirmation Failed</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-[#0A2463]" />
        <h1 className="text-2xl font-bold mb-2">Confirming Your Email</h1>
        <p className="text-muted-foreground">Please wait...</p>
      </div>
    </div>
  );
}
