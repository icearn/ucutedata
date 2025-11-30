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

2.  **Run the App**:
    - For Android: `npm run android`
    - For iOS: `npm run ios`
    - For Web: `npm run web`

## Backend Integration

The app is configured to communicate with the backend at `http://localhost:8000` (iOS) or `http://10.0.2.2:8000` (Android).
Ensure the backend service is running to enable remote features (historical data fetching, profile sync).

## Design

The UI is based on the "User Dashboard Design" Figma prototype, featuring a clean, modern interface with:
- Consistent color palette (Blue/Purple/Green/Orange).
- Card-based layout.
- Interactive charts (Line, Bar, Pie).
- Responsive design for mobile devices.
