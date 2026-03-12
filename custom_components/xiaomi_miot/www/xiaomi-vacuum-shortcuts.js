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
 *   xiaomi-vacuum-zone-list-card  — dropdown selector for multiple locations
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
    this._confirmTimer = null;
    this._startX = 0;
    this._startY = 0;
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

  // ── Improved Hold detection (scroll-safe) ───────────────────────────────────

  _onPointerDown(e) {
    this._holdTriggered = false;
    this._startX = e.touches ? e.touches[0].clientX : e.clientX;
    this._startY = e.touches ? e.touches[0].clientY : e.clientY;

    this._holdTimer = setTimeout(() => {
      this._holdTriggered = true;
      this._send();
      this._flashFeedback('sent');
    }, 650); // slightly longer = safer for scrolling
  }

  _onPointerMove(e) {
    if (!this._holdTimer) return;

    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    const diffX = Math.abs(x - this._startX);
    const diffY = Math.abs(y - this._startY);

    // If user moved more than ~12 px → it's scrolling, cancel hold
    if (diffX > 12 || diffY > 12) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
  }

  _onPointerUp() {
    clearTimeout(this._holdTimer);
    this._holdTimer = null;

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
        }, 2800);
      }
    }
    this._holdTriggered = false;
  }

  _onPointerCancel() {
    clearTimeout(this._holdTimer);
    this._holdTimer = null;
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
    card.addEventListener('mousemove',   (e) => this._onPointerMove(e));
    card.addEventListener('touchmove',   (e) => this._onPointerMove(e), { passive: true });
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


// ── Custom configurable shortcut card ─────────────────────────────────────────

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

  static getConfigElement() {
    return document.createElement("xiaomi-vacuum-custom-card-editor");
  }
}

if (!customElements.get('xiaomi-vacuum-custom-card'))
  customElements.define('xiaomi-vacuum-custom-card', XiaomiVacuumCustomCard);


// ── Visual editor for custom card ─────────────────────────────────────────────

class XiaomiVacuumCustomCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot.querySelector('select[name="vacuum_entity"]')) {
      this._populateEntitySelect();
    }
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

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

        <div class="field">
          <label>Vacuum entity</label>
          <select name="vacuum_entity">
            <option value="${c.vacuum_entity || ''}">${c.vacuum_entity || 'Loading…'}</option>
          </select>
        </div>

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

        <div class="field">
          <label>Command style</label>
          <select name="command_style">
            <option value="miot_9_9" ${(c.command_style || 'miot_9_9') === 'miot_9_9' ? 'selected' : ''}>MiOT siid:9 (recommended)</option>
            <option value="miio" ${c.command_style === 'miio' ? 'selected' : ''}>Miio send_command (legacy)</option>
          </select>
        </div>

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
          Alternatively, use the <strong>xiaomi-static-map-card</strong> — tap a spot and check the inspector output.
        </div>

      </div>
    `;

    this._populateEntitySelect();
    this._attachListeners();
  }

  _attachListeners() {
    const root = this.shadowRoot;

    root.querySelector('select[name="vacuum_entity"]')
      ?.addEventListener('change', e => this._fire({ vacuum_entity: e.target.value }));

    root.querySelector('input[name="name"]')
      ?.addEventListener('input', e => this._fire({ name: e.target.value }));

    root.querySelector('input[name="icon"]')
      ?.addEventListener('input', e => this._fire({ icon: e.target.value }));

    root.querySelector('select[name="command_style"]')
      ?.addEventListener('change', e => this._fire({ command_style: e.target.value }));

    root.querySelector('input[name="type_toggle"]')
      ?.addEventListener('change', e => {
        this._fire({ type_: e.target.checked ? 'zone' : 'point' });
        this._render();
      });

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


// ──────────────────────────────────────────────────────────────────────────────
// xiaomi-vacuum-zone-list-card (dropdown selector version)
// ──────────────────────────────────────────────────────────────────────────────

const ZONE_LIST_STYLES = `
  ha-card {
    padding: 16px;
    border-radius: 16px;
    overflow: hidden;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .header-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    background: rgba(0,150,136,.12);
    color: #009688;
    transition: all .3s;
  }
  .header-icon.busy {
    animation: pulse 1.5s infinite;
    background: rgba(255,193,7,.2);
    color: #ffc107;
  }
  .header-info {
    flex: 1;
  }
  .header-name {
    font-size: 1.1rem;
    font-weight: 600;
  }
  .header-status {
    font-size: .9rem;
    color: var(--secondary-text-color);
  }
  .header-status.busy {
    color: #ffc107;
    font-weight: 500;
  }
  .zone-select {
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    font-size: 1rem;
    margin-bottom: 16px;
  }
  .empty {
    text-align: center;
    color: var(--secondary-text-color);
    padding: 20px 0;
    font-style: italic;
  }
  .btn-row {
    display: flex;
    gap: 12px;
  }
  .btn {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all .2s;
  }
  .btn-clean {
    background: #009688;
    color: white;
  }
  .btn-clean:hover {
    background: #00796b;
  }
  .btn-stop {
    background: #d32f2f;
    color: white;
  }
  .btn-stop:hover {
    background: #b71c1c;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .flashing {
    animation: flash 0.5s;
  }
  @keyframes flash {
    0%,100% { opacity:1; }
    50% { opacity:0.4; }
  }
`;

class XiaomiVacuumZoneListCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  getCardSize() { return 2; }

  _isBusy() {
    const state = this._hass?.states[this._config.vacuum_entity]?.state;
    return state && !['idle','docked','error','returning','paused'].includes(state);
  }

  _statusLabel() {
    const state = this._hass?.states[this._config.vacuum_entity]?.state || 'unknown';
    return state.charAt(0).toUpperCase() + state.slice(1);
  }

  _sendEntry(entry) {
    const cfg = this._config;
    if (!cfg.vacuum_entity || !this._hass) return;

    if (entry.type_ === 'point') {
      const p = `${parseFloat(entry.x).toFixed(3)},${parseFloat(entry.y).toFixed(3)}`;
      if (cfg.command_style === 'miot_9_9') {
        this._hass.callService('xiaomi_miot', 'call_action', {
          entity_id: cfg.vacuum_entity, siid: 9, aiid: 9, params: [p],
        });
      } else {
        this._hass.callService('vacuum', 'send_command', {
          entity_id: cfg.vacuum_entity,
          command: 'app_goto_target',
          params: [parseFloat(entry.x), parseFloat(entry.y)],
        });
      }
    } else {
      const xMin = Math.min(entry.x_min, entry.x_max).toFixed(3);
      const xMax = Math.max(entry.x_min, entry.x_max).toFixed(3);
      const yMin = Math.min(entry.y_min, entry.y_max).toFixed(3);
      const yMax = Math.max(entry.y_min, entry.y_max).toFixed(3);

      if (cfg.command_style === 'miot_9_9') {
        const eight = `${xMin},${yMin},${xMin},${yMax},${xMax},${yMax},${xMax},${yMin}`;
        this._hass.callService('xiaomi_miot', 'call_action', {
          entity_id: cfg.vacuum_entity, siid: 9, aiid: 8, params: [eight],
        });
        setTimeout(() => {
          this._hass.callService('xiaomi_miot', 'call_action', {
            entity_id: cfg.vacuum_entity, siid: 9, aiid: 3, params: [],
          });
        }, 500);
      } else {
        this._hass.callService('vacuum', 'send_command', {
          entity_id: cfg.vacuum_entity,
          command: 'app_zoned_clean',
          params: [[parseFloat(xMin), parseFloat(yMin), parseFloat(xMax), parseFloat(yMax), 1]],
        });
      }
    }
  }

  _sendStop() {
    if (!this._config.vacuum_entity || !this._hass) return;
    this._hass.callService('vacuum', 'return_to_base', {
      entity_id: this._config.vacuum_entity,
    });
  }

  static _iconForName(name) {
    if (!name) return 'mdi:robot-vacuum';
    const n = name.toLowerCase();
    const MAP = [
      [['kitchen', 'cook'],                     'mdi:silverware-fork-knife'],
      [['living', 'lounge', 'sitting'],          'mdi:sofa'],
      [['bedroom', 'bed', 'master'],             'mdi:bed'],
      [['bathroom', 'bath', 'shower', 'toilet'], 'mdi:shower'],
      [['corridor', 'hallway', 'hall', 'entry', 'entryway'], 'mdi:door-open'],
      [['office', 'study', 'desk'],              'mdi:desk'],
      [['dining', 'dinner'],                     'mdi:table-chair'],
      [['garage'],                               'mdi:garage'],
      [['laundry', 'utility'],                   'mdi:washing-machine'],
      [['balcony', 'terrace', 'patio'],          'mdi:flower'],
      [['stairs', 'staircase'],                  'mdi:stairs'],
      [['garden', 'yard', 'outdoor'],            'mdi:tree'],
      [['pc', 'computer', 'gaming', 'monitor'],  'mdi:monitor'],
      [['tv', 'television', 'media'],            'mdi:television'],
      [['couch', 'sofa'],                        'mdi:sofa'],
      [['dog', 'pet', 'cat'],                    'mdi:paw'],
      [['baby', 'nursery', 'kids', 'child'],     'mdi:baby-carriage'],
      [['gym', 'workout', 'fitness'],            'mdi:dumbbell'],
      [['wardrobe', 'closet', 'dressing'],       'mdi:hanger'],
    ];
    for (const [keywords, icon] of MAP) {
      if (keywords.some(k => n.includes(k))) return icon;
    }
    return 'mdi:robot-vacuum';
  }

  _syncState() {
    const busy = this._isBusy();
    const root = this.shadowRoot;

    const iconEl = root.querySelector('.header-icon');
    if (iconEl) iconEl.className = `header-icon ${busy ? 'busy' : 'idle'}`;

    const statusEl = root.querySelector('.header-status');
    if (statusEl) {
      statusEl.textContent = this._statusLabel();
      statusEl.className = `header-status ${busy ? 'busy' : ''}`;
    }

    const cleanBtn = root.querySelector('#btn-action');
    const stopBtn  = root.querySelector('.btn-stop');
    const sel      = root.querySelector('.zone-select');

    if (cleanBtn) cleanBtn.disabled = busy || !(this._config.zones?.length);
    if (stopBtn)  stopBtn.disabled  = !busy;
    if (sel)      sel.disabled      = busy;
  }

  _updateHeaderIcon(idx) {
    const entry = (this._config.zones || [])[idx];
    const haIconEl = this.shadowRoot.querySelector('.header-icon ha-icon');
    if (haIconEl) haIconEl.setAttribute('icon', XiaomiVacuumZoneListCard._iconForName(entry?.name));
  }

  _render() {
    const cfg   = this._config;
    const zones = cfg.zones || [];
    const busy  = this._isBusy();

    const firstEntry  = zones[0];
    const headerIcon  = XiaomiVacuumZoneListCard._iconForName(firstEntry?.name);
    const actionIcon  = firstEntry?.type_ === 'point' ? 'mdi:map-marker' : 'mdi:vacuum';
    const actionLabel = firstEntry?.type_ === 'point' ? 'Go' : 'Clean';

    this.shadowRoot.innerHTML = `
      <style>${ZONE_LIST_STYLES}</style>
      <ha-card>

        <div class="header">
          <div class="header-icon ${busy ? 'busy' : 'idle'}">
            <ha-icon icon="${headerIcon}"></ha-icon>
          </div>
          <div class="header-info">
            <div class="header-name">${cfg.name || 'Send To'}</div>
            <div class="header-status ${busy ? 'busy' : ''}">${this._statusLabel()}</div>
          </div>
        </div>

        ${zones.length
          ? `<select class="zone-select" ${busy ? 'disabled' : ''}>
               ${zones.map((z, i) => `<option value="${i}">${z.name || `Entry ${i + 1}`}</option>`).join('')}
             </select>`
          : `<div class="empty">No entries configured — open the card editor to add some.</div>`
        }

        <div class="btn-row">
          <button class="btn btn-clean" id="btn-action" ${busy || !zones.length ? 'disabled' : ''}>
            <ha-icon icon="${actionIcon}"></ha-icon>
            ${actionLabel}
          </button>
          <button class="btn btn-stop" ${!busy ? 'disabled' : ''}>
            <ha-icon icon="mdi:home-map-marker"></ha-icon>
            Return
          </button>
        </div>

      </ha-card>
    `;

    this._attachListeners();
  }

  _attachListeners() {
    const root  = this.shadowRoot;
    const zones = this._config.zones || [];

    const updateForIdx = (idx) => {
      const entry = zones[idx];
      if (!entry) return;
      const btn = root.querySelector('#btn-action');
      if (btn) {
        const isPoint = entry.type_ === 'point';
        btn.innerHTML = `<ha-icon icon="${isPoint ? 'mdi:map-marker' : 'mdi:vacuum'}"></ha-icon>${isPoint ? 'Go' : 'Clean'}`;
      }
      const haIconEl = root.querySelector('.header-icon ha-icon');
      if (haIconEl) haIconEl.setAttribute('icon', XiaomiVacuumZoneListCard._iconForName(entry.name));
    };

    root.querySelector('.zone-select')?.addEventListener('change', e => {
      updateForIdx(parseInt(e.target.value));
    });

    root.querySelector('#btn-action')?.addEventListener('click', () => {
      const sel   = root.querySelector('.zone-select');
      const idx   = sel ? parseInt(sel.value) : 0;
      const entry = zones[idx];
      if (!entry) return;
      this._sendEntry(entry);
      const btn = root.querySelector('#btn-action');
      btn.classList.add('flashing');
      setTimeout(() => btn.classList.remove('flashing'), 500);
    });

    root.querySelector('.btn-stop')?.addEventListener('click', () => {
      this._sendStop();
    });
  }
}

if (!customElements.get('xiaomi-vacuum-zone-list-card'))
  customElements.define('xiaomi-vacuum-zone-list-card', XiaomiVacuumZoneListCard);


// ── Zone list card editor ─────────────────────────────────────────────────────

class XiaomiVacuumZoneListCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass   = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot.querySelector('select[name="vacuum_entity"]'))
      this._populateEntitySelect();
  }

  setConfig(config) {
    this._config = { ...config, zones: [...(config.zones || [])] };
    this._render();
  }

  _fire(patch) {
    this._config = { ...this._config, ...patch };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true, composed: true,
    }));
  }

  _populateEntitySelect() {
    const sel = this.shadowRoot.querySelector('select[name="vacuum_entity"]');
    if (!sel || !this._hass) return;
    const current = this._config.vacuum_entity || '';
    const vacuums = Object.keys(this._hass.states).filter(id => id.startsWith('vacuum.')).sort();
    sel.innerHTML = vacuums.map(id =>
      `<option value="${id}" ${id === current ? 'selected' : ''}>${id}</option>`
    ).join('');
    if (!vacuums.includes(current) && current)
      sel.insertAdjacentHTML('afterbegin', `<option value="${current}" selected>${current}</option>`);
  }

  _render() {
    const c       = this._config;
    const entries = c.zones || [];

    this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; }
        :host { display: block; font-family: var(--primary-font-family, Roboto, sans-serif); }

        .editor { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }

        .field { display: flex; flex-direction: column; gap: 4px; }
        label {
          font-size: .8rem; font-weight: 500;
          color: var(--secondary-text-color);
          text-transform: uppercase; letter-spacing: .04em;
        }
        input[type=text], input[type=number], select {
          width: 100%; padding: 8px 10px;
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 6px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: .9rem; font-family: inherit;
          transition: border-color .15s;
        }
        input:focus, select:focus { outline: none; border-color: #009688; }

        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .section-title {
          font-size: .75rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: .06em; color: #009688;
          border-bottom: 1px solid rgba(0,150,136,.2);
          padding-bottom: 4px;
        }

        .entry-list { display: flex; flex-direction: column; gap: 10px; }

        .entry-card {
          border-radius: 10px;
          padding: 12px;
          display: flex; flex-direction: column; gap: 10px;
          position: relative;
        }
        .entry-card.type-zone  { background: rgba(0,150,136,.07); border: 1px solid rgba(0,150,136,.2); }
        .entry-card.type-point { background: rgba(103,58,183,.06); border: 1px solid rgba(103,58,183,.2); }

        .entry-header {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
        }
        .entry-title {
          font-size: .85rem; font-weight: 600; color: var(--primary-text-color);
          display: flex; align-items: center; gap: 6px;
        }
        .type-badge {
          font-size: .7rem; font-weight: 600; padding: 2px 7px;
          border-radius: 20px; text-transform: uppercase; letter-spacing: .04em;
        }
        .type-badge.zone  { background: rgba(0,150,136,.15); color: #009688; }
        .type-badge.point { background: rgba(103,58,183,.12); color: #7c4dff; }

        .entry-remove {
          background: none; border: none; cursor: pointer; padding: 2px 4px;
          color: var(--secondary-text-color); border-radius: 4px;
          transition: color .15s, background .15s;
          display: flex; align-items: center;
        }
        .entry-remove:hover { color: #e53935; background: rgba(229,57,53,.08); }
        .entry-remove ha-icon { --mdc-icon-size: 16px; }

        .type-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 0;
        }
        .type-toggle-label { font-size: .82rem; color: var(--primary-text-color); }
        .pill { position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer; flex-shrink: 0; }
        .pill input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; inset: 0; background: #009688; border-radius: 24px;
          transition: background .2s;
        }
        .slider::before {
          content: ''; position: absolute;
          width: 18px; height: 18px; left: 3px; bottom: 3px;
          background: white; border-radius: 50%;
          transition: transform .2s;
        }
        input:checked + .slider { background: #7c4dff; }
        input:checked + .slider::before { transform: translateX(20px); }

        .add-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        }
        .btn-add {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px;
          border: 2px dashed rgba(0,150,136,.4);
          border-radius: 10px;
          background: none;
          color: #009688;
          font-size: .85rem; font-weight: 500; font-family: inherit;
          cursor: pointer;
          transition: border-color .15s, background .15s;
          width: 100%;
        }
        .btn-add:hover { border-color: #009688; background: rgba(0,150,136,.05); }
        .btn-add.point-add { border-color: rgba(103,58,183,.3); color: #7c4dff; }
        .btn-add.point-add:hover { border-color: #7c4dff; background: rgba(103,58,183,.05); }
        .btn-add ha-icon { --mdc-icon-size: 17px; }

        .info-box {
          background: rgba(0,150,136,.07);
          border-left: 3px solid #009688;
          border-radius: 0 6px 6px 0;
          padding: 10px 12px;
          font-size: .82rem; color: var(--primary-text-color); line-height: 1.55;
        }
        .info-box strong { color: #009688; }
        .info-box ol { margin: 6px 0 0 16px; padding: 0; }
        .info-box li { margin-bottom: 3px; }
      </style>

      <div class="editor">

        <div class="field">
          <label>Vacuum entity</label>
          <select name="vacuum_entity">
            <option value="${c.vacuum_entity || ''}">${c.vacuum_entity || 'Loading…'}</option>
          </select>
        </div>

        <div class="row2">
          <div class="field">
            <label>Card name</label>
            <input type="text" name="name" value="${c.name || ''}" placeholder="Vacuum Shortcuts">
          </div>
          <div class="field">
            <label>Command style</label>
            <select name="command_style">
              <option value="miot_9_9" ${(c.command_style || 'miot_9_9') === 'miot_9_9' ? 'selected' : ''}>MiOT siid:9</option>
              <option value="miio"     ${c.command_style === 'miio' ? 'selected' : ''}>Miio (legacy)</option>
            </select>
          </div>
        </div>

        <div class="section-title">Locations</div>

        <div class="entry-list">
          ${entries.map((z, i) => {
            const isPoint = z.type_ === 'point';
            return `
              <div class="entry-card ${isPoint ? 'type-point' : 'type-zone'}" data-idx="${i}">
                <div class="entry-header">
                  <span class="entry-title">
                    <span class="type-badge ${isPoint ? 'point' : 'zone'}">${isPoint ? '📍 Point' : '⬜ Zone'}</span>
                    ${z.name || `Entry ${i + 1}`}
                  </span>
                  <button class="entry-remove" data-remove="${i}" title="Remove">
                    <ha-icon icon="mdi:close"></ha-icon>
                  </button>
                </div>

                <div class="field">
                  <label>Name</label>
                  <input type="text" name="entry_name_${i}" value="${z.name || ''}" placeholder="${isPoint ? 'e.g. Corridor' : 'e.g. Kitchen'}">
                </div>

                <div class="type-toggle-row">
                  <span class="type-toggle-label">${isPoint ? 'Go-to point' : 'Zone clean'}</span>
                  <label class="pill">
                    <input type="checkbox" name="entry_type_${i}" ${isPoint ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>

                ${isPoint ? `
                  <div class="row2">
                    <div class="field"><label>X</label><input type="number" name="entry_x_${i}"    value="${z.x    ?? 0}" step="0.001"></div>
                    <div class="field"><label>Y</label><input type="number" name="entry_y_${i}"    value="${z.y    ?? 0}" step="0.001"></div>
                  </div>
                ` : `
                  <div class="row2">
                    <div class="field"><label>X min</label><input type="number" name="entry_xmin_${i}" value="${z.x_min ?? 0}" step="0.001"></div>
                    <div class="field"><label>Y min</label><input type="number" name="entry_ymin_${i}" value="${z.y_min ?? 0}" step="0.001"></div>
                  </div>
                  <div class="row2">
                    <div class="field"><label>X max</label><input type="number" name="entry_xmax_${i}" value="${z.x_max ?? 0}" step="0.001"></div>
                    <div class="field"><label>Y max</label><input type="number" name="entry_ymax_${i}" value="${z.y_max ?? 0}" step="0.001"></div>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>

        <div class="add-row">
          <button class="btn-add" id="btn-add-zone">
            <ha-icon icon="mdi:plus"></ha-icon> Add zone
          </button>
          <button class="btn-add point-add" id="btn-add-point">
            <ha-icon icon="mdi:map-marker-plus"></ha-icon> Add point
          </button>
        </div>

        <div class="info-box">
          <strong>Finding coordinates</strong>
          <ol>
            <li>Run a short clean so the vacuum builds its map.</li>
            <li>For <strong>zones</strong>: draw a rectangle in the MiHome app — it shows both corners.</li>
            <li>For <strong>points</strong>: tap a spot in MiHome to get the X/Y coordinate.</li>
            <li>Coordinates are in <strong>metres</strong> relative to the dock. Negatives are normal.</li>
          </ol>
        </div>

      </div>
    `;

    this._populateEntitySelect();
    this._attachListeners();
  }

  _readEntries() {
    const entries = [];
    this.shadowRoot.querySelectorAll('.entry-card').forEach((el, i) => {
      const isPoint = el.querySelector(`[name="entry_type_${i}"]`)?.checked;
      const base = {
        name:  el.querySelector(`[name="entry_name_${i}"]`)?.value || `Entry ${i + 1}`,
        type_: isPoint ? 'point' : 'zone',
      };
      if (isPoint) {
        base.x = parseFloat(el.querySelector(`[name="entry_x_${i}"]`)?.value || 0);
        base.y = parseFloat(el.querySelector(`[name="entry_y_${i}"]`)?.value || 0);
      } else {
        base.x_min = parseFloat(el.querySelector(`[name="entry_xmin_${i}"]`)?.value || 0);
        base.y_min = parseFloat(el.querySelector(`[name="entry_ymin_${i}"]`)?.value || 0);
        base.x_max = parseFloat(el.querySelector(`[name="entry_xmax_${i}"]`)?.value || 0);
        base.y_max = parseFloat(el.querySelector(`[name="entry_ymax_${i}"]`)?.value || 0);
      }
      entries.push(base);
    });
    return entries;
  }

  _attachListeners() {
    const root = this.shadowRoot;

    root.querySelector('select[name="vacuum_entity"]')
      ?.addEventListener('change', e => this._fire({ vacuum_entity: e.target.value }));

    root.querySelector('input[name="name"]')
      ?.addEventListener('input', e => this._fire({ name: e.target.value }));

    root.querySelector('select[name="command_style"]')
      ?.addEventListener('change', e => this._fire({ command_style: e.target.value }));

    root.querySelector('.entry-list')?.addEventListener('change', e => {
      if (e.target.type === 'checkbox') {
        this._fire({ zones: this._readEntries() });
        this._render();
        return;
      }
      this._fire({ zones: this._readEntries() });
    });
    root.querySelector('.entry-list')?.addEventListener('input', e => {
      if (e.target.type === 'text') this._fire({ zones: this._readEntries() });
    });

    root.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.remove);
        const zones = [...(this._config.zones || [])];
        zones.splice(idx, 1);
        this._fire({ zones });
        this._render();
      });
    });

    root.querySelector('#btn-add-zone')?.addEventListener('click', () => {
      const zones = [...(this._config.zones || [])];
      zones.push({ name: '', type_: 'zone', x_min: 0, y_min: 0, x_max: 0, y_max: 0 });
      this._fire({ zones });
      this._render();
    });

    root.querySelector('#btn-add-point')?.addEventListener('click', () => {
      const zones = [...(this._config.zones || [])];
      zones.push({ name: '', type_: 'point', x: 0, y: 0 });
      this._fire({ zones });
      this._render();
    });
  }
}

if (!customElements.get('xiaomi-vacuum-zone-list-card-editor'))
  customElements.define('xiaomi-vacuum-zone-list-card-editor', XiaomiVacuumZoneListCardEditor);

// Register cards in Lovelace card picker
window.customCards = window.customCards || [];
[
  { type: "xiaomi-vacuum-shortcut-card",      name: "Vacuum Shortcut (base)",         description: "Base class - not for direct use" },
  { type: "xiaomi-vacuum-corridor-card",      name: "Vacuum Corridor Shortcut",      description: "Go to corridor point" },
  { type: "xiaomi-vacuum-kitchen-card",       name: "Vacuum Kitchen Shortcut",       description: "Clean kitchen zone" },
  { type: "xiaomi-vacuum-livingroom-card",    name: "Vacuum Living Room Shortcut",   description: "Clean living room zone" },
  { type: "xiaomi-vacuum-emaspc-card",        name: "Vacuum Ema's PC Shortcut",      description: "Go to Ema's PC point" },
  { type: "xiaomi-vacuum-custom-card",        name: "Vacuum Custom Shortcut",        description: "Configurable go-to or zone shortcut" },
  { type: "xiaomi-vacuum-zone-list-card",     name: "Vacuum Location List",          description: "Dropdown selector for zone cleans and go-to points, with Return button", preview: true },
].forEach(card => {
  if (!window.customCards.find(c => c.type === card.type))
    window.customCards.push(card);
});