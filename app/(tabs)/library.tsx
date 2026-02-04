import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Colors';
import { useSupabaseStore as useStore } from '../../lib/supabaseStore';
import { MemoryItem } from '../../types/types';

const STATUS_FILTERS = ['All', 'Learning', 'Reviewing', 'Mastered'];

function MemoryItemCard({ item, onPress }: { item: MemoryItem; onPress: () => void }) {
    const { categories } = useStore();
    const category = categories.find((c) => c.id === item.categoryId);

    // Get preview text from content blocks
    const getPreview = () => {
        if (item.contentBlocks?.length > 0) {
            const textBlock = item.contentBlocks.find(b => b.type === 'text' || b.type === 'bullet');
            return textBlock?.content || '';
        }
        return item.content;
    };

    // Get content count badges
    const codeCount = item.contentBlocks?.filter(b => b.type === 'code').length || 0;
    const bulletCount = item.contentBlocks?.filter(b => b.type === 'bullet').length || 0;

    return (
        <TouchableOpacity style={styles.itemCard} activeOpacity={0.85} onPress={onPress}>
            <View style={styles.itemHeader}>
                <View style={[styles.categoryDot, { backgroundColor: category?.color || '#6366F1' }]} />
                <Text style={styles.itemCategory}>{category?.name || 'General'}</Text>
                <View style={[styles.statusBadge,
                item.status === 'mastered' && styles.statusMastered,
                item.status === 'reviewing' && styles.statusReviewing,
                ]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <Text style={styles.itemTitle} numberOfLines={2}>
                {item.title}
            </Text>

            <Text style={styles.itemContent} numberOfLines={2}>
                {getPreview()}
            </Text>

            {/* Content type badges */}
            <View style={styles.contentBadges}>
                {codeCount > 0 && (
                    <View style={styles.contentBadge}>
                        <Ionicons name="code-slash" size={12} color={Colors.dark.success} />
                        <Text style={styles.contentBadgeText}>{codeCount} code</Text>
                    </View>
                )}
                {bulletCount > 0 && (
                    <View style={styles.contentBadge}>
                        <Ionicons name="list" size={12} color={Colors.dark.accentSecondary} />
                        <Text style={styles.contentBadgeText}>{bulletCount} points</Text>
                    </View>
                )}
                {item.tags?.length > 0 && (
                    <View style={styles.contentBadge}>
                        <Ionicons name="pricetag" size={12} color={Colors.dark.accent} />
                        <Text style={styles.contentBadgeText}>{item.tags.length} tags</Text>
                    </View>
                )}
            </View>

            <View style={styles.itemFooter}>
                <View style={styles.itemMeta}>
                    <View style={styles.stageIndicator}>
                        {[0, 1, 2, 3, 4].map(i => (
                            <View
                                key={i}
                                style={[
                                    styles.stageDotSmall,
                                    i <= item.reviewStage && styles.stageDotFilled
                                ]}
                            />
                        ))}
                    </View>
                    <Text style={styles.itemMetaText}>Stage {item.reviewStage + 1}/5</Text>
                </View>
                <View style={styles.arrowBtn}>
                    <Ionicons name="arrow-forward" size={16} color={Colors.dark.accent} />
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function LibraryScreen() {
    const router = useRouter();
    const { memoryItems, categories } = useStore();
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = memoryItems.filter((item) => {
        const matchesStatus = statusFilter === 'All' || item.status.toLowerCase() === statusFilter.toLowerCase();
        const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
        const matchesSearch = !searchQuery ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesCategory && matchesSearch;
    });

    const handleItemPress = (item: MemoryItem) => {
        router.push({ pathname: '/item/[id]', params: { id: item.id } });
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={Colors.dark.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search items, tags..."
                    placeholderTextColor={Colors.dark.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color={Colors.dark.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Status Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
            >
                {STATUS_FILTERS.map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[
                            styles.filterChip,
                            statusFilter === filter && styles.filterChipActive,
                        ]}
                        onPress={() => setStatusFilter(filter)}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                statusFilter === filter && styles.filterTextActive,
                            ]}
                        >
                            {filter}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Category Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryFilterContainer}
                contentContainerStyle={styles.filterContent}
            >
                <TouchableOpacity
                    style={[
                        styles.categoryChip,
                        !selectedCategory && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(null)}
                >
                    <Text style={[
                        styles.categoryChipText,
                        !selectedCategory && styles.categoryChipTextActive,
                    ]}>
                        All
                    </Text>
                </TouchableOpacity>
                {categories.map((category) => (
                    <TouchableOpacity
                        key={category.id}
                        style={[
                            styles.categoryChip,
                            selectedCategory === category.id && styles.categoryChipActive,
                        ]}
                        onPress={() => setSelectedCategory(category.id)}
                    >
                        <View style={[styles.categoryDotSmall, { backgroundColor: category.color }]} />
                        <Text style={[
                            styles.categoryChipText,
                            selectedCategory === category.id && styles.categoryChipTextActive,
                        ]}>
                            {category.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Result Count */}
            <View style={styles.resultRow}>
                <Text style={styles.resultCount}>{filteredItems.length} items</Text>
            </View>

            {/* Items */}
            {filteredItems.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="book-outline" size={48} color={Colors.dark.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No items yet</Text>
                    <Text style={styles.emptyText}>
                        Add memory items from the dashboard
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    renderItem={({ item }) => (
                        <MemoryItemCard item={item} onPress={() => handleItemPress(item)} />
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.itemsList}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.dark.card,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        borderRadius: BorderRadius.lg,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    searchInput: {
        flex: 1,
        color: Colors.dark.text,
        fontSize: Typography.sizes.base,
    },
    filterContainer: {
        marginTop: Spacing.md,
    },
    filterContent: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    filterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
        marginRight: Spacing.sm,
    },
    filterChipActive: {
        backgroundColor: Colors.dark.accent,
        borderColor: Colors.dark.accent,
    },
    filterText: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.textSecondary,
        fontWeight: Typography.weights.medium,
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    categoryFilterContainer: {
        marginTop: Spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
        marginRight: Spacing.sm,
    },
    categoryChipActive: {
        backgroundColor: Colors.dark.cardElevated,
        borderColor: Colors.dark.glassHighlight,
    },
    categoryChipText: {
        fontSize: Typography.sizes.xs,
        color: Colors.dark.textSecondary,
    },
    categoryChipTextActive: {
        color: Colors.dark.text,
    },
    categoryDotSmall: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    resultRow: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    resultCount: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.textMuted,
    },
    itemsList: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
        gap: Spacing.md,
    },
    itemCard: {
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    categoryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    itemCategory: {
        fontSize: Typography.sizes.xs,
        color: Colors.dark.textMuted,
        flex: 1,
    },
    statusBadge: {
        backgroundColor: Colors.dark.cardElevated,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    statusMastered: {
        backgroundColor: Colors.dark.success + '20',
    },
    statusReviewing: {
        backgroundColor: Colors.dark.accentSecondary + '20',
    },
    statusText: {
        fontSize: 10,
        color: Colors.dark.textSecondary,
        textTransform: 'capitalize',
        fontWeight: Typography.weights.medium,
    },
    itemTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        color: Colors.dark.text,
        marginBottom: 6,
    },
    itemContent: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.textSecondary,
        lineHeight: 20,
        marginBottom: Spacing.sm,
    },
    contentBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
        marginBottom: Spacing.md,
    },
    contentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.dark.cardElevated,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    contentBadgeText: {
        fontSize: 10,
        color: Colors.dark.textSecondary,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    stageIndicator: {
        flexDirection: 'row',
        gap: 3,
    },
    stageDotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.dark.borderSubtle,
    },
    stageDotFilled: {
        backgroundColor: Colors.dark.accent,
    },
    itemMetaText: {
        fontSize: Typography.sizes.xs,
        color: Colors.dark.textMuted,
    },
    arrowBtn: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.dark.cardElevated,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.dark.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold,
        color: Colors.dark.text,
        marginBottom: Spacing.xs,
    },
    emptyText: {
        fontSize: Typography.sizes.base,
        color: Colors.dark.textMuted,
        textAlign: 'center',
    },
});
