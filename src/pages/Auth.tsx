import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Shield,
  Eye,
  EyeOff,
  Globe,
  User,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Building,
} from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import {
  useTenantBranding,
  isValidHexColor,
} from "@/hooks/use-tenant-branding";
import { useFavicon } from "@/hooks/use-favicon";
import { getAuthErrorMessage } from "@/utils/auth-errors";
const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email or username is required")
    .max(255, "Input must be less than 255 characters"),
  password: z.string().min(1, "Password is required"),
});
const signUpSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  subdomain: z
    .string()
    .trim()
    .min(3, "Subdomain must be at least 3 characters")
    .max(30, "Subdomain must be less than 30 characters")
    .regex(/^[a-zA-Z0-9-]+$/, "Only letters, numbers, and dashes allowed")
    .refine((val) => val.toLowerCase() !== "www", "Subdomain cannot be 'www'")
    .transform((val) => val.toLowerCase()),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  phone: z
    .string()
    .trim()
    .min(5, "Phone number is required")
    .max(20, "Phone number is too long"),

  // Billing Information
  cardNumber: z
    .string()
    .min(16, "Card number must be at least 16 digits")
    .max(19, "Card number is too long"),
  expiryDate: z
    .string()
    .regex(
      /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
      "Expiration date must be in MM/YY format",
    ),
  cvv: z
    .string()
    .min(3, "CVV must be 3 or 4 digits")
    .max(4, "CVV must be 3 or 4 digits"),
  billingAddress: z.string().min(1, "Billing address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State / Province is required"),
  zipCode: z.string().min(1, "Zip / Postal code is required"),
  country: z.string().min(1, "Country is required"),
});
type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
});
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "India",
  "United Arab Emirates",
  "Singapore",
  "Others",
];

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true); // New state to prevent flicker
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [newSubdomain, setNewSubdomain] = useState("");

  // Tenant branding
  const { tenantSubdomain } = useTenant();
  const { data: branding, isError: brandingError } =
    useTenantBranding(tenantSubdomain);

  // Determine if we should show tenant branding
  const showTenantBranding =
    !brandingError && branding?.found && branding?.branding_enabled;
  const accentColor =
    showTenantBranding &&
    branding?.accent_color &&
    isValidHexColor(branding.accent_color)
      ? branding.accent_color
      : null;

  // Set favicon from organization's square logo (always, not gated by branding_enabled)
  useFavicon(branding?.favicon_url);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      companyName: "",
      subdomain: "",
      email: "",
      phone: "",
      cardNumber: "",
      expiryDate: "",
      cvv: "",
      billingAddress: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  });
  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  useEffect(() => {
    // 1. Detect if we are in Setup or Recovery mode from URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");
    const urlParams = new URLSearchParams(window.location.search);
    const isSetup = urlParams.get("setup") === "true";

    // 2. Check current session status
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isSetupCompleted = session?.user?.user_metadata?.setup_completed === true;

      // If user is already logged in and setup is finished, ALWAYS go to dashboard
      // even if they tried to visit /auth?setup=true
      if (session && isSetupCompleted && !isPasswordReset) {
        console.log('[Auth] User already setup, redirecting to dashboard');
        navigate("/dashboard");
        return;
      }

      // If setup mode is requested and they HAVEN'T finished it yet, show setup form
      if (((accessToken && (type === "recovery" || type === "signup")) || isSetup) && !isSetupCompleted) {
        console.log('[Auth] Setup/Recovery mode detected');
        setIsPasswordReset(true);
        setCheckingSession(false);
      } else {
        // Otherwise show standard login/signup
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate]);
  const handleSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    try {
      // Generate a temporary random password
      const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: tempPassword,
        options: {
          emailRedirectTo: `https://${data.subdomain}.caseinformation.app/auth?setup=true`,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            full_name: `${data.firstName} ${data.lastName}`,
            organization_name: data.companyName,
            company_name: data.companyName,
            phone: data.phone,
            subdomain: data.subdomain,
            billing_address: data.billingAddress,
            billing_city: data.city,
            billing_state: data.state,
            billing_zip: data.zipCode,
            billing_country: data.country,
            // Capture billing card info as requested for "complete data"
            card_number: data.cardNumber,
            expiry_date: data.expiryDate,
            cvv: data.cvv,
          },
        },
      });
      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else if (authData.user) {
        toast.success("Account created! Sending setup link...");

        // Wait a moment for the organization trigger to complete
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Get the user's organization to send welcome email
        console.log('[DEBUG] Fetching org id for user:', authData.user.id);
        const { data: orgId, error: rpcError } = await supabase
          .rpc("get_org_id_by_user_id", { p_user_id: authData.user.id });

        if (rpcError) {
          console.error('[DEBUG] RPC Error fetching org id:', rpcError);
        }

        console.log('[DEBUG] Resolved orgId:', orgId);

        // Send welcome email with portal URL (fire and forget)
        if (orgId) {
          console.log('[DEBUG] Invoking send-welcome-email for org:', orgId);
          supabase.functions
            .invoke("send-welcome-email", {
              body: {
                userId: authData.user.id,
                organizationId: orgId,
              },
            })
            .then(res => console.log('[DEBUG] Welcome email invocation result:', res))
            .catch((err) => {
              console.error("Failed to send welcome email:", err);
            });
        } else {
          console.warn('[DEBUG] No organization found for user, welcome email skipped.');
        }

        // Check if user has vendor role - vendors skip payment
        // const {
        //   data: roleData
        // } = await supabase.from("user_roles").select("role").eq("user_id", authData.user.id).maybeSingle();

        // if (roleData?.role === "vendor") {
        //   // Vendors go directly to dashboard
        //   navigate("/dashboard");
        // } else {
        //   // Regular users go to billing to select plan (BillingGate will handle it)
        //   navigate("/dashboard");
        // }
        setNewSubdomain(data.subdomain);
        setSignupSuccess(true);
        toast.success("Success! Check your email to continue.");
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
      const { error } = await supabase.auth.updateUser({
        password: data.password,
        data: { setup_completed: true } // Mark setup as complete
      });
      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else {
        toast.success("Password set successfully! Please sign in with your new password.");
        
        // 2. LOG OUT explicitly to prevent automatic session continuation
        // This ensures the user must enter their credentials once to confirm they know them.
        await supabase.auth.signOut();
        
        setIsPasswordReset(false);

        // Clear params/hash from URL
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // Redirect to login view
        setTimeout(() => {
          navigate("/auth");
        }, 1500);
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
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
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
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", data.email)
          .maybeSingle();
        if (profileError || !profile) {
          toast.error("Username not found");
          setLoading(false);
          return;
        }
        loginEmail = profile.email;
      }
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: data.password,
      });
      if (error) {
        toast.error(getAuthErrorMessage(error));
      } else if (authData.user) {
        toast.success("Signed in successfully!");

        // Check user role for appropriate redirect
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authData.user.id)
          .maybeSingle();

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

  // Prevent flicker by showing a blank screen or loader while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background p-4"
      style={accentStyles}
    >
      {/* <div className="w-full max-w-md"> */}
      <div
        className={`w-full transition-all duration-300 ${isPasswordReset ? "max-w-2xl" : "max-w-2xl"}`}
      >
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
            {showTenantBranding && branding?.brand_name
              ? branding.brand_name
              : "Case Manager"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Professional case management
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isPasswordReset
                ? "Set Your Password"
                : isForgotPassword
                  ? "Forgot Password"
                  : signupSuccess
                    ? "Check your email"
                    : tenantSubdomain
                      ? "Sign In"
                      : "Get Started"}
            </CardTitle>
            <CardDescription>
              {isPasswordReset
                ? "Enter your new password below"
                : isForgotPassword
                  ? "Enter your email to receive a password reset link"
                  : signupSuccess
                    ? "Your account is ready"
                    : tenantSubdomain
                      ? `Sign in to access your ${branding?.brand_name || "workspace"}`
                      : "Create your account and workspace"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signupSuccess ? (
              <div key="signup-success" className="text-center py-8 space-y-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Check your email</h3>
                  <p className="text-muted-foreground">
                    Check your email for further setup.
                  </p>
                  {/* <p className="font-mono text-primary font-bold">
                    https://{newSubdomain}.caseinformation.app
                  </p> */}
                </div>
                {/* <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSignupSuccess(false)}
                >
                  Back to login
                </Button> */}
              </div>
            ) : isPasswordReset ? (
              <Form {...resetPasswordForm} key="reset-password-form">
                <form
                  onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)}
                  className="space-y-4"
                >
                  <FormField
                    control={resetPasswordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetPasswordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Setting up..." : "Setup Password"}
                  </Button>
                </form>
              </Form>
            ) : isForgotPassword ? (
              <Form {...forgotPasswordForm}>
                <form
                  onSubmit={forgotPasswordForm.handleSubmit(
                    handleForgotPassword,
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setIsForgotPassword(false)}
                  >
                    Back to Sign In
                  </Button>
                </form>
              </Form>
            ) : tenantSubdomain ? (
              /* Show Login on Tenant Subdomains */
              <Form {...signInForm} key="signin-form">
                <form
                  onSubmit={signInForm.handleSubmit(handleSignIn)}
                  className="space-y-4"
                >
                  <FormField
                    control={signInForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or Username</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter username or email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 text-sm"
                      onClick={() => setIsForgotPassword(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="text-center mt-4">
                    <p className="text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <a
                        href="https://caseinformation.app/auth"
                        className="text-primary hover:underline"
                      >
                        Sign up for your own workspace
                      </a>
                    </p>
                  </div>
                </form>
              </Form>
            ) : (
              /* Show Signup on Main Domain */
              <Form {...signUpForm} key="signup-form">
                <form
                  onSubmit={signUpForm.handleSubmit(handleSignUp)}
                  className="space-y-6"
                >
                  {/* Subdomain Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 text-primary font-semibold text-lg border-b pb-2">
                      <Globe className="w-5 h-5" />
                      <h3>Subdomain Selection</h3>
                    </div>
                    <FormField
                      control={signUpForm.control}
                      name="subdomain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unique Web Address</FormLabel>
                          <FormControl>
                            <div className="flex items-center group">
                              <span className="bg-muted px-3 py-2 rounded-l-md border border-r-0 text-muted-foreground text-sm group-focus-within:border-primary transition-colors">
                                https://
                              </span>
                              <Input
                                type="text"
                                placeholder="your-subdomain"
                                className="rounded-none lowercase focus-visible:ring-0 focus-visible:border-primary"
                                {...field}
                              />
                              <span className="bg-muted px-3 py-2 rounded-r-md border border-l-0 text-muted-foreground text-sm group-focus-within:border-primary transition-colors">
                                .caseinformation.app
                              </span>
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            No "www"; only letters, numbers and dashes allowed.
                            This will be your dedicated URL for accessing the
                            platform.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-primary font-semibold text-lg border-b pb-2">
                      <User className="w-5 h-5" />
                      <h3>Contact Information</h3>
                    </div>
                    <FormField
                      control={signUpForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <div className="relative flex items-center">
                              <Building className="absolute left-3 top-2.8 h-4 w-4 text-muted-foreground" />
                              <Input
                                className="pl-9"
                                placeholder="Acme Inc."
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={signUpForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="John"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={signUpForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Work Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-[14px] h-4 w-4 text-muted-foreground" />
                                <Input
                                  className="pl-9"
                                  type="email"
                                  placeholder="john@acme.com"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-[12px] h-4 w-4 text-muted-foreground" />
                                <Input
                                  className="pl-9"
                                  type="tel"
                                  placeholder="+1 (555) 000-0000"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Billing Information */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-primary font-semibold text-lg border-b pb-2">
                      <CreditCard className="w-5 h-5" />
                      <h3>Billing Information</h3>
                    </div>
                    <FormField
                      control={signUpForm.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CreditCard className="absolute left-3 top-[12px] h-4 w-4 text-muted-foreground" />
                              <Input
                                className="pl-9"
                                placeholder="0000 0000 0000 0000"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signUpForm.control}
                        name="expiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiration Date</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="MM/YY"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="cvv"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CVV</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={signUpForm.control}
                      name="billingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-[12px] h-4 w-4 text-muted-foreground" />
                              <Input
                                className="pl-9"
                                placeholder="123 Main St"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signUpForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="New York"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State / Province</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="NY" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signUpForm.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zip / Postal Code</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="10001"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold mt-6 gradient-primary text-white"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                  {/* <div className="text-center mt-4">
                      <p className="text-sm text-muted-foreground">
                        Already have a workspace? <span className="text-primary italic">Visit your unique subdomain to sign in.</span>
                      </p>
                    </div> */}
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
