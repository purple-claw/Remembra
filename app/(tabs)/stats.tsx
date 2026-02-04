import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/database'
import type { UserStats, StudyInsights } from '@/types'

const SCREEN_WIDTH = Dimensions.get('window').width

export default function StatsScreen() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [insights, setInsights] = useState<StudyInsights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [statsData, insightsData] = await Promise.all([
        db.getUserStats(user.id),
        db.getStudyInsights(user.id),
      ])
      setStats(statsData)
      setInsights(insightsData)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    )
  }

  const successRate = stats?.success_rate || 0
  const totalItems = stats?.total_items || 0
  const masteredItems = stats?.items_mastered || 0
  const dueToday = stats?.due_today || 0
  const reviewedThisWeek = stats?.reviewed_this_week || 0
  const reviewedThisMonth = stats?.items_learning || 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#8b5cf6']} style={styles.header}>
        <Text style={styles.headerTitle}>Stats</Text>
        <Text style={styles.headerSubtitle}>Your learning progress</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <LargeStatCard
              icon="library"
              iconColor="#6366F1"
              label="Total Items"
              value={totalItems}
            />
            <LargeStatCard
              icon="trophy"
              iconColor="#10b981"
              label="Mastered"
              value={masteredItems}
            />
            <LargeStatCard
              icon="calendar-clear"
              iconColor="#f59e0b"
              label="Due Today"
              value={dueToday}
            />
            <LargeStatCard
              icon="trending-up"
              iconColor="#06b6d4"
              label="Success Rate"
              value={`${successRate}%`}
            />
          </View>
        </View>

        {/* Review Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Review Activity</Text>
          <View style={styles.activityCards}>
            <ActivityCard
              label="This Week"
              value={reviewedThisWeek}
              icon="calendar-outline"
              color="#8b5cf6"
            />
            <ActivityCard
              label="This Month"
              value={reviewedThisMonth}
              icon="calendar"
              color="#ec4899"
            />
          </View>
        </View>

        {/* Mastery Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mastery Breakdown</Text>
          <View style={styles.masteryCard}>
            <MasteryBar
              label="New Items"
              count={totalItems - (stats?.items_learning || 0) - (stats?.items_mastered || 0)}
              total={totalItems}
              color="#64748b"
            />
            <MasteryBar
              label="Learning"
              count={stats?.items_learning || 0}
              total={totalItems}
              color="#f59e0b"
            />
            <MasteryBar
              label="Mastered"
              count={stats?.items_mastered || 0}
              total={totalItems}
              color="#10b981"
            />
          </View>
        </View>

        {/* Insights */}
        {insights && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Study Insights</Text>
            <View style={styles.metricsCard}>
              {insights.best_time_of_day !== null && (
                <MetricRow
                  icon="time"
                  iconColor="#6366F1"
                  label="Best Time of Day"
                  value={`${insights.best_time_of_day}:00`}
                />
              )}
              {insights.average_session_duration !== null && (
                <MetricRow
                  icon="timer"
                  iconColor="#8b5cf6"
                  label="Avg Session Duration"
                  value={`${Math.round(insights.average_session_duration)} min`}
                />
              )}
              {insights.most_difficult_category && (
                <MetricRow
                  icon="warning"
                  iconColor="#f59e0b"
                  label="Most Difficult Category"
                  value={insights.most_difficult_category}
                />
              )}
              {insights.total_study_time_hours !== null && (
                <MetricRow
                  icon="trending-up"
                  iconColor="#10b981"
                  label="Total Study Time"
                  value={`${insights.total_study_time_hours.toFixed(1)} hrs`}
                />
              )}
            </View>
          </View>
        )}

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.metricsCard}>
            <MetricRow
              icon="checkmark-circle"
              iconColor="#10b981"
              label="Average Success Rate"
              value={`${successRate}%`}
            />
            <MetricRow
              icon="timer"
              iconColor="#6366F1"
              label="Items Due Today"
              value={dueToday}
            />
            <MetricRow
              icon="bar-chart"
              iconColor="#8b5cf6"
              label="Reviews This Week"
              value={reviewedThisWeek}
            />
            <MetricRow
              icon="stats-chart"
              iconColor="#ec4899"
              label="Reviews This Month"
              value={reviewedThisMonth}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function LargeStatCard({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: any
  iconColor: string
  label: string
  value: number | string
}) {
  return (
    <View style={styles.largeStatCard}>
      <View style={[styles.largeStatIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
      <Text style={styles.largeStatValue}>{value}</Text>
      <Text style={styles.largeStatLabel}>{label}</Text>
    </View>
  )
}

function ActivityCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: any
  color: string
}) {
  return (
    <View style={styles.activityCard}>
      <View style={styles.activityCardHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.activityLabel}>{label}</Text>
      </View>
      <Text style={styles.activityValue}>{value}</Text>
      <Text style={styles.activitySubtext}>reviews completed</Text>
    </View>
  )
}

function MasteryBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  return (
    <View style={styles.masteryBarContainer}>
      <View style={styles.masteryBarHeader}>
        <Text style={styles.masteryBarLabel}>{label}</Text>
        <Text style={styles.masteryBarCount}>
          {count} ({percentage.toFixed(0)}%)
        </Text>
      </View>
      <View style={styles.masteryBarTrack}>
        <View style={[styles.masteryBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

function MetricRow({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: any
  iconColor: string
  label: string
  value: number | string
}) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLeft}>
        <View style={[styles.metricIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
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
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  largeStatCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  largeStatIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  largeStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  largeStatLabel: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  activityCards: {
    flexDirection: 'row',
    gap: 12,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activityLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  activityValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  activitySubtext: {
    fontSize: 12,
    color: '#64748b',
  },
  masteryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  masteryBarContainer: {
    gap: 8,
  },
  masteryBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  masteryBarLabel: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  masteryBarCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  masteryBarTrack: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  masteryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  metricsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#cbd5e1',
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
})
