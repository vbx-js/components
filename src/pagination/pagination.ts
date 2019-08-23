import { css, customElement, html, LitElement, property } from 'lit-element'
import { repeat } from 'lit-html/directives/repeat'
import ResizeObserver from 'resize-observer-polyfill'
import { DEFAULT_ITEM_WIDTH, DEFAULT_PER_PAGE, INLINE_TAG_NAME } from '../helpers/constants'
import { clip, eventKeys } from '../helpers/utils'
import { Inline } from '../inline/inline'

function slotName(index: number) {
    return `vbx-pagination__item-${index}`
}

@customElement('vbx-pagination')
export class Pagination extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './pagination.scss';
        }`]
    }

    @property({ type: Number, reflect: true, attribute: 'per-page' })
    perPage: number = 12

    @property({ type: Number, reflect: true })
    page: number = 0

    @property({ type: Number, reflect: true, attribute: 'item-width' })
    itemWidth: number = 240

    @property({ type: Number })
    private active: number = 0

    @property({ type: Number })
    private total: number = 0

    private get _itemWidth() {
        return Math.max(0, clip(this.itemWidth, DEFAULT_ITEM_WIDTH)) || DEFAULT_ITEM_WIDTH
    }

    private get _pagesCount() {
        const perPage = clip(this.perPage, DEFAULT_PER_PAGE)
        return Math.ceil(this.total / perPage)
    }

    private get _page() {
        const pages = this._pagesCount
        return Math.max(0, Math.min(pages - 1, this.page || 0))
    }

    private get _active() {
        const perPage = clip(this.perPage, DEFAULT_PER_PAGE)
        return this.active
            ? Math.ceil(perPage / this.active) * this.active
            : perPage
    }

    private get _activeItems() {
        const perPage = clip(this.perPage, DEFAULT_PER_PAGE)
        const page = this._page
        const start = page * perPage
        return this.total > 0
            ? new Array(this._active).fill(0).map((_v, i) => start + i)
            : []
    }

    private get _pages() {
        const pagesCount = this._pagesCount
        return new Array(pagesCount).fill(0).map((_v, i) => i + 1)
    }

    private _items = new Array<HTMLElement>()
    private _width: number
    private _resizeObserver = new ResizeObserver((changes) => {
        const c = (changes || []).find(c => c && c.target == this && c.contentRect.width != this._width)
        if (c) {
            this._width = c.contentRect.width
            this.recalculateCount()
        }
    })
    private _mutationObserver = new MutationObserver(() => this._updateChildren())

    recalculateCount() {
        const width = this.getBoundingClientRect().width
        const itemWidth = this._itemWidth

        this.active = Math.max(1, Math.floor(width / itemWidth))
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

    private _hideInlinePayers() {
        const activeI = new Set(this._activeItems)
        new Array<Inline>()
            .concat(...this._items
                .filter((_v, i) => !activeI.has(i))
                .map(el => Array.from<Inline>(el.querySelectorAll(INLINE_TAG_NAME)))
            )
            .forEach(p => p.hide())
    }

    @eventKeys(
        'Enter', 13,
        'Space', 32
    )
    private _keyPress(evt: KeyboardEvent, page?: number) {
        evt.stopPropagation()
        evt.preventDefault()
        if (Number.isInteger(page))
            this.page = page
    }

    render() {
        const items = this._activeItems
        const itemWidth = this._itemWidth
        const pages = this._pages
        const activePage = this._page
        const perPage = clip(this.perPage, DEFAULT_PER_PAGE)

        return html`
            <ul class="vbx-pagination__wrap">
                ${repeat(items, i => i, (i, j) => i < this.total && j < perPage
            ? html`<li style="flex-basis: ${itemWidth}px; max-width: ${100 / this.active}%;"><slot name="${slotName(i)}"></slot></li>`
            : html`<li style="flex-basis: ${itemWidth}px; max-width: ${100 / this.active}%;"></li>`
        )}
            </ul>
            ${pages.length > 1 ? html`<ul role="navigation"
                class="vbx-pagination__pages"
                aria-label="Pagination">
                ${repeat(pages, i => i, (label, i) => html`<li aria-current="${activePage == i}"
                    class="${activePage == i ? 'vbx-pagination__page--active' : ''}"
                    @click="${() => this.page = i}"
                    aria-label="Page ${label}${activePage == i ? ', Current Page' : ''}"
                    tabindex="0"
                    @keydown="${(e) => this._keyPress(e, i)}">${label}</li>`)}
            </ul>` : ''}
        `
    }

    connectedCallback() {
        super.connectedCallback()
        this._resizeObserver.observe(this)
        this._mutationObserver.observe(this, {
            childList: true
        })
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this._resizeObserver.disconnect()
        this._mutationObserver.disconnect()
    }

    update(changedProps: Map<string | number | symbol, unknown>) {
        if (changedProps.has('itemWidth'))
            this.recalculateCount()
        if (changedProps.has('page'))
            this._hideInlinePayers()
        return super.update(changedProps)
    }

    firstUpdated() {
        this._updateChildren()
        this.recalculateCount()
    }

}
