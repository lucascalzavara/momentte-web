import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import '../components/auth-layout'
@customElement('login-page')
export class LoginPage extends LitElement {
  protected createRenderRoot() { return this }
  connectedCallback() { super.connectedCallback(); document.title = 'Entrar — Momentte' }
  render() { return html`<auth-layout mode="login"></auth-layout>` }
}
