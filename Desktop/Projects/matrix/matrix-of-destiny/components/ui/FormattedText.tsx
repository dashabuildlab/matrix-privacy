// ─────────────────────────────────────────────────────────────────────────────
// FormattedText — renders basic markdown-style formatting in React Native
// Supports: **bold**, *italic*, and plain text
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
  selectable?: boolean;
}

interface Segment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

function parseFormatting(input: string): Segment[] {
  const segments: Segment[] = [];
  // Match **bold**, *italic*, or plain text
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|([^*]+)/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    if (match[1] !== undefined) {
      segments.push({ text: match[1], bold: true });
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], italic: true });
    } else if (match[3] !== undefined) {
      segments.push({ text: match[3] });
    }
  }
  return segments;
}

export function FormattedText({ children, style, selectable }: Props) {
  if (!children) return null;
  const segments = parseFormatting(children);

  return (
    <Text style={style} selectable={selectable}>
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={[
            seg.bold && { fontWeight: '700' },
            seg.italic && { fontStyle: 'italic' },
          ]}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}
