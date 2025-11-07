# Google Cloud Setup - Web Console Method

Since `gcloud` CLI isn't installed, follow these steps using the Google Cloud Console:

## Step 1: Enable APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **APIs & Services** → **Library**
4. Search for and enable:
   - **Cloud Speech-to-Text API**
   - **Cloud Text-to-Speech API**

Direct links:
- https://console.cloud.google.com/apis/library/speech.googleapis.com
- https://console.cloud.google.com/apis/library/texttospeech.googleapis.com

## Step 2: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
   - https://console.cloud.google.com/iam-admin/serviceaccounts
2. Click **+ CREATE SERVICE ACCOUNT**
3. Fill in:
   - **Name**: `zien-call-service`
   - **Description**: `Service account for Zien call system`
4. Click **CREATE AND CONTINUE**
5. Grant roles:
   - Add **Cloud Speech Client** role
   - Add **Cloud Text-to-Speech Client** role
6. Click **CONTINUE** → **DONE**

## Step 3: Create and Download Key

1. Find your new service account in the list
2. Click on it to open details
3. Go to **KEYS** tab
4. Click **ADD KEY** → **Create new key**
5. Choose **JSON** format
6. Click **CREATE**
7. Save the downloaded JSON file to:
   ```
   /Users/eyobdavidoff/Documents/GitHub/6.1040/concept_backend/zien-service-account.json
   ```

## Step 4: Update .env File

Copy `.env.example` to `.env` if you haven't already:
```bash
cp .env.example .env
```

Then add these lines to your `.env`:
```bash
GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
GOOGLE_APPLICATION_CREDENTIALS=/Users/eyobdavidoff/Documents/GitHub/6.1040/concept_backend/zien-service-account.json
```

Replace `your-actual-project-id` with your Google Cloud project ID (found in the console).

## Step 5: Verify Setup

Test that credentials work:
```bash
# This will be done when you restart the server
deno run start
```

Look for log messages like:
```
[GoogleCloud] Initialized with project: your-project-id
```

## Alternative: Use API Key (Development Only)

If you prefer to use an API key instead of service account:

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **API key**
3. Copy the generated key
4. Add to `.env`:
   ```bash
   GOOGLE_CLOUD_API_KEY=your-api-key-here
   # Comment out GOOGLE_APPLICATION_CREDENTIALS
   ```

**Note**: API keys are less secure and should only be used for development.

## Troubleshooting

**"Project not found"**
- Make sure you've selected the correct project in the console
- Verify the project ID matches what's in your `.env`

**"Permission denied"**
- Ensure the service account has both Speech and TTS client roles
- Wait a few minutes for permissions to propagate

**"File not found"**
- Check that the JSON key file path in `.env` is absolute
- Verify the file exists at that location
