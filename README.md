# Checkly Check Manager
By Victor Ibitoye
## Overview

The **Checkly Check Manager** is a CLI-based tool designed to manage Playwright tests and Checkly configurations with ease. It provides features such as test folder management, email alert setup, and seamless deployment of Playwright tests to Checkly.

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/VIbitoye/Checkly-Challenge.git
   cd Checkly-Challenge

2. Install dependencies:
  ```bash
   npm install
   ```

## Usage 
 Start the CLI with the command:
   ```bash
   npm start
 ```
Upon starting, you'll be guided through:
- Initializing Playwright and Checkly projects (if not already initialized).
- Setting up or selecting a test folder.
- Configuring email alerts for Checkly notifications.
- Deploying Playwright tests to Checkly.

### Features
- **Deploy to Checkly**: Runs Playwright tests and deploys them as Checkly checks.
- **Manage Test Folder**: Add, remove, or resync a folder for Playwright tests.
- **Email Alerts**: Configure email notifications for test failures.
- **File Syncing**: Automatically keeps test folders in sync.
- **Interactive Menu**: Access all features via an intuitive CLI.