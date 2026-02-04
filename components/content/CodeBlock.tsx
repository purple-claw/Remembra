import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Colors';

interface CodeBlockProps {
    code: string;
    language?: string;
}

// Syntax highlighting colors
const syntaxColors = {
    keyword: '#FF79C6',
    string: '#F1FA8C',
    comment: '#6272A4',
    function: '#50FA7B',
    variable: '#BD93F9',
    number: '#FF6B35',
    operator: '#FF4444',
    punctuation: '#F8F8F2',
    default: '#F8F8F2',
};

// Simple syntax highlighter
function highlightCode(code: string, language?: string): React.ReactNode[] {
    const lines = code.split('\n');

    return lines.map((line, lineIndex) => {
        // Simple tokenization
        const tokens: { text: string; color: string }[] = [];
        let remaining = line;

        // Keywords for common languages
        const keywords = /\b(const|let|var|function|return|if|else|for|while|import|export|from|default|class|extends|new|this|async|await|try|catch|throw|typeof|interface|type|enum)\b/g;
        const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
        const comments = /\/\/.*$|\/\*[\s\S]*?\*\//g;
        const numbers = /\b\d+\.?\d*\b/g;
        const functions = /\b([a-zA-Z_]\w*)\s*(?=\()/g;

        // Process the line character by character for simplicity
        let i = 0;
        while (i < remaining.length) {
            let matched = false;

            // Check for comments
            if (remaining.slice(i).startsWith('//')) {
                tokens.push({ text: remaining.slice(i), color: syntaxColors.comment });
                break;
            }

            // Check for strings
            const stringMatch = remaining.slice(i).match(/^(["'`])(?:(?!\1)[^\\]|\\.)*\1/);
            if (stringMatch) {
                tokens.push({ text: stringMatch[0], color: syntaxColors.string });
                i += stringMatch[0].length;
                matched = true;
                continue;
            }

            // Check for keywords
            const keywordMatch = remaining.slice(i).match(/^(const|let|var|function|return|if|else|for|while|import|export|from|default|class|extends|new|this|async|await|try|catch|throw|typeof|interface|type|enum)\b/);
            if (keywordMatch) {
                tokens.push({ text: keywordMatch[0], color: syntaxColors.keyword });
                i += keywordMatch[0].length;
                matched = true;
                continue;
            }

            // Check for numbers
            const numberMatch = remaining.slice(i).match(/^\d+\.?\d*/);
            if (numberMatch && (i === 0 || !/[a-zA-Z_]/.test(remaining[i - 1]))) {
                tokens.push({ text: numberMatch[0], color: syntaxColors.number });
                i += numberMatch[0].length;
                matched = true;
                continue;
            }

            // Check for functions
            const funcMatch = remaining.slice(i).match(/^([a-zA-Z_]\w*)\s*(?=\()/);
            if (funcMatch) {
                tokens.push({ text: funcMatch[1], color: syntaxColors.function });
                i += funcMatch[1].length;
                matched = true;
                continue;
            }

            // Check for operators
            if (/[+\-*/%=<>!&|^~?:]/.test(remaining[i])) {
                let op = remaining[i];
                if (remaining[i + 1] && /[=<>&|]/.test(remaining[i + 1])) {
                    op += remaining[i + 1];
                    i++;
                }
                tokens.push({ text: op, color: syntaxColors.operator });
                i++;
                matched = true;
                continue;
            }

            // Default character
            if (!matched) {
                const lastToken = tokens[tokens.length - 1];
                if (lastToken && lastToken.color === syntaxColors.default) {
                    lastToken.text += remaining[i];
                } else {
                    tokens.push({ text: remaining[i], color: syntaxColors.default });
                }
                i++;
            }
        }

        return (
            <View key={lineIndex} style={styles.codeLine}>
                <Text style={styles.lineNumber}>{(lineIndex + 1).toString().padStart(2, ' ')}</Text>
                <Text style={styles.codeContent}>
                    {tokens.map((token, tokenIndex) => (
                        <Text key={tokenIndex} style={{ color: token.color }}>
                            {token.text}
                        </Text>
                    ))}
                </Text>
            </View>
        );
    });
}

export function CodeBlock({ code, language }: CodeBlockProps) {
    return (
        <View style={styles.container}>
            {language && (
                <View style={styles.header}>
                    <Text style={styles.language}>{language}</Text>
                </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.codeContainer}>
                    {highlightCode(code, language)}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1E1E2E',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    header: {
        backgroundColor: '#2A2A3E',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.glassBorder,
    },
    language: {
        fontSize: Typography.sizes.xs,
        color: Colors.dark.textMuted,
        textTransform: 'uppercase',
        fontWeight: Typography.weights.medium,
    },
    codeContainer: {
        padding: Spacing.md,
        minWidth: '100%',
    },
    codeLine: {
        flexDirection: 'row',
        minHeight: 22,
    },
    lineNumber: {
        width: 28,
        color: Colors.dark.textMuted,
        fontSize: 13,
        fontFamily: 'monospace',
        marginRight: Spacing.sm,
        opacity: 0.5,
    },
    codeContent: {
        fontSize: 13,
        fontFamily: 'monospace',
        lineHeight: 22,
    },
});
