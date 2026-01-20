import React, { useState, useCallback } from 'react';
import { Dashboard } from './src/screens/Dashboard';
import { MyTrainings } from './src/screens/MyTrainings';
import { AddTraining } from './src/screens/AddTraining';
import { TrainingDetail } from './src/screens/TrainingDetail';
import { ActiveTraining } from './src/screens/ActiveTraining';

type Screen = 'Dashboard' | 'MyTrainings' | 'AddTraining' | 'TrainingDetail' | 'ActiveTraining';

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
        <TrainingDetail trainingId={selectedTrainingId} onGoBack={goBack} />
      ) : null;
    case 'ActiveTraining':
      return selectedTrainingId ? (
        <ActiveTraining trainingId={selectedTrainingId} onGoBack={goBack} />
      ) : null;
    default:
      return <Dashboard onTrainingPress={() => navigate('MyTrainings')} />;
  }
}
