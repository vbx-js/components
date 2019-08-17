import { css, customElement, html, LitElement, property, svg } from 'lit-element'

@customElement('vbx-icon')
export class Icon extends LitElement {

    static get styles() {
        return [css`:inline {
            content: './icon.scss';
        }`]
    }

    @property({ type: String, reflect: true })
    shape: string

    render() {
        return html`
            <svg display="none" xmlns="http://www.w3.org/2000/svg">
                <symbol id="close" style="width:24px;height:24px" viewBox="0 0 24 24" id=".8066955455236873">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </symbol>
                <symbol id="close-small" style="width:24px;height:24px" viewBox="0 0 24 24" id=".8066955455236873">
                    <path d="M13.414 12L17 15.586 15.586 17 12 13.414 8.417 17 7 15.586 10.586 12 7 8.417 8.417 7 12 10.586 15.586 7 17 8.417 13.414 12z"/>
                </symbol>
                <symbol id="circle" style="width:24px;height:24px" viewBox="0 0 24 24" id=".8066955455236873">
                    <path d="M2 12c0 5.521 4.477 10 10 10 5.521 0 10-4.479 10-10 0-5.523-4.479-10-10-10C6.477 2 2 6.477 2 12z"/>
                </symbol>
                <symbol id="play" style="width:24px;height:24px" viewBox="0 0 24 24" id=".8066955455236873">
                    <path d="M8 5v14l11-7L8 5z"/>
                </symbol>
            </svg>
            <svg class="${this.shape}" xmlns:xlink="http://www.w3.org/1999/xlink">
                ${svg`<use fill="currentColor" href="${'#' + this.shape}"></use>`}
            </svg>
        `
    }
}
