import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useScrollNav } from '@/hooks/useScrollNav';
import { 
  User,
  Mail,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Shield,
  Bell,
  HelpCircle,
  FileText,
  Check,
  AlertTriangle,
  RefreshCw,
  Pencil,
  X,
  Save,
  Globe,
  Clock,
  Sparkles,
  Flame,
  Download,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { avatarService } from '@/services/avatarService';
import type { NotificationPreferences } from '@/types';
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

type SubPage = 'main' | 'notifications' | 'account' | 'data' | 'help' | 'terms';

export function Profile() {
  const { user, profile, signOut, memoryItems, categories, updateProfile } = useStore();
  const { onScroll } = useScrollNav();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [didAutoAvatarAttempt, setDidAutoAvatarAttempt] = useState(false);
  const [subPage, setSubPage] = useState<SubPage>('main');

  // Editable fields
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [editingTimezone, setEditingTimezone] = useState(false);
  const [timezoneInput, setTimezoneInput] = useState('');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  // Sync notif prefs when profile changes
  useEffect(() => {
    if (profile?.notification_preferences) {
      setNotifPrefs({ ...profile.notification_preferences });
    }
  }, [profile?.notification_preferences]);

  const stats = useMemo(() => ({
    totalItems: memoryItems.length,
    masteredItems: memoryItems.filter(i => i.status === 'completed').length,
    categories: categories.length,
    streak: profile?.streak_count || 0,
    totalReviews: profile?.total_reviews || 0,
  }), [memoryItems, categories, profile]);

  const displayName = profile?.username || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || '';

  const userInitials = useMemo(() => {
    const source = profile?.username || user?.email || 'U';
    return source.slice(0, 2).toUpperCase();
  }, [profile?.username, user?.email]);

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
      if (randomize) toast.success('Avatar refreshed');
    } catch {
      toast.error('Failed to update avatar');
    } finally {
      setIsGeneratingAvatar(false);
    }
  }, [profile, updateProfile, user]);

  useEffect(() => {
    setDidAutoAvatarAttempt(false);
    setAvatarLoadFailed(false);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile || !user || profile.avatar_url || isGeneratingAvatar) return;
    if (didAutoAvatarAttempt) return;
    setDidAutoAvatarAttempt(true);
    generateAvatar(false).catch(console.error);
  }, [profile, user, isGeneratingAvatar, generateAvatar, didAutoAvatarAttempt]);

  // --- Save handlers ---
  const saveUsername = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed || trimmed.length < 2) {
      toast.error('Username must be at least 2 characters');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ username: trimmed });
      setEditingUsername(false);
      toast.success('Username updated');
    } catch {
      toast.error('Failed to update username');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveTimezone = async () => {
    const trimmed = timezoneInput.trim();
    if (!trimmed) return;
    setSavingProfile(true);
    try {
      await updateProfile({ timezone: trimmed });
      setEditingTimezone(false);
      toast.success('Timezone updated');
    } catch {
      toast.error('Failed to update timezone');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleNotifPref = async (key: keyof NotificationPreferences) => {
    if (!notifPrefs) return;
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    try {
      await updateProfile({ notification_preferences: updated });
    } catch {
      setNotifPrefs(notifPrefs);
      toast.error('Failed to update setting');
    }
  };

  const saveReminderTime = async (time: string) => {
    if (!notifPrefs) return;
    const updated = { ...notifPrefs, reminder_time: time };
    setNotifPrefs(updated);
    try {
      await updateProfile({ notification_preferences: updated });
      toast.success('Reminder time updated');
    } catch {
      setNotifPrefs(notifPrefs);
      toast.error('Failed to update time');
    }
  };

  const exportData = () => {
    try {
      const data = {
        profile: { username: profile?.username, timezone: profile?.timezone },
        categories: categories.map(c => ({ name: c.name, color: c.color })),
        memoryItems: memoryItems.map(m => ({
          title: m.title,
          content: m.content,
          contentType: m.content_type,
          difficulty: m.difficulty,
          status: m.status,
          createdAt: m.created_at,
        })),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remembra-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Export failed');
    }
  };

  // --- Shared UI ---
  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-remembra-accent-primary' : 'bg-remembra-bg-tertiary border border-white/10'}`}
    >
      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
    </button>
  );

  const SubPageHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <header className="flex-shrink-0 px-4 sm:px-5 safe-top pb-4 bg-black border-b border-white/5">
      <button onClick={onBack} className="flex items-center gap-1 text-remembra-accent-primary text-sm mb-2 -ml-1">
        <ChevronLeft size={18} /> Back
      </button>
      <h1 className="text-2xl font-bold text-remembra-text-primary">{title}</h1>
    </header>
  );

  // --- Sub-pages ---

  if (subPage === 'notifications' && notifPrefs) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col" style={{ height: '100vh', maxHeight: '100vh' }}>
        <SubPageHeader title="Notifications" onBack={() => setSubPage('main')} />
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4" onScroll={onScroll}>
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 divide-y divide-white/5">
            {/* Daily Reminder */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Clock size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-remembra-text-primary">Daily Reminder</p>
                  <p className="text-xs text-remembra-text-muted">Get reminded to review daily</p>
                </div>
              </div>
              <ToggleSwitch enabled={notifPrefs.daily_reminder} onToggle={() => toggleNotifPref('daily_reminder')} />
            </div>

            {/* Reminder Time */}
            {notifPrefs.daily_reminder && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Bell size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-remembra-text-primary">Reminder Time</p>
                    <p className="text-xs text-remembra-text-muted">{notifPrefs.reminder_time || '09:00'}</p>
                  </div>
                </div>
                <input
                  type="time"
                  value={notifPrefs.reminder_time || '09:00'}
                  onChange={e => saveReminderTime(e.target.value)}
                  className="bg-remembra-bg-tertiary border border-white/10 rounded-lg px-3 py-1.5 text-sm text-remembra-text-primary"
                />
              </div>
            )}

            {/* Streak Reminder */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Flame size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-remembra-text-primary">Streak Reminder</p>
                  <p className="text-xs text-remembra-text-muted">Alert before streak breaks</p>
                </div>
              </div>
              <ToggleSwitch enabled={notifPrefs.streak_reminder} onToggle={() => toggleNotifPref('streak_reminder')} />
            </div>

            {/* Achievement Notifications */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Sparkles size={18} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-remembra-text-primary">Achievements</p>
                  <p className="text-xs text-remembra-text-muted">Celebrate milestones</p>
                </div>
              </div>
              <ToggleSwitch enabled={notifPrefs.achievement_notifications} onToggle={() => toggleNotifPref('achievement_notifications')} />
            </div>

            {/* AI Insights */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-remembra-text-primary">AI Insights</p>
                  <p className="text-xs text-remembra-text-muted">Smart study recommendations</p>
                </div>
              </div>
              <ToggleSwitch enabled={notifPrefs.ai_insights} onToggle={() => toggleNotifPref('ai_insights')} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'account') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col" style={{ height: '100vh', maxHeight: '100vh' }}>
        <SubPageHeader title="Account & Security" onBack={() => setSubPage('main')} />
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4" onScroll={onScroll}>
          {/* Username */}
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-remembra-text-muted">Username</p>
              {!editingUsername && (
                <button onClick={() => { setUsernameInput(profile?.username || ''); setEditingUsername(true); }}
                  className="text-remembra-accent-primary text-xs flex items-center gap-1 hover:underline">
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>
            {editingUsername ? (
              <div className="flex gap-2 mt-1">
                <input
                  autoFocus
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  className="flex-1 bg-remembra-bg-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-remembra-text-primary outline-none focus:border-remembra-accent-primary"
                  placeholder="Enter username"
                  maxLength={30}
                  onKeyDown={e => e.key === 'Enter' && saveUsername()}
                />
                <button onClick={saveUsername} disabled={savingProfile}
                  className="px-3 py-2 rounded-lg bg-remembra-accent-primary text-white text-sm disabled:opacity-50">
                  <Save size={16} />
                </button>
                <button onClick={() => setEditingUsername(false)}
                  className="px-3 py-2 rounded-lg bg-remembra-bg-tertiary text-remembra-text-muted text-sm border border-white/10">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <p className="text-sm text-remembra-text-primary font-medium">{profile?.username || 'Not set'}</p>
            )}
          </div>

          {/* Email */}
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-4">
            <p className="text-xs text-remembra-text-muted mb-1">Email</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-remembra-text-primary font-medium flex-1">{user?.email || 'Not set'}</p>
              {user?.emailVerified && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-remembra-success/20 text-[10px] text-remembra-success">
                  <Check size={10} /> Verified
                </span>
              )}
            </div>
          </div>

          {/* Timezone */}
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-remembra-text-muted">Timezone</p>
              {!editingTimezone && (
                <button onClick={() => { setTimezoneInput(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone); setEditingTimezone(true); }}
                  className="text-remembra-accent-primary text-xs flex items-center gap-1 hover:underline">
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>
            {editingTimezone ? (
              <div className="flex gap-2 mt-1">
                <select
                  value={timezoneInput}
                  onChange={e => setTimezoneInput(e.target.value)}
                  className="flex-1 bg-remembra-bg-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-remembra-text-primary outline-none focus:border-remembra-accent-primary"
                >
                  {Intl.supportedValuesOf('timeZone').map(tz => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <button onClick={saveTimezone} disabled={savingProfile}
                  className="px-3 py-2 rounded-lg bg-remembra-accent-primary text-white text-sm disabled:opacity-50">
                  <Save size={16} />
                </button>
                <button onClick={() => setEditingTimezone(false)}
                  className="px-3 py-2 rounded-lg bg-remembra-bg-tertiary text-remembra-text-muted text-sm border border-white/10">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-remembra-text-muted" />
                <p className="text-sm text-remembra-text-primary font-medium">{profile?.timezone || 'Not set'}</p>
              </div>
            )}
          </div>

          {/* Account Stats */}
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-4">
            <p className="text-xs text-remembra-text-muted mb-3">Account Stats</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-remembra-bg-tertiary rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-remembra-text-primary">{stats.totalReviews}</p>
                <p className="text-[11px] text-remembra-text-muted">Total Reviews</p>
              </div>
              <div className="bg-remembra-bg-tertiary rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-remembra-accent-primary">{stats.streak}</p>
                <p className="text-[11px] text-remembra-text-muted">Day Streak</p>
              </div>
              <div className="bg-remembra-bg-tertiary rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-remembra-text-primary">{stats.totalItems}</p>
                <p className="text-[11px] text-remembra-text-muted">Memory Items</p>
              </div>
              <div className="bg-remembra-bg-tertiary rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-remembra-text-primary">{stats.categories}</p>
                <p className="text-[11px] text-remembra-text-muted">Categories</p>
              </div>
            </div>
          </div>

          {/* Member Since */}
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-4">
            <p className="text-xs text-remembra-text-muted mb-1">Member Since</p>
            <p className="text-sm text-remembra-text-primary font-medium">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === 'data') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col" style={{ height: '100vh', maxHeight: '100vh' }}>
        <SubPageHeader title="Data Management" onBack={() => setSubPage('main')} />
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4" onScroll={onScroll}>
          {/* Export */}
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Download size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-remembra-text-primary">Export Data</p>
                <p className="text-xs text-remembra-text-muted">Download all your memories as JSON</p>
              </div>
            </div>
            <p className="text-xs text-remembra-text-muted mb-3">
              Includes {stats.totalItems} items, {stats.categories} categories, and your profile settings.
            </p>
            <Button onClick={exportData} variant="outline"
              className="w-full h-10 bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary hover:bg-white/10">
              <Download size={16} className="mr-2" />
              Export All Data
            </Button>
          </div>

          {/* Danger Zone */}
          <div className="bg-remembra-bg-secondary rounded-2xl border border-remembra-error/20 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-remembra-error/10 flex items-center justify-center">
                <Trash2 size={18} className="text-remembra-error" />
              </div>
              <div>
                <p className="text-sm font-medium text-remembra-error">Danger Zone</p>
                <p className="text-xs text-remembra-text-muted">Irreversible actions</p>
              </div>
            </div>
            <p className="text-xs text-remembra-text-muted mb-3">
              Deleting your account removes all data permanently. This cannot be undone.
            </p>
            <Button onClick={() => setShowDeleteDialog(true)} variant="outline"
              className="w-full h-10 bg-remembra-error/10 border-remembra-error/30 text-remembra-error hover:bg-remembra-error/20">
              <Trash2 size={16} className="mr-2" />
              Delete Account
            </Button>
          </div>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-remembra-bg-secondary border-white/10 sm:max-w-md">
            <AlertDialogHeader>
              <div className="w-12 h-12 rounded-full bg-remembra-error/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-remembra-error" />
              </div>
              <AlertDialogTitle className="text-center text-remembra-text-primary">
                Delete Account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-remembra-text-muted">
                This will permanently delete your account and all {stats.totalItems} memory items. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary hover:bg-white/10">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { toast.info('Account deletion requires contacting support'); setShowDeleteDialog(false); }}
                className="bg-remembra-error hover:bg-remembra-error/90 text-white"
              >
                I understand, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (subPage === 'help') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col" style={{ height: '100vh', maxHeight: '100vh' }}>
        <SubPageHeader title="Help & Support" onBack={() => setSubPage('main')} />
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4" onScroll={onScroll}>
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-remembra-text-primary mb-3">How Review Scheduling Works</h3>
            <p className="text-xs text-remembra-text-muted leading-relaxed">
              Remembra uses a 1-4-7 spaced repetition schedule. After creating a memory item, you'll be prompted to review it after 1 day, then 4 days, then 7 days. Each successful review strengthens your long-term recall.
            </p>
          </div>
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-remembra-text-primary mb-3">AI-Powered Features</h3>
            <p className="text-xs text-remembra-text-muted leading-relaxed">
              The AI Studio generates summaries, flowcharts, quizzes, mnemonics, and code explanations tailored to your study material. For best results, add detailed content when creating memory items.
            </p>
          </div>
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-remembra-text-primary mb-3">Tips for Better Retention</h3>
            <ul className="text-xs text-remembra-text-muted space-y-2 leading-relaxed">
              <li>• Review items on the day they're due for optimal spacing</li>
              <li>• Use the quiz feature to test active recall</li>
              <li>• Break large topics into smaller, focused memory items</li>
              <li>• Maintain your streak for consistent study habits</li>
            </ul>
          </div>
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-remembra-text-primary mb-3">Contact</h3>
            <p className="text-xs text-remembra-text-muted leading-relaxed">
              For bug reports or feature requests, reach out via the app's GitHub repository.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Main profile page ---
  const menuItems = [
    {
      id: 'notifications' as SubPage,
      icon: Bell,
      label: 'Notifications',
      description: 'Reminders, streaks & alerts',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
    },
    {
      id: 'account' as SubPage,
      icon: Shield,
      label: 'Account & Security',
      description: 'Username, timezone, stats',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
    },
    {
      id: 'data' as SubPage,
      icon: Download,
      label: 'Data Management',
      description: 'Export & delete your data',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
    },
    {
      id: 'help' as SubPage,
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'FAQs and tips',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
    },
    {
      id: 'terms' as SubPage,
      icon: FileText,
      label: 'Terms & Privacy',
      description: 'Legal information',
      iconBg: 'bg-gray-500/10',
      iconColor: 'text-gray-400',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* Fixed Header */}
      <header className="flex-shrink-0 px-4 sm:px-5 safe-top pb-4 bg-black border-b border-white/5">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">Profile</h1>
        <p className="text-sm text-remembra-text-muted">Manage your account</p>
      </header>

      {/* Scrollable Content */}
      <div 
        className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        onScroll={onScroll}
      >

      {/* User Info Card */}
      <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5 mb-6 dynamic-container smooth-surface">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary flex items-center justify-center flex-shrink-0">
            {avatarUrl && !avatarLoadFailed ? (
              <img
                src={avatarUrl}
                alt={`${displayName} avatar`}
                onError={() => setAvatarLoadFailed(true)}
                className="w-full h-full rounded-full object-cover bg-remembra-bg-secondary"
              />
            ) : (
              <span className="text-xl font-bold text-white">{userInitials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-remembra-text-primary truncate">
              {displayName}
            </h2>
            <p className="text-sm text-remembra-text-muted truncate">
              {user?.email || 'No email'}
            </p>
          </div>
          <button
            onClick={() => generateAvatar(true)}
            disabled={isGeneratingAvatar}
            className="h-10 px-3 rounded-xl bg-remembra-bg-tertiary border border-white/10 text-remembra-text-secondary text-xs font-medium hover:bg-white/10 transition-colors disabled:opacity-50 flex items-center gap-2"
            title="Generate new avatar"
          >
            <RefreshCw size={13} className={isGeneratingAvatar ? 'animate-spin' : ''} />
            Avatar
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-white/5">
          <div className="text-center">
            <p className="text-xl font-bold text-remembra-text-primary">{stats.totalItems}</p>
            <p className="text-[10px] text-remembra-text-muted">Items</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-remembra-text-primary">{stats.masteredItems}</p>
            <p className="text-[10px] text-remembra-text-muted">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-remembra-accent-primary">{stats.streak}</p>
            <p className="text-[10px] text-remembra-text-muted">Streak</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-remembra-text-primary">{stats.totalReviews}</p>
            <p className="text-[10px] text-remembra-text-muted">Reviews</p>
          </div>
        </div>
      </div>

      {/* Quick Edit Username (inline) */}
      <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 mb-6 dynamic-container smooth-surface">
        <div className="px-5 py-3 border-b border-white/5">
          <h3 className="text-sm font-medium text-remembra-text-secondary">Quick Edit</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-remembra-bg-tertiary flex items-center justify-center">
              <User size={18} className="text-remembra-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-remembra-text-muted">Username</p>
              <p className="text-sm text-remembra-text-primary truncate">{profile?.username || 'Not set'}</p>
            </div>
            <button
              onClick={() => { setUsernameInput(profile?.username || ''); setEditingUsername(true); setSubPage('account'); }}
              className="text-remembra-accent-primary text-xs hover:underline flex items-center gap-1"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-remembra-bg-tertiary flex items-center justify-center">
              <Mail size={18} className="text-remembra-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-remembra-text-muted">Email</p>
              <p className="text-sm text-remembra-text-primary truncate">{user?.email || 'Not set'}</p>
            </div>
            {user?.emailVerified && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-remembra-success/20 text-[10px] text-remembra-success">
                <Check size={10} /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 mb-6 dynamic-container smooth-surface">
        <div className="px-5 py-3 border-b border-white/5">
          <h3 className="text-sm font-medium text-remembra-text-secondary">Settings</h3>
        </div>
        <div className="divide-y divide-white/5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === 'terms'
                ? window.open('https://remembra.app/terms', '_blank')
                : setSubPage(item.id)
              }
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                <item.icon size={18} className={item.iconColor} />
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
      <p className="text-center text-xs text-remembra-text-muted mt-6 mb-4">
        Remembra v1.0.0
      </p>

      {/* Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-remembra-bg-secondary border-white/10 sm:max-w-md">
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
    </div>
  );
}
