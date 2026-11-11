import { type ReactNode } from 'react'
import { View, Text, Pressable } from 'react-native'
import {
  etaLabel,
  methodChoices,
  methodLabel,
  unavailableLabel,
  type BasketQuote,
  type BasketQuoteOption,
} from '@mitumbadotafrica/logistics'
import { formatMoney } from './formatMoney'

/**
 * Unstyled React Native checkout delivery pickers. Each choice is a Pressable
 * with the radio role and its checked state, inside a radiogroup, so screen
 * readers announce it correctly; the host styles them through the style props.
 * The buyer picks a METHOD and, for pickup methods, a HUB. The carrier is the
 * backend's choice, shown as metadata only.
 */

type Style = Record<string, unknown>

export interface PickupHubPickerProps {
  /** One method's options; each carries its `hub`. */
  options: BasketQuoteOption[]
  value: string | null
  onChange: (quoteId: string) => void
  legend?: string
  style?: Style
  textStyle?: Style
  selectedStyle?: Style
  renderHub?: (option: BasketQuoteOption, selected: boolean) => ReactNode
}

export function PickupHubPicker(props: PickupHubPickerProps): ReactNode {
  const legend = props.legend ?? 'Choose a pickup point'
  return (
    <View style={props.style} accessibilityRole="radiogroup" accessibilityLabel={legend}>
      <Text style={props.textStyle}>{legend}</Text>
      {props.options.map((option) => {
        const selected = props.value === option.quote_id
        const hub = option.hub
        return (
          <Pressable
            key={option.quote_id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${hub?.name ?? ''}, ${hub?.address ?? ''}, ${formatMoney(option.price)}`}
            onPress={() => props.onChange(option.quote_id)}
            {...(selected && props.selectedStyle ? { style: props.selectedStyle } : {})}
          >
            {props.renderHub ? (
              props.renderHub(option, selected)
            ) : (
              <Text style={props.textStyle}>
                {hub?.name} · {hub?.address}
                {hub?.opening_hours ? ` · ${hub.opening_hours}` : ''} · {formatMoney(option.price)}
              </Text>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

export interface BasketDeliveryPickerProps {
  basket: BasketQuote
  value: string | null
  onChange: (quoteId: string) => void
  /** Heading for the shop, e.g. its name. */
  legend?: string
  methodLabels?: Partial<Record<string, string>>
  unavailableLabels?: Partial<Record<string, string>>
  style?: Style
  textStyle?: Style
  selectedStyle?: Style
  renderHub?: PickupHubPickerProps['renderHub']
}

/**
 * The delivery choice for one shop's basket. Choosing a method picks its
 * cheapest option; a pickup method then lists its hubs. An unavailable basket
 * shows its reason and no controls.
 */
export function BasketDeliveryPicker(props: BasketDeliveryPickerProps): ReactNode {
  const { basket } = props
  const choices = methodChoices(basket)
  const legend = props.legend ?? 'Delivery'

  if (basket.status !== 'available' || choices.length === 0) {
    return (
      <View style={props.style} accessibilityLiveRegion="polite">
        {props.legend ? <Text style={props.textStyle}>{props.legend}</Text> : null}
        <Text style={props.textStyle}>{unavailableLabel(basket.reason, props.unavailableLabels)}</Text>
      </View>
    )
  }

  const picked = basket.options.find((option) => option.quote_id === props.value)
  return (
    <View style={props.style} accessibilityRole="radiogroup" accessibilityLabel={legend}>
      <Text style={props.textStyle}>{legend}</Text>
      {choices.map((choice) => {
        const selected = picked?.method === choice.method
        const price = `${choice.options.length > 1 ? 'from ' : ''}${formatMoney(choice.cheapest.price)}`
        const eta = choice.cheapest.eta ? ` · ${etaLabel(choice.cheapest.eta)}` : ''
        const label = methodLabel(choice.method, props.methodLabels)
        return (
          <View key={choice.method}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${label}, ${price}${eta}, via ${choice.cheapest.carrier_name}`}
              onPress={() => props.onChange(choice.cheapest.quote_id)}
              {...(selected && props.selectedStyle ? { style: props.selectedStyle } : {})}
            >
              <Text style={props.textStyle}>
                {label} · {price}
                {eta} · via {choice.cheapest.carrier_name}
              </Text>
            </Pressable>
            {selected && choice.needsHub ? (
              <PickupHubPicker
                options={choice.options}
                value={props.value}
                onChange={props.onChange}
                {...(props.textStyle ? { textStyle: props.textStyle } : {})}
                {...(props.selectedStyle ? { selectedStyle: props.selectedStyle } : {})}
                {...(props.renderHub ? { renderHub: props.renderHub } : {})}
              />
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
