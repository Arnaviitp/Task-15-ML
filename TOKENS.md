# How to Generate an Instagram Basic Display API Access Token

To connect your real Instagram account to this application, you need to generate an **Access Token** using the Facebook Developers platform. Follow the steps below.

## Prerequisites
- A **Facebook Developer Account** (create at [developers.facebook.com](https://developers.facebook.com/)).
- An **Instagram Account** with media posts.

## Step 1: Create a Facebook App
1. Go to [My Apps](https://developers.facebook.com/apps/) on the Facebook Developers dashboard.
2. Click **Create App**.
3. Select **Consumer** as the app type and click **Next**.
4. Enter a **Display Name** (e.g., "My Comment Generator") and your contact email.
5. Click **Create App**.

## Step 2: Set Up Instagram Basic Display
1. On your app dashboard, find **Instagram Basic Display** and click **Set Up**.
2. Scroll to the bottom and click **Create New App**.
3. Click **Create App** again in the confirmation modal.

## Step 3: Configure Basic Settings
1. Go to **Settings > Basic** in the left sidebar.
2. Scroll down and click **Add Platform**.
3. Select **Website**.
4. Enter `http://localhost:5173/` (or your actual Site URL) in the **Site URL** field.
5. Click **Save Changes**.

## Step 4: Add an Instagram Tester
1. Go to **Roles > Roles**.
2. Scroll down to the **Instagram Testers** section.
3. Click **Add Instagram Testers**.
4. Enter your Instagram **username** and select your account.
5. **Important**: Log in to that Instagram account (e.g., on your phone or web), go to **Settings > Apps and Websites > Tester Invites**, and **Accept** the invite.

## Step 5: Generate the Token
1. Go back to **Instagram Basic Display > Basic Display**.
2. Scroll down to the **User Token Generator** section.
3. You should see your Instagram account listed there. Click **Generate Token**.
4. Log in to your Instagram account if prompted and authorize the app.
5. Check the box "I understand..." and copy the **Access Token**.

## Step 6: Connect to the App
1. Go to your **SocialAI Dashboard**.
2. Navigate to **Settings > Connected Accounts**.
3. Click **Connect** on the Instagram card.
4. Select **Developer Mode (Real)**.
5. Paste your **Access Token** into the field.
6. Click **Connect Account**.

You can now fetch your real Instagram posts!
