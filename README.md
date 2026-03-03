# NextPace

Aplicativo mobile de treino com timer, construído com **React Native** e **Expo**.

O NextPace permite criar treinos personalizados com exercícios, descansos configuráveis, rounds e alertas sonoros — tudo com uma interface focada em performance e usabilidade.

## Funcionalidades

- Criação e gerenciamento de treinos com exercícios e descansos
- Timer circular com contagem regressiva e alerta sonoro configurável
- Drag-and-drop para reordenar exercícios
- Rounds (múltiplas voltas de treino)
- Dashboard com favoritos, resumo semanal e quick start
- Histórico de treinos com calendário de atividades
- Feedback háptico e animações fluidas
- Perfil do usuário
- Persistência local com AsyncStorage

## Stack

| Tecnologia | Versão |
|---|---|
| React Native | 0.81 |
| Expo SDK | 54 |
| TypeScript | 5.9 |
| React | 19.1 |
| AsyncStorage | 2.x |

## Estrutura do Projeto

```
NextPace/
├── App.tsx                  # Entry point e navegação por estado
├── src/
│   ├── screens/             # Telas da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── MyTrainings.tsx
│   │   ├── AddTraining.tsx
│   │   ├── TrainingDetail.tsx
│   │   ├── ActiveTraining.tsx
│   │   └── Profile.tsx
│   ├── components/          # Componentes reutilizáveis
│   │   ├── CircularTimer.tsx
│   │   ├── DraggableList.tsx
│   │   ├── TimerPickerModal.tsx
│   │   ├── SoundPicker.tsx
│   │   ├── ActivityCalendar.tsx
│   │   └── ...
│   ├── services/            # Camada de serviços e persistência
│   │   ├── storage/         # Acesso ao AsyncStorage
│   │   ├── training/        # Lógica de treinos
│   │   └── workout/         # Lógica de histórico
│   ├── types/               # Modelos e interfaces TypeScript
│   ├── constants/           # Sons e constantes
│   ├── theme/               # Cores e estilos globais
│   ├── utils/               # Utilitários (formatTime, uuid)
│   └── assets/sounds/       # Arquivos de áudio para alertas
├── assets/                  # Ícones e splash screen
├── app.json                 # Configuração do Expo
└── package.json
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Emulador Android/iOS ou dispositivo físico com [Expo Go](https://expo.dev/go)

## Como rodar

```bash
# Instalar dependências
cd NextPace
npm install

# Iniciar o servidor de desenvolvimento
npx expo start

# Ou diretamente para Android/iOS
npx expo start --android
npx expo start --ios
```

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor Expo |
| `npm run android` | Inicia no emulador Android |
| `npm run ios` | Inicia no simulador iOS |
| `npm run web` | Inicia versão web |

## Licença

Projeto privado.
