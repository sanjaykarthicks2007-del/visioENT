# visioENT

### Visualisation • Imaging • ENT

A compact, portable ENT endoscopy visualization system designed to provide real-time endoscopic imaging through a mobile application.

---

## 🩺 About visioENT

**visioENT** is a portable ENT endoscopy system developed by **Team CuraXion** to make ENT examination more accessible, compact, and affordable.

The system captures live images from an ENT endoscope using an **OV5640 camera** connected to an **ESP32-S3**. The ESP32-S3 provides wireless video streaming to an Android mobile application, allowing the endoscopic view to be displayed in real time.

The system is designed for applications such as:

- Clinical ENT examination
- Bedside examination
- Rural and resource-limited healthcare settings
- Health camps
- Portable diagnosis support
- Remote consultation workflows

> **Note:** The current version does not include AI-based diagnosis or AI integration.

---

## 🎯 Problem Statement

Conventional ENT endoscopy systems can be:

- Bulky
- Expensive
- Difficult to transport
- Dependent on dedicated visualization equipment
- Less suitable for portable and resource-limited environments

visioENT aims to provide a **compact and portable alternative** using embedded hardware and mobile technology.

---

## 💡 Proposed Solution

visioENT integrates:

**ENT Endoscope → OV5640 Camera → ESP32-S3 → Wi-Fi → Android Application**

The camera captures the endoscopic view, while the ESP32-S3 processes the camera stream and provides wireless connectivity to the mobile application.

---

## ✨ Key Features

- 📷 Real-time ENT endoscopic visualization
- 📱 Android mobile application
- 📡 Wi-Fi-based wireless video streaming
- 🔋 Portable battery-powered hardware
- 🧩 Compact embedded design
- 🏥 Designed for clinical and field environments
- 🌐 WebRTC-based communication architecture
- ☁️ Firebase integration for application data
- 💾 Planned support for image/session storage

---

## 🏗️ System Architecture

```text
                ENT ENDOSCOPE
                     │
                     ▼
              ┌─────────────┐
              │   OV5640    │
              │  5MP Camera │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  ESP32-S3   │
              │             │
              │ Image       │
              │ Capture     │
              │ Processing  │
              └──────┬──────┘
                     │
                   Wi-Fi
                     │
                     ▼
              ┌─────────────┐
              │   Android   │
              │     App     │
              │ React Native│
              └──────┬──────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      Visualization         WebRTC
                                │
                                ▼
                       Remote Consultation