/**
 * Consultation Chat Component for visioENT
 *
 * Real-time messaging widget for consultation room (Operator ↔ Doctor).
 * Adheres strictly to Phase 5 Light Clinical Theme.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { ConsultationMessage, Role } from '@/types';
import { chatService } from '@/services/firebase/chatService';

interface ConsultationChatProps {
  consultationId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: Role;
  isCompleted?: boolean;
  maxHeight?: number;
}

export function ConsultationChat({
  consultationId,
  currentUserId,
  currentUserName,
  currentUserRole,
  isCompleted = false,
  maxHeight = 360,
}: ConsultationChatProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const flatListRef = useRef<FlatList<ConsultationMessage>>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!consultationId) return;

    const unsubscribe = chatService.subscribeMessages(
      consultationId,
      (updatedMessages) => {
        setMessages(updatedMessages);
        setErrorMessage('');
      },
      (err) => {
        setErrorMessage(err.message || 'Error syncing messages');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [consultationId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending || isCompleted) return;

    if (text.length > 1000) {
      setErrorMessage('Message exceeds 1000 characters.');
      return;
    }

    setErrorMessage('');
    setIsSending(true);

    const result = await chatService.sendMessage({
      consultationId,
      senderUid: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      text,
    });

    setIsSending(false);

    if (result.success) {
      setInputText('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      setErrorMessage(result.error || 'Failed to send message.');
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessageItem = ({ item }: { item: ConsultationMessage }) => {
    const isOwn = item.senderUid === currentUserId;
    const isDoctor = item.senderRole === 'doctor';

    return (
      <View
        style={[
          styles.messageRow,
          isOwn ? styles.messageRowOwn : styles.messageRowOther,
        ]}>
        <View
          style={[
            styles.messageBubble,
            isOwn
              ? [styles.bubbleOwn, { backgroundColor: colors.primary }]
              : [
                  styles.bubbleOther,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ],
          ]}>
          {/* Sender Header */}
          <View style={styles.senderHeader}>
            <Text
              style={[
                styles.senderName,
                { color: isOwn ? '#FFFFFF' : colors.primaryDark },
              ]}>
              {isOwn ? 'You' : item.senderName}{' '}
              <Text
                style={[
                  styles.roleTag,
                  { color: isOwn ? 'rgba(255,255,255,0.85)' : colors.textSecondary },
                ]}>
                ({isDoctor ? '👨‍⚕️ Doctor' : '🏥 Operator'})
              </Text>
            </Text>
            <Text
              style={[
                styles.messageTime,
                { color: isOwn ? 'rgba(255,255,255,0.75)' : colors.textMuted },
              ]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>

          {/* Message Text */}
          <Text
            style={[
              styles.messageText,
              { color: isOwn ? '#FFFFFF' : colors.black },
            ]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          maxHeight,
        },
      ]}>
      {/* Header / Participant Indicator */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            💬 Consultation Chat
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            Secure in-room clinical dialogue
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isCompleted
                ? colors.surfaceSecondary
                : colors.primaryLight,
            },
          ]}>
          <Text
            style={[
              styles.statusBadgeText,
              {
                color: isCompleted ? colors.textMuted : colors.primaryDark,
              },
            ]}>
            {isCompleted ? 'Read-Only' : 'Live Channel'}
          </Text>
        </View>
      </View>

      {/* Error Banner */}
      {errorMessage ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.dangerBg }]}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {/* Message List */}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 28, marginBottom: 6 }}>💬</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No messages yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Coordinate examination steps, patient responses, and technical guidance in real time.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Input Bar */}
      <View
        style={[
          styles.inputContainer,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}>
        {isCompleted ? (
          <View style={styles.readOnlyBox}>
            <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>
              🔒 Consultation completed. Messages preserved as historical clinical record.
            </Text>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  color: colors.black,
                },
              ]}
              placeholder="Type clinical message (max 1000)..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isSending}
            />

            <Pressable
              onPress={handleSend}
              disabled={isSending || !inputText.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: colors.primary,
                  opacity:
                    isSending || !inputText.trim() ? 0.5 : pressed ? 0.8 : 1,
                },
              ]}>
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  headerBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.subtitle,
    fontSize: 15,
    fontWeight: '700',
  },
  headerSub: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  errorBanner: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
  },
  errorText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  messageList: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    flexGrow: 1,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  bubbleOwn: {
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    borderWidth: 1,
    borderBottomLeftRadius: 2,
  },
  senderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 3,
  },
  senderName: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  roleTag: {
    fontSize: 10,
    fontWeight: '500',
  },
  messageTime: {
    ...Typography.caption,
    fontSize: 9,
  },
  messageText: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 19,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
  },
  emptyTitle: {
    ...Typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    ...Typography.caption,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 3,
    paddingHorizontal: Spacing.base,
  },
  inputContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  readOnlyBox: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  readOnlyText: {
    ...Typography.caption,
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 80,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: 'center',
  },
  sendButton: {
    height: 40,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
