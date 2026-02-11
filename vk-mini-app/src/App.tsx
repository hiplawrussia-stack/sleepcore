/**
 * VK Mini App Root
 * ================
 * Main application component with VKUI and routing.
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app
 */

import { useEffect, useState } from 'react';
import {
  AdaptivityProvider,
  ConfigProvider,
  AppRoot,
  SplitLayout,
  SplitCol,
  View,
  Panel,
  PanelHeader,
  Spinner,
  Placeholder,
  Button,
} from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

import { useAuth } from '@/hooks/useAuth';
import { vk } from '@/services/vk';
import Home from '@/pages/Home';
import Breathing from '@/pages/Breathing';
import Profile from '@/pages/Profile';

/**
 * Panel IDs for navigation
 */
export type PanelId = 'home' | 'breathing' | 'profile';

/**
 * App component
 */
function App() {
  const [activePanel, setActivePanel] = useState<PanelId>('home');
  const [vkReady, setVkReady] = useState(false);
  const { user, isAuthenticated, isAuthenticating, authError, authenticate } = useAuth();

  // Initialize VK Bridge
  useEffect(() => {
    const initVK = async () => {
      try {
        await vk.init();
        setVkReady(true);
      } catch (error) {
        console.error('[App] VK init failed:', error);
        // Still mark as ready to show error UI
        setVkReady(true);
      }
    };

    initVK();
  }, []);

  // Navigate to a panel
  const go = (panel: PanelId) => {
    setActivePanel(panel);
    // Haptic feedback
    vk.hapticFeedback('selection_change');
  };

  // Show loading state
  if (!vkReady || isAuthenticating) {
    return (
      <ConfigProvider>
        <AdaptivityProvider>
          <AppRoot>
            <SplitLayout>
              <SplitCol>
                <View activePanel="loading">
                  <Panel id="loading" centered>
                    <Placeholder>
                      <Spinner size="large" />
                    </Placeholder>
                  </Panel>
                </View>
              </SplitCol>
            </SplitLayout>
          </AppRoot>
        </AdaptivityProvider>
      </ConfigProvider>
    );
  }

  // Show auth error
  if (authError && !isAuthenticated) {
    return (
      <ConfigProvider>
        <AdaptivityProvider>
          <AppRoot>
            <SplitLayout>
              <SplitCol>
                <View activePanel="error">
                  <Panel id="error">
                    <PanelHeader>SleepCore</PanelHeader>
                    <Placeholder
                      icon={<span style={{ fontSize: 56 }}>:(</span>}
                      header="Ошибка авторизации"
                      action={
                        <Button size="m" onClick={() => authenticate()}>
                          Повторить
                        </Button>
                      }
                    >
                      {authError}
                    </Placeholder>
                  </Panel>
                </View>
              </SplitCol>
            </SplitLayout>
          </AppRoot>
        </AdaptivityProvider>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider>
      <AdaptivityProvider>
        <AppRoot>
          <SplitLayout>
            <SplitCol>
              <View activePanel={activePanel}>
                <Panel id="home">
                  <Home go={go} user={user} />
                </Panel>
                <Panel id="breathing">
                  <Breathing go={go} />
                </Panel>
                <Panel id="profile">
                  <Profile go={go} user={user} />
                </Panel>
              </View>
            </SplitCol>
          </SplitLayout>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}

export default App;
