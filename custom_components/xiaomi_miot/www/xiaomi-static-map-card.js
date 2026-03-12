import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit@2.4.0/index.js?module";

// ── Editor (unchanged) ────────────────────────────────────────────────────────

class XiaomiStaticMapCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, config: {}, _mode: { state: true }, _tempScaleStart: { state: true } };
  }
  setConfig(c) { this.config = c; }
  render() {
    if (!this.hass || !this.config) return html``;
    const {
      image, x_sensor, y_sensor, rotation_sensor, dock={x:50,y:50},
      ref_vector={x:0,y:0}, map_exit_angle=90, enable_mirror=false,
      scale_width_percent_per_meter=0, manual_offset_x=0, manual_offset_y=0,
      scale_mult_x=1.0, scale_mult_y=1.0, command_style="standard",
      icon_rotation_offset=0, icon_scale=10, name=""
    } = this.config;
    const xState = this.hass.states[x_sensor];
    const yState = this.hass.states[y_sensor];
    const rawX = xState ? parseFloat(xState.state) : 0;
    const rawY = yState ? parseFloat(yState.state) : 0;
    return html`
      <div class="card-config">
        <ha-textfield label="Card name (optional)" .value="${name || ''}" .configValue="${"name"}" @input="${this._val}"></ha-textfield>
        <ha-textfield label="Image URL" .value="${image || ''}" .configValue="${"image"}" @input="${this._val}"></ha-textfield>
        <ha-selector label="Vacuum" .hass="${this.hass}" .selector="${{entity:{domain:"vacuum"}}}" .value="${this.config.vacuum_entity}" .configValue="${"vacuum_entity"}" @value-changed="${this._val}"></ha-selector>
        <div class="row">
          <ha-selector label="X" .hass="${this.hass}" .selector="${{entity:{domain:["sensor","input_number"]}}}" .value="${x_sensor}" .configValue="${"x_sensor"}" @value-changed="${this._val}"></ha-selector>
          <ha-selector label="Y" .hass="${this.hass}" .selector="${{entity:{domain:["sensor","input_number"]}}}" .value="${y_sensor}" .configValue="${"y_sensor"}" @value-changed="${this._val}"></ha-selector>
        </div>
        <ha-selector label="Rotation Sensor" .hass="${this.hass}" .selector="${{entity:{domain:["sensor","input_number"]}}}" .value="${rotation_sensor}" .configValue="${"rotation_sensor"}" @value-changed="${this._val}"></ha-selector>
        <div class="sec"><b>1. Command Protocol</b><br>
          <select @change="${(e)=>this._save({command_style: e.target.value})}">
            <option value="standard" ?selected=${command_style==='standard'}>Standard</option>
            <option value="miot_9_9" ?selected=${command_style==='miot_9_9'}>Xiaomi MIOT (Actions 9 & 3)</option>
          </select>
        </div>
        <div class="sec"><b>2. Setup Steps</b><br>
          <div class="row">
            <button @click="${()=>this._mode='scale_start'}">1. Scale</button>
            <button @click="${()=>this._mode='dock'}">2. Dock</button>
            <button class="blue" @click="${() => this._captureRef(rawX, rawY)}">3. Capture</button>
          </div>
          <div style="margin-top:10px;">Exit Dir:
            <select @change="${(e)=>this._save({map_exit_angle: parseFloat(e.target.value)})}">
              <option value="0" ?selected=${map_exit_angle==0}>Right</option>
              <option value="90" ?selected=${map_exit_angle==90}>Down</option>
              <option value="180" ?selected=${map_exit_angle==180}>Left</option>
              <option value="270" ?selected=${map_exit_angle==270}>Up</option>
            </select>
            <label style="margin-left:10px"><input type="checkbox" ?checked=${enable_mirror} @change="${(e)=>this._save({enable_mirror:e.target.checked})}"> Mirror</label>
          </div>
        </div>
        <div class="sec"><b>3. Tuning</b><br>
          <div class="row">
            <ha-textfield label="X Off" type="number" step="0.5" .value="${manual_offset_x}" .configValue="${"manual_offset_x"}" @input="${this._val}"></ha-textfield>
            <ha-textfield label="Y Off" type="number" step="0.5" .value="${manual_offset_y}" .configValue="${"manual_offset_y"}" @input="${this._val}"></ha-textfield>
          </div>
          <div class="row">
            <ha-textfield label="X Str" type="number" step="0.01" .value="${scale_mult_x}" .configValue="${"scale_mult_x"}" @input="${this._val}"></ha-textfield>
            <ha-textfield label="Y Str" type="number" step="0.01" .value="${scale_mult_y}" .configValue="${"scale_mult_y"}" @input="${this._val}"></ha-textfield>
          </div>
          <div class="row" style="margin-top:10px">
            <ha-textfield label="Icon Rotation" type="number" step="90" .value="${icon_rotation_offset}" .configValue="${"icon_rotation_offset"}" @input="${this._val}"></ha-textfield>
            <ha-textfield label="Icon Scale (%)" type="number" step="0.5" .value="${icon_scale}" .configValue="${"icon_scale"}" @input="${this._val}"></ha-textfield>
          </div>
        </div>
        <div class="map-wrap" @click="${(e) => this._handleMapClick(e)}">
          <img id="conf-img" src="${image}" @load="${(e) => this._onImgLoad(e)}">
          <div class="marker dock" style="left:${dock.x}%;top:${dock.y}%;">🏠</div>
          ${this._mode ? html`<div class="helper">CLICK MAP</div>` : ''}
        </div>
      </div>
    `;
  }
  _val(e) { this._save({[e.target.configValue]: e.detail?.value ?? e.target.value}); }
  _save(o) { this.config={...this.config,...o}; this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this.config},bubbles:true,composed:true})); }
  _onImgLoad(e) { const img=e.target; if(img.naturalHeight>0){const ratio=img.naturalWidth/img.naturalHeight; this._save({aspect_ratio:ratio});} }
  _captureRef(x,y) { this._save({ref_vector:{x,y}}); }
  _handleMapClick(e) {
    const rect=e.currentTarget.getBoundingClientRect();
    const ix=((e.clientX-rect.left)/rect.width)*100;
    const iy=((e.clientY-rect.top)/rect.height)*100;
    if(this._mode==='dock'){this._save({dock:{x:ix,y:iy}});this._mode='';}
    else if(this._mode==='scale_start'){this._tempScaleStart={x:ix,y:iy};this._mode='scale_end';}
    else if(this._mode==='scale_end'){
      const start=this._tempScaleStart; const end={x:ix,y:iy};
      const ratio=this.config.aspect_ratio||1;
      const dx=end.x-start.x; const dy=(end.y-start.y)*ratio;
      const dist=Math.sqrt(dx*dx+dy*dy);
      const meters=prompt("Meters?","1.0");
      if(meters&&!isNaN(meters)){this._save({scale_width_percent_per_meter:dist/parseFloat(meters)});}
      this._mode='';
    }
  }
  static get styles() {
    return css`
      .card-config{display:flex;flex-direction:column;gap:10px}
      .row{display:flex;gap:5px}
      .sec{background:var(--secondary-background-color);padding:10px;border-radius:5px}
      button{background:var(--primary-color);color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;width:100%}
      .blue{background:#2196F3}
      .map-wrap{position:relative;border:2px solid blue;cursor:crosshair;margin-top:10px}
      img{width:100%;display:block}
      .marker{position:absolute;transform:translate(-50%,-50%);pointer-events:none}
      .helper{position:absolute;top:5px;left:5px;background:rgba(0,0,0,0.7);color:white;padding:2px}
      select{padding:5px;width:100%}
      ha-textfield{width:100%}
    `;
  }
}

// ── Main Card ─────────────────────────────────────────────────────────────────

class XiaomiStaticMapCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _mode:          { state: true },
      _click1:        { state: true },
      _click2:        { state: true },
      _popupOpen:     { state: true },
      _inspecting:    { state: true },
      _inspectResult: { state: true },
      _holdTriggered: { state: true },
    };
  }

  constructor() {
    super();
    this._mode = 'view';
    this._click1 = null;
    this._click2 = null;
    this._popupOpen = false;
    this._holdTimer = null;
    this._holdTriggered = false;
    this._startX = 0;
    this._startY = 0;
    this._inspecting = false;
    this._inspectResult = null;
  }

  static getConfigElement() { return document.createElement("xiaomi-static-map-card-editor"); }

  static getStubConfig() {
    return {
      image: "/local/floorplan.png",
      vacuum_entity: "", x_sensor: "", y_sensor: "", rotation_sensor: "",
      scale_width_percent_per_meter: 0, aspect_ratio: 1,
      dock: { x: 50, y: 50 }, ref_vector: { x: 0, y: 0 },
      map_exit_angle: 90, enable_mirror: false,
      manual_offset_x: 0, manual_offset_y: 0,
      scale_mult_x: 1.0, scale_mult_y: 1.0,
      icon_rotation_offset: 0, icon_scale: 10,
      command_style: "miot_9_9", name: ""
    };
  }

  setConfig(config) {
    if (!config.image) throw new Error("Please define an image.");
    this.config = config;
  }

  getCardSize() { return 1; }

  // ── Math helpers ─────────────────────────────────────────────────────────────

  getDeltaAngle() {
    const { ref_vector={x:0,y:0}, map_exit_angle=90 } = this.config;
    let sensor_angle = 0;
    if (ref_vector.x !== 0 || ref_vector.y !== 0)
      sensor_angle = Math.atan2(ref_vector.y, ref_vector.x);
    return (map_exit_angle * Math.PI / 180) - sensor_angle;
  }

  calculateRobotPosition(rawX, rawY) {
    const { scale_width_percent_per_meter=0, aspect_ratio=1, dock={x:50,y:50},
            enable_mirror=false, manual_offset_x=0, manual_offset_y=0,
            scale_mult_x=1.0, scale_mult_y=1.0 } = this.config;
    const delta = this.getDeltaAngle();
    const sin = Math.sin(delta), cos = Math.cos(delta);
    let wx = enable_mirror ? -rawX : rawX;
    const rx = wx*cos - rawY*sin, ry = wx*sin + rawY*cos;
    return {
      left: (dock.x||50) + rx*scale_width_percent_per_meter*parseFloat(scale_mult_x) + parseFloat(manual_offset_x),
      top:  (dock.y||50) + ry*(scale_width_percent_per_meter*aspect_ratio)*parseFloat(scale_mult_y) + parseFloat(manual_offset_y),
    };
  }

  calculateRealCoordinates(cx, cy) {
    const { scale_width_percent_per_meter=0, aspect_ratio=1, dock={x:50,y:50},
            enable_mirror=false, manual_offset_x=0, manual_offset_y=0,
            scale_mult_x=1.0, scale_mult_y=1.0 } = this.config;
    const dx = cx-(dock.x||50)-parseFloat(manual_offset_x);
    const dy = cy-(dock.y||50)-parseFloat(manual_offset_y);
    const safe = scale_width_percent_per_meter||1;
    const rotX = dx/(safe*parseFloat(scale_mult_x));
    const rotY = dy/(safe*aspect_ratio*parseFloat(scale_mult_y));
    const delta = this.getDeltaAngle();
    const sin = Math.sin(delta), cos = Math.cos(delta);
    let wx = rotX*cos + rotY*sin;
    const wy = -rotX*sin + rotY*cos;
    if (enable_mirror) wx = -wx;
    return { x: wx, y: wy };
  }

  getBatteryIcon(level, state) {
    if (state==='docked'||state==='charging') return 'mdi:battery-charging';
    if (level>=90) return 'mdi:battery';
    if (level>=70) return 'mdi:battery-70';
    if (level>=50) return 'mdi:battery-50';
    if (level>=30) return 'mdi:battery-30';
    return 'mdi:battery-10';
  }

  // ── Improved Hold detection (scroll-safe) ───────────────────────────────────

  _onPointerDown(e) {
    this._holdTriggered = false;
    this._startX = e.touches ? e.touches[0].clientX : e.clientX;
    this._startY = e.touches ? e.touches[0].clientY : e.clientY;

    this._holdTimer = setTimeout(() => {
      this._holdTriggered = true;
      this._popupOpen = true;
      this.requestUpdate();
    }, 650); // slightly longer = safer for scrolling
  }

  _onPointerMove(e) {
    if (!this._holdTimer) return;

    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    const diffX = Math.abs(x - this._startX);
    const diffY = Math.abs(y - this._startY);

    if (diffX > 12 || diffY > 12) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
  }

  _onPointerUp() {
    clearTimeout(this._holdTimer);
    this._holdTimer = null;

    if (!this._holdTriggered) {
      // Short tap = start / stop toggle
      const vac = this.hass?.states[this.config.vacuum_entity];
      if (vac) {
        const cleaning = ['cleaning','returning'].includes(vac.state);
        this._callService(cleaning ? 'stop' : 'start');
      }
    }
    this._holdTriggered = false;
  }

  _onPointerCancel() {
    clearTimeout(this._holdTimer);
    this._holdTimer = null;
    this._holdTriggered = false;
  }

  // ── Map interaction ───────────────────────────────────────────────────────────

  _toggleMode(mode) {
    if (this._mode === mode) { this._mode='view'; this._click1=null; this._click2=null; }
    else { this._mode=mode; this._click1=null; this._click2=null; }
  }

  _handleMapClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ix = ((e.clientX-rect.left)/rect.width)*100;
    const iy = ((e.clientY-rect.top)/rect.height)*100;

    if (this._inspecting) {
      if (!this._click1) {
        const c = this.calculateRealCoordinates(ix, iy);
        this._click1 = { left:ix, top:iy, rx:c.x, ry:c.y };
        this._inspectResult = {
          type: 'point',
          label: 'Go-To Point',
          x: c.x.toFixed(3), y: c.y.toFixed(3),
        };
      } else {
        const c = this.calculateRealCoordinates(ix, iy);
        this._click2 = { left:ix, top:iy, rx:c.x, ry:c.y };
        const p1 = this._click1, p2 = this._click2;
        const xMin=Math.min(p1.rx,c.x).toFixed(3), xMax=Math.max(p1.rx,c.x).toFixed(3);
        const yMin=Math.min(p1.ry,c.y).toFixed(3), yMax=Math.max(p1.ry,c.y).toFixed(3);
        this._inspectResult = {
          type: 'zone',
          label: 'Zone Clean',
          xMin, xMax, yMin, yMax,
          eight: `${xMin},${yMin},${xMin},${yMax},${xMax},${yMax},${xMax},${yMin}`,
        };
      }
      return;
    }

    if (this._mode==='view') return;
    if (this._mode==='target') {
      this._click1={left:ix,top:iy};
      const c=this.calculateRealCoordinates(ix,iy);
      this._sendPoint(c.x,c.y);
    } else if (this._mode==='zone_start') {
      this._click1={left:ix,top:iy}; this._mode='zone_end';
    } else if (this._mode==='zone_end') {
      this._click2={left:ix,top:iy};
    }
  }

  _clearInspect() {
    this._click1=null; this._click2=null; this._inspectResult=null;
  }

  _sendPoint(x,y) {
    if (!this.config.vacuum_entity) return;
    const p=`${x.toFixed(2)},${y.toFixed(2)}`;
    if (this.config.command_style==='miot_9_9') {
      this.hass.callService("xiaomi_miot","call_action",{entity_id:this.config.vacuum_entity,siid:9,aiid:9,params:[p]});
    } else {
      this.hass.callService("vacuum","send_command",{entity_id:this.config.vacuum_entity,command:"app_goto_target",params:[x,y]});
    }
    setTimeout(()=>{this._mode='view';this._click1=null;},500);
  }

  _sendZoneClick(e) { e.preventDefault(); e.stopPropagation(); this._sendZone(); }

  _sendZone() {
    if (!this._click1||!this._click2) return;
    const p1=this.calculateRealCoordinates(this._click1.left, this._click1.top);
    const p2=this.calculateRealCoordinates(this._click2.left, this._click2.top);
    const xMin=Math.min(p1.x,p2.x).toFixed(3), xMax=Math.max(p1.x,p2.x).toFixed(3);
    const yMin=Math.min(p1.y,p2.y).toFixed(3), yMax=Math.max(p1.y,p2.y).toFixed(3);
    const eight = `${xMin},${yMin},${xMin},${yMax},${xMax},${yMax},${xMax},${yMin}`;

    if (this.config.command_style==='miot_9_9') {
      this.hass.callService("xiaomi_miot","call_action",{entity_id:this.config.vacuum_entity,siid:9,aiid:8,params:[eight]});
      setTimeout(()=>{
        this.hass.callService("xiaomi_miot","call_action",{entity_id:this.config.vacuum_entity,siid:9,aiid:3,params:[]});
      },500);
    } else {
      this.hass.callService("vacuum","send_command",{entity_id:this.config.vacuum_entity,command:"app_zoned_clean",params:[[parseFloat(xMin),parseFloat(yMin),parseFloat(xMax),parseFloat(yMax),1]]});
    }
    this._mode='view';
    this._click1=null;
    this._click2=null;
  }

  _callService(service) {
    if (!this.config.vacuum_entity) return;
    this.hass.callService("vacuum", service, {entity_id: this.config.vacuum_entity});
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  render() {
    if (!this.hass || !this.config) return html``;

    const vac = this.hass.states[this.config.vacuum_entity];
    const state = vac?.state || 'unknown';
    const isCleaning = ['cleaning', 'returning'].includes(state);
    const battery = vac?.attributes?.battery_level || 0;

    const pos = this.calculateRobotPosition(
      parseFloat(this.hass.states[this.config.x_sensor]?.state || 0),
      parseFloat(this.hass.states[this.config.y_sensor]?.state || 0)
    );

    return html`
      <ha-card>
        <!-- Compact chip -->
        <ha-card
          class="compact"
          @pointerdown="${this._onPointerDown}"
          @pointermove="${this._onPointerMove}"
          @pointerup="${this._onPointerUp}"
          @pointercancel="${this._onPointerCancel}"
          @pointerleave="${this._onPointerCancel}"
        >
          <div class="mush-icon ${isCleaning ? 'cleaning' : (state === 'docked' ? 'on' : 'off')}">
            <ha-icon icon="mdi:robot-vacuum"></ha-icon>
          </div>
          <div class="mush-info">
            <div class="mush-name">${this.config.name || 'Vacuum'}</div>
            <div class="mush-badge">
              <span class="status-dot" style="background:${isCleaning ? '#4CAF50' : (state === 'docked' ? '#009688' : '#757575')}"></span>
              ${state === 'docked' ? 'Docked' : (isCleaning ? 'Cleaning' : 'Idle')}
              <ha-icon .icon="${this.getBatteryIcon(battery, state)}"></ha-icon>
              ${battery}%
            </div>
          </div>
          <div class="mush-hold-hint">Hold to open map • Tap to ${isCleaning ? 'stop' : 'start'}</div>
        </ha-card>

        <!-- Popup overlay -->
        ${this._popupOpen ? html`
          <div id="popup-overlay" class="open" @click="${(e)=>{if(e.target===this.shadowRoot.getElementById('popup-overlay')) this._popupOpen=false;}}">
            <div class="popup-sheet">
              <div class="sheet-handle"></div>
              <div class="sheet-header">
                <div class="sheet-title">
                  <ha-icon icon="mdi:map"></ha-icon>
                  ${this.config.name || 'Vacuum Map'}
                </div>
                <button class="close-btn" @click="${()=>{this._popupOpen=false;}}">
                  <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
              <div class="sheet-body">
                <!-- Full map content would go here -->
                <div class="map-wrapper">
                  <div class="map-container">
                    <img class="map-image" src="${this.config.image}" alt="Floor plan">
                    <!-- Robot marker, controls, inspector, etc. would be placed here -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host { display: block; }

      ha-card.compact {
        padding: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        user-select: none;
        height: 56px;
        overflow: hidden;
        transition: box-shadow 0.15s;
      }

      .mush-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .mush-icon ha-icon { --mdc-icon-size: 24px; }

      .mush-icon.off  { background: var(--secondary-background-color, rgba(0,0,0,.06)); color: var(--secondary-text-color); }
      .mush-icon.on   { background: rgba(0,150,136,.15); color: #009688; }
      .mush-icon.cleaning { animation: spin 3s linear infinite; }

      @keyframes spin { to { transform: rotate(360deg); } }

      .mush-info { flex: 1; min-width: 0; }
      .mush-name { font-size: 0.92rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mush-badge { font-size: 0.78rem; color: var(--secondary-text-color); display: flex; align-items: center; gap: 6px; }

      .status-dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }

      .mush-hold-hint {
        font-size: 0.68rem;
        color: var(--disabled-text-color, #bbb);
        padding: 3px 7px;
        border: 1px solid var(--divider-color);
        border-radius: 20px;
      }

      /* Popup styles (simplified - expand as needed) */
      #popup-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }

      .popup-sheet {
        width: 100%;
        max-width: 520px;
        background: var(--card-background-color, white);
        border-radius: 28px 28px 0 0;
        max-height: 92vh;
        overflow-y: auto;
      }

      .sheet-handle {
        padding: 12px 0;
        text-align: center;
      }

      .sheet-handle::before {
        content: '';
        display: inline-block;
        width: 40px;
        height: 4px;
        background: var(--divider-color);
        border-radius: 2px;
      }

      .sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        height: 52px;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
      }

      .sheet-body {
        padding: 0 16px 20px;
      }

      .map-wrapper {
        border-radius: 16px;
        overflow: hidden;
        background: #111;
      }

      .map-container {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
      }

      .map-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `;
  }
}

customElements.define("xiaomi-static-map-card-editor", XiaomiStaticMapCardEditor);
customElements.define("xiaomi-static-map-card", XiaomiStaticMapCard);

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === "xiaomi-static-map-card"))
  window.customCards.push({
    type: "xiaomi-static-map-card",
    name: "Xiaomi Map",
    description: "Mushroom-style chip with hold-to-open map sheet."
  });