import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const newPassword = url.searchParams.get('password');

    // For GET requests (clicking email link), show a password reset form
    if (req.method === 'GET') {
      if (!token) {
        return new Response(
          getErrorPage('Invalid or missing token'),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          }
        );
      }

      // Initialize Supabase admin client
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Verify the token
      const { data: resetRequest, error: fetchError } = await supabaseAdmin
        .from('password_reset_requests')
        .select('*')
        .eq('token', token)
        .is('completed_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !resetRequest) {
        return new Response(
          getErrorPage('Invalid or expired password reset link'),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          }
        );
      }

      // Show password reset form
      return new Response(
        getPasswordResetForm(token),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    // For POST requests (submitting new password)
    if (req.method === 'POST') {
      if (!token || !newPassword) {
        throw new Error('Token and new password are required');
      }

      // Initialize Supabase admin client
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Verify the token and get the request
      const { data: resetRequest, error: fetchError } = await supabaseAdmin
        .from('password_reset_requests')
        .select('*')
        .eq('token', token)
        .is('completed_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !resetRequest) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Update user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        resetRequest.user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw new Error('Failed to update password');
      }

      // Mark the reset request as completed
      await supabaseAdmin
        .from('password_reset_requests')
        .update({ completed_at: new Date().toISOString() })
        .eq('token', token);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Password reset successfully' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in confirm-password-reset:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

function getPasswordResetForm(token: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: 50px auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          color: #666;
          font-weight: 500;
        }
        input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        button {
          width: 100%;
          padding: 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        button:hover {
          background-color: #0056b3;
        }
        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        .error {
          color: #dc3545;
          margin-top: 10px;
          font-size: 14px;
        }
        .success {
          color: #28a745;
          margin-top: 10px;
          font-size: 14px;
        }
        .requirements {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Reset Your Password</h1>
        <form id="resetForm">
          <div class="form-group">
            <label for="password">New Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required 
              minlength="6"
              placeholder="Enter new password"
            />
            <div class="requirements">Minimum 6 characters</div>
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword" 
              required 
              minlength="6"
              placeholder="Confirm new password"
            />
          </div>
          <button type="submit" id="submitBtn">Reset Password</button>
          <div id="message"></div>
        </form>
      </div>

      <script>
        const form = document.getElementById('resetForm');
        const submitBtn = document.getElementById('submitBtn');
        const messageDiv = document.getElementById('message');

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const password = document.getElementById('password').value;
          const confirmPassword = document.getElementById('confirmPassword').value;

          if (password !== confirmPassword) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Passwords do not match';
            return;
          }

          if (password.length < 6) {
            messageDiv.className = 'error';
            messageDiv.textContent = 'Password must be at least 6 characters';
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = 'Resetting...';
          messageDiv.textContent = '';

          try {
            const response = await fetch(window.location.href, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                token: '${token}',
                password: password 
              }),
            });

            const data = await response.json();

            if (response.ok) {
              messageDiv.className = 'success';
              messageDiv.textContent = 'Password reset successfully! You can now close this window and log in with your new password.';
              form.reset();
            } else {
              throw new Error(data.error || 'Failed to reset password');
            }
          } catch (error) {
            messageDiv.className = 'error';
            messageDiv.textContent = error.message;
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Reset Password';
          }
        });
      </script>
    </body>
    </html>
  `;
}

function getErrorPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: 50px auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }
        h1 {
          color: #dc3545;
          margin-bottom: 20px;
        }
        p {
          color: #666;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Error</h1>
        <p>${message}</p>
        <p>Please request a new password reset if needed.</p>
      </div>
    </body>
    </html>
  `;
}

// Handle POST request with JSON body
serve(async (req: Request) => {
  if (req.method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
    const body = await req.json();
    const url = new URL(req.url);
    url.searchParams.set('token', body.token);
    url.searchParams.set('password', body.password);
    
    const modifiedReq = new Request(url.toString(), {
      method: 'POST',
      headers: req.headers,
    });
    
    return handler(modifiedReq);
  }
  
  return handler(req);
});
