import { css, customElement, html, LitElement, property, query } from 'lit-element'
import { repeat } from 'lit-html/directives/repeat'
import ResizeObserver from 'resize-observer-polyfill'
import { DEFAULT_ITEM_WIDTH, INLINE_TAG_NAME } from '../helpers/constants'
import { animate, clip, debounce, eventKeys } from '../helpers/utils'
import '../icon/icon'
import { Inline } from '../inline/inline'

function slotName(index: number) {
    return `vbx-slider__item-${index}`
}

@customElement('vbx-slider')
export class Slider extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './slider.scss';
        }`]
    }

    @property({ type: Boolean, reflect: true })
    single = false

    @property({ type: Number, reflect: true, attribute: 'item-width' })
    itemWidth: number = 240

    @property({ type: String, reflect: true })
    selector: string

    @property({ type: String, reflect: true, attribute: 'data-prev' })
    i18nPrev: string

    @property({ type: String, reflect: true, attribute: 'data-next' })
    i18nNext: string

    @property({ type: Number })
    private active: number = 0

    @property({ type: Number })
    private total: number = 0

    @property({ type: Number })
    private start: number = 0

    @property({ type: Number })
    private moving: number = 0

    @property({ type: Number })
    private pendingMove = 0

    @property({ type: Number })
    private cursorOffset = 0

    @property({ type: Number })
    private waitUpdates = 0

    @query('.vbx-slider__content') private _sliderContent: HTMLElement
    @query('.vbx-slider__wrap') private _sliderWrap: HTMLElement

    private get _itemWidth() {
        return Math.max(0, clip(this.itemWidth, DEFAULT_ITEM_WIDTH)) || DEFAULT_ITEM_WIDTH
    }

    private get _moveCount() {
        return Math.min(this.total, this.single ? 1 : this.active)
    }

    private get _start() {
        return this.moving > 0
            ? this.start
            : this.start + this.moving
    }

    private get _activeItems() {
        const start = this._start
        return this.total > 0
            ? new Array(this.active + Math.abs(this.moving)).fill(0).map((_v, i) => this._clampIndex(start + i))
            : []
    }

    private _items = new Array<HTMLElement>()
    private _width: number
    private readonly _resizeObserver = new ResizeObserver((changes) => {
        const c = (changes || []).find(c => c && c.target == this && c.contentRect.width != this._width)
        if (c) {
            this._width = c.contentRect.width
            this.recalculateCount()
        }
    })
    private readonly _mutationObserver = new MutationObserver(() => this._updateChildren())

    /**
     * Move slider backward
     *
     * Subsequent calls are batched.
     *
     * @param evt Click event
     */
    async prev(evt?: MouseEvent) {
        if (evt) {
            evt.stopPropagation()
            evt.preventDefault()
        }

        const move = -this._moveCount
        this.pendingMove += move
        return this._startMoving()
    }

    /**
     * Move slider forward
     *
     * Subsequent calls are batched.
     *
     * @param evt Click event
     */
    async next(evt?: MouseEvent) {
        if (evt) {
            evt.stopPropagation()
            evt.preventDefault()
        }

        const move = this._moveCount
        this.pendingMove += move
        return this._startMoving()
    }

    recalculateCount() {
        const width = this.getBoundingClientRect().width
        const itemWidth = this._itemWidth

        let visible = Math.max(1, Math.floor(width / itemWidth))
        if (visible < this.total)
            // If there isn't enough room for all items, subtract cursor width
            visible = Math.max(1, Math.floor((width - 96) / itemWidth))

        this.active = visible
    }

    recalculateCursorOffset() {
        const targets = Array.from(this.selector
            ? this.querySelectorAll(this.selector)
            : this.children
        )
        const midpoints = targets
            .map(el => {
                const rect = el.getBoundingClientRect()
                if (rect.height || rect.width)
                    return (rect.top + rect.bottom) / 2
                else
                    return undefined
            })
            .filter(mid => mid !== undefined)

        if (midpoints.length < 1) {
            this.cursorOffset = this.getBoundingClientRect().height / 2
            return
        }

        const midpoint = midpoints.reduce((t, v) => t + v, 0) / midpoints.length
        const top = this.getBoundingClientRect().top
        this.cursorOffset = midpoint - top
    }

    /**
     * Assign each child element to a slot
     */
    private _updateChildren() {
        this._items = Array.from<HTMLElement>(<any>this.children)
        this._items
            .forEach((el, i) => el.slot = slotName(i))
        this.total = this._items.length
    }

    /**
     * Executre any pending move
     */
    @debounce(200)
    private async _startMoving(): Promise<void> {
        if (!this.pendingMove || this.moving)
            return

        const move = this.total
            ? this.pendingMove % this.total
            : 0
        this.pendingMove = 0

        try {
            let oldHeight = 0
            let newHeight = 0
            const content = this._sliderContent
            if (content)
                oldHeight = content.getBoundingClientRect().height

            // Render new state
            const start = this.start
            this.start = this._clampIndex(this.start + move)
            await this.updateComplete

            if (content)
                newHeight = content.getBoundingClientRect().height
            const activeI = new Set(this._activeItems)

            // Calculate new cursor position
            this.recalculateCursorOffset()

            // Revert to current state
            this.start = start
            await this.updateComplete

            // Close any active inline players
            new Array<Inline>()
                .concat(...this._items
                    .filter((_v, i) => !activeI.has(i))
                    .map(el => Array.from<Inline>(el.querySelectorAll(INLINE_TAG_NAME)))
                )
                .forEach(p => p.hide())

            // Execute move
            this.moving = move

            await this.updateComplete
            await this._animateItems(oldHeight, newHeight)
            await this.updateComplete
        } catch (e) {
            console.error(e)
        }

        // Repeat if another move was requested in the meantime
        if (this.pendingMove)
            return this._startMoving()
    }

    /**
     * Animate items
     */
    private async _animateItems(): Promise<void>
    /**
     * Animate items
     *
     * @param oldHeight Current container height
     * @param newHeight New container height
     */
    private async _animateItems(oldHeight: number, newHeight: number): Promise<void>
    private async _animateItems(oldHeight?: number, newHeight?: number): Promise<void> {
        const content = this._sliderContent
        if (!this.moving || !content)
            return

        const from: Keyframe = {}
        const to: Keyframe = {}
        const step = this.moving / (this.active + Math.abs(this.moving))

        if (this.moving > 0) {
            from.transform = `translate(0%)`
            to.transform = `translate(${-100 * step}%)`
        } else {
            from.transform = `translate(${100 * step}%)`
            to.transform = `translate(0%)`
        }

        const d = 15 * this._itemWidth * Math.abs(step)
        const promises = []
        promises.push(animate(content, [
            from,
            to
        ], d).promise)

        content.style.transform = to['transform'] + ''

        const wrap = this._sliderWrap
        if (wrap && oldHeight != newHeight && (oldHeight || newHeight)) {
            promises.push(animate(wrap, [
                {
                    height: `${oldHeight}px`
                },
                {
                    height: `${newHeight}px`
                }
            ], d).promise)

            wrap.style.height = `${newHeight}px`
        }

        await Promise.all(promises)
        this.start = this._clampIndex(this.start + this.moving)
        this.moving = 0

        await this.updateComplete

        content.style.transform = ''
        if (wrap)
            wrap.style.height = ''
    }

    private _clampIndex(val: number) {
        if (this.total < 1)
            return 0

        val = val % this.total
        if (val < 0)
            val += this.total

        return val
    }

    @eventKeys(
        'Enter', 13,
        'Space', 12
    )
    private _prevKeyPress(evt: KeyboardEvent) {
        evt.stopPropagation()
        evt.preventDefault()
        this.prev()
    }

    @eventKeys(
        'Enter', 13,
        'Space', 12
    )
    private _nextKeyPress(evt: KeyboardEvent) {
        evt.stopPropagation()
        evt.preventDefault()
        this.next()
    }

    @eventKeys(
        'ArrowLeft', 37,
        'ArrowRight', 39
    )
    private _arrowKeyPress(evt: KeyboardEvent) {
        if (evt.code == 'ArrowLeft' ||
            evt.key == 'ArrowLeft' ||
            // tslint:disable-next-line:deprecation
            evt.keyCode == 37
        )
            this.prev()
        else
            this.next()

        // On keyboard navigation transfer focus to wrapper
        this._sliderWrap.focus()
    }

    render() {
        const items = this._activeItems
        const itemWidth = this._itemWidth

        const cursors = this.active && this.active < this.total
        return html`
            ${cursors ? html`<div class="vbx-slider__prev"
                @click="${this.prev}"
                title="${this.i18nPrev || 'Previous'}"
                tabindex="0"
                @keypress="${this._prevKeyPress}"
                rel=prev><vbx-icon shape="angle"
                    direction="left"
                    style="top: ${this.cursorOffset}px;"></vbx-icon></div>` : ''}
            <div class="vbx-slider__wrap"
                tabindex="0"
                @keydown="${this._arrowKeyPress}">
                <ul class="vbx-slider__content"
                    style="width: ${100 * items.length / this.active}%">
                    ${repeat(items, i => i, i => html`<li style="flex-basis: ${itemWidth}px; max-width: ${100 / items.length}%;"><slot name="${slotName(i)}"></slot></li>`)}
                </ul>
            </div>
            ${cursors ? html`<div class="vbx-slider__next"
                @click="${this.next}"
                title="${this.i18nNext || 'Next'}"
                tabindex="0"
                @keypress="${this._nextKeyPress}"
                rel="next"><vbx-icon shape="angle"
                    direction="right" style="top: ${this.cursorOffset}px;"></vbx-icon></div>` : ''}
        `
    }

    connectedCallback() {
        super.connectedCallback()
        this._resizeObserver.observe(this)
        this._mutationObserver.observe(this, {
            childList: true
        })
        this.waitUpdates = 3
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._resizeObserver.disconnect()
        this._mutationObserver.disconnect()
    }

    update(changedProps: Map<string | number | symbol, unknown>) {
        if (changedProps.has('itemWidth'))
            this.recalculateCount()
        return super.update(changedProps)
    }

    updated(changedProps: Map<string | number | symbol, unknown>) {
        if (changedProps.has('selector') || (changedProps.has('waitUpdates') && this.waitUpdates <= 0))
            this.recalculateCursorOffset()
        if (this.waitUpdates > 0)
            setTimeout(() => this.waitUpdates -= 1, 0)
        return super.updated(changedProps)
    }

    firstUpdated() {
        this._updateChildren()
        this.recalculateCount()
        this.recalculateCursorOffset()
        this.waitUpdates = 3
    }
}
