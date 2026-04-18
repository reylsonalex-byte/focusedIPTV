import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

export const openInExternalPlayer = async (streamUrl: string) => {
  const url = streamUrl.trim();
  if (!url) return false;

  try {
    if (Platform.OS === 'android') {
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: url,
        type: 'video/*',
      });
      return true;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.warn('Falha ao abrir player externo', error);
    return false;
  }
};
