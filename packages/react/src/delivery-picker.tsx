import { useId, type ReactNode } from 'react'
import {
  etaLabel,
  formatPrice,
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

/** How a picker writes a price; the default is {@link formatPrice} ("KES 260"). */
export type PriceFormatter = (amount: Money) => string

export interface PickupHubPickerProps {
  /** One method's options; each carries its `hub`. */
  options: BasketQuoteOption[]
  /** The picked quote id, or null. */
  value: string | null
  onChange: (quoteId: string) => void
  legend?: ReactNode
  /** Custom content per hub (e.g. distance, a map pin); defaults to name, address and hours. */
  renderHub?: (option: BasketQuoteOption) => ReactNode
  /** How prices are written; defaults to {@link formatPrice}. */
  formatMoney?: PriceFormatter
}

/** A list of pickup hubs to choose from, each with its own price. */
export function PickupHubPicker(props: PickupHubPickerProps): ReactNode {
  const name = useId()
  const format = props.formatMoney ?? formatPrice
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
              <span className="mitumba-hub-picker__price">{format(option.price)}</span>
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
  /** How prices are written; defaults to {@link formatPrice}. */
  formatMoney?: PriceFormatter
  /** Show the partner's name ("via …") beside each method. Defaults to true. */
  showCarrier?: boolean
}

/** "from " only when a method's options differ in price: one price needs no hedge. */
function fromPrefix(choice: { options: BasketQuoteOption[]; cheapest: BasketQuoteOption }): string {
  return choice.options.some((option) => option.price.minor_units !== choice.cheapest.price.minor_units) ? 'from ' : ''
}

/**
 * The delivery choice for one shop's basket. Choosing a method picks its
 * cheapest option; a pickup method then shows its hubs so the buyer can choose
 * another. An unavailable basket renders its reason and no controls.
 */
export function BasketDeliveryPicker(props: BasketDeliveryPickerProps): ReactNode {
  const name = useId()
  const format = props.formatMoney ?? formatPrice
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
                {fromPrefix(choice)}
                {format(choice.cheapest.price)}
              </span>
              {choice.cheapest.eta ? (
                <span className="mitumba-delivery-picker__eta"> · {etaLabel(choice.cheapest.eta)}</span>
              ) : null}{' '}
              {props.showCarrier === false ? null : (
                <span className="mitumba-delivery-picker__carrier">via {choice.cheapest.carrier_name}</span>
              )}
            </label>
            {selected && choice.needsHub ? (
              <PickupHubPicker
                options={choice.options}
                value={props.value}
                onChange={props.onChange}
                formatMoney={format}
                {...(props.renderHub ? { renderHub: props.renderHub } : {})}
              />
            ) : null}
          </div>
        )
      })}
    </fieldset>
  )
}
