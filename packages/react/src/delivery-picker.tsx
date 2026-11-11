import { useId, type ReactNode } from 'react'
import {
  etaLabel,
  methodChoices,
  methodLabel,
  unavailableLabel,
  type BasketQuote,
  type BasketQuoteOption,
  type Money,
} from '@mitumbadotafrica/logistics'

/**
 * Unstyled checkout delivery pickers. Structure, text and native form controls
 * only (radio groups in fieldsets), so they are keyboard- and screen-reader-
 * accessible by default and the host themes them. The buyer picks a METHOD and,
 * for pickup methods, a HUB; the carrier is already chosen by the backend and is
 * shown as metadata only.
 */

function formatMoney(amount: Money): string {
  const major = amount.minor_units / 100
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: amount.currency }).format(major)
  } catch {
    return `${amount.currency} ${major.toFixed(2)}`
  }
}

export interface PickupHubPickerProps {
  /** One method's options; each carries its `hub`. */
  options: BasketQuoteOption[]
  /** The picked quote id, or null. */
  value: string | null
  onChange: (quoteId: string) => void
  legend?: ReactNode
  /** Custom content per hub (e.g. distance, a map pin); defaults to name, address and hours. */
  renderHub?: (option: BasketQuoteOption) => ReactNode
}

/** A list of pickup hubs to choose from, each with its own price. */
export function PickupHubPicker(props: PickupHubPickerProps): ReactNode {
  const name = useId()
  return (
    <fieldset className="mitumba-hub-picker">
      <legend className="mitumba-hub-picker__legend">{props.legend ?? 'Choose a pickup point'}</legend>
      {props.options.map((option) => (
        <label key={option.quote_id} className="mitumba-hub-picker__hub" data-node-id={option.hub?.node_id}>
          <input
            type="radio"
            name={name}
            value={option.quote_id}
            checked={props.value === option.quote_id}
            onChange={() => props.onChange(option.quote_id)}
          />
          {props.renderHub ? (
            props.renderHub(option)
          ) : (
            <span className="mitumba-hub-picker__details">
              <span className="mitumba-hub-picker__name">{option.hub?.name}</span>{' '}
              <span className="mitumba-hub-picker__address">{option.hub?.address}</span>
              {option.hub?.opening_hours ? (
                <span className="mitumba-hub-picker__hours"> · {option.hub.opening_hours}</span>
              ) : null}{' '}
              <span className="mitumba-hub-picker__price">{formatMoney(option.price)}</span>
            </span>
          )}
        </label>
      ))}
    </fieldset>
  )
}

export interface BasketDeliveryPickerProps {
  basket: BasketQuote
  /** The picked quote id for this shop, or null. */
  value: string | null
  onChange: (quoteId: string) => void
  /** Heading for the shop, e.g. its name. */
  legend?: ReactNode
  methodLabels?: Partial<Record<string, string>>
  unavailableLabels?: Partial<Record<string, string>>
  renderHub?: PickupHubPickerProps['renderHub']
}

/**
 * The delivery choice for one shop's basket. Choosing a method picks its
 * cheapest option; a pickup method then shows its hubs so the buyer can choose
 * another. An unavailable basket renders its reason and no controls.
 */
export function BasketDeliveryPicker(props: BasketDeliveryPickerProps): ReactNode {
  const name = useId()
  const { basket } = props
  const choices = methodChoices(basket)

  if (basket.status !== 'available' || choices.length === 0) {
    return (
      <div className="mitumba-delivery-picker mitumba-delivery-picker--unavailable" role="status" data-store-id={basket.store_id}>
        {props.legend ? <div className="mitumba-delivery-picker__legend">{props.legend}</div> : null}
        {unavailableLabel(basket.reason, props.unavailableLabels)}
      </div>
    )
  }

  const picked = basket.options.find((option) => option.quote_id === props.value)
  return (
    <fieldset className="mitumba-delivery-picker" data-store-id={basket.store_id}>
      <legend className="mitumba-delivery-picker__legend">{props.legend ?? 'Delivery'}</legend>
      {choices.map((choice) => {
        const selected = picked?.method === choice.method
        return (
          <div key={choice.method} className="mitumba-delivery-picker__method" data-method={choice.method}>
            <label>
              <input
                type="radio"
                name={name}
                value={choice.method}
                checked={selected}
                onChange={() => props.onChange(choice.cheapest.quote_id)}
              />
              <span className="mitumba-delivery-picker__label">{methodLabel(choice.method, props.methodLabels)}</span>{' '}
              <span className="mitumba-delivery-picker__price">
                {choice.options.length > 1 ? 'from ' : ''}
                {formatMoney(choice.cheapest.price)}
              </span>
              {choice.cheapest.eta ? (
                <span className="mitumba-delivery-picker__eta"> · {etaLabel(choice.cheapest.eta)}</span>
              ) : null}{' '}
              <span className="mitumba-delivery-picker__carrier">via {choice.cheapest.carrier_name}</span>
            </label>
            {selected && choice.needsHub ? (
              <PickupHubPicker
                options={choice.options}
                value={props.value}
                onChange={props.onChange}
                {...(props.renderHub ? { renderHub: props.renderHub } : {})}
              />
            ) : null}
          </div>
        )
      })}
    </fieldset>
  )
}
