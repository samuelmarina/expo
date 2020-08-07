import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Assets as StackAssets } from '@react-navigation/stack';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native-appearance';

import Navigation from './navigation/Navigation';
import HistoryActions from './redux/HistoryActions';
import { useDispatch, useSelector } from './redux/Hooks';
import SessionActions from './redux/SessionActions';
import SettingsActions from './redux/SettingsActions';
import LocalStorage from './storage/LocalStorage';
import addListenerWithNativeCallback from './utils/addListenerWithNativeCallback';

// Download and cache stack assets, don't block loading on this though
Asset.loadAsync(StackAssets);

function useSplashScreenWhileLoadingResources(loadResources: () => Promise<void>) {
  const [isSplashScreenShown, setSplashScreenShown] = React.useState(true);
  React.useEffect(() => {
    const preventAutoHideAndLoadResources = async () => {
      try {
        const result = await (SplashScreen.preventAutoHideAsync || SplashScreen.preventAutoHide)();
        console.log(`SplashScreen.preventAutoHideAsync returned: ${result}`);
      } catch (error) {
        console.warn(`SplashScreen.preventAutoHideAsync threw: ${error}`);
      }
      await loadResources();
      setSplashScreenShown(false);
      try {
        const result = await (SplashScreen.hideAsync || SplashScreen.hide)();
        console.log(`SplashScreen.hideAsync returned: ${result}`);
      } catch (error) {
        console.warn(`SplashScreen.hideAsync threw: ${error}`);
      }
    };
    preventAutoHideAndLoadResources();
  }, []);
  return isSplashScreenShown;
}

export default function HomeApp() {
  const colorScheme = useColorScheme();
  const preferredAppearance = useSelector(data => data.settings.preferredAppearance);
  const dispatch = useDispatch();

  const isShowingSplashScreen = useSplashScreenWhileLoadingResources(async () => {
    await initStateAsync();
  });

  React.useEffect(() => {
    addProjectHistoryListener();
  }, []);

  React.useEffect(() => {
    if (!isShowingSplashScreen && Platform.OS === 'ios') {
      // if expo client is opened via deep linking, we'll get the url here
      Linking.getInitialURL().then(initialUrl => {
        if (initialUrl) {
          Linking.openURL(initialUrl);
        }
      });
    }
  }, [isShowingSplashScreen]);

  const addProjectHistoryListener = () => {
    addListenerWithNativeCallback('ExponentKernel.addHistoryItem', async event => {
      let { manifestUrl, manifest, manifestString } = event;
      if (!manifest && manifestString) {
        manifest = JSON.parse(manifestString);
      }
      dispatch(HistoryActions.addHistoryItem(manifestUrl, manifest));
    });
  };

  const initStateAsync = async () => {
    try {
      dispatch(SettingsActions.loadSettings());
      dispatch(HistoryActions.loadHistory());

      const storedSession = await LocalStorage.getSessionAsync();

      if (storedSession) {
        dispatch(SessionActions.setSession(storedSession));
      }

      if (Platform.OS === 'ios') {
        await Promise.all([Font.loadAsync(Ionicons.font)]);
      } else {
        await Promise.all([Font.loadAsync(Ionicons.font), Font.loadAsync(MaterialIcons.font)]);
      }
    } finally {
      return;
    }
  };

  if (isShowingSplashScreen) {
    return null;
  }

  let theme = preferredAppearance === 'no-preference' ? colorScheme : preferredAppearance;
  if (theme === 'no-preference') {
    theme = 'light';
  }

  const backgroundColor = theme === 'dark' ? '#000000' : '#ffffff';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ActionSheetProvider>
        <Navigation theme={theme} />
      </ActionSheetProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
