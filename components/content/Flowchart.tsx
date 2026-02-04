import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Colors';

interface FlowchartProps {
    mermaidCode: string;
}

// Parse simple Mermaid flowchart to visual nodes
function parseMermaid(code: string): { nodes: any[]; edges: any[] } {
    const nodes: { id: string; label: string; shape: 'rect' | 'diamond' | 'round' }[] = [];
    const edges: { from: string; to: string; label?: string }[] = [];

    const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('graph'));

    lines.forEach(line => {
        // Parse node definitions and edges
        // Format: A[Label] --> B{Label}
        const arrowMatch = line.match(/(\w+)(?:\[([^\]]+)\]|\{([^\}]+)\}|\(([^\)]+)\))?\s*--(?:>|-)(?:\|([^|]+)\|)?\s*(\w+)(?:\[([^\]]+)\]|\{([^\}]+)\}|\(([^\)]+)\))?/);

        if (arrowMatch) {
            const [, fromId, fromRect, fromDiamond, fromRound, edgeLabel, toId, toRect, toDiamond, toRound] = arrowMatch;

            // Add from node if not exists
            if (!nodes.find(n => n.id === fromId)) {
                nodes.push({
                    id: fromId,
                    label: fromRect || fromDiamond || fromRound || fromId,
                    shape: fromDiamond ? 'diamond' : fromRound ? 'round' : 'rect',
                });
            }

            // Add to node if not exists
            if (!nodes.find(n => n.id === toId)) {
                nodes.push({
                    id: toId,
                    label: toRect || toDiamond || toRound || toId,
                    shape: toDiamond ? 'diamond' : toRound ? 'round' : 'rect',
                });
            }

            edges.push({ from: fromId, to: toId, label: edgeLabel });
        }
    });

    return { nodes, edges };
}

export function Flowchart({ mermaidCode }: FlowchartProps) {
    const { nodes, edges } = parseMermaid(mermaidCode);

    if (nodes.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.placeholder}>Flowchart visualization</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.chart}>
                {nodes.map((node, index) => (
                    <View key={node.id} style={styles.nodeRow}>
                        <View
                            style={[
                                styles.node,
                                node.shape === 'diamond' && styles.nodeDiamond,
                                node.shape === 'round' && styles.nodeRound,
                            ]}
                        >
                            <Text style={styles.nodeText} numberOfLines={2}>
                                {node.label}
                            </Text>
                        </View>
                        {index < nodes.length - 1 && (
                            <View style={styles.connector}>
                                <View style={styles.line} />
                                <View style={styles.arrow} />
                                {edges[index]?.label && (
                                    <Text style={styles.edgeLabel}>{edges[index].label}</Text>
                                )}
                            </View>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    placeholder: {
        color: Colors.dark.textMuted,
        fontSize: Typography.sizes.sm,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    chart: {
        alignItems: 'center',
    },
    nodeRow: {
        alignItems: 'center',
    },
    node: {
        backgroundColor: Colors.dark.cardElevated,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.accent,
        minWidth: 120,
        alignItems: 'center',
    },
    nodeDiamond: {
        transform: [{ rotate: '0deg' }],
        backgroundColor: Colors.dark.accentSecondary + '20',
        borderColor: Colors.dark.accentSecondary,
    },
    nodeRound: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.lg,
    },
    nodeText: {
        color: Colors.dark.text,
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
        textAlign: 'center',
    },
    connector: {
        alignItems: 'center',
        height: 40,
        justifyContent: 'center',
    },
    line: {
        width: 2,
        height: 30,
        backgroundColor: Colors.dark.textMuted,
    },
    arrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: Colors.dark.textMuted,
    },
    edgeLabel: {
        position: 'absolute',
        left: 20,
        fontSize: Typography.sizes.xs,
        color: Colors.dark.textSecondary,
        backgroundColor: Colors.dark.background,
        paddingHorizontal: 4,
    },
});
