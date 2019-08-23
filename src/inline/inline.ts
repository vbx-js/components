import { css, customElement, html, LitElement, property, query } from 'lit-element'
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, INITIAL_WIDTH, INLINE_TAG_NAME, PlayerEventType } from '../helpers/constants'
import { Origin } from '../helpers/interfaces'
import { animate, clip, eventKeys, hide, show } from '../helpers/utils'
import '../icon/icon'
import { Pagination } from '../pagination/pagination'
import { Slider } from '../slider/slider'

const instances = new Set<Inline>()

@customElement(INLINE_TAG_NAME)
export class Inline extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './inline.scss';
        }`]
    }

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

    @query('.vbx-inline__video') private _inlineVideo: HTMLElement
    @query('.vbx-inline__wrap') private _inlineWrap: HTMLElement
    @query('.vbx-inline__sizer') private _inlineSizer: HTMLElement

    private _openingAnimation: Animation
    private _closingAnimations: Animation[]
    private _origin: Origin
    private _target: HTMLElement

    private get _inPager() {
        let p: HTMLElement = this
        while (p && !(p instanceof Slider || p instanceof Pagination))
            p = p.parentElement

        return !!(p && (p instanceof Slider || p instanceof Pagination))
    }

    private get _width() {
        return clip(this.maxWidth, DEFAULT_WIDTH)
    }

    /**
     * Target element, i.e. element which is replaced by this player
     */
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

    static closeInstances(self?: Inline) {
        instances.forEach(i => i != self && i.hide())
    }

    /**
     * Called when player closes and we want to transfer focus to another element
     *
     * If triggering player through an external function, be sure to override this
     * callback before calling {@link Inline.open}.
     */
    onPlayerBlur = () => { }

    /**
     * Show inline player
     *
     * @param from Animation origin, specifying (x, y) and initial size
     * @param focus If true, focus this element when video opens
     */
    async show(from?: Origin, focus = false) {
        // Keep target proprtions
        if (this._inPager && from && from.w && from.h) {
            this.maxHeight = from.h / from.w * this.maxWidth
        }

        // Check if already open
        if (this.open)
            return

        // Cancel any leftover opening animation
        if (this._openingAnimation) {
            this._openingAnimation.cancel()
            this._openingAnimation = null
        }

        instances.forEach(instance => {
            if (instance !== this)
                instance.hide()
        })

        // Get origin from target
        if (!from && this._target) {
            this._setTargetVisibility(true)
            const rect = this._target.getBoundingClientRect()
            from = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                w: rect.width,
                h: rect.height
            }

            // Keep target proprtions
            if (this._inPager)
                this.maxHeight = from.h / from.w * this.maxWidth
        }

        // Set state to open, but not ready
        this.open = true
        this.contentOpen = true
        this.contentReady = false

        // Cancel possible closing animation
        if (this._closingAnimations) {
            this._closingAnimations.forEach(a => a.cancel())
            this._closingAnimations = null
        }

        await this._animateContent(from || {})

        const video = this._inlineVideo
        if (focus && video)
            video.focus()
    }

    /**
     * Hide inline player
     *
     * @param evt Mouse event
     * @param notifyBlur If true, call {@link Overlay.onPlayerBlur} callback
     */
    async hide(evt?: MouseEvent, notifyBlur = false) {
        if (evt) {
            evt.stopPropagation()
            evt.preventDefault()
        }

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

        const wrap = this._inlineWrap
        const sizer = this._inlineSizer
        if (this._origin && wrap && !this._inPager) {
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

            const { animation, promise } = animate(wrap, [from, to], d)

            wrap.style.maxWidth = to['maxWidth']

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

        if (wrap)
            wrap.style.maxWidth = ''

        if (sizer && sizer.style.paddingBottom == ppB)
            sizer.style.paddingBottom = spB

        if (notifyBlur && this.onPlayerBlur)
            this.onPlayerBlur()
    }

    /**
     * Animate video container
     *
     * @param origin Animation origin, specifying (x, y) and initial size
     */
    private async _animateContent(origin: Origin) {
        this._origin = origin
        const wrap = this._inlineWrap
        if (!wrap)
            return

        await this.updateComplete

        if (!this._inPager) {

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

            promises.push(animate(wrap, [from, to], d).promise)

            // Change ratio when expanding
            if (origin.h && origin.w) {
                const sizer = this._inlineSizer
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

    @eventKeys(
        'Enter', 13,
        'Space', 32
    )
    private _closeKeyPress(evt: KeyboardEvent) {
        evt.stopPropagation()
        evt.preventDefault()
        // Transfer focus when closing through keyboard
        this.hide(undefined, true)
    }

    @eventKeys(
        'Escape', 27,
        'KeyX', 88
    )
    private _keyPress(evt: KeyboardEvent) {
        evt.stopPropagation()
        evt.preventDefault()
        // Transfer focus when closing through keyboard
        this.hide(undefined, true)
    }

    render() {
        const maxWidth = clip(this.maxWidth, DEFAULT_WIDTH)
        const maxHeight = clip(this.maxHeight, DEFAULT_HEIGHT)
        return html`
            <div class="vbx-inline__wrap"
                style="width: ${maxWidth}px;" >
                <div class="vbx-inline__sizer"
                    style="padding-bottom: ${100 * maxHeight / maxWidth}%;">
                    ${this.contentOpen ? html`<div class="vbx-inline__content">
                        <div class="vbx-inline__video"
                            tabindex="0"
                            @keydown="${this._keyPress}">
                            <iframe allowfullscreen
                                src="${this.contentReady && this.src || ''}"
                                allow="autoplay"
                                tabindex="-1"></iframe>
                        </div>
                        <div class="vbx-inline__close"
                            @click="${this.hide}"
                            @keydown="${this._closeKeyPress}"
                            tabindex="0">
                            <div class="vbx-inline__close-icons"
                                title="${this.i18nClose || 'Close'}"><vbx-icon shape="circle"></vbx-icon><vbx-icon shape="close-small"></vbx-icon></div>
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

    updated(changedProps: Map<string | number | symbol, unknown>) {
        if (changedProps.has('open')) {
            this._setTargetVisibility()
            this.dispatchEvent(new CustomEvent(PlayerEventType.OpenChange, {
                detail: {
                    open: !!this.open
                }
            }))
        }
        return super.updated(changedProps)
    }
}
