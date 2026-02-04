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
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/database'
import type { Category, MemoryItem } from '@/types'

export default function LibraryScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [categoriesData, itemsData] = await Promise.all([
        db.getCategories(user.id),
        db.getMemoryItems(user.id),
      ])
      setCategories(categoriesData)
      setItems(itemsData)
    } catch (error) {
      console.error('Error loading library:', error)
      Alert.alert('Error', 'Failed to load library')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryStats = (categoryId: string) => {
    const categoryItems = items.filter((item) => item.category_id === categoryId)
    return {
      total: categoryItems.length,
      new: categoryItems.filter((item) => item.stage === 0).length,
      learning: categoryItems.filter((item) => item.stage > 0 && item.stage < 30).length,
      mastered: categoryItems.filter((item) => item.stage >= 30).length,
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366F1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Library</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Ionicons name="add-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilters}
          contentContainerStyle={styles.categoryFiltersContent}
        >
          <TouchableOpacity
            style={[styles.categoryFilterChip, !selectedCategory && styles.categoryFilterChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryFilterText, !selectedCategory && styles.categoryFilterTextActive]}>
              All ({items.length})
            </Text>
          </TouchableOpacity>

          {categories.map((category) => {
            const stats = getCategoryStats(category.id)
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryFilterChip,
                  selectedCategory === category.id && styles.categoryFilterChipActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <Text
                  style={[
                    styles.categoryFilterText,
                    selectedCategory === category.id && styles.categoryFilterTextActive,
                  ]}
                >
                  {category.name} ({stats.total})
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Categories Section */}
        {!searchQuery && !selectedCategory && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
                <Text style={styles.sectionAction}>Add New</Text>
              </TouchableOpacity>
            </View>

            {categories.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color="#64748b" />
                <Text style={styles.emptyText}>No categories yet</Text>
                <Text style={styles.emptySubtext}>Create your first category to organize your learning</Text>
              </View>
            ) : (
              <View style={styles.categoriesGrid}>
                {categories.map((category) => {
                  const stats = getCategoryStats(category.id)
                  return (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      stats={stats}
                      onPress={() => setSelectedCategory(category.id)}
                    />
                  )
                })}
              </View>
            )}
          </View>
        )}

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory
                ? categories.find((c) => c.id === selectedCategory)?.name
                : 'All Items'}
            </Text>
            <TouchableOpacity onPress={() => setShowItemModal(true)}>
              <Ionicons name="add" size={24} color="#6366F1" />
            </TouchableOpacity>
          </View>

          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="documents-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No items found' : 'No items yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add your first memory item to start learning'}
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {filteredItems.map((item) => {
                const category = categories.find((c) => c.id === item.category_id)
                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    category={category}
                    onPress={() => router.push(`/item/${item.id}`)}
                  />
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Category Modal */}
      <CreateCategoryModal
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSuccess={loadData}
      />

      {/* Create Item Modal */}
      <CreateItemModal
        visible={showItemModal}
        categories={categories}
        onClose={() => setShowItemModal(false)}
        onSuccess={loadData}
      />
    </View>
  )
}

function CategoryCard({
  category,
  stats,
  onPress,
}: {
  category: Category
  stats: { total: number; new: number; learning: number; mastered: number }
  onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
      <View style={[styles.categoryCardHeader, { backgroundColor: category.color + '20' }]}>
        <Text style={styles.categoryIcon}>{category.icon}</Text>
      </View>
      <Text style={styles.categoryCardName}>{category.name}</Text>
      <View style={styles.categoryCardStats}>
        <View style={styles.categoryCardStat}>
          <Text style={styles.categoryCardStatValue}>{stats.total}</Text>
          <Text style={styles.categoryCardStatLabel}>Items</Text>
        </View>
        <View style={styles.categoryCardStat}>
          <Text style={styles.categoryCardStatValue}>{stats.mastered}</Text>
          <Text style={styles.categoryCardStatLabel}>Mastered</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function ItemCard({
  item,
  category,
  onPress,
}: {
  item: MemoryItem
  category?: Category
  onPress: () => void
}) {
  const getDaysUntilReview = () => {
    const now = new Date()
    const reviewDate = new Date(item.next_review_date)
    const diff = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'Overdue'
    if (diff === 0) return 'Today'
    return `${diff}d`
  }

  return (
    <TouchableOpacity style={styles.itemCard} onPress={onPress}>
      <View style={styles.itemCardHeader}>
        <View style={styles.itemCardTitle}>
          <View style={[styles.categoryDot, { backgroundColor: category?.color || '#6366F1' }]} />
          <Text style={styles.itemCardTitleText} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <View style={styles.itemCardBadge}>
          <Text style={styles.itemCardBadgeText}>{getDaysUntilReview()}</Text>
        </View>
      </View>

      <View style={styles.itemCardMeta}>
        {category && (
          <View style={styles.metaItem}>
            <Ionicons name="folder-outline" size={14} color="#94a3b8" />
            <Text style={styles.metaText}>{category.name}</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Ionicons name="layers-outline" size={14} color="#94a3b8" />
          <Text style={styles.metaText}>Stage {item.stage}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#94a3b8" />
          <Text style={styles.metaText}>
            {item.success_count}/{item.review_count}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function CreateCategoryModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366F1')
  const [icon, setIcon] = useState('📚')
  const [loading, setLoading] = useState(false)

  const colors = ['#6366F1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444']
  const icons = ['📚', '💻', '🧪', '🎨', '🎵', '🏃', '🍳', '🌍', '💡', '📊']

  const handleCreate = async () => {
    if (!user || !name.trim()) return

    try {
      setLoading(true)
      await db.createCategory(user.id, {
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
        item_count: 0,
      })
      setName('')
      setDescription('')
      setColor('#6366F1')
      setIcon('📚')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating category:', error)
      Alert.alert('Error', 'Failed to create category')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., JavaScript, Biology, History"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief description of this category"
              placeholderTextColor="#64748b"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Icon</Text>
            <View style={styles.optionsGrid}>
              {icons.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.optionChip, icon === emoji && styles.optionChipActive]}
                  onPress={() => setIcon(emoji)}
                >
                  <Text style={styles.optionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.optionsGrid}>
              {colors.map((colorOption) => (
                <TouchableOpacity
                  key={colorOption}
                  style={[
                    styles.colorOption,
                    { backgroundColor: colorOption },
                    color === colorOption && styles.colorOptionActive,
                  ]}
                  onPress={() => setColor(colorOption)}
                >
                  {color === colorOption && <Ionicons name="checkmark" size={20} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.createButton, (!name.trim() || loading) && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Category</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function CreateItemModal({
  visible,
  categories,
  onClose,
  onSuccess,
}: {
  visible: boolean
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!user || !title.trim() || !content.trim()) return

    try {
      setLoading(true)
      await db.createMemoryItem(user.id, {
        title: title.trim(),
        content: [{ type: 'text', content: content.trim() }],
        category_id: categoryId || null,
        content_type: 'text',
        tags: [],
        is_archived: false,
        has_quiz: false,
        has_summary: false,
        has_flashcards: false,
        has_flowchart: false,
      })
      setTitle('')
      setContent('')
      setCategoryId('')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating item:', error)
      Alert.alert('Error', 'Failed to create item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Memory Item</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you want to remember?"
              placeholderTextColor="#64748b"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter the information you want to learn..."
              placeholderTextColor="#64748b"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
            />

            <Text style={styles.inputLabel}>Category (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              <TouchableOpacity
                style={[styles.categoryPickerChip, !categoryId && styles.categoryPickerChipActive]}
                onPress={() => setCategoryId('')}
              >
                <Text style={[styles.categoryPickerText, !categoryId && styles.categoryPickerTextActive]}>
                  None
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryPickerChip,
                    categoryId === category.id && styles.categoryPickerChipActive,
                  ]}
                  onPress={() => setCategoryId(category.id)}
                >
                  <Text style={styles.categoryPickerEmoji}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.categoryPickerText,
                      categoryId === category.id && styles.categoryPickerTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.createButton,
              (!title.trim() || !content.trim() || loading) && styles.createButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!title.trim() || !content.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Item</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  categoryFilters: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  categoryFiltersContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  categoryFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
    gap: 6,
  },
  categoryFilterChipActive: {
    backgroundColor: '#6366F1',
  },
  categoryFilterText: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  categoryFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  sectionAction: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryCardHeader: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  categoryCardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  categoryCardStat: {
    flex: 1,
  },
  categoryCardStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  categoryCardStatLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemCardTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemCardTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  itemCardBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemCardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  itemCardMeta: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  optionChipActive: {
    borderColor: '#6366F1',
  },
  optionEmoji: {
    fontSize: 24,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#fff',
  },
  categoryPicker: {
    flexDirection: 'row',
  },
  categoryPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryPickerChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  categoryPickerEmoji: {
    fontSize: 16,
  },
  categoryPickerText: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  categoryPickerTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#6366F1',
    margin: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#334155',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
})
