import { css, customElement, html, LitElement, property } from 'lit-element';
import { Origin } from '../helpers/interfaces';
import { animate, clip } from '../helpers/utils';
import '../icon/icon';

export const DEFAULT_WIDTH = 720
export const DEFAULT_HEIGHT = 405
export const INITIAL_WIDTH = 100
export const TAG_NAME = 'vbx-overlay'

const instances = new Set<Overlay>()

@customElement(TAG_NAME)
export class Overlay extends LitElement {

    $(selector: string) {
        return this.shadowRoot.querySelector(selector) as HTMLElement
    }

    static get styles() {
        return [css`:inline {
            content: './overlay.scss';
        }`]
    }

    @property({ type: Boolean, reflect: true })
    open: boolean = false

    @property({ type: Number, reflect: true })
    maxWidth: number

    @property({ type: Number, reflect: true })
    maxHeight: number

    @property({ type: String, reflect: true })
    src: string

    @property({ type: String, reflect: true })
    description: string

    @property({ type: String, reflect: true, attribute: 'data-close' })
    i18nClose: string

    @property({ type: Number })
    private width: number

    @property({ type: Boolean })
    private contentOpen: boolean = true

    @property({ type: Boolean })
    private overlayReady: boolean = true

    private _openingAnimation: Animation
    private _closingAnimation: Animation
    private _dirty = true

    private _resizeListener = (_evt) => {
        this.recalculateWidth()
    }

    private get _bg() {
        return <HTMLDivElement>this.$('.vbx-background')
    }

    /**
     * Show Videobox overlay
     *
     * @param from Animation origin, specifying (x, y) and initial size
     */
    async show(from?: Origin) {
        // Check if already open
        if (this.open)
            return []

        // Cancel any leftover opening animation
        if (this._openingAnimation) {
            this._openingAnimation.cancel()
            this._openingAnimation = null
        }

        instances.forEach(instance => {
            if (instance !== this)
                instance.hide()
        })

        // Set state to open
        this.open = true
        this.contentOpen = true
        this.overlayReady = false

        if (this._dirty)
            await this.recalculateWidth()

        // Cancel possible closing animation
        if (this._closingAnimation) {
            this._closingAnimation.cancel()
            this._closingAnimation = null
        }

        const promises: Array<Promise<any>> = []

        const bg = this._bg
        if (bg) {
            const { animation, promise } = animate(bg, [
                {
                    opacity: 0
                },
                {
                    opacity: 1
                }
            ])
            this._openingAnimation = animation

            promises.push(
                promise
                    .catch(() => { })
                    .then(() => this._openingAnimation = null)
            )
        }

        promises.push(this.animateContent(from || {}))

        return Promise.all(promises)
    }

    /**
     * Hide Videobox overlay
     */
    async hide() {
        // Check if already closed or closing
        if (!this.open || this._closingAnimation)
            return

        // Cancel possible opening animation
        if (this._openingAnimation) {
            this._openingAnimation.cancel()
            this._openingAnimation = null
        }

        this.contentOpen = false

        const bg = this._bg
        if (bg) {
            const { animation, promise } = animate(bg, [
                {
                    opacity: 1
                },
                {
                    opacity: 0
                }
            ])

            this._closingAnimation = animation

            await promise
                .then(() => this.open = false)
                .catch(() => { })
                .then(() => this._closingAnimation = null)
        } else {
            this.open = false
        }
    }

    /**
     * Calculate video popup size
     *
     * If popup is not open, label it as dirty and return.
     *
     * @param w Maximum video width
     * @param h Maximum video height
     */
    async recalculateWidth(w?: number, h?: number) {
        if (!this.open)
            return this._dirty = true

        w = clip(w || this.maxWidth, DEFAULT_WIDTH)
        h = clip(h || this.maxHeight, DEFAULT_HEIGHT)

        this._dirty = false

        const r = h / w
        await this.updateComplete
        const rect = this.getBoundingClientRect()
        const maxW = Math.min(rect.width - 90, w)
        const maxH = Math.min(rect.height - 90, h)
        const newH = r * maxW

        if ((w <= maxW && h <= maxH) || newH <= maxH)
            return this.width = Math.max(0, w)

        return this.width = Math.max(0, maxH / r)
    }

    /**
     * Animate video container
     *
     * @param origin Animation origin, specifying (x, y) and initial size
     */
    private async animateContent(origin: Origin) {
        const content = <HTMLDivElement>this.$('.vbx-wrap')
        if (!content)
            return

        await this.updateComplete

        const maxW = clip(this.maxWidth, DEFAULT_WIDTH)
        const maxH = clip(this.maxHeight, DEFAULT_HEIGHT)

        const promises: Array<Promise<any>> = []
        const from = {
            transform: 'translateY(0px)'
        }
        const to = {
            transform: 'translateY(-30px)'
        }
        let d = 0

        // If (x, y) is specified, expand from that point
        if (origin.x || origin.x === 0 || origin.y || origin.y === 0) {
            const rect = this.getBoundingClientRect()

            let left = 0
            let top = 0

            if (origin.x || origin.x === 0) {
                const nullX = origin.x - rect.left
                left = nullX - rect.width / 2
            }

            if (origin.y || origin.y === 0) {
                const nullY = origin.y - rect.top
                top = nullY - rect.height / 2
            }

            from['left'] = `${left}px`
            from['top'] = `${top}px`

            to['left'] = `0px`
            to['top'] = `0px`

            d = 1.5 * Math.sqrt(left * left + top * top)
        }

        // Exapnd from initial size
        let initialW = INITIAL_WIDTH
        if (origin.w || origin.w === 0 || origin.h || origin.h === 0) {
            if (origin.w || origin.w === 0)
                // Initial width is specified
                initialW = origin.w
            else
                // Initial width isn't specified, calculate from initial height
                initialW = origin.h * maxW / maxH
        }
        from['maxWidth'] = initialW + 'px'
        to['maxWidth'] = this.width + 'px'

        if (!d)
            d = 1.5 * Math.abs(initialW - this.width)

        promises.push(animate(content, [from, to], d).promise)

        // Change ratio when expanding
        if (origin.h && origin.w) {
            const sizer = <HTMLDivElement>this.$('.vbx-sizer')
            if (sizer) {
                const r0 = 100 * maxH / maxW
                const r = 100 * origin.h / origin.w

                promises.push(animate(sizer, [
                    {
                        'paddingBottom': r + '%'
                    },
                    {
                        'paddingBottom': r0 + '%'
                    }
                ], d).promise)
            }
        }

        await Promise.all(promises)

        this.overlayReady = true

        await this.updateComplete

        const bottom = this.$('.vbx-bottom')
        if (bottom) {
            await animate(bottom, [
                {
                    transform: 'translateY(-100%)'
                },
                {
                    transform: 'translateY(0%)'
                }
            ]).promise
        }
    }

    render() {
        const maxWidth = clip(this.maxWidth, DEFAULT_WIDTH)
        const maxHeight = clip(this.maxHeight, DEFAULT_HEIGHT)
        return html`
            <div class="vbx-background" @click="${() => this.hide()}" title="${this.i18nClose || 'Close'}"></div>
            <div class="vbx-wrap" style="max-width: ${this.width}px;">
                <div class="vbx-sizer" style="padding-bottom: ${100 * maxHeight / maxWidth}%;">
                    ${this.contentOpen ? html`<div class="vbx-content">
                        <div class="vbx-video">
                            ${this.overlayReady ? html`<iframe allowfullscreen src="${this.src}" allow="autoplay"></iframe>` : ''}
                        </div>
                        ${this.overlayReady ? html`<div class="vbx-bottom">
                            <div class="vbx-bottom__content">${this.description}</div>
                            <div class="vbx-bottom__button" @click="${() => this.hide()}" title="${this.i18nClose || 'Close'}">
                                <span>${this.i18nClose || 'Close'}</span>
                                <vbx-icon shape="close"></vbx-icon>
                            </div>
                        </div>` : ''}
                    </div>` : ''}
                </div>
            </div>
        `
    }

    connectedCallback() {
        super.connectedCallback()
        window.addEventListener('resize', this._resizeListener)
        instances.add(this)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        window.removeEventListener('resize', this._resizeListener)
        instances.delete(this)
    }

    update(changedProps: Map<string | number | symbol, unknown>) {
        if ('maxWidth' in changedProps || 'maxHeight' in changedProps)
            this.recalculateWidth(this.maxWidth, this.maxHeight)
        return super.update(changedProps)
    }

    firstUpdated() {
        this.recalculateWidth()
    }

}
