import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { 
  User,
  Mail,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  Palette,
  HelpCircle,
  FileText,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Profile() {
  const { user, profile, signOut, memoryItems, categories } = useStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutDialog(false);
    }
  };

  // Get user stats
  const stats = {
    totalItems: memoryItems.length,
    masteredItems: memoryItems.filter(i => i.status === 'mastered').length,
    categories: categories.length,
    streak: profile?.streak_count || 0,
    totalReviews: profile?.total_reviews || 0,
  };

  // Get user initials
  const getInitials = () => {
    if (profile?.username) {
      return profile.username.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const menuItems = [
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      description: 'Manage reminders & alerts',
      action: () => console.log('Notifications'),
    },
    {
      id: 'appearance',
      icon: Palette,
      label: 'Appearance',
      description: 'Theme & display settings',
      action: () => console.log('Appearance'),
    },
    {
      id: 'privacy',
      icon: Shield,
      label: 'Privacy & Security',
      description: 'Account security options',
      action: () => console.log('Privacy'),
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'FAQs and contact support',
      action: () => console.log('Help'),
    },
    {
      id: 'terms',
      icon: FileText,
      label: 'Terms & Privacy Policy',
      description: 'Legal information',
      action: () => console.log('Terms'),
    },
  ];

  return (
    <div className="bg-black lined-bg-subtle px-5 pt-6 pb-8 min-h-screen">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">Profile</h1>
        <p className="text-remembra-text-muted">Manage your account</p>
      </header>

      {/* User Info Card */}
      <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">{getInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-remembra-text-primary truncate">
              {profile?.username || 'User'}
            </h2>
            <p className="text-sm text-remembra-text-muted truncate">
              {user?.email || 'No email'}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/5">
          <div className="text-center">
            <p className="text-xl font-bold text-remembra-text-primary">{stats.totalItems}</p>
            <p className="text-xs text-remembra-text-muted">Items</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-remembra-text-primary">{stats.masteredItems}</p>
            <p className="text-xs text-remembra-text-muted">Mastered</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-remembra-accent-primary">{stats.streak}</p>
            <p className="text-xs text-remembra-text-muted">Day Streak</p>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 mb-6">
        <div className="px-5 py-3 border-b border-white/5">
          <h3 className="text-sm font-medium text-remembra-text-secondary">Account</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-remembra-bg-tertiary flex items-center justify-center">
              <User size={18} className="text-remembra-text-muted" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-remembra-text-muted">Username</p>
              <p className="text-sm text-remembra-text-primary">{profile?.username || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-remembra-bg-tertiary flex items-center justify-center">
              <Mail size={18} className="text-remembra-text-muted" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-remembra-text-muted">Email</p>
              <p className="text-sm text-remembra-text-primary">{user?.email || 'Not set'}</p>
            </div>
            {user?.email_confirmed_at && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-remembra-success/20">
                <Check size={12} className="text-remembra-success" />
                <span className="text-[10px] text-remembra-success">Verified</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 mb-6">
        <div className="px-5 py-3 border-b border-white/5">
          <h3 className="text-sm font-medium text-remembra-text-secondary">Settings</h3>
        </div>
        <div className="divide-y divide-white/5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-remembra-bg-tertiary flex items-center justify-center">
                <item.icon size={18} className="text-remembra-text-muted" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-remembra-text-primary">{item.label}</p>
                <p className="text-xs text-remembra-text-muted">{item.description}</p>
              </div>
              <ChevronRight size={18} className="text-remembra-text-muted" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout Button */}
      <Button
        onClick={() => setShowLogoutDialog(true)}
        variant="outline"
        className="w-full h-12 bg-remembra-error/10 border-remembra-error/30 text-remembra-error hover:bg-remembra-error/20"
      >
        <LogOut size={18} className="mr-2" />
        Sign Out
      </Button>

      {/* App Version */}
      <p className="text-center text-xs text-remembra-text-muted mt-6">
        Remembra v1.0.0
      </p>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-remembra-bg-secondary border-white/10">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-remembra-error/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-remembra-error" />
            </div>
            <AlertDialogTitle className="text-center text-remembra-text-primary">
              Sign Out?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-remembra-text-muted">
              You'll need to sign in again to access your memories. Your data will be safely stored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-remembra-error hover:bg-remembra-error/90 text-white"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
