import { Alert } from 'react-native';

export function confirmDiscardUnsaved(): Promise<boolean> {
  return confirm('Leave without saving?', 'This decision has not been saved. Leaving it may lose your question, options and choice.', 'Leave without saving');
}

export function confirmDeleteDecision(): Promise<boolean> {
  return confirm('Delete this decision?', 'This also deletes its saved research, drafts and outcome reviews from this device. Separate pathways and later decisions are kept. This cannot be undone.', 'Delete');
}

function confirm(title: string, message: string, label: string): Promise<boolean> {
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Keep it', style: 'cancel', onPress: () => resolve(false) },
    { text: label, style: 'destructive', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
