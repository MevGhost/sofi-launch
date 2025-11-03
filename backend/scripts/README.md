# Database Scripts

This directory contains utility scripts for managing the database.

## Available Scripts

### init-test-data.ts
Initializes test data including admin addresses for development.

```bash
cd src/server
npx tsx scripts/init-test-data.ts
```

This will:
- Create initial settings if they don't exist
- Add default test admin addresses (Hardhat accounts)
- Set a default admin PIN (123456)

### add-test-admin.ts
Add a specific wallet address as an admin.

```bash
cd src/server
npx tsx scripts/add-test-admin.ts <wallet-address>
```

Example:
```bash
npx tsx scripts/add-test-admin.ts 0x1234567890123456789012345678901234567890
```

## Testing Admin Access

1. Run the initialization script:
   ```bash
   cd src/server
   npx tsx scripts/init-test-data.ts
   ```

2. Start the backend server:
   ```bash
   npm run dev
   ```

3. In your frontend app:
   - Connect with one of the admin wallet addresses
   - Navigate to `/dashboard/admin`
   - You should now have admin access

## Default Test Admin Addresses

The following addresses are set as admins by default (Hardhat test accounts):
- `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

To add your own wallet address:
```bash
npx tsx scripts/add-test-admin.ts <your-wallet-address>
```