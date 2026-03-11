/**
 * Xiaomi Vacuum Shortcut Cards
 * Mushroom-style chips that send the vacuum to pre-defined locations.
 * Drop in: config/www/xiaomi-vacuum-shortcuts.js
 *
 * Cards defined:
 *   xiaomi-vacuum-shortcut-card   — generic base (used by all four below)
 *   xiaomi-vacuum-corridor-card
 *   xiaomi-vacuum-kitchen-card
 *   xiaomi-vacuum-livingroom-card
 *   xiaomi-vacuum-emaspc-card
 */

class XiaomiVacuumShortcutCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._rendered = false;
    this._holdTimer = null;
    this._holdTriggered = false;
    this._confirming = false;
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  static getStubConfig() {
    return {
      vacuum_entity: "vacuum.ijai_v3_542b_robot_cleaner",
      name: "Shortcut",
      icon: "mdi:robot-vacuum",
      type_: "point",        // "point" | "zone"
      x: 0, y: 0,            // for point
      x_min: 0, y_min: 0, x_max: 0, y_max: 0,  // for zone
      command_style: "miot_9_9",
    };
  }

  setConfig(config) {
    this._config = config;
    this._rendered = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._rendered = true;
      this._render();
    } else {
      this._syncState();
    }
  }

  getCardSize() { return 1; }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  get _vac() { return this._hass?.states[this._config.vacuum_entity]; }

  _isBusy() {
    const s = this._vac?.state;
    return s && !['idle','docked','error','returning','paused'].includes(s);
  }

  // ── Commands ─────────────────────────────────────────────────────────────────

  _send() {
    const cfg = this._config;
    if (!cfg.vacuum_entity || !this._hass) return;

    if (cfg.type_ === 'zone') {
      const xMin = Math.min(cfg.x_min, cfg.x_max).toFixed(3);
      const xMax = Math.max(cfg.x_min, cfg.x_max).toFixed(3);
      const yMin = Math.min(cfg.y_min, cfg.y_max).toFixed(3);
      const yMax = Math.max(cfg.y_min, cfg.y_max).toFixed(3);
      const eight = `${xMin},${yMin},${xMin},${yMax},${xMax},${yMax},${xMax},${yMin}`;

      if (cfg.command_style === 'miot_9_9') {
        this._hass.callService("xiaomi_miot", "call_action", {
          entity_id: cfg.vacuum_entity, siid: 9, aiid: 8, params: [eight]
        });
        setTimeout(() => {
          this._hass.callService("xiaomi_miot", "call_action", {
            entity_id: cfg.vacuum_entity, siid: 9, aiid: 3, params: []
          });
        }, 500);
      } else {
        this._hass.callService("vacuum", "send_command", {
          entity_id: cfg.vacuum_entity,
          command: "app_zoned_clean",
          params: [[parseFloat(xMin), parseFloat(yMin), parseFloat(xMax), parseFloat(yMax), 1]]
        });
      }
    } else {
      // Go-To Point
      const p = `${parseFloat(cfg.x).toFixed(3)},${parseFloat(cfg.y).toFixed(3)}`;
      if (cfg.command_style === 'miot_9_9') {
        this._hass.callService("xiaomi_miot", "call_action", {
          entity_id: cfg.vacuum_entity, siid: 9, aiid: 9, params: [p]
        });
      } else {
        this._hass.callService("vacuum", "send_command", {
          entity_id: cfg.vacuum_entity,
          command: "app_goto_target",
          params: [parseFloat(cfg.x), parseFloat(cfg.y)]
        });
      }
    }
  }

  // ── Hold / tap ───────────────────────────────────────────────────────────────

  _onPointerDown() {
    this._holdTriggered = false;
    this._holdTimer = setTimeout(() => {
      this._holdTriggered = true;
      // Hold = send immediately without confirm
      this._send();
      this._flashFeedback('sent');
    }, 500);
  }

  _onPointerUp() {
    clearTimeout(this._holdTimer);
    if (!this._holdTriggered) {
      // Short tap: first tap shows confirm, second tap sends
      if (this._confirming) {
        this._confirming = false;
        this._send();
        this._flashFeedback('sent');
      } else {
        this._confirming = true;
        this._syncState();
        // Auto-cancel confirm after 3s
        clearTimeout(this._confirmTimer);
        this._confirmTimer = setTimeout(() => {
          this._confirming = false;
          this._syncState();
        }, 3000);
      }
    }
    this._holdTriggered = false;
  }

  _onPointerCancel() {
    clearTimeout(this._holdTimer);
    this._holdTriggered = false;
  }

  _flashFeedback(type) {
    const card = this.shadowRoot.querySelector('ha-card');
    if (!card) return;
    card.classList.add('flash');
    setTimeout(() => card.classList.remove('flash'), 600);
    this._confirming = false;
    this._syncState();
  }

  // ── State sync ───────────────────────────────────────────────────────────────

  _syncState() {
    const cfg = this._config;
    const vac = this._vac;
    const busy = this._isBusy();

    const icon = this.shadowRoot.querySelector('.mush-icon');
    const badge = this.shadowRoot.querySelector('.mush-badge');
    const nameEl = this.shadowRoot.querySelector('.mush-name');
    const hint = this.shadowRoot.querySelector('.mush-hint');

    if (nameEl) nameEl.textContent = cfg.name || 'Shortcut';

    if (icon) {
      icon.className = `mush-icon ${busy ? 'busy' : 'idle'}`;
    }

    if (badge) {
      if (this._confirming) {
        badge.textContent = 'Tap again to confirm';
        badge.classList.add('confirming');
      } else {
        badge.textContent = cfg.type_ === 'zone' ? 'Zone clean' : 'Go to point';
        badge.classList.remove('confirming');
      }
    }

    if (hint) {
      hint.textContent = this._confirming ? '✓ Confirm' : 'Tap';
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  _render() {
    const cfg = this._config;
    const typeLabel = cfg.type_ === 'zone' ? 'Zone clean' : 'Go to point';
    const icon = cfg.icon || 'mdi:robot-vacuum';

    this.shadowRoot.innerHTML = `
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :host { display: block; font-family: var(--primary-font-family, Roboto, sans-serif); }

        ha-card {
          padding: 10px;
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; user-select: none; -webkit-user-select: none;
          height: 56px; overflow: hidden;
          transition: box-shadow .15s, background .2s;
        }
        ha-card.flash { background: rgba(0,150,136,.08); }

        .mush-icon {
          width: 36px; height: 36px; min-width: 36px; min-height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background .25s, color .25s;
        }
        .mush-icon ha-icon { --mdc-icon-size: 24px; display: flex; line-height: 0; }
        .mush-icon.idle { background: rgba(0,150,136,.15); color: #009688; }
        .mush-icon.busy { background: rgba(255,193,7,.15); color: #ffc107; animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }

        .mush-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .mush-name { font-size: .92rem; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mush-badge { font-size: .78rem; color: var(--secondary-text-color); }
        .mush-badge.confirming { color: #009688; font-weight: 600; }

        .mush-hint { font-size: .68rem; color: var(--disabled-text-color, #bbb); flex-shrink: 0; padding: 3px 7px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 20px; transition: color .2s, border-color .2s; }
      </style>

      <ha-card id="main-card">
        <div class="mush-icon idle">
          <ha-icon icon="${icon}"></ha-icon>
        </div>
        <div class="mush-info">
          <div class="mush-name">${cfg.name || 'Shortcut'}</div>
          <div class="mush-badge">${typeLabel}</div>
        </div>
        <div class="mush-hint">Tap</div>
      </ha-card>
    `;

    const card = this.shadowRoot.querySelector('ha-card');
    card.addEventListener('mousedown',   () => this._onPointerDown());
    card.addEventListener('touchstart',  () => this._onPointerDown(), { passive: true });
    card.addEventListener('mouseup',     () => this._onPointerUp());
    card.addEventListener('touchend',    () => this._onPointerUp());
    card.addEventListener('mouseleave',  () => this._onPointerCancel());
    card.addEventListener('touchcancel', () => this._onPointerCancel());

    this._syncState();
  }
}

// ── Register base card ────────────────────────────────────────────────────────

if (!customElements.get('xiaomi-vacuum-shortcut-card'))
  customElements.define('xiaomi-vacuum-shortcut-card', XiaomiVacuumShortcutCard);

// ── Four pre-configured shortcut cards ───────────────────────────────────────

// Shared config defaults for this installation
const _BASE = {
  vacuum_entity: "vacuum.ijai_v3_542b_robot_cleaner",
  command_style: "miot_9_9",
};

// 1. Corridor – Go To Point
class XiaomiVacuumCorridorCard extends XiaomiVacuumShortcutCard {
  static getStubConfig() {
    return { ..._BASE, name: "Corridor", icon: "mdi:door-open", type_: "point", x: -3.216, y: -4.343 };
  }
  setConfig(cfg) { super.setConfig({ ..._BASE, name: "Corridor", icon: "mdi:door-open", type_: "point", x: -3.216, y: -4.343, ...cfg }); }
}
if (!customElements.get('xiaomi-vacuum-corridor-card'))
  customElements.define('xiaomi-vacuum-corridor-card', XiaomiVacuumCorridorCard);

// 2. Kitchen – Zone Clean
class XiaomiVacuumKitchenCard extends XiaomiVacuumShortcutCard {
  static getStubConfig() {
    return { ..._BASE, name: "Kitchen", icon: "mdi:silverware-fork-knife", type_: "zone", x_min: -2.402, y_min: -4.990, x_max: 0.855, y_max: -3.530 };
  }
  setConfig(cfg) { super.setConfig({ ..._BASE, name: "Kitchen", icon: "mdi:silverware-fork-knife", type_: "zone", x_min: -2.402, y_min: -4.990, x_max: 0.855, y_max: -3.530, ...cfg }); }
}
if (!customElements.get('xiaomi-vacuum-kitchen-card'))
  customElements.define('xiaomi-vacuum-kitchen-card', XiaomiVacuumKitchenCard);

// 3. Living Room – Zone Clean
class XiaomiVacuumLivingroomCard extends XiaomiVacuumShortcutCard {
  static getStubConfig() {
    return { ..._BASE, name: "Living Room", icon: "mdi:sofa", type_: "zone", x_min: -1.097, y_min: -3.254, x_max: 2.630, y_max: 0.020 };
  }
  setConfig(cfg) { super.setConfig({ ..._BASE, name: "Living Room", icon: "mdi:sofa", type_: "zone", x_min: -1.097, y_min: -3.254, x_max: 2.630, y_max: 0.020, ...cfg }); }
}
if (!customElements.get('xiaomi-vacuum-livingroom-card'))
  customElements.define('xiaomi-vacuum-livingroom-card', XiaomiVacuumLivingroomCard);

// 4. Ema's PC – Go To Point
class XiaomiVacuumEmaspcCard extends XiaomiVacuumShortcutCard {
  static getStubConfig() {
    return { ..._BASE, name: "Ema's PC", icon: "mdi:monitor", type_: "point", x: -2.670, y: -0.924 };
  }
  setConfig(cfg) { super.setConfig({ ..._BASE, name: "Ema's PC", icon: "mdi:monitor", type_: "point", x: -2.670, y: -0.924, ...cfg }); }
}
if (!customElements.get('xiaomi-vacuum-emaspc-card'))
  customElements.define('xiaomi-vacuum-emaspc-card', XiaomiVacuumEmaspcCard);

// ── Register all in the card picker ──────────────────────────────────────────

window.customCards = window.customCards || [];
[
  { type: "xiaomi-vacuum-corridor-card",   name: "Vacuum → Corridor",    description: "Send vacuum to the corridor" },
  { type: "xiaomi-vacuum-kitchen-card",    name: "Vacuum → Kitchen",     description: "Zone clean the kitchen" },
  { type: "xiaomi-vacuum-livingroom-card", name: "Vacuum → Living Room", description: "Zone clean the living room" },
  { type: "xiaomi-vacuum-emaspc-card",     name: "Vacuum → Ema's PC",    description: "Send vacuum to Ema's PC area" },
].forEach(c => { if (!window.customCards.find(x => x.type === c.type)) window.customCards.push(c); });
