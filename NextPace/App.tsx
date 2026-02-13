import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Dashboard } from './src/screens/Dashboard';
import { MyTrainings } from './src/screens/MyTrainings';
import { AddTraining } from './src/screens/AddTraining';
import { TrainingDetail } from './src/screens/TrainingDetail';
import { ActiveTraining } from './src/screens/ActiveTraining';
import { Profile } from './src/screens/Profile';

type Screen = 'Dashboard' | 'MyTrainings' | 'AddTraining' | 'TrainingDetail' | 'ActiveTraining' | 'Profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('Dashboard');
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (currentScreen === 'AddTraining' || currentScreen === 'TrainingDetail' || currentScreen === 'ActiveTraining') {
      setCurrentScreen('MyTrainings');
      setSelectedTrainingId(null);
    } else if (currentScreen === 'Profile' || currentScreen === 'MyTrainings') {
      setCurrentScreen('Dashboard');
    } else {
      setCurrentScreen('Dashboard');
    }
  };

  const onTrainingSaved = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setCurrentScreen('MyTrainings');
  }, []);

  const onSelectTraining = useCallback((trainingId: string) => {
    setSelectedTrainingId(trainingId);
    setCurrentScreen('TrainingDetail');
  }, []);

  const onStartTraining = useCallback((trainingId: string) => {
    setSelectedTrainingId(trainingId);
    setCurrentScreen('ActiveTraining');
  }, []);

  // Listener: ao tocar na notificação, navega para ActiveTraining
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'ActiveTraining' && response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        setCurrentScreen('ActiveTraining');
      }
    });
    return () => subscription.remove();
  }, []);

  const goToTrainingDetail = useCallback(() => {
    setCurrentScreen('TrainingDetail');
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'MyTrainings':
        return (
          <MyTrainings
            key={refreshKey}
            onAddTraining={() => navigate('AddTraining')}
            onGoBack={goBack}
            onSelectTraining={onSelectTraining}
            onStartTraining={onStartTraining}
          />
        );
      case 'AddTraining':
        return <AddTraining onGoBack={goBack} onSave={onTrainingSaved} />;
      case 'TrainingDetail':
        return selectedTrainingId ? (
          <TrainingDetail trainingId={selectedTrainingId} onGoBack={goBack} onStartTraining={onStartTraining} />
        ) : null;
      case 'ActiveTraining':
        return selectedTrainingId ? (
          <ActiveTraining
            trainingId={selectedTrainingId}
            onGoBack={goBack}
            onGoToTrainingDetail={goToTrainingDetail}
          />
        ) : null;
      case 'Profile':
        return <Profile onGoBack={goBack} />;
      default:
        return (
          <Dashboard
            onTrainingPress={() => navigate('MyTrainings')}
            onProfilePress={() => navigate('Profile')}
            onQuickStart={onStartTraining}
            onSelectTraining={onSelectTraining}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
    </SafeAreaProvider>
  );
}
