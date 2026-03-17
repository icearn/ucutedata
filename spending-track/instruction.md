# Run Instructions

## Prerequisites
- Node.js installed
- npm or yarn installed
- Expo Go app installed on your mobile device (for testing on device)

## Installation

1. Navigate to the `code` directory:
   ```bash
   cd code
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the App

Start the Expo development server:
```bash
npm start
```

### Options:
- **Android**: Run on a connected Android device or emulator:
  ```bash
  npm run android
  ```
- **iOS**: Run on a connected iOS device or simulator (requires macOS):
  ```bash
  npm run ios
  ```
- **Web**: Run in the web browser:
  ```bash
  npm run web
  ```

## Testing

Run unit tests:
```bash
npm test
```

## E2E Testing

End-to-End tests are implemented using [Maestro](https://maestro.mobile.dev/).

### Prerequisites
- Java 17+ installed.
- Android Emulator or iOS Simulator running.
- **Maestro is already installed locally** for this project in `../deps`.
- **Android Emulator** must be running.

### Running Tests

1. **Start Device**: Open Android Studio -> Device Manager -> Start an Emulator.
   - Verify it is visible by running `adb devices` (ensure `platform-tools` is in your PATH).
   
2. **Start App**:
   ```bash
   npm start
   ```
   (Press 'a' to build and install the app on the emulator).
   **IMPORTANT:** Wait for Expo Go to finish installing and for your app to appear on the emulator screen before proceeding.

3. **Run Tests** (in a new terminal, from `code` directory):
   
   **Verification Flows:**
   - **Login Test** (Required first time):
     ```bash
     ..\deps\maestro\maestro\bin\maestro.bat test .maestro/login_flow.yaml
     ```
   - **AI Scan Test** (Adds data):
     ```bash
     ..\deps\maestro\maestro\bin\maestro.bat test .maestro/scan_flow.yaml
     ```
   - **General Flow** (Assumes Logged In):
     ```bash
     ..\deps\maestro\maestro\bin\maestro.bat test .maestro/flow.yaml
     ```

