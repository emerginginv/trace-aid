import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantBranding, isValidHexColor } from "@/hooks/use-tenant-branding";
import { useFavicon } from "@/hooks/use-favicon";
import { getAuthErrorMessage } from "@/utils/auth-errors";
const signInSchema = z.object({
  email: z.string().trim().min(1, "Email or username is required").max(255, "Input must be less than 255 characters"),
  password: z.string().min(1, "Password is required")
});
const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Full name must be less than 100 characters"),
  organizationName: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100, "Organization name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email format").max(255, "Email must be less than 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be less than 128 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number")
});
type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be less than 128 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email format")
});
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Tenant branding
  const { tenantSubdomain } = useTenant();
  const { data: branding, isError: brandingError } = useTenantBranding(tenantSubdomain);

  // Determine if we should show tenant branding
  const showTenantBranding = !brandingError && branding?.found && branding?.branding_enabled;
  const accentColor = showTenantBranding && branding?.accent_color && isValidHexColor(branding.accent_color)
    ? branding.accent_color
    : null;

  // Set favicon from organization's square logo (always, not gated by branding_enabled)
  useFavicon(branding?.favicon_url);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      organizationName: "",
      email: "",
      password: ""
    }
  });
  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });
  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      // Check for hash parameters (password reset token from email)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      // If we have a recovery token in the URL, show password reset form
      if (accessToken && type === 'recovery') {
        setIsPasswordReset(true);
        return;
      }
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session) {
        // Check user role and redirect accordingly
        const {
          data: roleData
        } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
        if (roleData?.role === "vendor") {
          navigate("/dashboard"); // Vendor dashboard shows automatically via role check
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkSessionAndRedirect();
  }, [navigate]);
  const handleSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      const {
        data: authData,
        error
      } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/billing`,
          data: {
            full_name: data.fullName,
            organization_name: data.organizationName
          }
        }
      });
      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else if (authData.user) {
        toast.success("Account created! Setting up your workspace...");

        // Wait a moment for the organization trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Get the user's organization to send welcome email
        const { data: memberData } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", authData.user.id)
          .single();

        // Send welcome email with portal URL (fire and forget)
        if (memberData?.organization_id) {
          supabase.functions.invoke("send-welcome-email", {
            body: {
              userId: authData.user.id,
              organizationId: memberData.organization_id,
            },
          }).catch(err => {
            console.error("Failed to send welcome email:", err);
            // Don't block the user flow for email errors
          });
        }

        // Check if user has vendor role - vendors skip payment
        const {
          data: roleData
        } = await supabase.from("user_roles").select("role").eq("user_id", authData.user.id).maybeSingle();
        
        if (roleData?.role === "vendor") {
          // Vendors go directly to dashboard
          navigate("/dashboard");
        } else {
          // Regular users go to billing to select plan (BillingGate will handle it)
          navigate("/billing");
        }
      }
    } catch (error: any) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: data.password
      });
      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else {
        toast.success("Password updated successfully!");
        setIsPasswordReset(false);

        // Clear the hash from URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Redirect to dashboard
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
    } catch (error: any) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`
      });
      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setIsForgotPassword(false);
        forgotPasswordForm.reset();
      }
    } catch (error: any) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  const handleSignIn = async (data: SignInFormData) => {
    setLoading(true);
    try {
      let loginEmail = data.email;

      // Check if input is a username (doesn't contain @)
      if (!data.email.includes("@")) {
        const {
          data: profile,
          error: profileError
        } = await supabase.from("profiles").select("email").eq("username", data.email).maybeSingle();
        if (profileError || !profile) {
          toast.error("Username not found");
          setLoading(false);
          return;
        }
        loginEmail = profile.email;
      }
      const {
        data: authData,
        error
      } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: data.password
      });
      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else if (authData.user) {
        toast.success("Signed in successfully!");

        // Check user role for appropriate redirect
        const {
          data: roleData
        } = await supabase.from("user_roles").select("role").eq("user_id", authData.user.id).maybeSingle();

        // All users go to dashboard - role determines what they see
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };
  // Custom CSS properties for accent color
  const accentStyles = accentColor
    ? ({
        "--auth-accent": accentColor,
        "--auth-accent-hover": `${accentColor}dd`,
      } as React.CSSProperties)
    : {};

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" style={accentStyles}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Tenant Logo or Default */}
          {showTenantBranding && branding?.logo_url ? (
            <div className="mb-4 flex justify-center">
              <img
                src={branding.logo_url}
                alt={branding.brand_name || "Login"}
                className="h-16 max-w-[200px] object-contain"
                onError={(e) => {
                  // Fallback to default on error
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
          )}
          
          {/* Brand Name or Default */}
          <h1 className="text-3xl font-bold">
            {showTenantBranding && branding?.brand_name ? branding.brand_name : "Case Manager"}
          </h1>
          <p className="text-muted-foreground mt-2">Professional case management</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isPasswordReset ? "Reset Password" : isForgotPassword ? "Forgot Password" : "Welcome"}
            </CardTitle>
            <CardDescription>
              {isPasswordReset ? "Enter your new password below" : isForgotPassword ? "Enter your email to receive a password reset link" : "Sign in to your account or create a new one"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPasswordReset ? <Form {...resetPasswordForm}>
                <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                  <FormField control={resetPasswordForm.control} name="password" render={({
                field
              }) => <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  <FormField control={resetPasswordForm.control} name="confirmPassword" render={({
                field
              }) => <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Form> : isForgotPassword ? <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                  <FormField control={forgotPasswordForm.control} name="email" render={({
                field
              }) => <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setIsForgotPassword(false)}>
                    Back to Sign In
                  </Button>
                </form>
              </Form> : <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <FormField control={signInForm.control} name="email" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Email or Username</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Enter username or email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={signInForm.control} name="password" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <div className="flex justify-end">
                      <Button type="button" variant="link" className="px-0 text-sm" onClick={() => setIsForgotPassword(true)}>
                        Forgot password?
                      </Button>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup">
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField control={signUpForm.control} name="fullName" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={signUpForm.control} name="organizationName" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Acme Law Firm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={signUpForm.control} name="email" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <FormField control={signUpForm.control} name="password" render={({
                    field
                  }) => <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
             </Tabs>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;