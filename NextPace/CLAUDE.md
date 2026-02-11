# NextPace - Coding Guidelines

## User Experience Priority

**SEMPRE priorizar a experiência do usuário.** Em todas as implementações:

1. **Animações fluidas** - Use spring animations com valores suaves para feedback natural
2. **Feedback tátil** - Vibração e feedback visual imediato para ações do usuário
3. **Responsividade** - Interface deve responder instantaneamente ao toque
4. **Consistência** - Comportamentos similares em toda a app

## Componentization Rule

**ALWAYS componentize reusable UI elements.** When implementing any feature:

1. **Identify reusable patterns** - If a UI element or logic appears in 2+ places, extract it
2. **Create components in `/src/components/`** - All reusable components go here
3. **Props-based configuration** - Components should be flexible via props
4. **Single responsibility** - Each component does one thing well

### Component Structure

```
src/
  components/
    TimerPickerModal.tsx   # Reusable time picker
    Button.tsx             # Custom buttons
    Card.tsx               # Card containers
    ...
```

### Benefits
- Reduces code duplication
- Easier maintenance
- Consistent UI/UX
- Faster development

## Project Stack

- React Native + Expo SDK 54
- TypeScript
- AsyncStorage for persistence
- State-based navigation (no external nav library)

## Naming Conventions

- Components: PascalCase (`TimerPickerModal.tsx`)
- Hooks: camelCase with `use` prefix (`useTraining.ts`)
- Services: camelCase (`trainingStorage.ts`)
- Styles: inline StyleSheet or in same file
