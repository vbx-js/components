import { css, customElement, html, LitElement, property } from 'lit-element'
import { Origin } from '../helpers/interfaces'
import { animate, clip, hide, show } from '../helpers/utils'
import '../icon/icon'
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, INITIAL_WIDTH } from '../overlay/overlay'
import { Slider } from '../slider/slider'

export const TAG_NAME = 'vbx-inline'

export enum EventType {
    OpenChange = 'open-change'
}

const instances = new Set<Inline>()

@customElement(TAG_NAME)
export class Inline extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './inline.scss';
        }`]
    }
    set target(val: HTMLElement) {
        if (val != this._target) {
            this._setTargetVisibility(true)
            this._target = val
            this._setTargetVisibility()
        }
    }
    get target() {
        return this._target
    }

    private _target: HTMLElement

    @property({ type: Boolean, reflect: true })
    open: boolean = false

    @property({ type: Number, reflect: true, attribute: 'max-width' })
    maxWidth: number

    @property({ type: Number, reflect: true, attribute: 'max-height' })
    maxHeight: number

    @property({ type: String, reflect: true })
    src: string

    @property({ type: String, reflect: true })
    description: string

    @property({ type: String, reflect: true, attribute: 'data-close' })
    i18nClose: string

    @property({ type: Boolean })
    private contentOpen: boolean = true

    @property({ type: Boolean })
    private contentReady: boolean = true

    private get _inSlider() {
        let p: HTMLElement = this
        while (p && !(p instanceof Slider))
            p = p.parentElement

        return !!(p && p instanceof Slider)
    }

    private get _width() {
        return clip(this.maxWidth, DEFAULT_WIDTH)
    }

    private _openingAnimation: Animation
    private _closingAnimations: Animation[]
    private _origin: Origin

    static closeInstances(self?: Inline) {
        instances.forEach(i => i != self && i.hide())
    }

    $(selector: string) {
        return this.shadowRoot.querySelector(selector) as HTMLElement
    }

    private _setTargetVisibility(visible = !this.open) {
        if (this._target) {
            if (visible)
                show(this._target)
            else
                hide(this._target)
        }

        if (!visible)
            show(this)
        else
            hide(this)
    }

    /**
     * Show inline player
     *
     * @param from Animation origin, specifying (x, y) and initial size
     */
    async show(from?: Origin) {
        if (from && from.w && from.h && this._inSlider) {
            this.maxHeight = from.h / from.w * this.maxWidth
        }

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

        if (!from && this._target) {
            this._setTargetVisibility(true)
            const rect = this._target.getBoundingClientRect()
            from = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                w: rect.width,
                h: rect.height
            }
        }

        // Set state to open
        this.open = true
        this.contentOpen = true
        this.contentReady = false

        // Cancel possible closing animation
        if (this._closingAnimations) {
            this._closingAnimations.forEach(a => a.cancel())
            this._closingAnimations = null
        }

        return this.animateContent(from || {})
    }

    /**
     * Hide inline player
     */
    async hide() {
        // Check if already closed or closing
        if (!this.open || this._closingAnimations)
            return

        // Cancel possible opening animation
        if (this._openingAnimation) {
            this._openingAnimation.cancel()
            this._openingAnimation = null
        }

        this.contentOpen = false

        let ppB, spB

        const content = <HTMLDivElement>this.$('.vbx-inline__wrap')
        const sizer = <HTMLDivElement>this.$('.vbx-inline__sizer')
        if (this._origin && content && !this._inSlider) {
            const origin = this._origin || {}

            await this.updateComplete

            const maxW = clip(this.maxWidth, DEFAULT_WIDTH)
            const maxH = clip(this.maxHeight, DEFAULT_HEIGHT)

            this._closingAnimations = []
            const promises: Array<Promise<any>> = []
            const from = {}
            const to = {}
            let d = 0

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
            from['maxWidth'] = this._width + 'px'
            to['maxWidth'] = initialW + 'px'

            if (!d)
                d = 1.5 * Math.abs(initialW - this._width)

            const { animation, promise } = animate(content, [from, to], d)

            content.style.maxWidth = to['maxWidth']

            this._closingAnimations.push(animation)
            promises.push(promise)

            // Change ratio when expanding
            if (origin.h && origin.w && sizer) {
                const r0 = 100 * origin.h / origin.w
                const r = 100 * maxH / maxW

                const { animation, promise } = animate(sizer, [
                    {
                        paddingBottom: r + '%'
                    },
                    {
                        paddingBottom: r0 + '%'
                    }
                ], d)

                spB = sizer.style.paddingBottom
                sizer.style.paddingBottom = ppB = r0 + '%'

                this._closingAnimations.push(animation)
                promises.push(promise)
            }

            await Promise.all(promises)
                .then(() => this.open = false)
                .catch(() => { })
                .then(() => this._closingAnimations = null)
        } else {
            this.open = false
        }

        await this.updateComplete

        if (content)
            content.style.maxWidth = ''

        if (sizer && sizer.style.paddingBottom == ppB)
            sizer.style.paddingBottom = spB
    }

    /**
     * Animate video container
     *
     * @param origin Animation origin, specifying (x, y) and initial size
     */
    private async animateContent(origin: Origin) {
        this._origin = origin
        const content = <HTMLDivElement>this.$('.vbx-inline__wrap')
        if (!content)
            return

        await this.updateComplete

        if (!this._inSlider) {

            const maxW = clip(this.maxWidth, DEFAULT_WIDTH)
            const maxH = clip(this.maxHeight, DEFAULT_HEIGHT)

            const promises: Array<Promise<any>> = []
            const from = {}
            const to = {}
            let d = 0

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
            to['maxWidth'] = this._width + 'px'

            if (!d)
                d = 1.5 * Math.abs(initialW - this._width)

            promises.push(animate(content, [from, to], d).promise)

            // Change ratio when expanding
            if (origin.h && origin.w) {
                const sizer = <HTMLDivElement>this.$('.vbx-inline__sizer')
                if (sizer) {
                    const r0 = 100 * maxH / maxW
                    const r = 100 * origin.h / origin.w

                    promises.push(animate(sizer, [
                        {
                            paddingBottom: r + '%'
                        },
                        {
                            paddingBottom: r0 + '%'
                        }
                    ], d).promise)
                }
            }

            await Promise.all(promises)
        }

        this.contentReady = true
    }

    render() {
        const maxWidth = clip(this.maxWidth, DEFAULT_WIDTH)
        const maxHeight = clip(this.maxHeight, DEFAULT_HEIGHT)
        return html`
            <div class="vbx-inline__wrap" style="width: ${maxWidth}px;">
                <div class="vbx-inline__sizer" style="padding-bottom: ${100 * maxHeight / maxWidth}%;">
                    ${this.contentOpen ? html`<div class="vbx-inline__content">
                        <div class="vbx-inline__video">
                            <iframe allowfullscreen src="${this.contentReady && this.src || ''}" allow="autoplay"></iframe>
                        </div>
                        <div class="vbx-inline__close" @click="${this.hide}">
                            <div class="vbx-inline__close-icons" title="${this.i18nClose || 'Close'}"><vbx-icon shape="circle"></vbx-icon><vbx-icon shape="close-small"></vbx-icon></div>
                        </div>
                    </div>` : ''}
                </div>
            </div>
        `
    }

    connectedCallback() {
        super.connectedCallback()
        instances.add(this)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        instances.delete(this)
    }

    update(changedProps: Map<string | number | symbol, unknown>) {
        if (changedProps.has('open')) {
            this._setTargetVisibility()
            this.dispatchEvent(new CustomEvent(EventType.OpenChange, {
                detail: {
                    open: !!this.open
                }
            }))
        }
        return super.update(changedProps)
    }
}
