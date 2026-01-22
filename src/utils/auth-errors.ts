import { AuthError } from "@supabase/supabase-js";

export const getAuthErrorMessage = (error: AuthError | Error | null): string => {
  if (!error) return "An unknown error occurred";

  const message = error.message.toLowerCase();

  // Login errors
  if (message.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (message.includes("email not confirmed")) {
    return "Please verify your email address before logging in.";
  }

  // Signup errors
  if (message.includes("user already registered")) {
    return "This email is already registered. Please sign in instead.";
  }
  if (message.includes("password should be at least")) {
    return "Password is too weak. It must be at least 6 characters.";
  }
  if (message.includes("anonymous sign-ins are disabled")) {
    return "Guest access is currently disabled.";
  }

  // Rate limiting / Security
  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Too many attempts. Please wait a moment before trying again.";
  }

  // General fallback for other specific Supabase errors that might be readable
  // If it's a short message, it might be safe to show, but for safety we often sanitize
  // However, often specific messages like "Password must contain..." are useful.
  if (message.length < 100 && !message.includes("json") && !message.includes("token")) {
      return error.message; 
  }

  return "An unexpected error occurred. Please try again later.";
};
