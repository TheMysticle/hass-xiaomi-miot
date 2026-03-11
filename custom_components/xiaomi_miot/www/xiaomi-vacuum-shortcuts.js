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
 *   xiaomi-vacuum-custom-card     — fully configurable via visual editor
 */

// ── Shared styles ─────────────────────────────────────────────────────────────

const CARD_STYLES = `
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
`;

// ── Base card class ───────────────────────────────────────────────────────────

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
      this._send();
      this._flashFeedback('sent');
    }, 500);
  }

  _onPointerUp() {
    clearTimeout(this._holdTimer);
    if (!this._holdTriggered) {
      if (this._confirming) {
        this._confirming = false;
        this._send();
        this._flashFeedback('sent');
      } else {
        this._confirming = true;
        this._syncState();
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
      <style>${CARD_STYLES}</style>
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


// ══════════════════════════════════════════════════════════════════════════════
// xiaomi-vacuum-custom-card — fully configurable with a visual editor
// ══════════════════════════════════════════════════════════════════════════════

class XiaomiVacuumCustomCard extends XiaomiVacuumShortcutCard {
  static getStubConfig() {
    return {
      vacuum_entity: "vacuum.my_vacuum",
      name: "Custom Shortcut",
      icon: "mdi:robot-vacuum",
      type_: "point",
      x: 0, y: 0,
      x_min: 0, y_min: 0, x_max: 0, y_max: 0,
      command_style: "miot_9_9",
    };
  }

  // The visual editor is a separate element defined below.
  static getConfigElement() {
    return document.createElement("xiaomi-vacuum-custom-card-editor");
  }
}

if (!customElements.get('xiaomi-vacuum-custom-card'))
  customElements.define('xiaomi-vacuum-custom-card', XiaomiVacuumCustomCard);


// ── Visual editor element ─────────────────────────────────────────────────────

class XiaomiVacuumCustomCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    // Refresh entity list if we already rendered
    if (this.shadowRoot.querySelector('select[name="vacuum_entity"]')) {
      this._populateEntitySelect();
    }
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  // Fire config-changed so HA picks up edits immediately
  _fire(newConfig) {
    this._config = { ...this._config, ...newConfig };
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  _populateEntitySelect() {
    const sel = this.shadowRoot.querySelector('select[name="vacuum_entity"]');
    if (!sel || !this._hass) return;
    const current = this._config.vacuum_entity || '';
    const vacuums = Object.keys(this._hass.states)
      .filter(id => id.startsWith('vacuum.'))
      .sort();
    sel.innerHTML = vacuums.map(id =>
      `<option value="${id}" ${id === current ? 'selected' : ''}>${id}</option>`
    ).join('');
    if (!vacuums.includes(current) && current) {
      sel.insertAdjacentHTML('afterbegin', `<option value="${current}" selected>${current}</option>`);
    }
  }

  _render() {
    const c = this._config;
    const isZone = c.type_ === 'zone';

    this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        :host { display: block; font-family: var(--primary-font-family, Roboto, sans-serif); }

        .editor { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }

        .field { display: flex; flex-direction: column; gap: 4px; }
        label { font-size: .8rem; font-weight: 500; color: var(--secondary-text-color); text-transform: uppercase; letter-spacing: .04em; }

        input[type=text], input[type=number], select {
          width: 100%; padding: 8px 10px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 6px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: .9rem;
          font-family: inherit;
          transition: border-color .15s;
        }
        input:focus, select:focus { outline: none; border-color: #009688; }

        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--secondary-background-color, #f5f5f5);
          padding: 10px 12px; border-radius: 8px;
        }
        .toggle-label { font-size: .9rem; color: var(--primary-text-color); }
        .toggle-sub  { font-size: .75rem; color: var(--secondary-text-color); margin-top: 2px; }

        /* pill toggle */
        .pill { position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer; flex-shrink: 0; }
        .pill input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; inset: 0; background: #ccc; border-radius: 24px;
          transition: background .2s;
        }
        .slider::before {
          content: ''; position: absolute;
          width: 18px; height: 18px; left: 3px; bottom: 3px;
          background: white; border-radius: 50%;
          transition: transform .2s;
        }
        input:checked + .slider { background: #009688; }
        input:checked + .slider::before { transform: translateX(20px); }

        .section-title {
          font-size: .75rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: .06em; color: #009688;
          border-bottom: 1px solid rgba(0,150,136,.2);
          padding-bottom: 4px;
        }

        .info-box {
          background: rgba(0,150,136,.07);
          border-left: 3px solid #009688;
          border-radius: 0 6px 6px 0;
          padding: 10px 12px;
          font-size: .82rem;
          color: var(--primary-text-color);
          line-height: 1.55;
        }
        .info-box strong { color: #009688; }
        .info-box code {
          font-family: monospace; font-size: .8rem;
          background: rgba(0,0,0,.06); padding: 1px 4px; border-radius: 3px;
        }
        .info-box ol { margin: 6px 0 0 16px; padding: 0; }
        .info-box li { margin-bottom: 3px; }
      </style>

      <div class="editor">

        <!-- Vacuum entity -->
        <div class="field">
          <label>Vacuum entity</label>
          <select name="vacuum_entity">
            <option value="${c.vacuum_entity || ''}">${c.vacuum_entity || 'Loading…'}</option>
          </select>
        </div>

        <!-- Name & Icon -->
        <div class="row">
          <div class="field">
            <label>Name</label>
            <input type="text" name="name" value="${c.name || ''}" placeholder="e.g. Kitchen">
          </div>
          <div class="field">
            <label>Icon</label>
            <input type="text" name="icon" value="${c.icon || 'mdi:robot-vacuum'}" placeholder="mdi:robot-vacuum">
          </div>
        </div>

        <!-- Command style -->
        <div class="field">
          <label>Command style</label>
          <select name="command_style">
            <option value="miot_9_9" ${(c.command_style || 'miot_9_9') === 'miot_9_9' ? 'selected' : ''}>MiOT siid:9 (recommended)</option>
            <option value="miio" ${c.command_style === 'miio' ? 'selected' : ''}>Miio send_command (legacy)</option>
          </select>
        </div>

        <!-- Type toggle -->
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Zone clean</div>
            <div class="toggle-sub">${isZone ? 'Cleans a rectangular area' : 'Sends vacuum to a single point'}</div>
          </div>
          <label class="pill">
            <input type="checkbox" name="type_toggle" ${isZone ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>

        <!-- Coordinates -->
        <div class="section-title">Coordinates</div>

        ${isZone ? `
          <div class="row">
            <div class="field"><label>X min</label><input type="number" name="x_min" value="${c.x_min ?? 0}" step="0.001"></div>
            <div class="field"><label>Y min</label><input type="number" name="y_min" value="${c.y_min ?? 0}" step="0.001"></div>
          </div>
          <div class="row">
            <div class="field"><label>X max</label><input type="number" name="x_max" value="${c.x_max ?? 0}" step="0.001"></div>
            <div class="field"><label>Y max</label><input type="number" name="y_max" value="${c.y_max ?? 0}" step="0.001"></div>
          </div>
        ` : `
          <div class="row">
            <div class="field"><label>X</label><input type="number" name="x" value="${c.x ?? 0}" step="0.001"></div>
            <div class="field"><label>Y</label><input type="number" name="y" value="${c.y ?? 0}" step="0.001"></div>
          </div>
        `}

        <!-- How to get coordinates -->
        <div class="info-box">
          <strong>How to find your coordinates</strong>
          <ol>
            <li>Open <strong>Developer Tools → Services</strong> in Home Assistant.</li>
            <li>Call <code>xiaomi_miot.call_action</code> with <code>siid: 6</code>, <code>aiid: 1</code> on your vacuum entity to start a short manual clean, then dock it — this builds the map.</li>
            <li>Go to your vacuum's entity page and look for the <strong>map</strong> attribute, or open the <strong>Xiaomi MiHome app</strong> and long-press a point on the map.</li>
            <li>For <em>go-to point</em>: note the single X/Y shown. For <em>zone</em>: drag a box in MiHome and note the two corner coordinates.</li>
            <li>Coordinates are in <strong>metres</strong>, relative to the vacuum's dock (negative values are valid).</li>
          </ol>
          <br>
          Alternatively, the <strong>xiaomi-static-map-card</strong> bundled with this integration shows a live map — tap a spot and check your browser console for the coordinate output.
        </div>

      </div>
    `;

    this._populateEntitySelect();
    this._attachListeners();
  }

  _attachListeners() {
    const root = this.shadowRoot;

    // Entity select
    root.querySelector('select[name="vacuum_entity"]')
      ?.addEventListener('change', e => this._fire({ vacuum_entity: e.target.value }));

    // Text inputs
    root.querySelector('input[name="name"]')
      ?.addEventListener('input', e => this._fire({ name: e.target.value }));

    root.querySelector('input[name="icon"]')
      ?.addEventListener('input', e => this._fire({ icon: e.target.value }));

    // Command style
    root.querySelector('select[name="command_style"]')
      ?.addEventListener('change', e => this._fire({ command_style: e.target.value }));

    // Type toggle
    root.querySelector('input[name="type_toggle"]')
      ?.addEventListener('change', e => {
        this._fire({ type_: e.target.checked ? 'zone' : 'point' });
        // Re-render so the coordinate fields swap
        this._render();
      });

    // Coordinate inputs — all numeric, fire on change
    for (const name of ['x', 'y', 'x_min', 'y_min', 'x_max', 'y_max']) {
      root.querySelector(`input[name="${name}"]`)
        ?.addEventListener('change', e => {
          this._fire({ [name]: parseFloat(e.target.value) || 0 });
        });
    }
  }
}

if (!customElements.get('xiaomi-vacuum-custom-card-editor'))
  customElements.define('xiaomi-vacuum-custom-card-editor', XiaomiVacuumCustomCardEditor);


// ── Register all in the card picker ──────────────────────────────────────────

window.customCards = window.customCards || [];
[
  { type: "xiaomi-vacuum-corridor-card",   name: "Vacuum → Corridor",    description: "Send vacuum to the corridor" },
  { type: "xiaomi-vacuum-kitchen-card",    name: "Vacuum → Kitchen",     description: "Zone clean the kitchen" },
  { type: "xiaomi-vacuum-livingroom-card", name: "Vacuum → Living Room", description: "Zone clean the living room" },
  { type: "xiaomi-vacuum-emaspc-card",     name: "Vacuum → Ema's PC",    description: "Send vacuum to Ema's PC area" },
  { type: "xiaomi-vacuum-custom-card",     name: "Vacuum → Custom",      description: "Configurable vacuum shortcut with visual editor", preview: true },
].forEach(c => { if (!window.customCards.find(x => x.type === c.type)) window.customCards.push(c); });