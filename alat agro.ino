#include <WiFi.h>
#include <HTTPClient.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include "DHT.h"

// ===============================
// Konfigurasi WiFi
// ===============================
const char* ssid = "test";
const char* password = "5OYR75RB9UM7E281";

// ===============================
// Konfigurasi ThingSpeak
// ===============================
String apiKey = "5OYR75RB9UM7E281";   // Write API Key
const char* serverTS = "http://api.thingspeak.com/update";

// ===============================
// Konfigurasi Sensor
// ===============================
#define DHTPIN   4
#define DHTTYPE  DHT22
#define SOIL_PIN 34

DHT dht(DHTPIN, DHTTYPE);

// ===============================
// Konfigurasi Relay
// ===============================
#define RELAY_PUMP 26
#define RELAY_FAN  27

// ===============================
// Web Server
// ===============================
AsyncWebServer server(80);

// ===============================
// Variabel Global Sensor
// ===============================
float temperature = 0;
float humidity = 0;
int soilPercent = 0;

// ===============================
// SETUP
// ===============================
void setup() {
  Serial.begin(115200);

  // Inisialisasi DHT
  dht.begin();

  // Mount LittleFS
  if (!LittleFS.begin()) {
    Serial.println("LittleFS mount gagal!");
    return;
  }
  Serial.println("LittleFS mounted.");

  // Koneksi WiFi
  WiFi.begin(ssid, password);
  Serial.print("Menghubungkan WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi terhubung!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Set Pin Relay
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RELAY_FAN, OUTPUT);

  digitalWrite(RELAY_PUMP, LOW);
  digitalWrite(RELAY_FAN, LOW);

  // ===============================
  // ROUTING WEB SERVER
  // ===============================

  // Serve file statis (index.html)
  server.serveStatic("/", LittleFS, "/")
        .setDefaultFile("index.html");

  // Endpoint Data JSON
  server.on("/data", HTTP_GET, [](AsyncWebServerRequest *request) {
    String json = "{";
    json += "\"temperature\":" + String(temperature, 1) + ",";
    json += "\"humidity\":" + String(humidity, 1) + ",";
    json += "\"soil\":" + String(soilPercent);
    json += "}";

    request->send(200, "application/json", json);
  });

  // Endpoint Kontrol Pompa
  server.on("/pump", HTTP_GET, [](AsyncWebServerRequest *request) {

    if (!request->hasParam("state")) {
      request->send(400, "text/plain", "Bad Request");
      return;
    }

    String state = request->getParam("state")->value();

    if (state == "1") {
      digitalWrite(RELAY_PUMP, HIGH);
      request->send(200, "text/plain", "Pump ON");
    } else {
      digitalWrite(RELAY_PUMP, LOW);
      request->send(200, "text/plain", "Pump OFF");
    }
  });

  // Endpoint Kontrol Fan
  server.on("/fan", HTTP_GET, [](AsyncWebServerRequest *request) {

    if (!request->hasParam("state")) {
      request->send(400, "text/plain", "Bad Request");
      return;
    }

    String state = request->getParam("state")->value();

    if (state == "1") {
      digitalWrite(RELAY_FAN, HIGH);
      request->send(200, "text/plain", "Fan ON");
    } else {
      digitalWrite(RELAY_FAN, LOW);
      request->send(200, "text/plain", "Fan OFF");
    }
  });

  server.begin();
  Serial.println("Web server started.");
}

// ===============================
// LOOP
// ===============================
void loop() {

  // ===============================
  // BACA SENSOR (Dummy Data)
  // ===============================
  temperature = random(20, 40);   // 20 - 39 °C
  humidity    = random(20, 91);   // 20 - 90 %
  soilPercent = random(20, 101);  // 20 - 100 %

  Serial.printf(
    "Temp: %.1f °C | Hum: %.1f %% | Soil: %d %%\n",
    temperature, humidity, soilPercent
  );

  // ===============================
  // Kirim ke ThingSpeak
  // ===============================
  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;

    String url = String(serverTS) +
                 "?api_key=" + apiKey +
                 "&field1=" + String(temperature) +
                 "&field2=" + String(humidity) +
                 "&field3=" + String(soilPercent);

    http.begin(url);
    int httpCode = http.GET();

    if (httpCode > 0) {
      Serial.println("ThingSpeak update OK");
    } else {
      Serial.println("Gagal kirim ke ThingSpeak");
    }

    http.end();
  }

  // Delay sesuai limit ThingSpeak (minimal 15 detik)
  delay(20000);
}
