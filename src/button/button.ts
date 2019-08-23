import { css, customElement, html, LitElement, property, query } from 'lit-element'
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, INLINE_TAG_NAME, OVERLAY_TAG_NAME, PlayerEventType, PlayerType } from '../helpers/constants'
import { Origin } from '../helpers/interfaces'
import { clip, eventKeys } from '../helpers/utils'
import { Inline } from '../inline/inline'
import { Overlay } from '../overlay/overlay'

const PLAYER_SLOT = 'vbx-botton__player'

const PLAYER_TYPE_MAP = {
    [PlayerType.Overlay]: Overlay,
    [PlayerType.Inline]: Inline
}

@customElement('vbx-button')
export class Button extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './button.scss';
        }`]
    }

    @property({ type: Number, reflect: true, attribute: 'max-width' })
    maxWidth: number

    @property({ type: Number, reflect: true, attribute: 'max-height' })
    maxHeight: number

    @property({ type: String, reflect: true })
    src: string

    @property({ type: String, reflect: true })
    player: PlayerType = PlayerType.Overlay

    @property({ type: String, reflect: true })
    description: string

    @property({ type: String, reflect: true })
    selector: string

    @property({ type: Boolean, reflect: true })
    origin = false

    @property({ type: Boolean })
    private inlineOpen = false

    @property({ type: Boolean })
    private directPlayer = false

    @query('.vbx-button__trigger') private _buttonTrigger: HTMLElement

    private _inlinePlayer: Inline

    private get _target(): HTMLElement {
        return this.selector && this.querySelector(this.selector)
    }

    /**
     * Open player according to button attributes
     *
     * @param evt Mouse event
     * @param focus If true, transfer focus to player
     */
    async openPlayer(evt?: MouseEvent, focus = false) {
        if (evt) {
            evt.stopPropagation()
            evt.preventDefault()
        }

        if (!focus && this.shadowRoot.activeElement && this.shadowRoot.activeElement['blur'])
            (this.shadowRoot.activeElement as HTMLElement).blur()

        switch (this.player) {
            case PlayerType.Inline:
                const inline = this._getInlineInstance()
                if (this._inlinePlayer && this._inlinePlayer != inline)
                    this._inlinePlayer.removeEventListener(PlayerEventType.OpenChange, this._inlineOpenListener)

                this._inlinePlayer = inline
                this._closeOtherInstances(this._inlinePlayer)
                await this._inlinePlayer.hide()

                this._inlinePlayer.src = this.src
                this._inlinePlayer.description = this.description
                this._inlinePlayer.maxWidth = clip(this.maxWidth, DEFAULT_WIDTH)
                this._inlinePlayer.maxHeight = clip(this.maxHeight, DEFAULT_HEIGHT)
                this._inlinePlayer.onPlayerBlur = this._onPlayerBlur
                this._inlinePlayer.addEventListener(PlayerEventType.OpenChange, this._inlineOpenListener)
                this.inlineOpen = this._inlinePlayer.open

                return this._inlinePlayer.show(this._getOrigin(), focus)

            default:
                const overlay = this._getOverlayInstance()
                this._closeOtherInstances(overlay)
                await overlay.hide()

                overlay.src = this.src
                overlay.description = this.description
                overlay.maxWidth = clip(this.maxWidth, DEFAULT_WIDTH)
                overlay.maxHeight = clip(this.maxHeight, DEFAULT_HEIGHT)
                overlay.onPlayerBlur = this._onPlayerBlur

                return overlay.show(this._getOrigin(), focus)
        }
    }

    /**
     * Close all players except self
     *
     * @param self
     */
    private _closeOtherInstances<T extends keyof typeof PLAYER_TYPE_MAP, R extends InstanceType<typeof PLAYER_TYPE_MAP[T]>>(self?: R) {
        Object.keys(PLAYER_TYPE_MAP).forEach((k: keyof typeof PLAYER_TYPE_MAP) => {
            const clazz = PLAYER_TYPE_MAP[k]
            if (self && self instanceof clazz)
                clazz.closeInstances(<any>self)
            else
                clazz.closeInstances()
        })
    }

    /**
     * Get player animation origin
     *
     * Origin is based on target element if selector is set, or on this if no
     * target element can be found and origin attribute is true.
     */
    private _getOrigin(): Origin {
        const target = this._target || (this.origin && this)
        if (!target)
            return null

        const rect = target.getBoundingClientRect()
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            w: rect.width,
            h: rect.height
        }
    }

    private _getOverlayInstance() {
        let instance = <Overlay>document.querySelector(OVERLAY_TAG_NAME)
        if (!instance) {
            instance = new Overlay()
            document.body.appendChild(instance)
        }
        return instance
    }

    private _getInlineInstance() {
        const target = this._target
        let instance = <Inline>this.querySelector(INLINE_TAG_NAME)
        if (!instance) {
            instance = new Inline()
            instance.slot = PLAYER_SLOT
            this.appendChild(instance)
        }
        if (target) {
            instance.slot = ''
            target.parentNode.insertBefore(instance, target.nextSibling)
        }
        instance.target = target
        this.directPlayer = instance.slot == PLAYER_SLOT
        return instance
    }

    private _updateInlineTarget() {
        if (this._inlinePlayer) {
            const target = this._target
            if (target) {
                this._inlinePlayer.slot = ''
                target.parentNode.insertBefore(this._inlinePlayer, target.nextSibling)
            }
            this._inlinePlayer.target = target
        }
        this.directPlayer = this._inlinePlayer && this._inlinePlayer.slot == PLAYER_SLOT
    }

    private _inlineOpenListener = (evt: CustomEvent) => {
        this.inlineOpen = evt.detail.open
    }

    private _onPlayerBlur = async () => {
        await this.updateComplete
        const trigger = this._buttonTrigger
        if (trigger)
            trigger.focus()
    }

    @eventKeys(
        'Enter', 13,
        'Space', 32
    )
    private _keyPress(evt: KeyboardEvent) {
        evt.stopPropagation()
        evt.preventDefault()
        // Transfer focus when opening through keyboard
        this.openPlayer(undefined, true)
    }

    render() {
        return this.player == PlayerType.Inline && this.inlineOpen
            ? this.directPlayer
                ? html`<slot name="${PLAYER_SLOT}"></slot>`
                : html`<slot></slot>`
            : html`<div class="vbx-button__trigger"
                tabindex="0"
                @click="${this.openPlayer}"
                @keydown="${this._keyPress}"
                title="${this.description}"><slot></slot></div>`
    }

    update(changedProps: Map<string | number | symbol, unknown>) {
        if (changedProps.has('selector'))
            this._updateInlineTarget()
        return super.update(changedProps)
    }
}
