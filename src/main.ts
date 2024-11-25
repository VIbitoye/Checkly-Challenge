import fs from 'fs-extra'; // Importing the 'fs-extra' module for file system operations (extends native 'fs' with additional features).
import path from 'path'; // Importing the 'path' module to handle and transform file paths.
import prompts from 'prompts'; // Importing 'prompts' for CLI-based interactive user input.
import { execSync } from 'child_process'; // Importing 'execSync' to execute shell commands synchronously.

class TestManager {
  // Class to manage test folder, configuration files, and associated operations.

  // Property to hold the path of the current test folder in use.
  private testFolder: string | null = null;

  // Property to store the original folder path (before any modifications).
  private originalFolderPath: string | null = null;

  // Path to save the test folder's state (saved between program runs).
  private savedFolderPath = './savedFolder.json';

  // Path to store email configuration for Checkly alerts.
  private emailFilePath = './email.json';

  // Absolute path to the Checkly configuration file.
  private configPath = path.resolve('checkly.config.ts');

  // Absolute path to the Playwright configuration file.
  private playwrightConfigPath = path.resolve('playwright.config.ts');
     
    // Method to initialize the test manager and perform initial setup.
    async init() {
      console.log('Welcome to the Checkly Test Manager!');
    
      const playwrightExists = fs.existsSync(this.playwrightConfigPath); // Check if the Playwright config file exists
      const checklyExists = fs.existsSync(this.configPath); // Check if the Checkly config file exists
    
      if (playwrightExists && checklyExists) {
        console.log('Configuration files detected. Skipping project initialization.');
        await this.loginToCheckly();
      } else {
        if (!playwrightExists) await this.createPlaywrightProject();
        if (!checklyExists) await this.createChecklyProject();
        await this.loginToCheckly();
      }
    
      await this.ensureTestFolder(); // Ensure the test folder exists
      await this.syncOriginalFolder(); // Sync original files whenever the test folder changes
      await this.setupEmailChannel(); // Setting up email for Checkly alerts
      await this.modifyChecklyConfig(); // Adding alerts to project config 
    
      await this.mainMenu(); // Always navigate to the main menu
    }

      // Methods to create Playwright and Checkly projects
      async createPlaywrightProject() { 
        const playwrightConfigPath = './playwright.config.ts';
        if (fs.existsSync(playwrightConfigPath)) {
          console.log('Playwright project already initialized.');
          return;
        }
      
        console.log('Initializing a new Playwright project...');
        try {
          execSync('npm init playwright@latest', { stdio: 'inherit' }); // shell command
          console.log('Playwright project initialized successfully!');
        } catch (error) {
          console.error('Error initializing Playwright project:', error instanceof Error ? error.message : error);
          console.log('Skipping Playwright initialization and continuing.');
        }
      }
      
      async createChecklyProject() {
        if (fs.existsSync(this.configPath)) {
          console.log('Checkly project already initialized.');
          return;
        }
      
        console.log('Initializing a new Checkly project...');
        try {
          execSync('npm create checkly', { stdio: 'inherit' }); 
          console.log('Checkly project initialized successfully!');
        } catch (error) {
          console.error('Error initializing Checkly project:', error instanceof Error ? error.message : error);
          console.log('Skipping Checkly initialization and continuing.');
        }
      }
  
  // Method to log in to Checkly
  async loginToCheckly() {
    console.log('Please login to Checkly CLI.');
    try {
      const response = await prompts({
        type: 'confirm',
        name: 'login',
        message: 'Do you want to log in to Checkly CLI?',
        initial: true,
      });

      if (!response.login) {
        console.log('Skipping Checkly login. Some features may not work without logging in.');
        return; // Allow the CLI to continue without forcing login
      }

      execSync('npx checkly login', { stdio: 'inherit' });
      console.log('Login successful!');
    } catch (error) {
      console.error('Error logging into Checkly:', error);
      console.log('Continuing without Checkly login. Some features may not work.');
    }
  }

    // Ensure the test folder exists
    async ensureTestFolder() { 
      if (fs.existsSync(this.savedFolderPath)) { // Check if a saved folder exists
        const savedFolder = JSON.parse(fs.readFileSync(this.savedFolderPath, 'utf-8'));
        if (fs.existsSync(savedFolder.folder)) {
          this.testFolder = savedFolder.folder; // Load saved folder
          this.originalFolderPath = savedFolder.originalFolder; // Load original path
          console.log(`Using previously saved folder: ${this.testFolder}`);
          return;
        }
      }
      await this.setTestFolder();
    }
    
    // Method to set the test folder if it doesnt exist
    async setTestFolder() {
      try {
        let currentDir = process.cwd(); // Starting at the current project folder
    
        while (true) {
          const items = fs.readdirSync(currentDir).map((item) => { // Getting all files and folders in the current directory
            const fullPath = path.join(currentDir, item); // Constructing the full path
            return {
              title: item + (fs.statSync(fullPath).isDirectory() ? '/' : ''),
              value: fullPath,
            };
          });
    
          items.unshift({ // Adding navigation options
            title: '.. (Go Up)', // To go back to the parent directory
            value: path.resolve(currentDir, '..'),
          });
    
          items.push({
            title: 'Select This Folder',
            value: currentDir, // Set the current directory as the value
          });
    
          const response = await prompts({
            type: 'select',
            name: 'selected',
            message: `Current Directory: ${currentDir}\nSelect a folder or action:`,
            choices: items,
          });
    
          if (!response.selected) {
            console.log('No selection made. Operation canceled.');
            return; // Exit if no selection is made
          }
    
          if (response.selected === currentDir) {
            if (!fs.lstatSync(currentDir).isDirectory()) {
              console.error('Invalid selection, please choose a directory.');
            } else {
              this.originalFolderPath = currentDir; // Save the original folder path
              const projectRoot = process.cwd(); // Project root directory
              this.testFolder = path.resolve(projectRoot, path.basename(currentDir)); // Copy to root, maintaining folder name
    
              // Copy files from the original folder to the root of the project
              try {
                fs.copySync(this.originalFolderPath, this.testFolder, { overwrite: true });
                console.log(`Copied files from ${this.originalFolderPath} to ${this.testFolder}`);
              } catch (error) {
                console.error(`Error copying files: ${error instanceof Error ? error.message : error}`);
                return; // Exit on error
              }
    
              // Save the paths to the configuration file
              fs.writeFileSync(
                this.savedFolderPath,
                JSON.stringify({ folder: this.testFolder, originalFolder: this.originalFolderPath }, null, 2)
              );
              console.log('Saved test folder paths.');
    
              // Inform the user the folder is ready for testing
              console.log(`Playwright tests will now use the folder at: ${this.testFolder}`);
              break; // Exit the loop after a successful copy
            }
          } else {
            currentDir = response.selected; // Navigate into the selected directory
          }
        }
      } catch (error) {
        console.error(`An error occurred: ${error instanceof Error ? error.message : error}`);
      }
    }
    
// Synchronize files from the original folder to the test folder
// Only updates files if they are missing or outdated in the destination
async syncOriginalFolder() { 
  if (!this.originalFolderPath || !this.testFolder) {
    console.error('Original or test folder not set. Cannot sync files.');
    return;
  }

  console.log(`Syncing files from ${this.originalFolderPath} to ${this.testFolder}...`);
  try {
    fs.copySync(this.originalFolderPath, this.testFolder, { // src, dest
      overwrite: true, // Allow overwriting files in the destination
      filter: (src, dest) => {
        const srcData = fs.statSync(src); // Getting data of the source file
        const destData = fs.existsSync(dest) ? fs.statSync(dest) : null; // Checking if the destination file exists and get its data.
        
        // Only copy the file if:
        // - The destination file does not exist, or
        // - The source file is newer than the destination file.
        return ! destData || srcData.mtimeMs >  destData.mtimeMs;
      },
    });
    console.log('Syncing completed successfully.');
  } catch (error) {
    console.error(`Error syncing files: ${error instanceof Error ? error.message : error}`);
  }
}

    
    // Method to update the checkly.config.ts file with the path of the test folder
    async updateChecklyConfig(folderPath: string) {
      try {
        let configContent = fs.readFileSync(this.configPath, 'utf-8'); // Pointing to checkly.config.ts
  
        configContent = configContent.replace(
          /checkMatch: '.*?'/,
          `checkMatch: '${folderPath.replace(/\\/g, '/')}/**/*.check.ts'`// to find check files in the test folder
        );
  
        configContent = configContent.replace(
          /testMatch: '.*?'/,
          `testMatch: '${folderPath.replace(/\\/g, '/')}/**/*.spec.ts'` // to find test files in the test folder
        );
  
        fs.writeFileSync(this.configPath, configContent, 'utf-8'); // adding the updated content of checkly.config.ts
        console.log(`Updated Checkly config paths to: ${folderPath}`);
      } catch (error) {
        console.error(`Error updating Checkly config: ${error instanceof Error ? error.message : error}`);
      }
    }
  
    // Method to update the playwright.config.ts file with the path of the test folder
    async updatePlaywrightConfig(folderPath: string) {
      try {
        let configContent = fs.readFileSync(this.playwrightConfigPath, 'utf-8');
  
        configContent = configContent.replace(
          /testDir: '.*?'/,
          `testDir: '${folderPath.replace(/\\/g, '/')}'`
        );
  
        fs.writeFileSync(this.playwrightConfigPath, configContent, 'utf-8'); // adding the updated content of playwright.config.ts
        console.log(`Updated Playwright config paths to: ${folderPath}`); 
      } catch (error) {
        console.error(`Error updating Playwright config: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    // Method to setup email
    async setupEmailChannel() {
      if (!fs.existsSync(this.configPath)) {
        console.error('Checkly config file not found. Ensure the project is created first.');
        return;
      }
    
      const emailData = fs.existsSync(this.emailFilePath)
        ? JSON.parse(fs.readFileSync(this.emailFilePath, 'utf-8'))
        : null;
    
      const cachedEmail = emailData?.email;
      if (cachedEmail) {
        console.log(`Using cached email address: ${cachedEmail}`);
        return;
      }
    
      const response = await prompts({
        type: 'text',
        name: 'email',
        message: 'Enter the email address for Checkly alerts:',
        validate: (input) =>
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || 'Please enter a valid email address.',
      });
    
      const email = response.email;
      if (!email) {
        console.log('No email provided. Continuing without email setup.');
        return;
      }
    
      fs.writeFileSync(this.emailFilePath, JSON.stringify({ email }, null, 2));
      console.log(`Email alert channel set up for: ${email}`);
    
      // Modify config to add the email channel
      await this.modifyChecklyConfig();
    }
    
    // adding email channel to the checkly.config.ts
    async modifyChecklyConfig() {
      if (!fs.existsSync(this.configPath)) {
        console.error('Checkly config file not found. Ensure the project is created first.');
        return;
      }
    
      const emailData = fs.existsSync(this.emailFilePath)
        ? JSON.parse(fs.readFileSync(this.emailFilePath, 'utf-8'))
        : null;
    
      const email = emailData?.email;
      if (!email) {
        console.error('Email address not set. Cannot modify Checkly config.');
        return;
      }

      // Defining the EmailAlertChannel 
      const emailChannel = `
    import { EmailAlertChannel } from 'checkly/constructs';
    
    const emailChannel = new EmailAlertChannel('email-channel-1', {
      address: '${email}', 
      sendFailure: true,
      sendRecovery: true,
      sendDegraded: false,
    });
    `;
    
      try {
        let configContent = fs.readFileSync(this.configPath, 'utf-8'); // uppdating the checkly.config.ts file
    
        // Add the email channel import and definition if it doesn't already exist
        if (!configContent.includes('EmailAlertChannel')) {
          configContent = `${emailChannel}\n${configContent}`;
        }
    
        const checksRegex = /checks\s*:\s*\{[\s\S]*?\}/; // Regex to find the `checks` object declared in the config file
        if (checksRegex.test(configContent)) { 
          configContent = configContent.replace( // Replacing the `checks` object with the modified version
            checksRegex,
            (match) => { // Adding the email channel to the `checks` object
              if (!match.includes('alertChannels')) { // Check if `alertChannels` is already defined
                return match.replace(
                  /{\s*/,
                  `{ alertChannels: [emailChannel],\n`
                );
              }
              return match; // Leave existing alertChannels untouched
            }
          );
        } else {
          console.error('Checks object not found in the Checkly configuration. Ensure the file is formatted correctly.');
          return;
        }
    
        fs.writeFileSync(this.configPath, configContent, 'utf-8'); // updating the checkly.config.ts file
        console.log('Email alert channel added to checks in Checkly config!');
      } catch (error) {
        console.error(`Error modifying Checkly config: ${error instanceof Error ? error.message : error}`);
      }
    }
  
    // to remove the email channel
    async removeEmailChannel() {
      if (!fs.existsSync(this.configPath)) {
        console.error('Checkly config file not found. Ensure the project is created first.');
        return;
      }
    
      if (fs.existsSync(this.emailFilePath)) {
        fs.unlinkSync(this.emailFilePath);
        console.log('Email address removed successfully.');
      }
    
      try {
        let configContent = fs.readFileSync(this.configPath, 'utf-8');
    
        // Removing the email channel definition
        configContent = configContent.replace(/import { EmailAlertChannel } from 'checkly\/constructs';[\s\S]*?alertChannels: \[emailChannel\],/g, ''); 
    
        // Removing the alertChannels entry from the checks object
        configContent = configContent.replace(/alertChannels: \[emailChannel\],\s*/g, '');
     
        fs.writeFileSync(this.configPath, configContent, 'utf-8'); // updating the checkly.config.ts file
        console.log('Email alert channel removed from Checkly config!');
      } catch (error) {
        console.error(`Error modifying Checkly config: ${error instanceof Error ? error.message : error}`);
      }
    }

    // to remove the test folder
    async removeTestFolder() {
      if (fs.existsSync(this.savedFolderPath)) {
        fs.unlinkSync(this.savedFolderPath);
        this.testFolder = null;
        console.log('Test folder path removed successfully.');
      } else {
        console.log('No saved test folder to remove.');
      }
    }

    // main menu
    async mainMenu() {
      console.log('\n=== Current Checkly CLI Configuration ==='); // header
      if (fs.existsSync(this.emailFilePath)) {
        const email = JSON.parse(fs.readFileSync(this.emailFilePath, 'utf-8')).email; // reading the email
        console.log(`Email Address: ${email}`);
      } else {
        console.log('Email Address: Not set');
      }
    
      if (this.testFolder) {
        console.log(`Test Folder: ${this.testFolder}`); // reading the test folder
        this.listTestFiles(); // function to read files in test folder
      } else {
        console.log('Test Folder: Not set');
      }
      console.log('=============================\n');
      
      // menu choices
      const choices = [
        { title: 'Deploy to Checkly', value: 'deploy' },
        { title: 'Remove Test Folder', value: 'removeFolder' },
        { title: 'Remove Email Address', value: 'removeEmail' },
        { title: 'Add Email Address', value: 'addEmail' },
        { title: 'Add New Folder', value: 'addFolder' },
        { title: 'Exit', value: 'exit' },
      ];
    
      const response = await prompts({
        type: 'select',
        name: 'action',
        message: 'What would you like to do?',
        choices,
      });
      
      //switch for different actions
      switch (response.action) {
        case 'deploy':
          await this.deployToCheckly();
          break;
        case 'addEmail':
          await this.setupEmailChannel();
          break;
        case 'addFolder':
          await this.setTestFolder();
          break;
        case 'removeFolder':
          await this.removeTestFolder();
          break;
        case 'removeEmail':
          await this.removeEmailChannel();
          break;
        case 'exit':
          console.log('Goodbye!');
          return; // Exit gracefully
      }
    
      await this.mainMenu(); // Always return to main menu
    }
    

    // to test on playwright then deploy to checkly
    async deployToCheckly() {
  console.log('Adding alerts to checks...');
  
  // Read email configuration
  const emailData = JSON.parse(fs.readFileSync(this.emailFilePath, 'utf-8'));
  
  console.log('Running Playwright tests...');
  let testsFailed = false;

  try {
    // Runnig Playwright tests
    execSync('npx playwright test', { stdio: 'inherit' });
  } catch {
    console.error('Some tests failed.');
    testsFailed = true; // Mark that there were test failures
  }

  // Prompt user for deployment even if tests failed
  const confirmDeployment = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: testsFailed // tenary operator for test failures
      ? 'Some tests failed. Do you still want to proceed with deployment to Checkly?'
      : 'Do you want to proceed with deployment to Checkly?',
    initial: true,
  });

  if (!confirmDeployment.confirm) {
    console.log('Deployment canceled.');
    return; // Exit the function if deployment is canceled
  }

  console.log('Deploying to Checkly...');
  try {
    // Deploy to Checkly
    execSync('npx checkly deploy', { stdio: 'inherit' });
    console.log('Deployment successful!');
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

// to list the files in the test folder
async listTestFiles() {
      if (this.testFolder) {
        try {
          console.log(`Scanning directory: ${this.testFolder}`); 
    
          const allFiles = fs.readdirSync(this.testFolder);
          console.log('Files in the directory:', allFiles);
    
          const files = allFiles.filter((file) => {
            const filePath = path.join(this.testFolder!, file);
            return (
              fs.statSync(filePath).isFile() &&
              file.toLowerCase().endsWith('.spec.ts') // filtering for only .spec.ts files
            );
          });
    
          if (files.length > 0) {
            console.log('List of tests in the folder:');
            files.forEach((file) => console.log(`- ${file}`));
          } else {
            console.log('No tests found in the folder.');
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Error listing files in directory ${this.testFolder}: ${error.message}`);
          } else {
            console.error(`Unexpected error occurred: ${error}`);
          }
        }
      } else {
        console.log('No test folder set.');
      }
    }
    
    
  }

  // calling the class
  const testManager = new TestManager();
  // calling the init method
  testManager.init();
