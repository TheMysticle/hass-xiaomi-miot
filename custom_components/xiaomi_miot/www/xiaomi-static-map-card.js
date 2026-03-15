import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit@2.4.0/index.js?module";

// ── Editor (unchanged from original) ─────────────────────────────────────────

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
        <div class="sec" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <span style="font-size:.9rem;">Show fan speed &amp; mode on card</span>
          <ha-switch .checked="${this.config.show_extra_info||false}" @change="${(e)=>this._save({show_extra_info:e.target.checked})}"></ha-switch>
        </div>
        ${this.config.show_extra_info ? html`
          <ha-selector label="Fan speed entity (select)" .hass="${this.hass}" .selector="${{entity:{domain:'select'}}}" .value="${this.config.fan_speed_entity||''}" .configValue="${'fan_speed_entity'}" @value-changed="${this._val}"></ha-selector>
          ${(() => {
            const fsEntity = this.config.fan_speed_entity;
            const fsState = fsEntity ? this.hass?.states[fsEntity] : null;
            const fsOptions = fsState?.attributes?.options || [];
            const fsLabels = this.config.fan_speed_labels || [];
            if (!fsOptions.length) return html``;
            return html`
              <div class="sec">
                <b style="font-size:.85rem;">Fan speed labels</b>
                <div style="font-size:.75rem;color:var(--secondary-text-color);margin-bottom:6px;">Replace Chinese/raw values with friendly names (top = lowest, bottom = highest)</div>
                ${fsOptions.map((opt, i) => html`
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-size:.78rem;color:var(--secondary-text-color);flex:0 0 40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${opt}">${opt}</span>
                    <ha-textfield style="flex:1;" label="Label" .value="${fsLabels[i]||''}"
                      @input="${(e) => {
                        const arr = [...(this.config.fan_speed_labels || fsOptions.map(() => ''))];
                        arr[i] = e.target.value;
                        this._save({fan_speed_labels: arr});
                      }}">
                    </ha-textfield>
                  </div>
                `)}
              </div>
            `;
          })()}
          <ha-selector label="Mode entity (select, optional)" .hass="${this.hass}" .selector="${{entity:{domain:'select'}}}" .value="${this.config.mode_entity||''}" .configValue="${'mode_entity'}" @value-changed="${this._val}"></ha-selector>
          ${(() => {
            const mEntity = this.config.mode_entity;
            const mState = mEntity ? this.hass?.states[mEntity] : null;
            const mOptions = mState?.attributes?.options || [];
            const mLabels = this.config.mode_labels || [];
            if (!mOptions.length) return html``;
            return html`
              <div class="sec">
                <b style="font-size:.85rem;">Mode labels</b>
                <div style="font-size:.75rem;color:var(--secondary-text-color);margin-bottom:6px;">Replace Chinese/raw values with friendly names</div>
                ${mOptions.map((opt, i) => html`
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-size:.78rem;color:var(--secondary-text-color);flex:0 0 40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${opt}">${opt}</span>
                    <ha-textfield style="flex:1;" label="Label" .value="${mLabels[i]||''}"
                      @input="${(e) => {
                        const arr = [...(this.config.mode_labels || mOptions.map(() => ''))];
                        arr[i] = e.target.value;
                        this._save({mode_labels: arr});
                      }}">
                    </ha-textfield>
                  </div>
                `)}
              </div>
            `;
          })()}
        ` : ''}
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
      config: {},
      _mode:          { state: true },
      _click1:        { state: true },
      _click2:        { state: true },
      _popupOpen:     { state: true },
      _inspecting:    { state: true },
      _inspectResult: { state: true },
    };
  }

  // Custom hass setter — HA passes the same mutated object every tick,
  // so Lit's default shallow-equality check never sees a change.
  // We store it manually and call requestUpdate() to force a re-render
  // every time hass is set, giving instant state updates.
  set hass(hass) {
    this._hass = hass;
    this.requestUpdate();
  }
  get hass() { return this._hass; }

  constructor() {
    super();
    this._mode = 'view';
    this._click1 = null;
    this._click2 = null;
    this._popupOpen = false;
    this._holdTimer = null;
    this._holdTriggered = false;
    this._inspecting = false;
    this._inspectResult = null;
  }

  static getConfigElement() { return document.createElement("xiaomi-static-map-card-editor"); }

  static getStubConfig() {
    return {
      image: "/local/floorplan.png",
      vacuum_entity: "", x_sensor: "", y_sensor: "", rotation_sensor: "",
      show_extra_info: false, fan_speed_entity: "", mode_entity: "",
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

  getCardSize() { return this.config?.show_extra_info ? 2 : 1; }

  getLayoutOptions() {
    if (this.config?.show_extra_info) {
      return { grid_rows: 2, grid_min_rows: 2, grid_columns: 4 };
    }
    return { grid_rows: 1, grid_min_rows: 1, grid_columns: 4 };
  }

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

  // ── Hold detection ────────────────────────────────────────────────────────────
  // Uses a 10px movement threshold to distinguish scroll from tap/hold.

  _onPointerDown(e) {
    if (e.target.tagName === 'SELECT') return;
    const t = e.touches?.[0] ?? e;
    this._startX = t.clientX;
    this._startY = t.clientY;
    this._scrollCancelled = false;
    this._holdTriggered = false;
    this._holdTimer = setTimeout(() => {
      if (this._scrollCancelled) return;
      this._holdTriggered = true;
      this._popupOpen = true;
    }, 500);
  }

  _onPointerMove(e) {
    if (this._scrollCancelled || (!this._holdTimer && !this._holdTriggered)) return;
    const t = e.touches?.[0] ?? e;
    const dx = t.clientX - this._startX;
    const dy = t.clientY - this._startY;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
      this._scrollCancelled = true;
    }
  }

  _onPointerUp(e) {
    if (e.target.tagName === 'SELECT') return;
    clearTimeout(this._holdTimer);
    if (!this._holdTriggered && !this._scrollCancelled) {
      // Short tap = start / stop toggle
      const vac = this.hass?.states[this.config.vacuum_entity];
      if (vac) {
        const cleaning = ['cleaning','returning'].includes(vac.state);
        this._callService(cleaning ? 'stop' : 'start');
      }
    }
    this._holdTriggered = false;
    this._scrollCancelled = false;
  }

  _onPointerCancel() {
    clearTimeout(this._holdTimer);
    this._holdTriggered = false;
    this._scrollCancelled = false;
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

    // ── Inspector mode: just show coords, never send ──────────────────────────
    if (this._inspecting) {
      if (!this._click1) {
        // First tap — could be a point or corner 1 of a zone
        const c = this.calculateRealCoordinates(ix, iy);
        this._click1 = { left:ix, top:iy, rx:c.x, ry:c.y };
        this._inspectResult = {
          type: 'point',
          label: 'Go-To Point',
          x: c.x.toFixed(3), y: c.y.toFixed(3),
        };
      } else {
        // Second tap — treat as zone corner 2
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
    const p1=this.calculateRealCoordinates(this._click1.left,this._click1.top);
    const p2=this.calculateRealCoordinates(this._click2.left,this._click2.top);
    const xMin=Math.min(p1.x,p2.x).toFixed(2), xMax=Math.max(p1.x,p2.x).toFixed(2);
    const yMin=Math.min(p1.y,p2.y).toFixed(2), yMax=Math.max(p1.y,p2.y).toFixed(2);
    const eight=`${xMin},${yMin},${xMin},${yMax},${xMax},${yMax},${xMax},${yMin}`;
    if (this.config.vacuum_entity) {
      if (this.config.command_style==='miot_9_9') {
        this.hass.callService("xiaomi_miot","call_action",{entity_id:this.config.vacuum_entity,siid:9,aiid:8,params:[eight]});
        setTimeout(()=>this.hass.callService("xiaomi_miot","call_action",{entity_id:this.config.vacuum_entity,siid:9,aiid:3,params:[]}),500);
      } else {
        this.hass.callService("vacuum","send_command",{entity_id:this.config.vacuum_entity,command:"app_zoned_clean",params:[[parseFloat(xMin),parseFloat(yMin),parseFloat(xMax),parseFloat(yMax),1]]});
      }
    }
    this._mode='view'; this._click1=null; this._click2=null;
  }

  _callService(service) {
    if (this.config.vacuum_entity) this.hass.callService("vacuum",service,{entity_id:this.config.vacuum_entity});
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  render() {
    if (!this.config||!this.hass) return html``;

    const { image, x_sensor, y_sensor, rotation_sensor, vacuum_entity,
            dock={x:50,y:50}, map_exit_angle=90, icon_rotation_offset=0,
            aspect_ratio=1, icon_scale=10 } = this.config;

    const xState = this.hass.states[x_sensor];
    const yState = this.hass.states[y_sensor];
    const vacState = this.hass.states[vacuum_entity];

    let rawX = xState ? parseFloat(xState.state)||0 : 0;
    let rawY = yState ? parseFloat(yState.state)||0 : 0;

    let statusText = "Unknown", batteryLevel = 0, isOnline = false;
    let batteryIcon = "mdi:battery-unknown", isCleaning = false;

    if (vacState) {
      statusText = vacState.state.charAt(0).toUpperCase() + vacState.state.slice(1);
      isOnline = !['unavailable','unknown'].includes(vacState.state);
      batteryLevel = vacState.attributes.battery_level || 0;
      batteryIcon = this.getBatteryIcon(batteryLevel, vacState.state);
      isCleaning = ['cleaning','returning'].includes(vacState.state);
    }

    const showExtra = this.config.show_extra_info || false;
    const fanSpeedState = showExtra && this.config.fan_speed_entity ? this.hass?.states[this.config.fan_speed_entity] : null;
    const modeState     = showExtra && this.config.mode_entity      ? this.hass?.states[this.config.mode_entity]      : null;
    const fanSpeed   = fanSpeedState?.state ?? null;
    const fanOptions = fanSpeedState?.attributes?.options || [];
    const vacMode    = modeState?.state ?? null;
    const modeOptions = modeState?.attributes?.options || [];

    const cardName = this.config.name || (vacState?.attributes.friendly_name) || "Vacuum";
    const dotColor = isOnline ? '#4CAF50' : '#F44336';
    const robotPos = this.calculateRobotPosition(rawX, rawY);

    let iconRotation = 0;
    if (rotation_sensor && this.hass.states[rotation_sensor]) {
      const rawRot = parseFloat(this.hass.states[rotation_sensor].state)||0;
      const delta = this.getDeltaAngle();
      const userOffset = (parseFloat(icon_rotation_offset)||0)*(Math.PI/180);
      iconRotation = rawRot + delta + userOffset;
    }

    const robotTransform = `translate(-50%,-50%) rotate(${iconRotation}rad)`;
    const dockStyle = `left:${dock.x}%;top:${dock.y}%;transform:translate(-50%,-50%) rotate(${map_exit_angle}deg);`;
    const stylesVar = `--map-ratio:${aspect_ratio};--icon-scale-percent:${icon_scale}%;`;

    // Zone overlay
    let zoneOverlay = html``;
    let zoneConfirmBtn = html``;
    if (this._mode==='zone_end' && this._click1 && this._click2) {
      const left=Math.min(this._click1.left,this._click2.left);
      const top=Math.min(this._click1.top,this._click2.top);
      const width=Math.abs(this._click1.left-this._click2.left);
      const height=Math.abs(this._click1.top-this._click2.top);
      zoneOverlay = html`<div style="position:absolute;left:${left}%;top:${top}%;width:${width}%;height:${height}%;border:2px solid #FFC107;background:rgba(255,193,7,0.3);pointer-events:none;z-index:5;"></div>`;
      zoneConfirmBtn = html`<div class="zone-go-container" style="left:${left+width/2}%;top:${top+height/2}%;"><button class="zone-go-btn" @click="${(e)=>this._sendZoneClick(e)}" @touchstart="${(e)=>this._sendZoneClick(e)}">START ZONE</button></div>`;
    }

    return html`
      <!-- ── Mushroom-style compact chip ── -->
      <ha-card id="main-card" class="${showExtra ? 'expanded' : ''}"
        @mousedown="${this._onPointerDown}"
        @touchstart="${this._onPointerDown}"
        @mousemove="${this._onPointerMove}"
        @touchmove="${this._onPointerMove}"
        @mouseup="${this._onPointerUp}"
        @touchend="${this._onPointerUp}"
        @mouseleave="${this._onPointerCancel}"
        @touchcancel="${this._onPointerCancel}"
      >
        <!-- Top row: icon + info + hold hint -->
        <div class="mush-chip-row">
          <div class="mush-icon ${isOnline ? 'on' : 'off'} ${isCleaning ? 'cleaning' : ''}">
            <ha-icon icon="mdi:robot-vacuum"></ha-icon>
          </div>
          <div class="mush-info">
            <div class="mush-name">${cardName}</div>
            <div class="mush-badge">
              <span class="status-dot" style="background:${dotColor};"></span>
              ${statusText} · ${batteryLevel}%
            </div>
          </div>
          <div class="mush-hold-hint">Hold</div>
        </div>

        <!-- Second row: fan speed + mode dropdowns -->
        ${showExtra ? html`
          <div class="mush-details-row">
            ${this.config.fan_speed_entity ? html`
              <div class="mush-detail-item">
                <ha-icon icon="mdi:fan" class="detail-icon"></ha-icon>
                <select class="detail-select"
                  @change="${(e) => { e.stopPropagation(); this.hass.callService('select', 'select_option', { entity_id: this.config.fan_speed_entity, option: e.target.value }); }}"
                  @mousedown="${(e) => e.stopPropagation()}"
                  @touchstart="${(e) => e.stopPropagation()}"
                  @mouseup="${(e) => e.stopPropagation()}"
                  @touchend="${(e) => e.stopPropagation()}"
                >
                  ${fanOptions.map((s, i) => {
                    const labels = this.config.fan_speed_labels || [];
                    const label = labels[i] || s;
                    return html`<option value="${s}" ?selected="${s === fanSpeed}">${label}</option>`;
                  })}
                </select>
              </div>
            ` : ''}
            ${this.config.mode_entity ? html`
              <div class="mush-detail-item">
                <ha-icon icon="mdi:robot-vacuum-variant" class="detail-icon"></ha-icon>
                <select class="detail-select"
                  @change="${(e) => { e.stopPropagation(); this.hass.callService('select', 'select_option', { entity_id: this.config.mode_entity, option: e.target.value }); }}"
                  @mousedown="${(e) => e.stopPropagation()}"
                  @touchstart="${(e) => e.stopPropagation()}"
                  @mouseup="${(e) => e.stopPropagation()}"
                  @touchend="${(e) => e.stopPropagation()}"
                >
                  ${modeOptions.map((s, i) => {
                    const labels = this.config.mode_labels || [];
                    const label = labels[i] || s;
                    return html`<option value="${s}" ?selected="${s === vacMode}">${label}</option>`;
                  })}
                </select>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </ha-card>

      <!-- ── Popup overlay + bottom sheet ── -->
      <div id="popup-overlay" class="${this._popupOpen ? 'open' : ''}">
        <div class="popup-sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-header">
            <div class="sheet-title">
              <ha-icon icon="mdi:robot-vacuum"></ha-icon>
              ${cardName}
            </div>
            <div class="close-btn-wrap">
              <button class="close-btn" @click="${()=>{this._popupOpen=false;this._mode='view';this._click1=null;this._click2=null;}}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="sheet-body">
            <!-- Map -->
            <div class="map-wrapper" style="${stylesVar}">
              ${this._inspecting ? html`<div class="mode-banner insp-banner">📍 TAP POINT &nbsp;·&nbsp; TAP 2× FOR ZONE</div>` : ''}
              ${!this._inspecting && this._mode==='target'    ? html`<div class="mode-banner">TAP TO GO</div>` : ''}
              ${!this._inspecting && this._mode==='zone_start'? html`<div class="mode-banner">TAP CORNER 1</div>` : ''}
              ${!this._inspecting && this._mode==='zone_end'  ? html`<div class="mode-banner">TAP CORNER 2</div>` : ''}

              <div class="map-container" @click="${this._handleMapClick}">
                <img src="${image}" class="map-image"/>

                <div class="dock-marker" style="${dockStyle}">
                  <ha-icon icon="mdi:home-floor-g"></ha-icon>
                  <div class="dock-arrow">➜</div>
                </div>

                ${(this._mode==='target' && this._click1 && !this._inspecting) ? html`
                  <div class="target-marker" style="left:${this._click1.left}%;top:${this._click1.top}%;">
                    <ha-icon icon="mdi:map-marker"></ha-icon>
                  </div>` : ''}

                ${zoneOverlay}
                ${zoneConfirmBtn}

                ${(this._mode==='zone_start' && this._click1 && !this._inspecting) ? html`
                  <div class="dot-marker" style="left:${this._click1.left}%;top:${this._click1.top}%;"></div>` : ''}

                <!-- Inspector markers -->
                ${(this._inspecting && this._click1) ? html`
                  <div class="insp-dot" style="left:${this._click1.left}%;top:${this._click1.top}%;"></div>` : ''}
                ${(this._inspecting && this._click2) ? html`
                  <div class="insp-dot insp-dot2" style="left:${this._click2.left}%;top:${this._click2.top}%;"></div>` : ''}
                ${(this._inspecting && this._click1 && this._click2) ? (() => {
                  const l=Math.min(this._click1.left,this._click2.left);
                  const t=Math.min(this._click1.top,this._click2.top);
                  const w=Math.abs(this._click1.left-this._click2.left);
                  const h=Math.abs(this._click1.top-this._click2.top);
                  return html`<div style="position:absolute;left:${l}%;top:${t}%;width:${w}%;height:${h}%;border:2px dashed #a78bfa;background:rgba(167,139,250,.15);pointer-events:none;z-index:5;"></div>`;
                })() : ''}

                <div class="vacuum-marker" style="top:${robotPos.top}%;left:${robotPos.left}%;transform:${robotTransform};">
                  <ha-icon icon="mdi:robot-vacuum"></ha-icon>
                </div>
              </div>

              <!-- Info strip -->
              <div class="info-strip">
                <div class="info-pill">
                  <span class="status-dot" style="background:${dotColor};box-shadow:0 0 5px ${dotColor};"></span>
                  <span>${statusText}</span>
                </div>
                <div class="info-pill">
                  <ha-icon icon="${batteryIcon}" style="--mdc-icon-size:14px;"></ha-icon>
                  <span>${batteryLevel}%</span>
                </div>
              </div>

              <!-- Inspector result overlay -->
              ${(this._inspecting && this._inspectResult) ? html`
                <div class="insp-result">
                  <div class="insp-result-title">${this._inspectResult.label}</div>
                  ${this._inspectResult.type==='point' ? html`
                    <div class="insp-row"><span class="insp-key">x</span><span class="insp-val">${this._inspectResult.x}</span></div>
                    <div class="insp-row"><span class="insp-key">y</span><span class="insp-val">${this._inspectResult.y}</span></div>
                    <div class="insp-copy-row">
                      <span class="insp-code">${this._inspectResult.x}, ${this._inspectResult.y}</span>
                      <button class="insp-copy-btn" @click="${()=>navigator.clipboard?.writeText(`${this._inspectResult.x},${this._inspectResult.y}`)}">Copy</button>
                    </div>
                    <div class="insp-hint">Tap a 2nd spot to get a zone instead</div>
                  ` : html`
                    <div class="insp-row"><span class="insp-key">xMin</span><span class="insp-val">${this._inspectResult.xMin}</span></div>
                    <div class="insp-row"><span class="insp-key">xMax</span><span class="insp-val">${this._inspectResult.xMax}</span></div>
                    <div class="insp-row"><span class="insp-key">yMin</span><span class="insp-val">${this._inspectResult.yMin}</span></div>
                    <div class="insp-row"><span class="insp-key">yMax</span><span class="insp-val">${this._inspectResult.yMax}</span></div>
                    <div class="insp-copy-row">
                      <span class="insp-code">${this._inspectResult.xMin}, ${this._inspectResult.yMin}, ${this._inspectResult.xMax}, ${this._inspectResult.yMax}</span>
                      <button class="insp-copy-btn" @click="${()=>navigator.clipboard?.writeText(`${this._inspectResult.xMin},${this._inspectResult.yMin},${this._inspectResult.xMax},${this._inspectResult.yMax}`)}">Copy</button>
                    </div>
                  `}
                  <button class="insp-clear-btn" @click="${()=>this._clearInspect()}">Clear &amp; tap again</button>
                </div>
              ` : ''}
            </div>

            <!-- Controls -->
            <div class="controls">
              <button class="ctrl-btn ${this._inspecting?'active insp-active':''}"
                @click="${(e)=>{e.stopPropagation();this._inspecting=!this._inspecting;this._clearInspect();this._mode='view';}}" title="Coordinate Inspector">
                <ha-icon icon="mdi:map-marker-question"></ha-icon>
              </button>
              <div class="sep"></div>
              <button class="ctrl-btn ${!this._inspecting&&this._mode==='target'?'active':''}"
                @click="${(e)=>{e.stopPropagation();if(this._inspecting)return;this._toggleMode('target');}}" title="Go To Point">
                <ha-icon icon="mdi:crosshairs-gps"></ha-icon>
              </button>
              <button class="ctrl-btn ${!this._inspecting&&this._mode.startsWith('zone')?'active':''}"
                @click="${(e)=>{e.stopPropagation();if(this._inspecting)return;this._toggleMode('zone_start');}}" title="Zone Clean">
                <ha-icon icon="mdi:selection-drag"></ha-icon>
              </button>
              <div class="sep"></div>
              <button class="ctrl-btn" @click="${(e)=>{e.stopPropagation();this._callService('start');}}" title="Start">
                <ha-icon icon="mdi:play"></ha-icon>
              </button>
              <button class="ctrl-btn" @click="${(e)=>{e.stopPropagation();this._callService('pause');}}" title="Pause">
                <ha-icon icon="mdi:pause"></ha-icon>
              </button>
              <button class="ctrl-btn" @click="${(e)=>{e.stopPropagation();this._callService('stop');}}" title="Stop">
                <ha-icon icon="mdi:stop"></ha-icon>
              </button>
              <button class="ctrl-btn" @click="${(e)=>{e.stopPropagation();this._callService('return_to_base');}}" title="Dock">
                <ha-icon icon="mdi:home-import-outline"></ha-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host { display: block; font-family: var(--primary-font-family, Roboto, sans-serif); }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* ── Compact chip ── */
      ha-card {
        padding: 0;
        display: flex; flex-direction: column;
        cursor: pointer; user-select: none; -webkit-user-select: none;
        min-height: 56px; height: auto; overflow: hidden;
        transition: box-shadow .15s;
      }
      .mush-chip-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px; min-height: 56px; width: 100%;
      }

      .mush-icon {
        width: 36px; height: 36px; min-width: 36px; min-height: 36px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: background .25s, color .25s;
      }
      .mush-icon ha-icon { --mdc-icon-size: 24px; display: flex; line-height: 0; }
      .mush-icon.off  { background: var(--secondary-background-color, rgba(0,0,0,.06)); color: var(--secondary-text-color); }
      .mush-icon.on   { background: rgba(0,150,136,.15); color: #009688; }
      .mush-icon.cleaning { animation: spin 3s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      .mush-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .mush-name { font-size: .92rem; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mush-badge { font-size: .78rem; color: var(--secondary-text-color); display: flex; align-items: center; gap: 5px; }
      .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

      .mush-hold-hint { font-size: .68rem; color: var(--disabled-text-color, #bbb); flex-shrink: 0; padding: 3px 7px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 20px; }

      /* ── Popup overlay ── */
      #popup-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0);
        pointer-events: none;
        transition: background .25s;
        display: flex; align-items: flex-end; justify-content: center;
      }
      #popup-overlay.open { background: rgba(0,0,0,.5); pointer-events: auto; }

      .popup-sheet {
        width: 100%; max-width: 520px;
        background: var(--card-background-color, #fff);
        border-radius: 28px 28px 0 0;
        transform: translateY(100%);
        transition: transform .3s cubic-bezier(.32,1,.6,1);
        max-height: 92vh; overflow-y: auto; overscroll-behavior: contain;
        padding-bottom: env(safe-area-inset-bottom, 0);
      }
      #popup-overlay.open .popup-sheet { transform: translateY(0); }

      .sheet-handle { display: flex; justify-content: center; padding: 12px 0 6px; }
      .sheet-handle::before { content: ''; display: block; width: 40px; height: 4px; background: var(--divider-color, rgba(0,0,0,.12)); border-radius: 2px; }

      .sheet-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 4px 20px 12px;
        height: 52px; box-sizing: border-box;
      }
      .sheet-title {
        display: flex; align-items: center; gap: 10px;
        font-size: 1rem; font-weight: 600; color: var(--primary-text-color);
        flex: 1; min-width: 0;
      }
      .sheet-title ha-icon { color: #009688; --mdc-icon-size: 20px; display: flex; line-height: 0; }

      .close-btn-wrap { width: 32px; height: 32px; min-width: 32px; min-height: 32px; flex-shrink: 0; display: block; }
      .close-btn {
        display: block; width: 32px; height: 32px;
        border-radius: 50%;
        background: var(--secondary-background-color, rgba(0,0,0,.06));
        border: none; cursor: pointer; padding: 0; margin: 0; line-height: 0;
        color: var(--secondary-text-color); transition: background .15s; text-align: center;
      }
      .close-btn:hover { background: var(--divider-color, rgba(0,0,0,.12)); }
      .close-btn svg { display: inline-block; width: 16px; height: 16px; vertical-align: middle; pointer-events: none; }

      .sheet-body { padding: 0 16px 20px; display: flex; flex-direction: column; gap: 12px; }

      /* ── Map ── */
      .map-wrapper {
        position: relative;
        border-radius: 16px; overflow: hidden;
        background: #111;
      }
      .map-container {
        position: relative; display: block;
        width: 100%;
        aspect-ratio: var(--map-ratio, 1);
        cursor: crosshair; user-select: none;
      }
      .map-image { width: 100%; height: 100%; display: block; object-fit: cover; }

      .info-strip {
        position: absolute; top: 10px; left: 10px;
        display: flex; gap: 6px; z-index: 10; pointer-events: none;
      }
      .info-pill {
        display: flex; align-items: center; gap: 5px;
        background: rgba(0,0,0,.55); backdrop-filter: blur(8px);
        color: white; font-size: 11px; font-weight: 600;
        padding: 4px 9px; border-radius: 20px;
      }

      .mode-banner {
        position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
        background: rgba(255,193,7,.95); color: #333; font-weight: bold;
        padding: 5px 14px; border-radius: 20px; font-size: 11px;
        pointer-events: none; z-index: 12;
      }

      /* Markers */
      .vacuum-marker {
        position: absolute;
        width: var(--icon-scale-percent, 10%); aspect-ratio: 1;
        background: #03a9f4; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        transition: top .5s, left .5s, transform .5s;
        box-shadow: 0 4px 10px rgba(0,0,0,.4); pointer-events: none; z-index: 2;
      }
      .vacuum-marker ha-icon { width: 85%; height: 85%; --mdc-icon-size: 100%; }
      .target-marker { position: absolute; color: #FF5722; transform: translate(-50%,-100%); font-size: 32px; filter: drop-shadow(0 2px 2px rgba(0,0,0,.5)); z-index: 1; }
      .dot-marker { position: absolute; width: 12px; height: 12px; background: #FFC107; border-radius: 50%; transform: translate(-50%,-50%); z-index: 3; box-shadow: 0 0 5px black; pointer-events: none; }
      .dock-marker { position: absolute; color: #4CAF50; pointer-events: none; display: flex; flex-direction: column; align-items: center; }
      .dock-arrow { font-size: 20px; font-weight: bold; line-height: 0.8; }
      .zone-go-container { position: absolute; transform: translate(-50%,-50%); z-index: 20; }
      .zone-go-btn { background: #4CAF50; color: white; font-weight: bold; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; font-size: 14px; white-space: nowrap; }

      /* ── Controls bar ── */
      .controls {
        display: flex; align-items: center; justify-content: center;
        gap: 4px; flex-wrap: nowrap;
        background: var(--secondary-background-color, rgba(0,0,0,.04));
        border-radius: 16px; padding: 8px 12px;
      }
      .ctrl-btn {
        background: transparent; border: none;
        width: 44px; height: 44px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; color: var(--primary-text-color);
        transition: background .15s, color .15s;
      }
      .ctrl-btn ha-icon { --mdc-icon-size: 22px; display: flex; line-height: 0; }
      .ctrl-btn:hover { background: var(--divider-color, rgba(0,0,0,.08)); }
      .ctrl-btn.active { color: #009688; background: rgba(0,150,136,.12); }

      /* ── Details row (fan speed + mode) ── */
      .mush-details-row {
        display: flex; align-items: center; gap: 8px;
        width: 100%; padding: 0 10px 10px;
        min-height: 56px; box-sizing: border-box;
      }
      .mush-detail-item {
        display: flex; align-items: center; gap: 5px;
        flex: 1; min-width: 0;
        background: var(--secondary-background-color);
        border-radius: 8px; padding: 10px 10px;
        min-height: 36px;
      }
      .detail-icon {
        --mdc-icon-size: 15px; display: flex; line-height: 0;
        color: #009688; flex-shrink: 0;
      }
      .detail-val {
        font-size: .78rem; color: var(--secondary-text-color);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .detail-select {
        font-size: .78rem; color: var(--primary-text-color);
        background: transparent;
        border: none; padding: 0;
        cursor: pointer; flex: 1; min-width: 0;
        font-family: inherit; appearance: none; -webkit-appearance: none;
      }
      .detail-select:focus { outline: none; }
      .sep { width: 1px; height: 20px; background: var(--divider-color, rgba(0,0,0,.15)); margin: 0 4px; flex-shrink: 0; }

      /* ── Inspector ── */
      .insp-banner { background: rgba(167,139,250,.95) !important; color: white !important; }
      .insp-active { color: #7c3aed !important; background: rgba(124,58,237,.12) !important; }

      .insp-dot {
        position: absolute; width: 14px; height: 14px; border-radius: 50%;
        background: #a78bfa; border: 2px solid white;
        transform: translate(-50%,-50%); z-index: 6; pointer-events: none;
        box-shadow: 0 0 6px rgba(124,58,237,.6);
      }
      .insp-dot2 { background: #f472b6; box-shadow: 0 0 6px rgba(244,114,182,.6); }

      .insp-result {
        position: absolute; bottom: 0; left: 0; right: 0;
        background: rgba(15,15,20,.88); backdrop-filter: blur(12px);
        color: white; padding: 14px 16px 16px;
        border-top: 1px solid rgba(167,139,250,.3);
        z-index: 20;
      }
      .insp-result-title { font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #a78bfa; margin-bottom: 8px; }
      .insp-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; }
      .insp-key { font-size: .75rem; color: rgba(255,255,255,.5); font-family: monospace; }
      .insp-val { font-size: .82rem; font-family: monospace; color: #e2e8f0; font-weight: 600; }
      .insp-copy-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; background: rgba(255,255,255,.07); border-radius: 8px; padding: 6px 10px; }
      .insp-code { font-size: .72rem; font-family: monospace; color: #a78bfa; flex: 1; word-break: break-all; }
      .insp-copy-btn { background: #7c3aed; color: white; border: none; border-radius: 6px; padding: 4px 10px; font-size: .75rem; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
      .insp-copy-btn:hover { background: #6d28d9; }
      .insp-hint { font-size: .68rem; color: rgba(255,255,255,.4); margin-top: 6px; }
      .insp-clear-btn { margin-top: 10px; width: 100%; background: rgba(255,255,255,.08); color: rgba(255,255,255,.7); border: none; border-radius: 8px; padding: 8px; font-size: .8rem; cursor: pointer; }
      .insp-clear-btn:hover { background: rgba(255,255,255,.14); }
    `;
  }
}

customElements.define("xiaomi-static-map-card-editor", XiaomiStaticMapCardEditor);
customElements.define("xiaomi-static-map-card", XiaomiStaticMapCard);

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === "xiaomi-static-map-card"))
  window.customCards.push({ type: "xiaomi-static-map-card", name: "Xiaomi Map", description: "Mushroom-style chip with hold-to-open map sheet." });