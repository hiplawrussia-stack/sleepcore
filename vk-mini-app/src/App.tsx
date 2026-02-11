/**
 * VK Mini App Root
 * ================
 * Main application component with VKUI and TabBar navigation.
 *
 * Navigation structure:
 * - Epic: root container for tab-based navigation
 * - View: screen container for each tab
 * - Panel: individual screens within a view
 *
 * Tabs (5 max for thumb-friendly UX):
 * 1. Home - main dashboard
 * 2. Breathing - breathing exercises
 * 3. Quests - gamification tasks
 * 4. Leaderboard - rankings
 * 5. Profile - user settings
 *
 * @packageDocumentation
 * @module @sleepcore/vk-mini-app
 */

import { useEffect, useState, useCallback } from 'react';
import {
  AdaptivityProvider,
  ConfigProvider,
  AppRoot,
  SplitLayout,
  SplitCol,
  Epic,
  View,
  Panel,
  PanelHeader,
  Tabbar,
  TabbarItem,
  Spinner,
  Placeholder,
  Button,
} from '@vkontakte/vkui';
import {
  Icon28HomeOutline,
  Icon28MoonOutline,
  Icon28GiftOutline,
  Icon28UsersOutline,
  Icon28UserCircleOutline,
} from '@vkontakte/icons';
import '@vkontakte/vkui/dist/vkui.css';

import { useAuth } from '@/hooks/useAuth';
import { useQuests } from '@/hooks/useEvolution';
import { vk } from '@/services/vk';
import Home from '@/pages/Home';
import Breathing from '@/pages/Breathing';
import Profile from '@/pages/Profile';
import Quests from '@/pages/Quests';
import LeaderboardPage from '@/pages/LeaderboardPage';

/**
 * Tab IDs for navigation
 */
export type TabId = 'home' | 'breathing' | 'quests' | 'leaderboard' | 'profile';

/**
 * Panel IDs (kept for backwards compatibility)
 */
export type PanelId = TabId;

/**
 * Tab configuration
 */
const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'home', label: 'Главная', icon: <Icon28HomeOutline /> },
  { id: 'breathing', label: 'Дыхание', icon: <Icon28MoonOutline /> },
  { id: 'quests', label: 'Задания', icon: <Icon28GiftOutline /> },
  { id: 'leaderboard', label: 'Рейтинг', icon: <Icon28UsersOutline /> },
  { id: 'profile', label: 'Профиль', icon: <Icon28UserCircleOutline /> },
];

/**
 * App component
 */
function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [vkReady, setVkReady] = useState(false);
  const { user, isAuthenticated, isAuthenticating, authError, authenticate } = useAuth();
  const { quests } = useQuests();

  // Count active quests for badge
  const activeQuestsCount = quests.filter(q => q.status === 'active').length;

  // Initialize VK Bridge
  useEffect(() => {
    const initVK = async () => {
      try {
        await vk.init();
        setVkReady(true);
      } catch (error) {
        console.error('[App] VK init failed:', error);
        setVkReady(true);
      }
    };

    initVK();
  }, []);

  // Navigate to a tab
  const go = useCallback((tab: TabId) => {
    setActiveTab(tab);
    vk.hapticFeedback('selection_change');
  }, []);

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
                      <Spinner size="l" />
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
                      action={
                        <Button size="m" onClick={() => authenticate()}>
                          Повторить
                        </Button>
                      }
                    >
                      <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 18 }}>
                        Ошибка авторизации
                      </div>
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

  /**
   * TabBar component
   */
  const tabbar = (
    <Tabbar>
      {TABS.map((tab) => (
        <TabbarItem
          key={tab.id}
          selected={activeTab === tab.id}
          onClick={() => go(tab.id)}
          label={
            tab.id === 'quests' && activeQuestsCount > 0
              ? `${tab.label} (${activeQuestsCount})`
              : tab.label
          }
        >
          {tab.icon}
        </TabbarItem>
      ))}
    </Tabbar>
  );

  return (
    <ConfigProvider>
      <AdaptivityProvider>
        <AppRoot>
          <SplitLayout>
            <SplitCol>
              <Epic activeStory={activeTab} tabbar={tabbar}>
                {/* Home tab */}
                <View id="home" activePanel="home">
                  <Panel id="home">
                    <Home go={go} user={user} />
                  </Panel>
                </View>

                {/* Breathing tab */}
                <View id="breathing" activePanel="breathing">
                  <Panel id="breathing">
                    <Breathing go={go} />
                  </Panel>
                </View>

                {/* Quests tab */}
                <View id="quests" activePanel="quests">
                  <Panel id="quests">
                    <Quests />
                  </Panel>
                </View>

                {/* Leaderboard tab */}
                <View id="leaderboard" activePanel="leaderboard">
                  <Panel id="leaderboard">
                    <LeaderboardPage />
                  </Panel>
                </View>

                {/* Profile tab */}
                <View id="profile" activePanel="profile">
                  <Panel id="profile">
                    <Profile go={go} user={user} />
                  </Panel>
                </View>
              </Epic>
            </SplitCol>
          </SplitLayout>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}

export default App;
