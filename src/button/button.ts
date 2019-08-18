import { css, customElement, html, LitElement, property } from 'lit-element'
import { Origin } from '../helpers/interfaces'
import { clip } from '../helpers/utils'
import { EventType, Inline, TAG_NAME as INLINE_TAG_NAME } from '../inline/inline'
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, Overlay, TAG_NAME as OVERLAY_TAG_NAME } from '../overlay/overlay'

export enum PlayerType {
    Overlay = 'videobox',
    Inline = 'vbinline'
}

const PLAYER_SLOT = 'player'

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

    private inlinePlayer: Inline

    private _inlineOpenListener = (evt: CustomEvent) => {
        this.inlineOpen = evt.detail.open
    }

    /**
     * Open player according to button attributes
     */
    async openPlayer() {
        switch (this.player) {
            case PlayerType.Inline:
                Overlay.closeInstances()
                if (this.inlinePlayer)
                    this.inlinePlayer.removeEventListener(EventType.OpenChange, this._inlineOpenListener)
                this.inlinePlayer = this._getInlineInstance()
                this._closeOtherInstances(this.inlinePlayer)
                await this.inlinePlayer.hide()

                this.inlinePlayer.src = this.src
                this.inlinePlayer.description = this.description
                this.inlinePlayer.maxWidth = clip(this.maxWidth, DEFAULT_WIDTH)
                this.inlinePlayer.maxHeight = clip(this.maxHeight, DEFAULT_HEIGHT)
                this.inlinePlayer.addEventListener(EventType.OpenChange, this._inlineOpenListener)
                this.inlineOpen = this.inlinePlayer.open

                return this.inlinePlayer.show(this._getOrigin())

            default:
                const overlay = this._getOverlayInstance()
                this._closeOtherInstances(overlay)
                await overlay.hide()

                overlay.src = this.src
                overlay.description = this.description
                overlay.maxWidth = clip(this.maxWidth, DEFAULT_WIDTH)
                overlay.maxHeight = clip(this.maxHeight, DEFAULT_HEIGHT)

                return overlay.show(this._getOrigin())
        }
    }

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
        const target: HTMLElement = (this.selector && this.querySelector(this.selector)) || (this.origin && this)
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
        const target: HTMLElement = this.selector && this.querySelector(this.selector)
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

    private _updateTarget() {
        if (this.inlinePlayer) {
            const target: HTMLElement = this.selector && this.querySelector(this.selector)
            if (target) {
                this.inlinePlayer.slot = ''
                target.parentNode.insertBefore(this.inlinePlayer, target.nextSibling)
            }
            this.inlinePlayer.target = target
        }
        this.directPlayer = this.inlinePlayer && this.inlinePlayer.slot == PLAYER_SLOT
    }

    render() {
        const inlinePlayerOpen = this.player == PlayerType.Inline && this.inlineOpen
        const inlineContainer = this.directPlayer
            ? html`<slot name="${PLAYER_SLOT}"></slot>`
            : html`<slot></slot>`

        return html`
            ${inlinePlayerOpen
                ? inlineContainer
                : html`<div class="vbx-button__trigger" @click="${this.openPlayer}" title="${this.description}">
                    <slot></slot>
                </div>`
            }
    `
    }

    update(changedProps: Map<string | number | symbol, unknown>) {
        if (changedProps.has('selector'))
            this._updateTarget()
        return super.update(changedProps)
    }
}
