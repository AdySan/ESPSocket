ESPSocket: Websockets for ESP8266
===========================================

![Connected!](/Connected.png)

Welcome to ESP8266 Interface

This project demostrates WebSockets using the Arduino port of ESP8266. It uses some awesome projects like arduinoWebSockets and ColorChord: Embedded. I've tried to port some of the WebSockets functionality from ColorChord: Embedded to work with the Arduino port of ESP8266
It uses the SPIFFS file system on the ESP8266 to host a bunch of webpages. It also supports OTA firmware updates.

Inspired by these two awesome videos:
 [![WebSockets for awesome on the ESP8266](http://img.youtube.com/vi/8ISbmQTbjDI/0.jpg)](http://www.youtube.com/watch?v=8ISbmQTbjDI)

 [![WebSocket ESP-WROOM-02(ESP8266) Android iPad](http://img.youtube.com/vi/q3SqUsdBtDY/0.jpg)](http://www.youtube.com/watch?v=q3SqUsdBtDY)


Note: This is a work in progress! Some things are still broken.

##### Requirements #####
 - Arduino IDE from [here](https://github.com/arduino/Arduino/pull/4107). OTA updates will not work with 1.6.6 until this PR is merged. 
 - Git version of esp8266/Arduino from [here](https://github.com/esp8266/Arduino)
  
##### Uses project #####
 - [ColorChord: Embedded](https://github.com/cnlohr/colorchord)
 - [arduinoWebSockets](https://github.com/Links2004/arduinoWebSockets)
 - [BasicOTA Example](https://github.com/esp8266/Arduino/tree/master/libraries/ArduinoOTA/examples/BasicOTA)
 - [FSBrowser Example](https://github.com/esp8266/Arduino/tree/master/libraries/ESP8266WebServer/examples/FSBrowser)

##### Known Issues #####
 - For some reason, the IP address needs to be hardcoded in menuinterface.js, `ws://espsocket.local:81/` or `"ws://" + location.host + ":81/"` does not work. Need to use `var wsUri = "ws://192.168.1.5:81/";`
 - Unsupported commands result in loss of connection
 - Drag and drop file upload results in `LmacRxBlk:1`, but the uplaod works
 - The WiFi Settings section is still not working

##### Tested Hardware #####
 - NodeMCU 0.9

##### Screenshots #####

![SPIFFSupload](/SPIFFSupload.png)

![All Features](/all.png)