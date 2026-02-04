import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/database'
import { notifications } from '@/lib/notifications'
import type { ReviewQueueItem, UserStats } from '@/types'

export default function HomeScreen() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      loadData()
      notifications.setupUserNotifications(user.id)
    } else if (!authLoading && !user) {
      router.replace('/auth/signin')
    }
  }, [user, authLoading])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [queueData, statsData] = await Promise.all([
        db.getReviewQueue(user.id),
        db.getUserStats(user.id),
      ])
      setReviewQueue(queueData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getStageLabel = (stage: number) => {
    if (stage === 0) return 'New'
    if (stage === 1) return 'Day 1'
    if (stage === 4) return 'Day 4'
    if (stage === 7) return 'Day 7'
    if (stage === 30) return 'Day 30'
    if (stage >= 90) return 'Mastered'
    return `Day ${stage}`
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 0.3) return '#10b981'
    if (difficulty < 0.7) return '#f59e0b'
    return '#ef4444'
  }

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
    >
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{profile?.full_name || profile?.username || 'Learner'}</Text>
          </View>
          <TouchableOpacity style={styles.streakBadge}>
            <Ionicons name="flame" size={24} color="#f59e0b" />
            <Text style={styles.streakText}>{profile?.streak_count || 0}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard icon="checkbox-outline" label="Due Today" value={stats?.due_today || 0} />
          <StatCard icon="checkmark-done" label="This Week" value={stats?.reviewed_this_week || 0} />
          <StatCard icon="trending-up" label="Success Rate" value={`${stats?.success_rate || 0}%`} />
        </View>
      </LinearGradient>

      {/* Review Queue */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Review Queue</Text>
          <Text style={styles.sectionSubtitle}>{reviewQueue.length} items</Text>
        </View>

        {reviewQueue.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#6366F1" />
            <Text style={styles.emptyTitle}>All Caught Up! 🎉</Text>
            <Text style={styles.emptyText}>
              No reviews due right now. Keep learning to build your knowledge base!
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/library')}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add New Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reviewList}>
            {reviewQueue.slice(0, 10).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.reviewCard}
                onPress={() => router.push(`/item/${item.id}?mode=review`)}
              >
                <View style={styles.reviewCardHeader}>
                  <View style={styles.reviewCardTitle}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: item.category_color || '#6366F1' },
                      ]}
                    />
                    <Text style={styles.reviewCardTitleText} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                  <View style={[styles.stageBadge, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                    <Text style={styles.stageText}>{getStageLabel(item.stage)}</Text>
                  </View>
                </View>

                <View style={styles.reviewCardMeta}>
                  {item.category_name && (
                    <View style={styles.metaItem}>
                      <Ionicons name="folder-outline" size={14} color="#94a3b8" />
                      <Text style={styles.metaText}>{item.category_name}</Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#94a3b8" />
                    <Text style={styles.metaText}>
                      {new Date(item.next_review_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <View
                      style={[
                        styles.difficultyIndicator,
                        { backgroundColor: getDifficultyColor(item.difficulty) },
                      ]}
                    />
                    <Text style={styles.metaText}>
                      {item.difficulty < 0.3 ? 'Easy' : item.difficulty < 0.7 ? 'Medium' : 'Hard'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {reviewQueue.length > 10 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All {reviewQueue.length} Items</Text>
                <Ionicons name="arrow-forward" size={16} color="#6366F1" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionButton
            icon="add-circle"
            label="Add Item"
            onPress={() => router.push('/library')}
          />
          <QuickActionButton
            icon="library"
            label="Library"
            onPress={() => router.push('/library')}
          />
          <QuickActionButton
            icon="stats-chart"
            label="Stats"
            onPress={() => router.push('/stats')}
          />
          <QuickActionButton
            icon="calendar"
            label="Calendar"
            onPress={() => router.push('/calendar')}
          />
        </View>
      </View>
    </ScrollView>
  )
}

function StatCard({ icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color="rgba(255,255,255,0.8)" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function QuickActionButton({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon} size={24} color="#6366F1" />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewCardTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reviewCardTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  reviewCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  difficultyIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#cbd5e1',
  },
})
