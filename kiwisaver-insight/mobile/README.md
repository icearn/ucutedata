# KiwiSaver Insight Mobile App

This is the mobile application for the KiwiSaver Insight platform, built with React Native (Expo).

## Features

- **Legal Disclaimer**: Mandatory acceptance of terms.
- **Settings**: Configure initial funds, contributions, investment period, and scheme selection.
- **Scenario Comparison**: Compare different investment strategies (Same, Worst, Normal, Best) with projected growth charts.
- **Historical Prices**: View historical performance of KiwiSaver schemes with interactive charts and comparison tools.
- **Results Summary**: Detailed breakdown of investment outcomes, including key metrics, charts, and future projections.
- **Local Caching**: User settings are saved locally using AsyncStorage.
- **Backend Integration**: Ready to connect to the Python FastAPI backend for data synchronization.

## Project Structure

- `src/screens`: Application screens (Legal, Settings, Scenarios, Historical, Summary).
- `src/components`: Reusable UI components (Card, Input, Button, ScreenContainer).
- `src/navigation`: Navigation configuration (Stack and Tab navigators).
- `src/services`: API integration services.
- `src/constants`: Theme and static data (Schemes).
- `src/types`: TypeScript definitions.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

## Available Scripts

In the project directory, you can run:

### `npm start`
Runs the app in the development mode.
Open it in the [Expo Go](https://expo.dev/client) app on your phone to view it.

### `npm run android`
Runs the app in the Android Simulator or on a connected physical device.
**Note**: Requires Android Studio to be installed and configured.

### `npm run ios`
Runs the app in the iOS Simulator.
**Note**: Requires Xcode (macOS only).

### `npm run web`
Runs the app in a web browser.

### `npm test`
Launches the test runner in the interactive watch mode.
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

## Testing

The application uses Jest and React Native Testing Library for unit and integration testing.

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

Test files are located in `src/screens/__tests__` and other `__tests__` directories.

## Backend Integration

The app is configured to communicate with the backend at `http://localhost:8000` (iOS/Web) or `http://10.0.2.2:8000` (Android).
Ensure the backend service is running to enable remote features (historical data fetching, profile sync).

## Troubleshooting

### Backend Connection Failed
- Ensure the backend is running: `curl http://localhost:8000/health`
- For Android Emulator, `localhost` refers to the device itself. Use `10.0.2.2` to access the host machine's localhost.
- Check if your firewall is blocking the connection.

### Metro Bundler Issues
- Try clearing the cache: `npx expo start -c`
- Ensure no other process is using port 8081.

## Design

The UI is based on the "User Dashboard Design" Figma prototype, featuring a clean, modern interface with:
- Consistent color palette (Blue/Purple/Green/Orange).
- Card-based layout.
- Interactive charts (Line, Bar, Pie).
- Responsive design for mobile devices.
