# Budget Master 💰

A comprehensive personal finance management application built with React and Node.js. Track your income, expenses, budgets, loans, and credit cards all in one place.

## 🚀 Features

### Core Financial Management
- **Dashboard Overview**: Real-time financial metrics including net worth, income, expenses, and savings rate
- **Account Management**: Track multiple bank accounts (checking, savings, investment) with different currencies
- **Transaction Tracking**: Record and categorize income and expenses with detailed transaction history
- **Budget Planning**: Set monthly budgets by category and track spending against targets
- **Category Management**: Organize transactions with customizable categories (income, fixed expenses, variable expenses, savings goals)

### Advanced Features
- **Credit Card Management**: Track multiple credit cards with limits, balances, due dates, and APR
- **Loan Management**: Comprehensive loan tracking with amortization calculations
  - Support for fixed and variable rate loans
  - Early payment strategies (reduce term or reduce payment)
  - Payment history and interest tracking
  - Insurance cost tracking
- **Multi-Currency Support**: Handle multiple currencies with custom symbols and formatting
- **Localization & Preferences**: Support for English (US) and Spanish (ES), customizable base currencies, and UI settings
- **Luxury UI Design**: High-end interface featuring midnight blues, champagne gold accents, and elegant glassmorphism effects

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern React with hooks and context
- **Vite** - Fast build tool and development server
- **Tailwind CSS 4** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API requests
- **Lucide React** - Beautiful icon library
- **Recharts** - Charting library for financial visualizations

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Prisma** - Modern database toolkit and ORM
- **SQLite** - Lightweight database for development
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 📁 Project Structure

```
budget-master/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers
│   │   ├── pages/           # Main application pages
│   │   └── App.jsx          # Main application component
│   ├── package.json
│   └── vite.config.js
├── backend/                 # Node.js backend API
│   ├── src/
│   │   ├── controllers/     # Business logic controllers
│   │   ├── routes/          # API route definitions
│   │   └── db.js           # Database configuration
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── server.js           # Express server setup
│   └── package.json
└── README.md
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd budget-master
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Seed the database (optional)**
   ```bash
   node seed.js
   # To completely flush the database before seeding:
   # node seed.js --flush
   ```

5. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   # Server runs on http://localhost:5001
   ```

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

3. **Access the application**
   Open your browser and navigate to `http://localhost:5173`

## 📊 Database Schema

The application uses Prisma with SQLite and includes the following main entities:

- **Users**: User accounts and authentication
- **Accounts**: Bank accounts with balances and transaction history
- **Transactions**: Income and expense records with categorization
- **Categories**: Customizable transaction categories
- **Budgets**: Monthly budget allocations by category
- **Credit Cards**: Credit card tracking with limits and due dates
- **Loans**: Loan management with amortization calculations
- **Currencies**: Multi-currency support
- **Settings**: User preferences and configuration

## 🔧 API Endpoints

The backend provides RESTful API endpoints for:

- `/api/accounts` - Account management
- `/api/transactions` - Transaction operations
- `/api/categories` - Category management
- `/api/budgets` - Budget planning
- `/api/credit-cards` - Credit card tracking
- `/api/loans` - Loan management
- `/api/currencies` - Currency operations
- `/api/settings` - User settings
- `/api/health` - Health check endpoint

## 🎨 UI Features

- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern Interface**: Clean, intuitive design with Tailwind CSS
- **Dark/Light Theme**: Customizable theme preferences
- **Interactive Charts**: Visual representation of financial data
- **Real-time Updates**: Live data synchronization across components

## 📧 Automated Bank Synchronization (Email Parsing)

Budget Master includes a secure, privacy-first alternative to Open Banking APIs: **IMAP Email Syncing**. Instead of giving third parties your banking passwords, the system can read purchase notification emails generated by your bank and automatically queue them as Pending Transactions.

### Configuration Guide

1. **Go to Settings > Email Sync** in the application.
2. **Setup IMAP**: Provide your email provider's IMAP Host (e.g., `imap.gmail.com`), Port (usually `993`), your Email Address, and an **App Password** (do not use your primary email password).
3. **Create Parsing Rules**: Tell the system how to read your bank's emails using Regular Expressions (Regex).
   * **Sender Email**: The email address your bank uses to send purchase alerts (e.g. `notificaciones@mibank.com`).
   * **Body Regex**: The expression used to extract the transaction data. Use capture groups `()` to pinpoint the data. Example: `Comercio:\s*(.*?)\s*Monto:\s*([A-Z]{3})\s*([\d,.]+)`
   * **Group Indices**: Map your capture groups to the required fields. For the example regex above:
     * Merchant Group: `1` (The text captured by `(.*?)`)
     * Currency Group (Optional): `2` (The 3-letter currency code `([A-Z]{3})`)
     * Amount Group: `3` (The numeric value `([\d,.]+)`)
4. **Approve Transactions**: Visit the **Transactions** page. New bank alerts will appear in the golden "Inbox Queue" at the top of the page. Select the proper Account and Category, and click "Approve & Save" to post it to your ledger.

## 🔮 Future Enhancements

- Investment portfolio tracking
- Bill reminders and notifications
- Financial goal setting and tracking
- Data export and reporting
- Bank account integration
- Advanced analytics and insights

## Development Workflow

### Unified Command (Recommended)
You can now start both the backend and frontend with a single command from the root directory:

```bash
npm run dev
```

This uses `concurrently` to run the Vite dev server and Nodemon simultaneously.

### Using PM2
Alternatively, you can manage both services using PM2:

```bash
pm2 start ecosystem.dev.config.cjs
```

This will launch:
- `personal-finance-app-api`: Backend (port 5001) with watch mode enabled.
- `personal-finance-app-ui`: Frontend (port 5173).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

If you encounter any issues or have questions, please open an issue on the repository or contact the development team.

---

**Budget Master** - Take control of your finances with confidence! 🎯