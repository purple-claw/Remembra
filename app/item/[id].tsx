import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams } from 'expo-router'
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/database'
import { ai } from '@/lib/ai'
import type { MemoryItem, Category, AIContent } from '@/types'

export default function ItemDetailScreen() {
  const router = useRouter()
  const { id, mode } = useLocalSearchParams()
  const { user } = useAuth()
  const [item, setItem] = useState<MemoryItem | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [aiContent, setAIContent] = useState<AIContent[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewMode, setReviewMode] = useState(mode === 'review')
  const [showAnswer, setShowAnswer] = useState(false)
  const [reviewStartTime, setReviewStartTime] = useState(Date.now())
  const [generatingAI, setGeneratingAI] = useState(false)

  useEffect(() => {
    if (user && id) {
      loadItem()
    }
  }, [user, id])

  const loadItem = async () => {
    if (!user || !id) return

    try {
      setLoading(true)
      const itemData = await db.getMemoryItem(id as string)
      if (itemData) {
        setItem(itemData)
        if (itemData.category_id) {
          const categoryData = await db.getCategory(itemData.category_id)
          setCategory(categoryData)
        }
        const aiData = await db.getAIContent(id as string)
        setAIContent(aiData)
      }
    } catch (error) {
      console.error('Error loading item:', error)
      Alert.alert('Error', 'Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewComplete = async (wasCorrect: boolean) => {
    if (!user || !item) return

    const timeTaken = Math.floor((Date.now() - reviewStartTime) / 1000)

    try {
      await db.submitReview(user.id, item.id, {
        was_correct: wasCorrect,
        difficulty_rating: wasCorrect ? 3 : 2,
        time_taken: timeTaken,
      })

      Alert.alert(
        'Review Complete',
        wasCorrect ? 'Great job! 🎉' : 'Keep practicing! 💪',
        [{ text: 'OK', onPress: () => router.back() }]
      )
    } catch (error) {
      console.error('Error submitting review:', error)
      Alert.alert('Error', 'Failed to submit review')
    }
  }

  const generateAISummary = async () => {
    if (!user || !item || generatingAI) return

    try {
      setGeneratingAI(true)
      const content = Array.isArray(item.content) 
        ? item.content.map(block => block.content).join('\n\n')
        : String(item.content)
      const summary = await ai.generateSummary(content)

      await db.createAIContent(user.id, item.id, {
        content_type: 'summary',
        content: summary,
      })

      loadItem()
      Alert.alert('Success', 'AI summary generated!')
    } catch (error) {
      console.error('Error generating summary:', error)
      Alert.alert('Error', 'Failed to generate summary')
    } finally {
      setGeneratingAI(false)
    }
  }

  const generateQuiz = async () => {
    if (!user || !item || generatingAI) return

    try {
      setGeneratingAI(true)
      const content = Array.isArray(item.content)
        ? item.content.map(block => block.content).join('\n\n')
        : String(item.content)
      const quiz = await ai.generateQuiz(content)

      await db.createAIContent(user.id, item.id, {
        content_type: 'quiz',
        content: quiz,
      })

      loadItem()
      Alert.alert('Success', 'Quiz generated!')
    } catch (error) {
      console.error('Error generating quiz:', error)
      Alert.alert('Error', 'Failed to generate quiz')
    } finally {
      setGeneratingAI(false)
    }
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    )
  }

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const content = Array.isArray(item.content)
    ? item.content.map(block => block.content).join('\n\n')
    : String(item.content)

  if (reviewMode) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#6366F1', '#8b5cf6']} style={styles.reviewHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.reviewInfo}>
            <Text style={styles.reviewStage}>{getStageLabel(item.stage)}</Text>
            <Text style={styles.reviewTitle}>{item.title}</Text>
          </View>
        </LinearGradient>

        <ScrollView style={styles.reviewContent} contentContainerStyle={styles.reviewContentContainer}>
          {!showAnswer ? (
            <View style={styles.questionContainer}>
              <Text style={styles.questionPrompt}>Can you recall this?</Text>
              <TouchableOpacity
                style={styles.showAnswerButton}
                onPress={() => setShowAnswer(true)}
              >
                <Text style={styles.showAnswerButtonText}>Show Answer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.answerContainer}>
                <Text style={styles.answerLabel}>Answer:</Text>
                <Text style={styles.answerText}>{content}</Text>
              </View>

              <View style={styles.reviewActions}>
                <Text style={styles.reviewPrompt}>Did you remember it correctly?</Text>
                <View style={styles.reviewButtons}>
                  <TouchableOpacity
                    style={[styles.reviewButton, styles.incorrectButton]}
                    onPress={() => handleReviewComplete(false)}
                  >
                    <Ionicons name="close-circle" size={32} color="#fff" />
                    <Text style={styles.reviewButtonText}>Forgot</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.reviewButton, styles.correctButton]}
                    onPress={() => handleReviewComplete(true)}
                  >
                    <Ionicons name="checkmark-circle" size={32} color="#fff" />
                    <Text style={styles.reviewButtonText}>Remembered</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Item Details</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Item Info Card */}
        <View style={styles.itemCard}>
          {category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryEmoji}>{category.icon}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </View>
          )}

          <Text style={styles.itemTitle}>{item.title}</Text>

          <View style={styles.itemMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="layers" size={16} color="#6366F1" />
              <Text style={styles.metaText}>{getStageLabel(item.stage)}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="time" size={16} color="#94a3b8" />
              <Text style={styles.metaText}>
                Next: {new Date(item.next_review_date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.metaText}>
                {item.success_count}/{item.review_count}
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content</Text>
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>{content}</Text>
          </View>
        </View>

        {/* AI Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Tools</Text>
          <View style={styles.aiTools}>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={generateAISummary}
              disabled={generatingAI}
            >
              <Ionicons name="document-text" size={24} color="#6366F1" />
              <Text style={styles.aiButtonText}>Summary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={generateQuiz}
              disabled={generatingAI}
            >
              <Ionicons name="help-circle" size={24} color="#8b5cf6" />
              <Text style={styles.aiButtonText}>Quiz</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Content */}
        {aiContent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generated Content</Text>
            {aiContent.map((content) => (
              <View key={content.id} style={styles.aiContentCard}>
                <View style={styles.aiContentHeader}>
                  <Text style={styles.aiContentType}>{content.content_type}</Text>
                  <Text style={styles.aiProvider}>{content.provider}</Text>
                </View>
                <Text style={styles.aiContentText}>{JSON.stringify(content.content, null, 2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={styles.reviewButton2}
          onPress={() => setReviewMode(true)}
        >
          <Text style={styles.reviewButton2Text}>Start Review</Text>
        </TouchableOpacity>
      </ScrollView>
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
  errorText: {
    fontSize: 18,
    color: '#cbd5e1',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: '#1e293b',
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  itemCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryName: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  itemTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  contentCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contentText: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 24,
  },
  aiTools: {
    flexDirection: 'row',
    gap: 12,
  },
  aiButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  aiContentCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  aiContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiContentType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  aiProvider: {
    fontSize: 12,
    color: '#64748b',
  },
  aiContentText: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  reviewButton2: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  reviewButton2Text: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  reviewHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  reviewInfo: {
    alignItems: 'center',
  },
  reviewStage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  reviewContent: {
    flex: 1,
  },
  reviewContentContainer: {
    padding: 24,
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  questionPrompt: {
    fontSize: 20,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 40,
  },
  showAnswerButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  showAnswerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  answerContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  answerLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 12,
  },
  answerText: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
  },
  reviewActions: {
    marginTop: 32,
  },
  reviewPrompt: {
    fontSize: 18,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 24,
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  reviewButton: {
    flex: 1,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  incorrectButton: {
    backgroundColor: '#ef4444',
  },
  correctButton: {
    backgroundColor: '#10b981',
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
})
