# Q58App - Coding Guidelines

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
