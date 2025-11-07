import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
// import logo from "@/assets/techiemaya-logo.png";
const logo = "/techiemaya-logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        navigate("/");
      }
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const response = await api.auth.register({
          email,
          password,
          full_name: email.split('@')[0], // Use email prefix as name
        });
        
        // Save token
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        toast({
          title: "Success",
          description: "Account created successfully",
        });
        navigate("/");
      } else {
        // Trim email before sending
        const response = await api.auth.login({
          email: email.trim().toLowerCase(),
          password,
        });
        
        // Save token
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        navigate("/");
      }
    } catch (error: any) {
      let errorMessage = error.message || "Authentication failed";
      
      // Provide helpful message for connection errors
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('Cannot connect to server')) {
        errorMessage = "Backend server is not running. Please start the backend server first. See README.md for instructions.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show longer for connection errors
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.auth.forgotPassword(email.trim().toLowerCase()) as any;
      // In development, the token is returned - use it directly
      if (response.resetToken) {
        setResetToken(response.resetToken);
        toast({
          title: "Success",
          description: "Please enter your new password below.",
        });
      } else {
        toast({
          title: "Success",
          description: "Password reset link sent to your email. Please check your inbox.",
        });
        setShowForgotPassword(false);
        setEmail("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await api.auth.resetPassword(resetToken, newPassword);
      toast({
        title: "Success",
        description: "Password reset successfully. Please login with your new password.",
      });
      setShowForgotPassword(false);
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-1">
            <img src={logo} alt="TechieMaya Logo" className="h-52 w-auto" />
          </div>
          <CardTitle className="text-2xl">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {showForgotPassword
              ? "Reset your password"
              : isSignUp
              ? "Sign up to create your timesheet"
              : "Sign in to manage your timesheet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showForgotPassword ? (
            resetToken ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetToken("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="text-primary hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="text-primary hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )
          ) : (
            <>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
                {!isSignUp && (
                  <div className="text-right text-sm">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline"
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </button>
          </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

