[![version](https://img.shields.io/github/manifest-json/v/al-one/hass-xiaomi-miot?filename=custom_components%2Fxiaomi_miot%2Fmanifest.json)](https://github.com/al-one/hass-xiaomi-miot/releases/latest)
[![releases](https://img.shields.io/github/downloads/al-one/hass-xiaomi-miot/total)](https://github.com/al-one/hass-xiaomi-miot/releases)
[![stars](https://img.shields.io/github/stars/al-one/hass-xiaomi-miot)](https://github.com/al-one/hass-xiaomi-miot/stargazers)
[![issues](https://img.shields.io/github/issues/al-one/hass-xiaomi-miot)](https://github.com/al-one/hass-xiaomi-miot/issues)
[![HACS](https://img.shields.io/badge/HACS-Default-orange.svg)](https://hacs.xyz)

# Xiaomi Miot For HomeAssistant

English | [简体中文](https://github.com/al-one/hass-xiaomi-miot/blob/master/README_zh.md)

[MIoT-Spec](https://iot.mi.com/new/doc/design/spec/overall): The protocol specification for Xiaomi IoT devices, is a standard designed by the Xiaomi IoT platform to describe the function definition of hardware products according to the networking mode of hardware products, the characteristics of product functions, the characteristics of user usage scenarios and the user's requirements for hardware product use experience specification.

This component uses the **miot** protocol to automatically integrate Xiaomi devices into [HomeAssistant](https://www.home-assistant.io), and currently supports most Xiaomi IoT devices. And it supports HA Web UI, and you can easily integrate Xiaomi devices into HA without configuring yaml.

![hass-xiaomi-miot-configs](https://user-images.githubusercontent.com/4549099/142151697-5188ea2d-0aad-4778-8b60-b949bcc410bb.png)


<a name="installing"></a>
## Installation

#### Method 1: [HACS](https://hacs.xyz)
- First installation
    > HACS > Integrations > ➕ EXPLORE & DOWNLOAD REPOSITORIES > [`Xiaomi Miot`](https://my.home-assistant.io/redirect/hacs_repository/?owner=al-one&repository=hass-xiaomi-miot) > DOWNLOAD THIS REPOSITORY
- Update component
    > HACS > Integrations > [`Xiaomi Miot`](https://my.home-assistant.io/redirect/hacs_repository/?owner=al-one&repository=hass-xiaomi-miot) > UPDATE / Redownload

#### Method 2: Manually installation via Samba / SFTP
> Download and copy `custom_components/xiaomi_miot` folder to `custom_components` folder in your HomeAssistant config folder

#### Method 3: Onkey shell via SSH / Terminal & SSH add-on
```shell
wget -O - https://get.hacs.vip | DOMAIN=xiaomi_miot bash -

# Or

wget -O - https://raw.githubusercontent.com/al-one/hass-xiaomi-miot/master/install.sh | ARCHIVE_TAG=latest bash -
```

#### Method 4: shell_command service
1. Copy this code to file `configuration.yaml`
    ```yaml
    shell_command:
      update_xiaomi_miot: |-
        wget -O - https://get.hacs.vip | DOMAIN=xiaomi_miot bash -
    ```
2. Restart HA core
3. Call this [`service: shell_command.update_xiaomi_miot`](https://my.home-assistant.io/redirect/developer_call_service/?service=shell_command.update_xiaomi_miot) in Developer Tools
2. Restart HA core again


## Config

> [⚙️ Configuration](https://my.home-assistant.io/redirect/config) > Devices and Services > [🧩 Integrations](https://my.home-assistant.io/redirect/integrations) > [➕ Add Integration](https://my.home-assistant.io/redirect/config_flow_start?domain=xiaomi_miot) > 🔍 Search `Xiaomi Miot`

Or click: [![Add Integration](https://my.home-assistant.io/badges/config_flow_start.svg)](https://my.home-assistant.io/redirect/config_flow_start?domain=xiaomi_miot)

### Add devices using Mi Account:
Starting from the v0.4.4 version, the component has added support for selecting the connection device mode when integrated by account:
- **Automatic**: The component will regularly update [the devices that support miot-spec in LAN](https://github.com/al-one/hass-xiaomi-miot/blob/master/custom_components/xiaomi_miot/core/miot_local_devices.py), and automatically use the local connection for the supported devices (recommended)
- **Local**: All devices filtered by the integrated configuration will use local connection. If you check the devices that do not support miot in LAN, they will be unavailable
- **Cloud**: All devices filtered by the integrated configuration will use cloud connection. It is recommended that miio, BLE, ZigBee devices use this mode

**Note:** For **Local** mode, some devices require Home Assistant to be on the same subnet/VLAN. They will not respond to requests from a different subnet. A workaround is to NAT your Home Assistant IP to the device's subnet.

### Add device using host/token:
Suitable for devices support miot-spec protocol in LAN

### Config Xiaomi Cloud:

> Config Xiaomi cloud for the devices **integrated by host/token**

```yaml
# configuration.yaml
xiaomi_miot:
  username: xiaomi_username
  password: xiaomi_password
  # server_country: cn # Location of xiaomi cloud: cn(default), de, i2, ru, sg, tw, us
  # http_timeout: 15   # Timeout (seconds) for requesting the xiaomi apis
```

> [⚙️ Configuration](https://my.home-assistant.io/redirect/config) > Devices and Services > [🧩 Integrations](https://my.home-assistant.io/redirect/integrations) > Xiaomi Miot > Options > ☑️ Enable miot cloud

### Translations

> Looking forward to your [contribution](https://github.com/al-one/hass-xiaomi-miot/edit/master/custom_components/xiaomi_miot/core/translation_languages.py).

```yaml
# configuration.yaml
xiaomi_miot:
  language: zh # Using the built-in dictionary, currently only `zh` is supported
  # https://github.com/al-one/hass-xiaomi-miot/blob/master/custom_components/xiaomi_miot/core/translation_languages.py
  translations:
    # Global dictionary
    idle: '空闲'
    busy: '工作中'
    # Dictionary for specifying fan modes
    fan.mode:
      straight wind: '直吹模式'
      natural wind: '自然风'
    # Dictionary for specifying the drying modes of the washer
    washer.drying_level:
      moist: '微湿'
      extra: '特干'
```


### [Customize entity](https://www.home-assistant.io/docs/configuration/customizing-devices/#customizing-entities)

```yaml
# configuration.yaml
homeassistant:
  customize: !include customize.yaml

# Customize via device model
xiaomi_miot:
  # https://github.com/al-one/hass-xiaomi-miot/blob/master/custom_components/xiaomi_miot/core/device_customizes.py
  device_customizes:
    chuangmi.plug.212a01:
      miot_local: true
      chunk_properties: 7


# Customize via parent entity
# customize.yaml
domain.your_entity_id:
  miot_local: true        # Force to read and write data in LAN (integrate by account)
  miot_cloud: true        # Enable miot cloud for entity (read, write, action)
  miot_cloud_write: true  # Enable miot cloud (only write)
  miot_cloud_action: true # Enable miot cloud (only action)
  check_lan: true         # Check LAN connection in cloud mode
  miio_properties: power,battery # Get miio properties to state attributes
  miio_cloud_props: prop.power,event.dev_online

# Custom sub entities
domain.parent_entity_id:
  sensor_properties: temperature,humidity,illumination # Miot properties
  binary_sensor_properties: is_volume_muted,any_boolen_property
  switch_properties: on,power
  number_properties: volume
  select_properties: mode
  fan_properties: mode,fan_level
  cover_properties: motor_control

light.your_entity_id:
  color_temp_reverse: false # Reverse color temperature (Requires reload config entry)
  yeelight_smooth_on:  2000 # milliseconds (Only for Yeelights in local mode)
  yeelight_smooth_off: 3000 # milliseconds (Only for Yeelights in local mode)

climate.your_entity_id:
  bind_sensor: sensor.temperature_entity,sensor.humidity_entity # Sensor entities

camera.your_entity_id:
  video_attribute: 1   # https://github.com/al-one/hass-xiaomi-miot/issues/11#issuecomment-773054167
  keep_streaming: true # Continuously update stream address

cover.your_entity_id:
  closed_position: 5     # Change cover state to closed when position <= 5%
  deviated_position: 2   # Current position deviation 2% -> 0%, 98% -> 100%
  motor_reverse: true    # Reverse motor state (Requires reload config entry)
  position_reverse: true # Reverse motor position (Requires reload config entry)
  open_texts: Open,Up
  close_texts: Close,Down

media_player.mitv_entity_id:
  bind_xiaoai: media_player.xiaoai_entity_id # Bind xiaoai speaker for turn on TV

domain.your_entity_id_xxxx:
  interval_seconds: 30 # Seconds between each update state (Requires reload config entry)
  chunk_properties: 10 # Chunk miot properties on update state (LAN)
  reverse_state: true  # Reverse the On/Off state of a binary sensor
```

### Filter entity attributes

> Too many entity attributes will make your HA's database very large. If some entity attributes are useless to you, you can configure `exclude_state_attributes` to ignore them.

```yaml
# configuration.yaml
xiaomi_miot:
  exclude_state_attributes:
    - miot_type
    - stream_address
    - motion_video_latest
```

### YAML configuration reloading
This component has added support for configuration reloading (to avoid having to restart [HomeAssistant](https://www.home-assistant.io) instance after a YAML configuration change):
> [🔨 Developer tools](https://my.home-assistant.io/redirect/developer_states) > [YAML Configuration](https://my.home-assistant.io/redirect/server_controls) > YAML configuration reloading > 🔍 Look for `Xiaomi Miot` (almost at the bottom of the list)


## [Supported Devices](https://github.com/al-one/hass-xiaomi-miot/issues/12)

- 🔌 [outlet](https://home.miot-spec.com/s/plug) / [switch](https://home.miot-spec.com/s/switch)
- 💡 [light](https://home.miot-spec.com/s/light)
- ❄️ [air-conditioner](https://home.miot-spec.com/s/aircondition) / [air-conditioner-outlet](https://home.miot-spec.com/s/acpartner) / [ir-aircondition-control](https://home.miot-spec.com/s/miir.aircondition)
- 🌀 [fan](https://home.miot-spec.com/s/fan) / [ceiling-fan](https://home.miot-spec.com/s/ven_fan)
- 🛀 [bath-heater](https://home.miot-spec.com/s/bhf_light) / 🔥 [heater](https://home.miot-spec.com/s/heater) / [thermostat](https://home.miot-spec.com/s/airrtc)
- 📷 [camera](https://home.miot-spec.com/s/camera) / [video-doorbell](https://home.miot-spec.com/s/cateye) [❓️](https://github.com/al-one/hass-xiaomi-miot/issues/100#issuecomment-903078604)
- 📺 [television](https://home.miot-spec.com/s/tv) / 📽️ [projector](https://home.miot-spec.com/s/projector) / [tv-box](https://home.miot-spec.com/s/tvbox)
- 🗣️ [intelligent-speaker](https://home.miot-spec.com/s/wifispeaker) [❓️](https://github.com/al-one/hass-xiaomi-miot/issues/100#issuecomment-885989099)
- 🎮️ [ir-remote-control](https://home.miot-spec.com/s/chuangmi.remote) [❓️](https://github.com/al-one/hass-xiaomi-miot/commit/fbcc8063783e53b9480574536a034d338634f4e8#commitcomment-56563663)
- 🔐 [lock](https://home.miot-spec.com/s/lock) / 🚪 [door](https://home.miot-spec.com/s/door)
- 👕 [washer](https://home.miot-spec.com/s/washer) / [dryer](https://home.miot-spec.com/s/dry) / [fridge](https://home.miot-spec.com/s/fridge)
- 🚰 [water-purifier](https://home.miot-spec.com/s/waterpuri) / [kettle](https://home.miot-spec.com/s/kettle)
- ♻️ [air-purifier](https://home.miot-spec.com/s/airpurifier) / [air-fresh](https://home.miot-spec.com/s/airfresh) / [hood](https://home.miot-spec.com/s/hood)
- 🌡 [temperature-humidity-sensor](https://home.miot-spec.com/s/sensor_ht) / [submersion-sensor](https://home.miot-spec.com/s/flood) / [smoke-sensor](https://home.miot-spec.com/s/sensor_smoke)
- 🥘 [cooker](https://home.miot-spec.com/s/cooker) / [pressure-cooker](https://home.miot-spec.com/s/pre_cooker) / [electric-steamer](https://home.miot-spec.com/s/esteamer)
- 🍲 [induction-cooker](https://home.miot-spec.com/s/ihcooker) / [oven](https://home.miot-spec.com/s/oven) / [microwave](https://home.miot-spec.com/s/microwave)
- 🍗 [air-fryer](https://home.miot-spec.com/s/fryer) / [multifunction-cooking-pot](https://home.miot-spec.com/s/mfcp)
- 🍵 [health-pot](https://home.miot-spec.com/s/health_pot) / ☕️ [coffee-machine](https://home.miot-spec.com/s/coffee)
- 🍹 [juicer](https://home.miot-spec.com/s/juicer) / [fruit-vegetable-purifier](https://home.miot-spec.com/s/f_washer)
- ♨️ [water-heater](https://home.miot-spec.com/s/waterheater) / [dishwasher](https://home.miot-spec.com/s/dishwasher) / [foot-bath](https://home.miot-spec.com/s/foot_bath)
- 🦠 [steriliser](https://home.miot-spec.com/s/steriliser) / [towel-rack](https://home.miot-spec.com/s/.tow)
- 🪟 [curtain](https://home.miot-spec.com/s/curtain) / [window-opener](https://home.miot-spec.com/s/wopener) / [airer](https://home.miot-spec.com/s/airer)
- 🧹 [vacuum](https://home.miot-spec.com/s/vacuum) / [mopping-machine](https://home.miot-spec.com/s/.mop)
- 💦 [humidifier](https://home.miot-spec.com/s/humidifier) / [dehumidifier](https://home.miot-spec.com/s/derh) / [diffuser](https://home.miot-spec.com/s/diffuser)
- 🍃 [air-monitor](https://home.miot-spec.com/s/airmonitor) / 🪴 [plant-monitor](https://home.miot-spec.com/s/plantmonitor)
- 🛏 [bed](https://home.miot-spec.com/s/bed) / [blanket](https://home.miot-spec.com/s/blanket) / 😴 [sleep-monitor](https://home.miot-spec.com/s/lunar)
- 💺 [chair](https://home.miot-spec.com/s/chair) / [table](https://home.miot-spec.com/s/desk)
- 💆 [massager](https://home.miot-spec.com/s/massage) / [magic-touch](https://home.miot-spec.com/s/magic_touch)
- 🏃 [walking-pad](https://home.miot-spec.com/s/walkingpad) / [treadmill](https://home.miot-spec.com/s/treadmill)
- 🚽 [toilet](https://home.miot-spec.com/s/toilet) / [cat-toilet](https://home.miot-spec.com/s/litter_box) / 🪥 [toothbrush](https://home.miot-spec.com/s/toothbrush)
- 🐱 [pet-feeder](https://home.miot-spec.com/s/feeder) / ⛲ [pet-drinking-fountain](https://home.miot-spec.com/s/pet_waterer) / 🐟 [fish-tank](https://home.miot-spec.com/s/fishbowl)
- 🦟 [mosquito-dispeller](https://home.miot-spec.com/s/mosq) / [germicidal-lamp](https://home.miot-spec.com/s/s_lamp)
- 🚘 [rearview-mirror](https://home.miot-spec.com/s/rv_mirror) / [head-up-display](https://home.miot-spec.com/s/hud)
- ⌚️ [watch](https://home.miot-spec.com/s/watch) / [bracelet](https://home.miot-spec.com/s/bracelet)
- 🚶 [motion-sensor](https://home.miot-spec.com/s/motion) / 🧲 [magnet-sensor](https://home.miot-spec.com/s/magnet) [❓️](https://github.com/al-one/hass-xiaomi-miot/issues/100#issuecomment-909031222)
- 📳 [vibration-sensor](https://home.miot-spec.com/s/vibration)
- 🌐 [router](https://home.miot-spec.com/s/router) / 🖨 [printer](https://home.miot-spec.com/s/printer)


### Unsupported devices

> This component uses the polling method to obtain the device state, so it cannot listen the events of some devices in real time.

- Wireless Switch (like: [lumi.sensor_switch.v1](https://home.miot-spec.com/s/lumi.sensor_switch.v1) / [lumi.remote.b686opcn01](https://home.miot-spec.com/s/lumi.remote.b686opcn01))
- Motion Sensor (like: [lumi.sensor_motion.v1](https://home.miot-spec.com/s/lumi.sensor_motion.v1))
- Window and Door Sensor (like: [lumi.sensor_magnet.v1](https://home.miot-spec.com/s/lumi.sensor_magnet.v1))


## Services

> Since the HA support service response has been for some time, this component no longer triggers events starting from v0.7.18.

#### [`xiaomi_miot.set_property`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.set_property)
```yaml
service: xiaomi_miot.set_property
data:
  entity_id: camera.isa_hlc7_xxxx
  field: camera_control.on
  value: true
```

#### [`xiaomi_miot.set_miot_property`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.set_miot_property)
```yaml
service: xiaomi_miot.set_miot_property
data:
  entity_id: camera.isa_hlc7_xxxx
  siid: 2
  piid: 1
  value: true
```

#### [`xiaomi_miot.get_properties`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.get_properties)
```yaml
service: xiaomi_miot.get_properties
data:
  entity_id: camera.isa_hlc7_1ab7
  mapping:
    - siid: 2
      piid: 1
    - siid: 3
      piid: 2
  update_entity: true # Update to entity state attributes
```

#### [`xiaomi_miot.call_action`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.call_action)
```yaml
service: xiaomi_miot.call_action
data:
  entity_id: vacuum.dreame_p2259_entity_id
  siid: 4 # vacuum-extend
  aiid: 1 # start-clean
  params:
    - 18 # piid: 1 - work-mode
    - '{"selects":[[7,1,0,2,1]]}' # piid: 10 - clean-extend-data
```

#### [`xiaomi_miot.send_command`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.send_command)
```yaml
service: xiaomi_miot.send_command
data:
  entity_id: switch.your_entity_id
  method: set_power
  params:
    - on
```

#### [`xiaomi_miot.get_token`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.get_token)
```yaml
service: xiaomi_miot.get_token
data:
  name: Light # Keyword of device name in Mihome / IP / Model.
```

#### [`xiaomi_miot.intelligent_speaker`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.intelligent_speaker)
```yaml
service: xiaomi_miot.intelligent_speaker
data:
  entity_id: media_player.xiaoai_lx04_xxxx
  text: Turn on the light
  execute: true # Execute text directive.
  silent: true  # Silent execution.
```

#### [`xiaomi_miot.xiaoai_wakeup`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.xiaoai_wakeup)
```yaml
service: xiaomi_miot.xiaoai_wakeup
data:
  entity_id: media_player.xiaoai_lx04_xxxx
```

#### [`xiaomi_miot.renew_devices`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.renew_devices)
```yaml
service: xiaomi_miot.renew_devices
data:
  username: 80001234 # Xiaomi Account ID / Email / Phone
```

#### [`xiaomi_miot.request_xiaomi_api`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.request_xiaomi_api)
```yaml
service: xiaomi_miot.request_xiaomi_api
data:
  entity_id: sensor.your_entity_id
  api: /v2/plugin/fetch_plugin
  data:
    latest_req:
      api_version: 10070
      plugins:
        - model: brand.device.model
```

> [More services](https://github.com/al-one/hass-xiaomi-miot/blob/master/custom_components/xiaomi_miot/services.yaml)


## Debug

### Get Entity State Attributes

> [🔨 Developer tools](https://my.home-assistant.io/redirect/developer_states) > [ℹ️ State](https://my.home-assistant.io/redirect/developer_states) > 🔍 Filter Entity

### [Get Debug Logs](https://www.home-assistant.io/integrations/logger)

```yaml
# configuration.yaml
logger:
  default: warning
  logs:
    custom_components.xiaomi_miot: debug
```

> [⚙️ Configuration](https://my.home-assistant.io/redirect/config) > [⚙️ System](https://my.home-assistant.io/redirect/system_dashboard) > [✍️ Logs](https://my.home-assistant.io/redirect/logs)


## Obtain miio token
- Use HomeAssistant Service
  1. Goto HomeAssistant service developer tool [![](https://my.home-assistant.io/badges/developer_services.svg)](https://my.home-assistant.io/redirect/developer_services/)
  2. Select [`xiaomi_miot.get_token`](https://my.home-assistant.io/redirect/developer_call_service/?service=xiaomi_miot.get_token), Enter the keyword of device name
  3. Find the token from the HA notifications
- Use MiHome mod by [@vevsvevs](https://github.com/custom-components/ble_monitor/issues/7#issuecomment-595874419)
  1. Down apk from [СКАЧАТЬ ВЕРСИЮ 7.x.x](https://www.vevs.me/2017/11/mi-home.html) and install
  2. Start Mihome APP > Profile > Experimental features
  3. Check on `Write custom log files` and `Enable app's debug mode`
  4. Find the token from `vevs/logs/misc/devices.txt` after restart app
- [Xiaomi Cloud Tokens Extractor](https://github.com/PiotrMachowski/Xiaomi-cloud-tokens-extractor)
  1. Download and run [token_extractor.exe](https://github.com/PiotrMachowski/Xiaomi-cloud-tokens-extractor/blob/master/token_extractor.exe) for Windows or install [for Python](https://github.com/PiotrMachowski/Xiaomi-cloud-tokens-extractor#other-platforms)
  2. Enter username, password and your server region
  3. Extracts tokens from your cloud account. Also reveals the bind_key for BT devices


---


## 🧹 Vacuum Live Map & Shortcut Cards

This fork adds a live vacuum map card, location shortcut cards, and real-time position tracking for Xiaomi MiOT vacuums. All frontend files are included in `custom_components/xiaomi_miot/www/` and must be registered as Lovelace resources.

### Installation

After installing the integration, the JS resources should register themselves, if they don't you'll need to add the two JS files as Lovelace resources:

> [⚙️ Settings](https://my.home-assistant.io/redirect/config) > Dashboards > ⋮ > Resources > ➕ Add Resource

Add both of the following with type **JavaScript Module**:

```
/local/xiaomi_miot/xiaomi-static-map-card.js
/local/xiaomi_miot/xiaomi-vacuum-shortcuts.js
```

> The files are served from `custom_components/xiaomi_miot/www/` which HA exposes at `/local/xiaomi_miot/`.

Restart Home Assistant after registering the resources.

---

### New Sensor Entities

After restarting, each vacuum device will have four new sensor entities created automatically alongside the standard vacuum entity:

| Entity | Description |
|--------|-------------|
| `sensor.<device>_vacuum_x_coordinate` | Vacuum X position in metres (relative to dock) |
| `sensor.<device>_vacuum_y_coordinate` | Vacuum Y position in metres (relative to dock) |
| `sensor.<device>_vacuum_rotation` | Vacuum heading in radians |
| `sensor.<device>_vacuum_cleaning_target` | Last-sent cleaning target as JSON (`"none"` when idle) |

Position sensors are polled every 1 second from `siid=10, piid=5` while the vacuum is cleaning and reset to `0.0` when it docks. The cleaning target sensor updates instantly when any zone clean or goto-point command is sent — from any source including automations — and clears automatically when the vacuum returns to idle or dock.

The cleaning target sensor state format:
```json
// Zone clean
{"type": "zone", "x_min": -2.4, "y_min": -5.0, "x_max": 0.85, "y_max": -3.5}

// Goto point
{"type": "point", "x": -3.2, "y": -4.3}
```

---

### `xiaomi-static-map-card`

A Mushroom-style card that shows a static floorplan image with the vacuum's live position overlaid. Tap to start/stop, hold to open the full map popup with zone and goto-point drawing tools.

#### Card options

| Option | Type | Description |
|--------|------|-------------|
| `image` | string | **Required.** URL of your floorplan image (e.g. `/local/floorplan.png`) |
| `vacuum_entity` | string | **Required.** Vacuum entity ID |
| `x_sensor` | string | X coordinate sensor entity |
| `y_sensor` | string | Y coordinate sensor entity |
| `rotation_sensor` | string | Rotation sensor entity |
| `status_sensor` | string | Optional status sensor for instant state updates |
| `target_sensor` | string | Cleaning target sensor — enables the zone/point overlay |
| `dock` | `{x, y}` | Dock position as % of image width/height (set via editor) |
| `map_exit_angle` | number | Direction the vacuum exits the dock (0=right, 90=down, 180=left, 270=up) |
| `enable_mirror` | boolean | Mirror the X axis |
| `scale_width_percent_per_meter` | number | Map scale — set via the editor's scale calibration tool |
| `scale_mult_x` | number | Fine-tune X axis stretch (default `1.0`) |
| `scale_mult_y` | number | Fine-tune Y axis stretch (default `1.0`) |
| `manual_offset_x` | number | Manual X position nudge in % |
| `manual_offset_y` | number | Manual Y position nudge in % |
| `icon_rotation_offset` | number | Additional icon rotation offset in degrees |
| `icon_scale` | number | Robot icon size as % of map width (default `10`) |
| `command_style` | `standard` \| `miot_9_9` | Service call protocol — use `miot_9_9` for MiOT vacuums |
| `show_extra_info` | boolean | Show fan speed and mode dropdowns on the card |
| `fan_speed_entity` | string | Fan speed select entity |
| `fan_speed_labels` | list | Friendly labels for each fan speed option (top = lowest) |
| `mode_entity` | string | Mode select entity |
| `mode_labels` | list | Friendly labels for each mode option |
| `name` | string | Card display name (defaults to vacuum friendly name) |

#### Example configuration

```yaml
type: custom:xiaomi-static-map-card
image: /local/floorplan.png
vacuum_entity: vacuum.ijai_v3_542b_robot_cleaner
x_sensor: sensor.ijai_v3_542b_vacuum_x_coordinate
y_sensor: sensor.ijai_v3_542b_vacuum_y_coordinate
rotation_sensor: sensor.ijai_v3_542b_vacuum_rotation
status_sensor: sensor.ijai_v3_542b_status
target_sensor: sensor.ijai_v3_542b_vacuum_cleaning_target
command_style: miot_9_9
dock:
  x: 52.3
  y: 78.1
map_exit_angle: 90
scale_width_percent_per_meter: 8.4
scale_mult_x: 1.0
scale_mult_y: 1.0
icon_scale: 10
show_extra_info: true
fan_speed_entity: select.ijai_v3_542b_fan_level
mode_entity: select.ijai_v3_542b_mode
```

#### Setting up the map calibration

Use the built-in editor (three-dot menu > Edit card) to calibrate the map without touching YAML:

1. **Scale** — click "1. Scale", then click two points on the map a known distance apart and enter the distance in metres when prompted.
2. **Dock** — click "2. Dock" then click the dock location on the map image.
3. **Capture** — with the vacuum physically at the dock and the dock position set, click "3. Capture" to record the sensor reference vector. This aligns the coordinate system.
4. Set **Exit Dir** to match which direction the vacuum drives away from the dock.
5. Enable **Mirror** if the map appears left-right flipped.

Use the **Tuning** section to fine-adjust if the robot icon drifts from its actual position.

#### Cleaning target overlay

When `target_sensor` is configured and a zone clean or goto-point command is sent, a pulsing amber overlay appears on the popup map showing the exact area or point. The overlay uses the same coordinate transform as the robot icon, so all your dock, scale, rotation, mirror, and offset settings apply automatically.

- **Zone clean**: rendered as a filled amber rectangle
- **Goto point**: rendered as a 2 m square with a centre pin dot
- The overlay disappears automatically when the vacuum returns to idle or dock

#### Coordinate inspector

In the map popup, tap the 📍 inspector button (bottom-left of controls) to enter inspection mode. Tap any point on the map to read its real-world coordinates. Tap a second point to get the zone coordinates for that rectangle, along with a copy button. These coordinates can be pasted directly into shortcut card configs or automations.

---

### `xiaomi-vacuum-shortcut-card` / `xiaomi-vacuum-custom-card`

Mushroom-style chips that send the vacuum to a pre-defined location with a single tap (confirm) or hold.

**Tap once** → shows "Tap again to confirm"  
**Tap again** → sends the command  
**Hold** → sends immediately

#### Built-in shortcut cards

Four pre-configured cards are included with hardcoded coordinates matching a specific floorplan. Use `xiaomi-vacuum-custom-card` for your own locations.

| Card type | Location | Command type |
|-----------|----------|--------------|
| `xiaomi-vacuum-corridor-card` | Corridor | Goto point |
| `xiaomi-vacuum-kitchen-card` | Kitchen | Zone clean |
| `xiaomi-vacuum-livingroom-card` | Living room | Zone clean |
| `xiaomi-vacuum-emaspc-card` | Ema's PC area | Goto point |

#### `xiaomi-vacuum-custom-card`

Fully configurable via the visual editor. Supports both goto-point and zone clean, with a coordinate inspector tip linking to the map card.

```yaml
type: custom:xiaomi-vacuum-custom-card
vacuum_entity: vacuum.ijai_v3_542b_robot_cleaner
name: Kitchen
icon: mdi:silverware-fork-knife
type_: zone
x_min: -2.402
y_min: -4.990
x_max: 0.855
y_max: -3.530
command_style: miot_9_9
```

#### `xiaomi-vacuum-zone-list-card`

A dropdown card listing multiple zones and goto-points with a single Clean and Return button. Useful for dashboards where you want all locations in one card.

```yaml
type: custom:xiaomi-vacuum-zone-list-card
vacuum_entity: vacuum.ijai_v3_542b_robot_cleaner
name: Vacuum Shortcuts
command_style: miot_9_9
zones:
  - name: Kitchen
    type_: zone
    x_min: -2.402
    y_min: -4.990
    x_max: 0.855
    y_max: -3.530
  - name: Living Room
    type_: zone
    x_min: -1.097
    y_min: -3.254
    x_max: 2.630
    y_max: 0.020
  - name: Corridor
    type_: point
    x: -3.216
    y: -4.343
```

#### Command style reference

| `command_style` | Zone service call | Goto service call |
|-----------------|-------------------|-------------------|
| `miot_9_9` | `xiaomi_miot.call_action` siid=9 aiid=8, then aiid=3 | `xiaomi_miot.call_action` siid=9 aiid=9 |
| `standard` | `vacuum.send_command` app_zoned_clean | `vacuum.send_command` app_goto_target |

Use `miot_9_9` for MiOT-protocol vacuums (recommended for most Xiaomi/ijai devices). Use `standard` for Roborock or Viomi devices using the legacy miio protocol.

---

## Thanks

- [PyCharm](https://www.jetbrains.com/pycharm/)
- [Dler](https://dler.pro/auth/register?affid=130833) (10% Discount coupon for new user: `CXVbfhHuSRsi`)