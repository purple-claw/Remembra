import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { NotificationPreferences } from '@/types';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  Flame,
  Globe2,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  User2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { avatarService } from '@/services/avatarService';
import { toFriendlyErrorMessage } from '@/lib/uiError';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  daily_reminder: true,
  reminder_time: '09:00',
  streak_reminder: true,
  achievement_notifications: true,
};

export function Profile() {
  const {
    user,
    profile,
    signOut,
    memoryItems,
    categories,
    updateProfile,
    updateNotificationPreferences,
    goBack,
  } = useStore();

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [didAutoAvatarAttempt, setDidAutoAvatarAttempt] = useState(false);

  const [usernameDraft, setUsernameDraft] = useState('');
  const [timezoneDraft, setTimezoneDraft] = useState('UTC');
  const [preferencesDraft, setPreferencesDraft] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  const basePreferences = profile?.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES;

  useEffect(() => {
    setUsernameDraft(profile?.username || user?.email?.split('@')[0] || 'User');
    setTimezoneDraft(profile?.timezone || 'UTC');
    setPreferencesDraft(basePreferences);
  }, [profile?.id, profile?.username, profile?.timezone, profile?.notification_preferences, user?.email]);

  useEffect(() => {
    setDidAutoAvatarAttempt(false);
    setAvatarLoadFailed(false);
  }, [profile?.id]);

  const displayName = profile?.username || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || '';

  const userInitials = useMemo(() => {
    const source = profile?.username || user?.email || 'U';
    return source.slice(0, 2).toUpperCase();
  }, [profile?.username, user?.email]);

  const stats = useMemo(() => ({
    totalItems: memoryItems.length,
    completedItems: memoryItems.filter((item) => item.status === 'completed').length,
    categories: categories.length,
    streak: profile?.streak_count || 0,
    totalReviews: profile?.total_reviews || 0,
  }), [memoryItems, categories.length, profile?.streak_count, profile?.total_reviews]);

  const hasProfileChanges = useMemo(() => {
    if (!profile) return false;
    const normalizedUsername = usernameDraft.trim();
    const normalizedTimezone = timezoneDraft.trim() || 'UTC';
    return profile.username !== normalizedUsername || profile.timezone !== normalizedTimezone;
  }, [profile, usernameDraft, timezoneDraft]);

  const hasPreferenceChanges = useMemo(() => {
    const current = basePreferences;
    const draft = preferencesDraft;

    return current.daily_reminder !== draft.daily_reminder
      || current.reminder_time !== draft.reminder_time
      || current.streak_reminder !== draft.streak_reminder
      || current.achievement_notifications !== draft.achievement_notifications;
  }, [basePreferences, preferencesDraft]);

  const isDirty = hasProfileChanges || hasPreferenceChanges;

  const generateAvatar = useCallback(async (randomize: boolean) => {
    if (!profile || !user) return;

    setIsGeneratingAvatar(true);
    try {
      const url = avatarService.generateProfileAvatarUrl({
        username: profile.username,
        email: user.email || undefined,
        userId: profile.id,
        nonce: randomize ? Date.now().toString() : undefined,
      });

      await updateProfile({ avatar_url: url });
      setAvatarLoadFailed(false);

      if (randomize) {
        toast.success('Profile avatar refreshed');
      }
    } catch (error) {
      toast.error(toFriendlyErrorMessage(error, 'Failed to update avatar'));
    } finally {
      setIsGeneratingAvatar(false);
    }
  }, [profile, updateProfile, user]);

  useEffect(() => {
    if (!profile || !user || profile.avatar_url || isGeneratingAvatar) return;
    if (didAutoAvatarAttempt) return;
    setDidAutoAvatarAttempt(true);
    void generateAvatar(false);
  }, [profile, user, isGeneratingAvatar, generateAvatar, didAutoAvatarAttempt]);

  const handleSave = async () => {
    if (!profile) return;

    const nextUsername = usernameDraft.trim();
    const nextTimezone = timezoneDraft.trim() || 'UTC';

    if (!nextUsername) {
      toast.error('Username is required');
      return;
    }

    if (nextUsername.length > 80) {
      toast.error('Username must be under 80 characters');
      return;
    }

    if (!isDirty) {
      toast('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      if (hasProfileChanges) {
        await updateProfile({
          username: nextUsername,
          timezone: nextTimezone,
        });
      }

      if (hasPreferenceChanges) {
        await updateNotificationPreferences(preferencesDraft);
      }

      toast.success('Profile updated');
    } catch (error) {
      toast.error(toFriendlyErrorMessage(error, 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setUsernameDraft(profile?.username || user?.email?.split('@')[0] || 'User');
    setTimezoneDraft(profile?.timezone || 'UTC');
    setPreferencesDraft(basePreferences);
    toast('Changes reset');
  };

  const handleLogout = async () => {
    // Close the dialog immediately — avoids stale overlay while async work runs
    setShowLogoutDialog(false);
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      toast.error(toFriendlyErrorMessage(error, 'Failed to log out'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    setPreferencesDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-black flex flex-col animate-screen-enter">
      <header className="flex-shrink-0 px-4 sm:px-6 safe-top pb-4 bg-black/70 border-b border-white/10 backdrop-blur-xl transition-smooth relative z-30 animate-slide-up">
        <div className="flex flex-wrap items-start gap-3 sm:items-center">
          <button
            onClick={() => goBack('dashboard')}
            className="w-10 h-10 rounded-xl border border-white/10 bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary tap-ripple press-glow"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-remembra-text-primary">Profile Management</h1>
            <p className="text-sm text-remembra-text-muted">Account, reminders, and learning preferences</p>
          </div>

          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="ml-auto shrink-0 gradient-primary text-white"
          >
            <Save size={16} className="mr-2" />
            {isSaving ? 'Saving' : 'Save'}
          </Button>
        </div>
      </header>

      <div
        data-nav-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 safe-bottom-nav fluid-scroll-zone smooth-scroll-content relative z-0"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        <div className="max-w-4xl mx-auto space-y-5">
          <section className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass relative overflow-hidden rounded-3xl p-5" style={{ animationDelay: '40ms' }}>
            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-black/60 border border-white/15 overflow-hidden flex items-center justify-center shrink-0">
                {avatarUrl && !avatarLoadFailed ? (
                  <img
                    src={avatarUrl}
                    alt={`${displayName} avatar`}
                    onError={() => setAvatarLoadFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-remembra-accent-primary">{userInitials}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold text-remembra-text-primary truncate">{displayName}</h2>
                <p className="text-sm text-remembra-text-secondary truncate">{user?.email || 'No email'}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-remembra-bg-tertiary border border-white/10 text-remembra-text-secondary">
                    {profile?.timezone || 'UTC'}
                  </span>
                  <span className={`px-2 py-1 rounded-full border ${user?.email_confirmed_at ? 'bg-remembra-success/15 border-remembra-success/30 text-remembra-success' : 'bg-remembra-warning/15 border-remembra-warning/30 text-remembra-warning'}`}>
                    {user?.email_confirmed_at ? 'Email Verified' : 'Email Not Verified'}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => generateAvatar(true)}
                disabled={isGeneratingAvatar}
                className="bg-remembra-bg-tertiary border-white/10"
              >
                <RefreshCw size={14} className={`mr-2 ${isGeneratingAvatar ? 'animate-spin' : ''}`} />
                Avatar
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-white/10">
              <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-xl p-3 text-center" style={{ animationDelay: '80ms' }}>
                <p className="text-lg font-semibold text-remembra-text-primary">{stats.totalItems}</p>
                <p className="text-xs text-remembra-text-muted">Items</p>
              </div>
              <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-xl p-3 text-center" style={{ animationDelay: '120ms' }}>
                <p className="text-lg font-semibold text-remembra-text-primary">{stats.completedItems}</p>
                <p className="text-xs text-remembra-text-muted">Completed</p>
              </div>
              <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-xl p-3 text-center" style={{ animationDelay: '160ms' }}>
                <p className="text-lg font-semibold text-remembra-text-primary">{stats.categories}</p>
                <p className="text-xs text-remembra-text-muted">Categories</p>
              </div>
              <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-xl p-3 text-center" style={{ animationDelay: '200ms' }}>
                <p className="text-lg font-semibold text-remembra-accent-primary">{stats.streak}</p>
                <p className="text-xs text-remembra-text-muted">Streak</p>
              </div>
              <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-xl p-3 text-center" style={{ animationDelay: '240ms' }}>
                <p className="text-lg font-semibold text-remembra-text-primary">{stats.totalReviews}</p>
                <p className="text-xs text-remembra-text-muted">Reviews</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-2xl p-5 space-y-4" style={{ animationDelay: '280ms' }}>
              <h3 className="text-base font-semibold text-remembra-text-primary">Account Details</h3>

              <div className="space-y-2">
                <Label htmlFor="profile-username" className="text-remembra-text-secondary">
                  <User2 size={14} />
                  Username
                </Label>
                <Input
                  id="profile-username"
                  value={usernameDraft}
                  onChange={(event) => setUsernameDraft(event.target.value)}
                  className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary"
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-remembra-text-secondary">
                  <Mail size={14} />
                  Email
                </Label>
                <Input
                  id="profile-email"
                  value={user?.email || ''}
                  disabled
                  className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-timezone" className="text-remembra-text-secondary">
                  <Globe2 size={14} />
                  Timezone
                </Label>
                <Input
                  id="profile-timezone"
                  value={timezoneDraft}
                  onChange={(event) => setTimezoneDraft(event.target.value)}
                  className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary"
                  placeholder="UTC"
                />
              </div>
            </div>

            <div className="liquid-glass-soft rounded-2xl p-5 space-y-4">
              <h3 className="text-base font-semibold text-remembra-text-primary">Reminder Preferences</h3>

              <div className="flex items-center justify-between rounded-xl bg-remembra-bg-tertiary border border-white/10 px-3 py-3">
                <div>
                  <p className="text-sm text-remembra-text-primary">Daily Reminder</p>
                  <p className="text-xs text-remembra-text-muted">Get your scheduled study reminder</p>
                </div>
                <Switch
                  checked={preferencesDraft.daily_reminder}
                  onCheckedChange={(value) => updatePreference('daily_reminder', value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-reminder-time" className="text-remembra-text-secondary">
                  <Clock3 size={14} />
                  Reminder Time
                </Label>
                <Input
                  id="profile-reminder-time"
                  type="time"
                  value={preferencesDraft.reminder_time}
                  onChange={(event) => updatePreference('reminder_time', event.target.value)}
                  disabled={!preferencesDraft.daily_reminder}
                  className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-remembra-bg-tertiary border border-white/10 px-3 py-3">
                <div>
                  <p className="text-sm text-remembra-text-primary">Streak Reminder</p>
                  <p className="text-xs text-remembra-text-muted">Nudge before you miss a streak day</p>
                </div>
                <Switch
                  checked={preferencesDraft.streak_reminder}
                  onCheckedChange={(value) => updatePreference('streak_reminder', value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-remembra-bg-tertiary border border-white/10 px-3 py-3">
                <div>
                  <p className="text-sm text-remembra-text-primary">Achievement Alerts</p>
                  <p className="text-xs text-remembra-text-muted">Notify when milestones unlock</p>
                </div>
                <Switch
                  checked={preferencesDraft.achievement_notifications}
                  onCheckedChange={(value) => updatePreference('achievement_notifications', value)}
                />
              </div>

            </div>
          </section>

          <section className="liquid-glass-soft rounded-2xl p-5">
            <h3 className="text-base font-semibold text-remembra-text-primary mb-4">Account Status</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3 flex items-start gap-2">
                <ShieldCheck size={16} className="text-remembra-success mt-0.5" />
                <div>
                  <p className="text-sm text-remembra-text-primary">Security</p>
                  <p className="text-xs text-remembra-text-muted">Verified account</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3 flex items-start gap-2">
                <Bell size={16} className="text-remembra-accent-primary mt-0.5" />
                <div>
                  <p className="text-sm text-remembra-text-primary">Reminders</p>
                  <p className="text-xs text-remembra-text-muted">{preferencesDraft.daily_reminder ? `Enabled at ${preferencesDraft.reminder_time}` : 'Disabled'}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3 flex items-start gap-2">
                <Flame size={16} className="text-remembra-warning mt-0.5" />
                <div>
                  <p className="text-sm text-remembra-text-primary">Learning Consistency</p>
                  <p className="text-xs text-remembra-text-muted flex items-center gap-1">
                    <Flame size={12} className="text-orange-500" />
                    {stats.streak} day streak active
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!isDirty || isSaving}
                className="bg-remembra-bg-tertiary border-white/10"
              >
                Reset Changes
              </Button>
              {user?.email_confirmed_at && (
                <div className="px-3 py-2 rounded-lg bg-remembra-success/15 border border-remembra-success/30 text-remembra-success text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  Email is verified
                </div>
              )}
            </div>
          </section>

          <section className="liquid-glass-soft rounded-2xl border border-remembra-danger/35 bg-remembra-danger/10 p-5">
            <h3 className="text-base font-semibold text-remembra-danger mb-2">Danger Zone</h3>
            <p className="text-sm text-remembra-text-secondary mb-4">
              Signing out will clear this device session.
            </p>
            <Button
              onClick={() => setShowLogoutDialog(true)}
              variant="outline"
              className="w-full sm:w-auto bg-remembra-danger/10 border-remembra-danger/40 text-remembra-danger hover:bg-remembra-danger/20"
            >
              <LogOut size={16} className="mr-2" />
              Sign Out
            </Button>
          </section>

          <p className="text-center text-xs text-remembra-text-muted pb-6">Remembra v6.0 - Made with ❤️ by PurpleClaw</p>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="liquid-glass w-[min(92vw,28rem)] max-h-[min(calc(100dvh-2rem),32rem)] overflow-y-auto border-white/10 mx-auto">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-remembra-danger/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-remembra-danger" />
            </div>
            <AlertDialogTitle className="text-center text-remembra-text-primary">Sign Out?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-remembra-text-muted">
              You can sign in again anytime. Your learning data remains safe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-remembra-danger hover:bg-remembra-danger/90 text-white"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
