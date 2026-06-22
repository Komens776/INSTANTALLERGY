# InstaAllergy: Your Personal Food Allergen Detector

This file is the instruction manual for setting up and running the InstaAllergy app on your own computer.

## How to Run This App Locally

Follow these three simple steps to get the app working.

### Step 1: Provide Your Secret AI Key

The app uses Google's AI (called Gemini) to recognize food from pictures. To use this feature, you need a special "key," which is free to get.

1.  **Get your key:** Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and click to get your free API key.
2.  **Create a secret file:** In the main folder of this project, create a new file and name it exactly `.env`.
3.  **Add your key to the file:** Open that new `.env` file and add the following line. Be sure to paste your own key where it says `YOUR_API_KEY_HERE`:

    `GOOGLE_API_KEY="YOUR_API_KEY_HERE"`

    This `.env` file is special because it keeps your key safe and private.

### Step 2: Install the App's Building Blocks

This app is made of many different code packages. You can install all of them with a single command.

1.  Open your computer's terminal (like Command Prompt, PowerShell, or the Terminal app on a Mac).
2.  Navigate into this project's main folder.
3.  Run this command:

    ```bash
    npm install
    ```
    This might take a minute or two to download everything it needs.

### Step 3: Start the App!

Now you're ready to see the app in action.

1.  In the same terminal, run this command:

    ```bash
    npm run dev
    ```

2.  Open your favorite web browser and go to this address: [http://localhost:9002](http://localhost:9002)

You should now see the InstaAllergy app running right on your computer!
