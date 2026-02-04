import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/database'

const SCREEN_WIDTH = Dimensions.get('window').width
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarScreen() {
  const { user } = useAuth()
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      loadHeatmapData()
    }
  }, [user, selectedMonth, selectedYear])

  const loadHeatmapData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const data = await db.getCalendarHeatmap(user.id)
      setHeatmapData(data || [])
    } catch (error) {
      console.error('Error loading calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIntensityColor = (count: number) => {
    if (count === 0) return '#1e293b'
    if (count <= 2) return '#6366F166'
    if (count <= 5) return '#6366F199'
    if (count <= 10) return '#6366F1CC'
    return '#6366F1'
  }

  const getDaysInMonth = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = Array(startingDayOfWeek).fill(null)
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  const getDayData = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return heatmapData.find((d) => d.date === dateStr)
  }

  const getMonthStats = () => {
    const monthDays = heatmapData.filter((d) => {
      const date = new Date(d.date)
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
    })

    const totalReviews = monthDays.reduce((sum, day) => sum + day.review_count, 0)
    const activeDays = monthDays.filter((day) => day.review_count > 0).length
    const avgPerDay = activeDays > 0 ? Math.round(totalReviews / activeDays) : 0

    return { totalReviews, activeDays, avgPerDay }
  }

  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta
    let newYear = selectedYear

    if (newMonth < 0) {
      newMonth = 11
      newYear--
    } else if (newMonth > 11) {
      newMonth = 0
      newYear++
    }

    setSelectedMonth(newMonth)
    setSelectedYear(newYear)
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      selectedMonth === today.getMonth() &&
      selectedYear === today.getFullYear()
    )
  }

  const days = getDaysInMonth()
  const stats = getMonthStats()

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#8b5cf6']} style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>

        {/* Month Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="calendar" label="Active Days" value={stats.activeDays} />
          <StatCard icon="checkmark-done" label="Total Reviews" value={stats.totalReviews} />
          <StatCard icon="trending-up" label="Avg/Day" value={stats.avgPerDay} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.monthText}>
            {MONTHS[selectedMonth]} {selectedYear}
          </Text>

          <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarContainer}>
          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {DAYS_SHORT.map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day[0]}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.calendar}>
            {days.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.dayCell} />
              }

              const dayData = getDayData(day)
              const reviewCount = dayData?.review_count || 0
              const backgroundColor = getIntensityColor(reviewCount)
              const today = isToday(day)

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    { backgroundColor },
                    today && styles.todayCell,
                  ]}
                  onPress={() => setSelectedDate(new Date(selectedYear, selectedMonth, day))}
                >
                  <Text style={[styles.dayText, reviewCount > 0 && styles.dayTextActive]}>
                    {day}
                  </Text>
                  {reviewCount > 0 && (
                    <View style={styles.reviewDot}>
                      <Text style={styles.reviewCount}>{reviewCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Heatmap Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendLabel}>Less</Text>
          <View style={styles.legendColors}>
            {[0, 2, 5, 10, 15].map((count) => (
              <View
                key={count}
                style={[styles.legendBox, { backgroundColor: getIntensityColor(count) }]}
              />
            ))}
          </View>
          <Text style={styles.legendLabel}>More</Text>
        </View>

        {/* Year Heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Year Overview</Text>
          <Text style={styles.sectionSubtitle}>Last 365 days</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearHeatmap}>
            <View style={styles.heatmapGrid}>
              {heatmapData.slice(-365).map((day, index) => {
                const backgroundColor = getIntensityColor(day.review_count)
                return (
                  <View
                    key={day.date}
                    style={[styles.heatmapCell, { backgroundColor }]}
                  />
                )
              })}
            </View>
          </ScrollView>
        </View>

        {/* Streak Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaks</Text>
          <View style={styles.streakCards}>
            <StreakCard
              icon="flame"
              iconColor="#f59e0b"
              label="Current Streak"
              value={`${user ? heatmapData.filter(d => d.review_count > 0).length : 0} days`}
            />
            <StreakCard
              icon="trophy"
              iconColor="#10b981"
              label="Longest Streak"
              value="0 days"
            />
          </View>
        </View>
      </ScrollView>
    </View>
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

function StreakCard({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: any
  iconColor: string
  label: string
  value: string
}) {
  return (
    <View style={styles.streakCard}>
      <View style={[styles.streakIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.streakLabel}>{label}</Text>
      <Text style={styles.streakValue}>{value}</Text>
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
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
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
  content: {
    flex: 1,
    padding: 24,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  calendarContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 8,
    position: 'relative',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  dayText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  dayTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  reviewDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 16,
    alignItems: 'center',
  },
  reviewCount: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  legendLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  legendColors: {
    flexDirection: 'row',
    gap: 4,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
  },
  yearHeatmap: {
    marginTop: 8,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    maxWidth: SCREEN_WIDTH * 3,
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  streakCards: {
    flexDirection: 'row',
    gap: 12,
  },
  streakCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  streakLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
})
