import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type AcceptResult = {
  success: boolean;
  error?: string;
  organization_id?: string;
  role?: string;
  already_member?: boolean;
};

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<'loading' | 'checking_auth' | 'accepting' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [result, setResult] = useState<AcceptResult | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No invitation token provided');
      return;
    }

    const checkAuthAndAccept = async () => {
      setStatus('checking_auth');
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to auth with return URL
        const returnUrl = `/accept-invite?token=${token}`;
        toast.info("Please sign in to accept the invitation");
        navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // User is authenticated, accept the invitation
      setStatus('accepting');
      
      try {
        const { data, error } = await supabase.rpc('accept_invitation', {
          p_token: token
        });

        if (error) {
          console.error("Error accepting invitation:", error);
          setStatus('error');
          setErrorMessage('Failed to accept invitation. Please try again.');
          return;
        }

        const acceptResult = data as AcceptResult;
        setResult(acceptResult);

        if (!acceptResult.success) {
          setStatus('error');
          switch (acceptResult.error) {
            case 'INVALID_OR_EXPIRED_INVITE':
              setErrorMessage('This invitation is invalid or has expired.');
              break;
            case 'EMAIL_MISMATCH':
              setErrorMessage('This invitation was sent to a different email address. Please sign in with the correct account.');
              break;
            case 'NOT_AUTHENTICATED':
              setErrorMessage('You must be signed in to accept this invitation.');
              break;
            default:
              setErrorMessage(acceptResult.error || 'An unknown error occurred.');
          }
          return;
        }

        setStatus('success');
        
        if (acceptResult.already_member) {
          toast.info("You're already a member of this organization");
        } else {
          toast.success("You've successfully joined the organization!");
        }

      } catch (err: any) {
        console.error("Error:", err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    checkAuthAndAccept();
  }, [token, navigate]);

  const handleGoToDashboard = async () => {
    if (!result?.organization_id) {
      navigate('/dashboard');
      return;
    }

    // Get the organization's subdomain to redirect properly
    const { data: org } = await supabase
      .from('organizations')
      .select('subdomain')
      .eq('id', result.organization_id)
      .single();

    if (org?.subdomain) {
      // Redirect to the organization's subdomain
      const protocol = window.location.protocol;
      window.location.href = `${protocol}//${org.subdomain}.casewyze.com/dashboard`;
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {status === 'loading' || status === 'checking_auth' || status === 'accepting' ? (
              'Processing Invitation...'
            ) : status === 'success' ? (
              'Invitation Accepted!'
            ) : (
              'Invitation Error'
            )}
          </CardTitle>
          <CardDescription>
            {status === 'loading' || status === 'checking_auth' ? (
              'Checking your authentication status...'
            ) : status === 'accepting' ? (
              'Joining the organization...'
            ) : status === 'success' ? (
              result?.already_member 
                ? "You're already a member of this organization."
                : `You've been added with the ${result?.role || 'member'} role.`
            ) : (
              'There was a problem with your invitation.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {(status === 'loading' || status === 'checking_auth' || status === 'accepting') && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <Button onClick={handleGoToDashboard} className="w-full">
                Go to Dashboard
              </Button>
            </>
          )}
          
          {status === 'error' && (
            <>
              {errorMessage.includes('expired') || errorMessage.includes('invalid') ? (
                <AlertTriangle className="h-16 w-16 text-amber-500" />
              ) : (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
              <p className="text-center text-muted-foreground">
                {errorMessage}
              </p>
              <div className="flex gap-3 w-full">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/auth')}
                  className="flex-1"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Go Home
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}