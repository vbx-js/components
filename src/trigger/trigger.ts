import { css, customElement, html, LitElement } from 'lit-element'

@customElement('vbx-trigger')
export class Trigger extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './trigger.scss';
        }`]
    }

    render() {
        return html`
            <slot></slot>
            <div class="vbx-trigger__button"><vbx-icon shape="play"></vbx-icon></div>
        `
    }
}
