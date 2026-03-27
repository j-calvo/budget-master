import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  'en-US': {
    translation: {
      "Dashboard": "Dashboard",
      "Accounts": "Accounts",
      "Credit Cards": "Credit Cards",
      "Loans": "Loans",
      "Transactions": "Transactions",
      "Budgets": "Budgets",
      "Analytics": "Analytics",
      "Settings": "Settings",
      
      "Overview": "Overview",
      "Net Worth": "Net Worth",
      "Total Income (This Month)": "Total Income (This Month)",
      "Total Expenses (This Month)": "Total Expenses (This Month)",
      "Savings Rate": "Savings Rate",
      "Cash Flow (6 Months)": "Cash Flow (6 Months)",
      "Recent Transactions": "Recent Transactions",
      "No recent transactions": "No recent transactions",
      
      "Global Settings": "Global Settings",
      "Localization & Format": "Localization & Format",
      "Data Management": "Data Management",
      "Localization Preferences": "Localization Preferences",
      "System Language": "System Language",
      "Default Display Currency": "Default Display Currency",
      "Dictates date formats and UI translations": "Dictates date formats and UI translations.",
      "Used for aggregate dashboard numbers": "Used for aggregate dashboard numbers.",
      "Save Preferences": "Save Preferences",
      "Saving...": "Saving...",

      // Accounts
      "Add Account": "Add Account",
      "No accounts added yet.": "No accounts added yet.",
      "Add Your First Account": "Add Your First Account",
      "Edit Account": "Edit Account",
      "Add New Account": "Add New Account",
      "Account Name": "Account Name",
      "Institution / Bank": "Institution / Bank",
      "Account Type": "Account Type",
      "Currency": "Currency",
      "Starting Balance": "Starting Balance",
      "Cancel": "Cancel",
      "Save Changes": "Save Changes",
      "Save Account": "Save Account",

      // Budgets
      "Create Budget": "Create Budget",
      "No budgets set for this month.": "No budgets set for this month.",
      "Create Your First Budget": "Create Your First Budget",
      "Edit Budget": "Edit Budget",
      "Set Budget": "Set Budget",
      "Category": "Category",
      "Monthly Amount": "Monthly Amount",
      "Delete Budget?": "Delete Budget?",
      "Delete": "Delete",

      // Transactions
      "Import CSV": "Import CSV",
      "Export CSV": "Export CSV",
      "New Transaction": "New Transaction",
      "Description": "Description",
      "Date": "Date",
      "Amount": "Amount",
      "Actions": "Actions",
      "Expense": "Expense",
      "Income": "Income",
      "Account": "Account",
      "Save Transaction": "Save Transaction",
      "Edit Transaction": "Edit Transaction",
      "Add Transaction": "Add Transaction",
      "No transactions found.": "No transactions found.",

      // Credit Cards
      "Add Credit Card": "Add Credit Card",
      "No credit cards added yet.": "No credit cards added yet.",
      "Add Your First Card": "Add Your First Card",
      "Credit Limit": "Credit Limit",
      "Current Balance": "Current Balance",
      "APR (%)": "APR (%)",
      "Due Date (Day)": "Due Date (Day)",
      "Save Card": "Save Card",
      "Delete Credit Card?": "Delete Credit Card?",

      // Loans
      "Add Loan": "Add Loan",
      "No loans tracked yet.": "No loans tracked yet.",
      "Add Your First Loan": "Add Your First Loan",
      "Loan Name": "Loan Name",
      "Loan Amount": "Loan Amount",
      "Interest Rate (% APR)": "Interest Rate (% APR)",
      "Term (Months)": "Term (Months)",
      "Insurance Cost / month": "Insurance Cost / month",
      "Start Date": "Start Date",
      "Early Payment Strategy": "Early Payment Strategy",
      "Save Loan": "Save Loan",
      "Register Installment": "Register Installment",
      "Early Payment": "Early Payment",

      // Analytics
      "Deep dive into your financial patterns": "Deep dive into your financial patterns",
      "Spending by Category": "Spending by Category",
      "Income vs Expenses": "Income vs Expenses",
      "Budgets vs Spends": "Budgets vs Spends",
      "Top Largest Expenses": "Top Largest Expenses"
    }
  },
  'es-ES': {
    translation: {
      "Dashboard": "Panel de Control",
      "Accounts": "Cuentas",
      "Credit Cards": "Tarjetas",
      "Loans": "Préstamos",
      "Transactions": "Transacciones",
      "Budgets": "Presupuestos",
      "Analytics": "Análisis",
      "Settings": "Configuración",
      
      "Overview": "Descripción General",
      "Net Worth": "Patrimonio Neto",
      "Total Income (This Month)": "Ingresos (Este Mes)",
      "Total Expenses (This Month)": "Gastos (Este Mes)",
      "Savings Rate": "Tasa de Ahorro",
      "Cash Flow (6 Months)": "Flujo de Caja (6 Meses)",
      "Recent Transactions": "Transacciones Recientes",
      "No recent transactions": "No hay transacciones recientes",
      
      "Global Settings": "Configuración Global",
      "Localization & Format": "Localización y Formato",
      "Data Management": "Gestión de Datos",
      "Localization Preferences": "Preferencias de Localización",
      "System Language": "Idioma del Sistema",
      "Default Display Currency": "Moneda Predeterminada",
      "Dictates date formats and UI translations": "Establece formatos de fecha y traducciones principales.",
      "Used for aggregate dashboard numbers": "Usado para los totales del panel de control.",
      "Save Preferences": "Guardar Preferencias",
      "Saving...": "Guardando...",

      // Accounts
      "Add Account": "Añadir Cuenta",
      "No accounts added yet.": "No hay cuentas todavía.",
      "Add Your First Account": "Añade Tu Primera Cuenta",
      "Edit Account": "Editar Cuenta",
      "Add New Account": "Añadir Nueva Cuenta",
      "Account Name": "Nombre de Cuenta",
      "Institution / Bank": "Institución / Banco",
      "Account Type": "Tipo de Cuenta",
      "Currency": "Moneda",
      "Starting Balance": "Saldo Inicial",
      "Cancel": "Cancelar",
      "Save Changes": "Guardar Cambios",
      "Save Account": "Guardar Cuenta",

      // Budgets
      "Create Budget": "Crear Presupuesto",
      "No budgets set for this month.": "Sin presupuestos este mes.",
      "Create Your First Budget": "Crea Tu Primer Presupuesto",
      "Edit Budget": "Editar Presupuesto",
      "Set Budget": "Definir Presupuesto",
      "Category": "Categoría",
      "Monthly Amount": "Monto Mensual",
      "Delete Budget?": "¿Eliminar Presupuesto?",
      "Delete": "Eliminar",

      // Transactions
      "Import CSV": "Importar CSV",
      "Export CSV": "Exportar CSV",
      "New Transaction": "Nueva Transacción",
      "Description": "Descripción",
      "Date": "Fecha",
      "Amount": "Monto",
      "Actions": "Acciones",
      "Expense": "Gasto",
      "Income": "Ingreso",
      "Account": "Cuenta",
      "Save Transaction": "Guardar Transacción",
      "Edit Transaction": "Editar Transacción",
      "Add Transaction": "Añadir Transacción",
      "No transactions found.": "No se encontraron transacciones.",

      // Credit Cards
      "Add Credit Card": "Añadir Tarjeta",
      "No credit cards added yet.": "No hay tarjetas todavía.",
      "Add Your First Card": "Añade Tu Primera Tarjeta",
      "Credit Limit": "Límite de Crédito",
      "Current Balance": "Saldo Actual",
      "APR (%)": "APR (%)",
      "Due Date (Day)": "Día de Pago",
      "Save Card": "Guardar Tarjeta",
      "Delete Credit Card?": "¿Eliminar Tarjeta?",

      // Loans
      "Add Loan": "Añadir Préstamo",
      "No loans tracked yet.": "No hay préstamos todavía.",
      "Add Your First Loan": "Añade Tu Primer Préstamo",
      "Loan Name": "Nombre del Préstamo",
      "Loan Amount": "Monto",
      "Interest Rate (% APR)": "Tasa de Interés (% APR)",
      "Term (Months)": "Plazo (Meses)",
      "Insurance Cost / month": "Seguro Mensual",
      "Start Date": "Fecha de Inicio",
      "Early Payment Strategy": "Estrategia de Pago",
      "Save Loan": "Guardar Préstamo",
      "Register Installment": "Registrar Cuota",
      "Early Payment": "Pago Adelantado",

      // Analytics
      "Deep dive into your financial patterns": "Analiza tus patrones financieros",
      "Spending by Category": "Gastos por Categoría",
      "Income vs Expenses": "Ingresos vs Gastos",
      "Budgets vs Spends": "Presupuestos vs Gastos",
      "Top Largest Expenses": "Mayores Gastos"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en-US", // Default language
    fallbackLng: "en-US",
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
