'use client';

import { useCallback } from 'react';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';
type NotificationFeedback = 'success' | 'warning' | 'error';

interface HapticFeedbackOptions {
  duration?: number;
  pattern?: number[];
  style?: HapticStyle;
}

export function useHapticFeedback() {
  // Check if the Vibration API is supported
  const isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;

  // Basic vibration
  const vibrate = useCallback((duration: number | number[] = 50) => {
    if (!isSupported) return false;
    
    try {
      return navigator.vibrate(duration);
    } catch (error) {
      // Haptic feedback not available
      return false;
    }
  }, [isSupported]);

  // Light tap feedback (similar to iOS haptic touch)
  const light = useCallback(() => {
    return vibrate(10);
  }, [vibrate]);

  // Medium tap feedback
  const medium = useCallback(() => {
    return vibrate(20);
  }, [vibrate]);

  // Heavy tap feedback
  const heavy = useCallback(() => {
    return vibrate(30);
  }, [vibrate]);

  // Soft impact (multiple light taps)
  const soft = useCallback(() => {
    return vibrate([10, 10, 10]);
  }, [vibrate]);

  // Rigid impact (sharp tap)
  const rigid = useCallback(() => {
    return vibrate(40);
  }, [vibrate]);

  // Selection changed feedback
  const selectionChanged = useCallback(() => {
    return vibrate(5);
  }, [vibrate]);

  // Success notification feedback
  const success = useCallback(() => {
    return vibrate([10, 30, 10, 30]);
  }, [vibrate]);

  // Warning notification feedback
  const warning = useCallback(() => {
    return vibrate([20, 40, 20]);
  }, [vibrate]);

  // Error notification feedback
  const error = useCallback(() => {
    return vibrate([50, 100, 50]);
  }, [vibrate]);

  // Impact feedback with style
  const impact = useCallback((style: HapticStyle = 'medium') => {
    switch (style) {
      case 'light':
        return light();
      case 'medium':
        return medium();
      case 'heavy':
        return heavy();
      case 'soft':
        return soft();
      case 'rigid':
        return rigid();
      default:
        return medium();
    }
  }, [light, medium, heavy, soft, rigid]);

  // Notification feedback
  const notification = useCallback((type: NotificationFeedback) => {
    switch (type) {
      case 'success':
        return success();
      case 'warning':
        return warning();
      case 'error':
        return error();
      default:
        return vibrate(20);
    }
  }, [success, warning, error, vibrate]);

  // Custom pattern vibration
  const pattern = useCallback((pattern: number[]) => {
    return vibrate(pattern);
  }, [vibrate]);

  // Long press feedback
  const longPress = useCallback(() => {
    return vibrate(100);
  }, [vibrate]);

  // Double tap feedback
  const doubleTap = useCallback(() => {
    return vibrate([20, 50, 20]);
  }, [vibrate]);

  // Scroll feedback (very light)
  const scroll = useCallback(() => {
    return vibrate(2);
  }, [vibrate]);

  // Button press feedback
  const buttonPress = useCallback(() => {
    return vibrate(15);
  }, [vibrate]);

  // Toggle switch feedback
  const toggle = useCallback(() => {
    return vibrate([5, 10, 5]);
  }, [vibrate]);

  // Slider feedback
  const slider = useCallback(() => {
    return vibrate(3);
  }, [vibrate]);

  // Tab switch feedback
  const tabSwitch = useCallback(() => {
    return vibrate(8);
  }, [vibrate]);

  // Swipe feedback
  const swipe = useCallback(() => {
    return vibrate([5, 5]);
  }, [vibrate]);

  // Pull to refresh feedback
  const pullToRefresh = useCallback(() => {
    return vibrate([10, 20, 10]);
  }, [vibrate]);

  // Keyboard tap feedback
  const keyboardTap = useCallback(() => {
    return vibrate(3);
  }, [vibrate]);

  return {
    isSupported,
    vibrate,
    impact,
    notification,
    pattern,
    // Specific feedback types
    light,
    medium,
    heavy,
    soft,
    rigid,
    selectionChanged,
    success,
    warning,
    error,
    longPress,
    doubleTap,
    scroll,
    buttonPress,
    toggle,
    slider,
    tabSwitch,
    swipe,
    pullToRefresh,
    keyboardTap,
  };
}

// HOC to add haptic feedback to any component
export function withHapticFeedback<P extends object>(
  Component: React.ComponentType<P>,
  feedbackType: HapticStyle | NotificationFeedback = 'medium'
) {
  return function WithHapticFeedbackComponent(props: P) {
    const haptic = useHapticFeedback();
    
    const handleClick = useCallback((e: React.MouseEvent) => {
      // Trigger haptic feedback
      if (feedbackType in ['success', 'warning', 'error']) {
        haptic.notification(feedbackType as NotificationFeedback);
      } else {
        haptic.impact(feedbackType as HapticStyle);
      }
      
      // Call original onClick if it exists
      if ((props as any).onClick) {
        (props as any).onClick(e);
      }
    }, [haptic, props]);
    
    return <Component {...props} onClick={handleClick} />;
  };
}