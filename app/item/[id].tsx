import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { CodeBlock } from '../../components/content/CodeBlock';
import { Flowchart } from '../../components/content/Flowchart';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Colors';
import { useStore } from '../../store/store';
import { ContentBlock, DEMO_MEMORY_ITEM, REVIEW_INTERVALS } from '../../types/types';

// Mini Calendar for this item's review schedule
function ItemCalendar({ reviewStage, nextReviewDate }: { reviewStage: number; nextReviewDate: Date }) {
    const stages = REVIEW_INTERVALS.map((days, index) => ({
        day: days,
        label: `Day ${days}`,
        completed: index < reviewStage,
        current: index === reviewStage,
        upcoming: index > reviewStage,
    }));

    return (
        <View style={styles.calendarContainer}>
            <Text style={styles.calendarTitle}>Review Schedule (1-4-7-30-90)</Text>
            <View style={styles.calendarTrack}>
                {stages.map((stage, index) => (
                    <View key={index} style={styles.stageItem}>
                        <View
                            style={[
                                styles.stageDot,
                                stage.completed && styles.stageDotCompleted,
                                stage.current && styles.stageDotCurrent,
                            ]}
                        >
                            {stage.completed && (
                                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                            )}
                            {stage.current && (
                                <Ionicons name="time" size={12} color="#FFFFFF" />
                            )}
                        </View>
                        <Text style={[styles.stageLabel, stage.current && styles.stageLabelCurrent]}>
                            {stage.label}
                        </Text>
                        {index < stages.length - 1 && (
                            <View
                                style={[
                                    styles.stageLine,
                                    stage.completed && styles.stageLineCompleted,
                                ]}
                            />
                        )}
                    </View>
                ))}
            </View>
            <View style={styles.nextReviewBox}>
                <Ionicons name="calendar-outline" size={18} color={Colors.dark.accent} />
                <Text style={styles.nextReviewText}>
                    Next review: {nextReviewDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    })}
                </Text>
            </View>
        </View>
    );
}

// Render individual content block
function RenderContentBlock({ block }: { block: ContentBlock }) {
    switch (block.type) {
        case 'heading':
            const HeadingStyle = block.level === 1 ? styles.heading1 :
                block.level === 2 ? styles.heading2 : styles.heading3;
            return <Text style={HeadingStyle}>{block.content}</Text>;

        case 'text':
            return <Text style={styles.textBlock}>{block.content}</Text>;

        case 'bullet':
            return (
                <View style={styles.bulletItem}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{block.content}</Text>
                </View>
            );

        case 'code':
            return <CodeBlock code={block.content} language={block.language} />;

        case 'flowchart':
            return <Flowchart mermaidCode={block.content} />;

        case 'note':
            return (
                <View style={[styles.noteBlock, { borderLeftColor: block.color || Colors.dark.warning }]}>
                    <Ionicons name="bulb-outline" size={16} color={block.color || Colors.dark.warning} />
                    <Text style={styles.noteText}>{block.content}</Text>
                </View>
            );

        case 'divider':
            return <View style={styles.divider} />;

        default:
            return null;
    }
}

export default function ItemDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { memoryItems, categories, updateMemoryItem } = useStore();

    // For demo, use the demo item if no real item found
    const item = memoryItems.find(m => m.id === id) || DEMO_MEMORY_ITEM;
    const category = categories.find(c => c.id === item.categoryId);

    const [personalNotes, setPersonalNotes] = useState(item.personalNotes || '');
    const [isEditing, setIsEditing] = useState(false);

    const handleSaveNotes = () => {
        if (item.id !== 'demo-1') {
            updateMemoryItem(item.id, { personalNotes });
        }
        setIsEditing(false);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="create-outline" size={20} color={Colors.dark.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Ionicons name="share-outline" size={20} color={Colors.dark.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                {/* Title Section */}
                <View style={styles.titleSection}>
                    <View style={styles.categoryBadge}>
                        <View style={[styles.categoryDot, { backgroundColor: category?.color || '#6366F1' }]} />
                        <Text style={styles.categoryName}>{category?.name || 'General'}</Text>
                    </View>
                    <Text style={styles.title}>{item.title}</Text>

                    {/* Tags */}
                    <View style={styles.tagsRow}>
                        {item.tags?.map((tag, i) => (
                            <View key={i} style={styles.tag}>
                                <Text style={styles.tagText}>#{tag}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Mini Calendar */}
                <ItemCalendar
                    reviewStage={item.reviewStage}
                    nextReviewDate={new Date(item.nextReviewDate)}
                />

                {/* Content Blocks */}
                <View style={styles.contentSection}>
                    {item.contentBlocks?.map((block) => (
                        <View key={block.id} style={styles.blockWrapper}>
                            <RenderContentBlock block={block} />
                        </View>
                    ))}
                </View>

                {/* Personal Notes */}
                <View style={styles.notesSection}>
                    <View style={styles.notesSectionHeader}>
                        <Text style={styles.notesSectionTitle}>My Notes</Text>
                        {!isEditing ? (
                            <TouchableOpacity onPress={() => setIsEditing(true)}>
                                <Ionicons name="create-outline" size={18} color={Colors.dark.accent} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleSaveNotes}>
                                <Ionicons name="checkmark" size={18} color={Colors.dark.success} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {isEditing ? (
                        <TextInput
                            style={styles.notesInput}
                            value={personalNotes}
                            onChangeText={setPersonalNotes}
                            placeholder="Add your personal notes here..."
                            placeholderTextColor={Colors.dark.textMuted}
                            multiline
                            textAlignVertical="top"
                        />
                    ) : (
                        <TouchableOpacity onPress={() => setIsEditing(true)}>
                            <Text style={[styles.notesText, !personalNotes && styles.notesPlaceholder]}>
                                {personalNotes || 'Tap to add notes...'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Review Actions */}
                <View style={styles.reviewActions}>
                    <TouchableOpacity style={styles.reviewBtn}>
                        <Ionicons name="flash" size={20} color="#FFFFFF" />
                        <Text style={styles.reviewBtnText}>Start Review</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
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
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    backBtn: {
        width: 40,
        height: 40,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    headerActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionBtn: {
        width: 40,
        height: 40,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },
    titleSection: {
        marginBottom: Spacing.lg,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: Spacing.sm,
    },
    categoryDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    categoryName: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.textSecondary,
    },
    title: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: Typography.weights.bold,
        color: Colors.dark.text,
        marginBottom: Spacing.sm,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    tag: {
        backgroundColor: Colors.dark.card,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    tagText: {
        fontSize: Typography.sizes.xs,
        color: Colors.dark.accent,
    },
    // Calendar styles
    calendarContainer: {
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    calendarTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
        color: Colors.dark.text,
        marginBottom: Spacing.md,
    },
    calendarTrack: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    stageItem: {
        alignItems: 'center',
        flex: 1,
        position: 'relative',
    },
    stageDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.dark.cardElevated,
        borderWidth: 2,
        borderColor: Colors.dark.textMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    stageDotCompleted: {
        backgroundColor: Colors.dark.success,
        borderColor: Colors.dark.success,
    },
    stageDotCurrent: {
        backgroundColor: Colors.dark.accent,
        borderColor: Colors.dark.accent,
    },
    stageLabel: {
        fontSize: 10,
        color: Colors.dark.textMuted,
    },
    stageLabelCurrent: {
        color: Colors.dark.accent,
        fontWeight: Typography.weights.semibold,
    },
    stageLine: {
        position: 'absolute',
        top: 14,
        left: '60%',
        right: '-40%',
        height: 2,
        backgroundColor: Colors.dark.textMuted,
        opacity: 0.3,
        zIndex: -1,
    },
    stageLineCompleted: {
        backgroundColor: Colors.dark.success,
        opacity: 1,
    },
    nextReviewBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.dark.cardElevated,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    nextReviewText: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.text,
    },
    // Content styles
    contentSection: {
        marginBottom: Spacing.lg,
    },
    blockWrapper: {
        marginBottom: Spacing.md,
    },
    heading1: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: Typography.weights.bold,
        color: Colors.dark.text,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    heading2: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.semibold,
        color: Colors.dark.text,
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    heading3: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.medium,
        color: Colors.dark.text,
        marginTop: Spacing.xs,
    },
    textBlock: {
        fontSize: Typography.sizes.base,
        color: Colors.dark.textSecondary,
        lineHeight: 24,
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 4,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.dark.accent,
        marginTop: 8,
        marginRight: Spacing.sm,
    },
    bulletText: {
        flex: 1,
        fontSize: Typography.sizes.base,
        color: Colors.dark.textSecondary,
        lineHeight: 22,
    },
    noteBlock: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        backgroundColor: Colors.dark.cardElevated,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderLeftWidth: 3,
    },
    noteText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        color: Colors.dark.text,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.dark.glassBorder,
        marginVertical: Spacing.md,
    },
    // Notes section
    notesSection: {
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    notesSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    notesSectionTitle: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        color: Colors.dark.text,
    },
    notesInput: {
        backgroundColor: Colors.dark.cardElevated,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.dark.text,
        fontSize: Typography.sizes.base,
        minHeight: 100,
    },
    notesText: {
        fontSize: Typography.sizes.base,
        color: Colors.dark.textSecondary,
        lineHeight: 22,
    },
    notesPlaceholder: {
        color: Colors.dark.textMuted,
        fontStyle: 'italic',
    },
    // Review actions
    reviewActions: {
        marginBottom: Spacing.lg,
    },
    reviewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.dark.accent,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    reviewBtnText: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        color: '#FFFFFF',
    },
});
