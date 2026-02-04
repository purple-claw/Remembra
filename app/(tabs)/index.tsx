import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CalendarStrip } from '../../components/CalendarStrip';
import { CategoryCard } from '../../components/CategoryCard';
import { HeroCard } from '../../components/HeroCard';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Colors';
import { useSupabaseStore as useStore } from '../../lib/supabaseStore';

export default function DashboardScreen() {
  const { user, categories, memoryItems, getTodayReviews, getCurrentStreak } = useStore();
  const todayReviews = getTodayReviews();
  const currentStreak = getCurrentStreak();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getCategoryProgress = (categoryId: string) => {
    const categoryItems = memoryItems.filter((m) => m.categoryId === categoryId);
    const masteredItems = categoryItems.filter((m) => m.status === 'mastered');
    if (categoryItems.length === 0) return 0;
    return Math.round((masteredItems.length / categoryItems.length) * 100);
  };

  const getCategoryItemCount = (categoryId: string) => {
    return memoryItems.filter((m) => m.categoryId === categoryId).length;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.username}>{user?.username || 'Learner'}</Text>
        </View>

        <TouchableOpacity style={styles.streakContainer} activeOpacity={0.8}>
          <Ionicons name="flame" size={22} color={Colors.dark.accent} />
          <Text style={styles.streakCount}>{currentStreak}</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Card */}
      <View style={styles.section}>
        <HeroCard
          title="Today's Focus"
          subtitle={
            todayReviews.length > 0
              ? `${todayReviews.length} reviews due`
              : 'All caught up! 🎉'
          }
          ctaText="Start Session"
          onPress={() => console.log('Start review')}
          icon="flash"
          reviewCount={todayReviews.length}
        />
      </View>

      {/* Calendar Strip */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Calendar</Text>
          </TouchableOpacity>
        </View>
        <CalendarStrip
          days={14}
          onDayPress={(date) => console.log('Selected date:', date)}
        />
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add" size={18} color={Colors.dark.accent} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CategoryCard
              name={item.name}
              icon={item.icon as keyof typeof Ionicons.glyphMap}
              color={item.color}
              itemCount={getCategoryItemCount(item.id)}
              progress={getCategoryProgress(item.id)}
              onPress={() => console.log('Category:', item.name)}
            />
          )}
        />
      </View>

      {/* Quick Add */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <View style={styles.quickAddGrid}>
          {[
            { icon: 'document-text', label: 'Text', color: '#6366F1' },
            { icon: 'code-slash', label: 'Code', color: '#22C55E' },
            { icon: 'image', label: 'Image', color: '#F59E0B' },
            { icon: 'folder', label: 'Doc', color: '#EC4899' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickAddItem}
              activeOpacity={0.8}
            >
              <View
                style={[styles.quickAddIcon, { backgroundColor: item.color + '15' }]}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={item.color}
                />
              </View>
              <Text style={styles.quickAddLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 10,
    paddingBottom: Spacing.md,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.textMuted,
    marginBottom: 2,
  },
  username: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.dark.text,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  streakCount: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.dark.accent,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.dark.text,
  },
  seeAllText: {
    fontSize: Typography.sizes.sm,
    color: Colors.dark.accent,
    fontWeight: Typography.weights.medium,
  },
  addBtn: {
    width: 32,
    height: 32,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  categoriesList: {
    gap: Spacing.md,
  },
  quickAddGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  quickAddItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  quickAddIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickAddLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.dark.textSecondary,
    fontWeight: Typography.weights.medium,
  },
});
