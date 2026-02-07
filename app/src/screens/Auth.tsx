import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Brain, Mail, Lock, User, Loader2, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

type AuthView = 'signin' | 'signup' | 'forgot-password' | 'reset-password' | 'update-password';

export function Auth() {
  const { signIn, signUp, setScreen, isAuthenticated } = useStore();
  const [view, setView] = useState<AuthView>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  if (isAuthenticated && view !== 'update-password') {
    setScreen('dashboard');
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signIn(signInEmail, signInPassword);
      if (error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
          toast.error('Too many attempts. Please wait a moment and try again.');
        } else if (errorMsg.includes('invalid') && errorMsg.includes('credentials')) {
          toast.error('Invalid email or password.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Welcome back!');
        setScreen('dashboard');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (!acceptedTerms) {
      toast.error('Please accept the Terms of Service and Privacy Policy');
      setIsLoading(false);
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }
    if (signUpPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }
    try {
      const { error } = await signUp(signUpEmail, signUpPassword, signUpUsername);
      if (error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
          toast.error('Too many signup attempts. Please wait a moment.');
        } else if (error.message.includes('already registered')) {
          toast.error('This email is already registered. Try signing in.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Account created! You can now sign in.');
        setView('signin');
        setSignInEmail(signUpEmail);
        setSignUpEmail('');
        setSignUpPassword('');
        setSignUpConfirmPassword('');
        setSignUpUsername('');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await authService.signInWithProvider('google');
      if (error) {
        toast.error('Google sign in failed: ' + error.message);
      }
    } catch {
      toast.error('Failed to start Google sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await authService.resetPassword(resetEmail);
      if (error) {
        toast.error(error.message);
      } else {
        setResetSent(true);
        toast.success('Password reset email sent!');
      }
    } catch {
      toast.error('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await authService.updatePassword(newPassword);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully!');
        setScreen('dashboard');
      }
    } catch {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  // Forgot Password View
  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen bg-remembra-bg-primary flex flex-col">
        <div className="flex-1 flex items-center justify-center p-5">
          <Card className="w-full max-w-md bg-remembra-bg-secondary border-white/5">
            <CardContent className="pt-8 pb-8 px-6">
              <button
                onClick={() => { setView('signin'); setResetSent(false); }}
                className="flex items-center gap-2 text-sm text-remembra-text-muted hover:text-remembra-text-primary mb-6 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </button>
              <div className="text-center mb-8">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-remembra-accent-primary/20 to-remembra-accent-secondary/20 flex items-center justify-center mb-4">
                  <KeyRound size={28} className="text-remembra-accent-primary" />
                </div>
                <h2 className="text-xl font-bold text-remembra-text-primary">Reset Password</h2>
                <p className="text-sm text-remembra-text-muted mt-1">We'll send you a link to reset your password</p>
              </div>
              {resetSent ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-green-400" />
                  </div>
                  <p className="text-sm text-remembra-text-secondary">
                    Check your email for a password reset link. It may take a few minutes.
                  </p>
                  <Button
                    onClick={() => { setView('signin'); setResetSent(false); }}
                    className="w-full bg-remembra-bg-tertiary text-remembra-text-primary hover:bg-remembra-bg-tertiary/80"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-remembra-text-secondary text-sm">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input id="reset-email" type="email" placeholder="Enter your email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="pl-10 bg-remembra-bg-tertiary border-white/5 text-remembra-text-primary h-12 rounded-xl" required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white rounded-xl font-semibold" disabled={isLoading}>
                    {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>) : 'Send Reset Link'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Update Password View
  if (view === 'update-password') {
    return (
      <div className="min-h-screen bg-remembra-bg-primary flex flex-col">
        <div className="flex-1 flex items-center justify-center p-5">
          <Card className="w-full max-w-md bg-remembra-bg-secondary border-white/5">
            <CardContent className="pt-8 pb-8 px-6">
              <div className="text-center mb-8">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-remembra-accent-primary/20 to-remembra-accent-secondary/20 flex items-center justify-center mb-4">
                  <KeyRound size={28} className="text-remembra-accent-primary" />
                </div>
                <h2 className="text-xl font-bold text-remembra-text-primary">Set New Password</h2>
                <p className="text-sm text-remembra-text-muted mt-1">Choose a strong password for your account</p>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-remembra-text-secondary text-sm">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                    <Input id="new-password" type={showPassword ? 'text' : 'password'} placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 pr-10 bg-remembra-bg-tertiary border-white/5 text-remembra-text-primary h-12 rounded-xl" required minLength={6} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-remembra-text-muted hover:text-remembra-text-primary">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-remembra-text-secondary text-sm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                    <Input id="confirm-new-password" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="pl-10 pr-10 bg-remembra-bg-tertiary border-white/5 text-remembra-text-primary h-12 rounded-xl" required minLength={6} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-remembra-text-muted hover:text-remembra-text-primary">
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white rounded-xl font-semibold" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>) : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Auth View
  return (
    <div className="min-h-screen bg-remembra-bg-primary flex flex-col">
      <div className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary flex items-center justify-center mb-5 shadow-lg shadow-remembra-accent-primary/20">
              <Brain size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-remembra-text-primary">Remembra</h1>
            <p className="text-remembra-text-muted mt-2">
              {view === 'signin' ? 'Welcome back! Sign in to continue.' : 'Create an account to get started.'}
            </p>
          </div>

          <Card className="bg-remembra-bg-secondary border-white/5">
            <CardContent className="pt-6 pb-6 px-6">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline"
                className="w-full h-12 bg-white hover:bg-gray-100 text-gray-800 border-0 rounded-xl font-medium flex items-center justify-center gap-3 mb-5"
              >
                <GoogleIcon />
                Continue with Google
              </Button>
              
              <p className="text-xs text-remembra-text-muted text-center mt-2">
                By signing in with Google, you agree to our{' '}
                <a href="/docs/TERMS_OF_SERVICE.md" target="_blank" rel="noopener noreferrer" className="text-remembra-accent-primary hover:underline">
                  Terms
                </a>
                {' '}and{' '}
                <a href="/docs/PRIVACY_POLICY.md" target="_blank" rel="noopener noreferrer" className="text-remembra-accent-primary hover:underline">
                  Privacy Policy
                </a>
              </p>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-remembra-bg-secondary px-3 text-remembra-text-muted">or continue with email</span>
                </div>
              </div>

              <div className="flex rounded-xl bg-remembra-bg-tertiary p-1 mb-5">
                <button
                  onClick={() => setView('signin')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${view === 'signin' ? 'bg-remembra-accent-primary text-white shadow-sm' : 'text-remembra-text-muted hover:text-remembra-text-secondary'}`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setView('signup')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${view === 'signup' ? 'bg-remembra-accent-primary text-white shadow-sm' : 'text-remembra-text-muted hover:text-remembra-text-secondary'}`}
                >
                  Sign Up
                </button>
              </div>

              {view === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-remembra-text-secondary text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input id="signin-email" type="email" placeholder="you@example.com" value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} className="pl-10 bg-remembra-bg-tertiary border-white/5 text-remembra-text-primary h-12 rounded-xl" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-remembra-text-secondary text-sm">Password</Label>
                      <button type="button" onClick={() => setView('forgot-password')} className="text-xs text-remembra-accent-primary hover:text-remembra-accent-secondary transition-colors">Forgot password?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input id="signin-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} className="pl-10 pr-10 bg-remembra-bg-tertiary border-white/5 text-remembra-text-primary h-12 rounded-xl" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-remembra-text-muted hover:text-remembra-text-primary">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white rounded-xl font-semibold" disabled={isLoading}>
                    {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>) : 'Sign In'}
                  </Button>
                </form>
              )}

              {view === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-remembra-text-secondary text-sm">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input id="signup-username" type="text" placeholder="Choose a username" value={signUpUsername} onChange={(e) => setSignUpUsername(e.target.value)} className="pl-10 bg-remembra-bg-tertiary border-white/5 text-remembra-text-primary h-12 rounded-xl" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-remembra-text-secondary text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input id="signup-email" type="email" placeholder="you@example.com" value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} className="pl-10 bg-remembra-bg-tertiary border-white/5 text-remembra-text-primary h-12 rounded-xl" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-remembra-text-secondary text-sm">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} className="pl-10 pr-10 bg-remembra-bg-tertiary border-white/5 text-remembra-text-primary h-12 rounded-xl" required minLength={6} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-remembra-text-muted hover:text-remembra-text-primary">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-remembra-text-secondary text-sm">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input id="signup-confirm" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" value={signUpConfirmPassword} onChange={(e) => setSignUpConfirmPassword(e.target.value)} className="pl-10 pr-10 bg-remembra-bg-tertiary border-white/5 text-remembra-text-primary h-12 rounded-xl" required minLength={6} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-remembra-text-muted hover:text-remembra-text-primary">
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-remembra-bg-primary/50 border border-white/5">
                    <Checkbox 
                      id="terms" 
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-xs text-remembra-text-muted leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <a href="/docs/TERMS_OF_SERVICE.md" target="_blank" rel="noopener noreferrer" className="text-remembra-accent-primary hover:text-remembra-accent-secondary underline underline-offset-2">
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a href="/docs/PRIVACY_POLICY.md" target="_blank" rel="noopener noreferrer" className="text-remembra-accent-primary hover:text-remembra-accent-secondary underline underline-offset-2">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                  
                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white rounded-xl font-semibold" disabled={isLoading || !acceptedTerms}>
                    {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>) : 'Create Account'}
                  </Button>
                </form>
              )}

              <div className="text-center mt-5 space-y-2">
                <p className="text-xs text-remembra-text-muted">
                  Protected by industry-standard encryption
                </p>
                <div className="flex items-center justify-center gap-4 text-xs">
                  <a href="/PRIVACY_POLICY.md" target="_blank" rel="noopener noreferrer" className="text-remembra-text-muted hover:text-remembra-accent-primary transition-colors">
                    Privacy Policy
                  </a>
                  <span className="text-remembra-text-muted/30">•</span>
                  <a href="/docs/TERMS_OF_SERVICE.md" target="_blank" rel="noopener noreferrer" className="text-remembra-text-muted hover:text-remembra-accent-primary transition-colors">
                    Terms of Service
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
