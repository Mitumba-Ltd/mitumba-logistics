import { createElement, type ReactNode } from 'react'

// Test-only stand-ins for the react-native primitives this package uses. The host app provides the
// real runtime; these render DOM elements that keep the accessibility props, so tests can check the
// pickers' roles, states and presses as a screen reader would see them.

type Props = {
  children?: ReactNode
  accessibilityRole?: string
  accessibilityLabel?: string
  accessibilityState?: { checked?: boolean | 'mixed' }
  onPress?: () => void
}

function a11y(props: Props): Record<string, string> {
  return {
    ...(props.accessibilityRole ? { role: props.accessibilityRole } : {}),
    ...(props.accessibilityLabel ? { 'aria-label': props.accessibilityLabel } : {}),
    ...(props.accessibilityState?.checked !== undefined ? { 'aria-checked': String(props.accessibilityState.checked) } : {}),
  }
}

export const View = (props: Props) => createElement('div', a11y(props), props.children)
export const Text = (props: Props) => createElement('span', null, props.children)
export const Pressable = (props: Props) => createElement('div', { ...a11y(props), onClick: props.onPress }, props.children)
export const ActivityIndicator = () => createElement('progress')
export const Linking = { openURL: async () => {}, canOpenURL: async () => true }
export const StyleSheet = { create: <T,>(styles: T) => styles, absoluteFillObject: {} }
