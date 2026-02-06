import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';

export function Auth() {
  const { signIn, signUp, setScreen } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up State
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signIn(signInEmail, signInPassword);
      if (error) {
        // Handle common errors with user-friendly messages
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
          setError('Too many attempts. Please wait 60 seconds and try again, or use Demo Mode.');
        } else if (errorMsg.includes('invalid') && errorMsg.includes('credentials')) {
          setError('Invalid email or password. Please check and try again.');
        } else {
          setError(error.message);
        }
      } else {
        setScreen('dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (signUpPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signUp(signUpEmail, signUpPassword, signUpUsername);
      if (error) {
        // Handle common Supabase errors with user-friendly messages
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
          setError('Too many signup attempts. Please wait 60 seconds and try again, or use Demo Mode.');
        } else if (error.message.includes('already registered')) {
          setError('This email is already registered. Try signing in instead.');
        } else if (error.message.includes('Database error')) {
          setError('Account created, but there was an issue setting up your profile. Try signing in.');
          setSuccess('You can now sign in with your credentials.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess('Account created! If email confirmation is enabled, check your email. Otherwise, you can sign in now.');
        setSignUpEmail('');
        setSignUpPassword('');
        setSignUpConfirmPassword('');
        setSignUpUsername('');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-remembra-bg-primary flex flex-col">
      {/* Header */}
      <header className="px-5 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setScreen('dashboard')}
          className="text-remembra-text-secondary hover:text-remembra-text-primary"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-semibold text-remembra-text-primary">Account</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-5">
        <Card className="w-full max-w-md bg-remembra-bg-secondary border-remembra-border">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary flex items-center justify-center mb-4">
              <Brain size={32} className="text-white" />
            </div>
            <CardTitle className="text-2xl text-remembra-text-primary">Remembra</CardTitle>
            <CardDescription className="text-remembra-text-muted">
              Sign in to sync your data across devices
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Demo Mode Info Banner */}
            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400">
                <span className="font-semibold">💡 Tip:</span> Can't sign in? Use the back button to try Demo Mode with local storage.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-remembra-bg-tertiary">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-remembra-text-secondary">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        className="pl-10 bg-remembra-bg-tertiary border-remembra-border text-remembra-text-primary"
                        pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                        title="Enter a valid email address"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-remembra-text-secondary">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        className="pl-10 bg-remembra-bg-tertiary border-remembra-border text-remembra-text-primary"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-remembra-text-secondary">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input
                        id="signup-username"
                        type="text"
                        placeholder="Choose a username"
                        value={signUpUsername}
                        onChange={(e) => setSignUpUsername(e.target.value)}
                        className="pl-10 bg-remembra-bg-tertiary border-remembra-border text-remembra-text-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-remembra-text-secondary">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        className="pl-10 bg-remembra-bg-tertiary border-remembra-border text-remembra-text-primary"
                        pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                        title="Enter a valid email address"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-remembra-text-secondary">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        className="pl-10 bg-remembra-bg-tertiary border-remembra-border text-remembra-text-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-remembra-text-secondary">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-remembra-text-muted" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="Confirm your password"
                        value={signUpConfirmPassword}
                        onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                        className="pl-10 bg-remembra-bg-tertiary border-remembra-border text-remembra-text-primary"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <p className="text-xs text-remembra-text-muted">
                By signing in, your data will be synced to the cloud and available across all your devices.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
