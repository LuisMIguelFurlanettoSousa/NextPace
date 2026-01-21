import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularTimerProps {
  timeLeft: number;
  totalTime: number;
  size?: number;
  isResting?: boolean;
  isPaused?: boolean;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  timeLeft,
  totalTime,
  size = 240,
  isResting = false,
  isPaused = false,
}) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastTotalTimeRef = useRef<number | null>(null);
  const lastTimeLeftRef = useRef<number | null>(null);

  // Calculate current progress (0 to 1)
  const currentProgress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

  // Start animation function
  const startAnimation = (fromProgress: number, duration: number) => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    animatedValue.setValue(fromProgress);

    if (duration > 0) {
      animationRef.current = Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animationRef.current.start();
    }
  };

  // Handle pause/unpause
  useEffect(() => {
    if (isPaused) {
      // Stop animation and set to current progress
      if (animationRef.current) {
        animationRef.current.stop();
      }
      animatedValue.setValue(currentProgress);
    } else if (timeLeft > 0) {
      // Resume: start animation from current progress
      startAnimation(currentProgress, timeLeft * 1000);
    }
  }, [isPaused]);

  // Handle phase changes (totalTime changes) and skips (timeLeft jumps)
  useEffect(() => {
    const totalTimeChanged = lastTotalTimeRef.current !== null && totalTime !== lastTotalTimeRef.current;
    const timeJumped = lastTimeLeftRef.current !== null && Math.abs(timeLeft - lastTimeLeftRef.current) > 2;
    const isFirstRun = lastTotalTimeRef.current === null;

    lastTotalTimeRef.current = totalTime;
    lastTimeLeftRef.current = timeLeft;

    // Only restart on significant changes, not on every second tick
    if ((isFirstRun || totalTimeChanged || timeJumped) && !isPaused && timeLeft > 0) {
      startAnimation(currentProgress, timeLeft * 1000);
    }

    // Handle timer finished
    if (timeLeft <= 0 && animationRef.current) {
      animationRef.current.stop();
      animatedValue.setValue(1);
    }
  }, [totalTime, timeLeft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressColor = isResting ? '#34C759' : colors.primary;

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.cardBorder}
          strokeWidth={strokeWidth}
          fill="transparent"
          opacity={0.3}
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Time display */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    color: colors.textPrimary,
    fontSize: 56,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
});
