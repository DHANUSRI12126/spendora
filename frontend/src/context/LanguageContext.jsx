import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const LANGUAGES = {
  en: { code: 'en', name: 'English', flag: '🇬🇧', speechLang: 'en-US' },
  ta: { code: 'ta', name: 'தமிழ் (Tamil)', flag: '🇮🇳', speechLang: 'ta-IN' },
  te: { code: 'te', name: 'తెలుగు (Telugu)', flag: '🇮🇳', speechLang: 'te-IN' },
  hi: { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳', speechLang: 'hi-IN' },
  es: { code: 'es', name: 'Español', flag: '🇪🇸', speechLang: 'es-ES' }
};

const translations = {
  en: {
    // Navigation & Workspace
    workspace: 'Workspace',
    controlPanel: 'Control Panel',
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    budgets: 'Budgets',
    groups: 'Groups',
    reports: 'Reports',
    aiInsights: 'AI Insights',
    voiceAssistant: 'Voice Assistant',
    profile: 'Profile',
    logout: 'Log Out',
    adminPanel: 'Admin Panel',

    // Headers & Subtitles
    transactionsHistory: 'Transactions History',
    transactionsSubtitle: 'Manage, filter, and track all your logged incomes and expenses.',
    budgetPlanning: 'Budget Planning',
    budgetSubtitle: 'Establish monthly limits and track spending thresholds per category.',
    sharedGroups: 'Shared Groups Ledger',
    sharedGroupsSubtitle: 'Split bills, manage shared household items, or organize trip expenses.',
    reportsAnalytics: 'Reports & Charts Analytics',
    reportsSubtitle: 'Visualize financial trends, monthly cash flows, and category distributions.',
    exportPdfReport: 'Monthly Expense Report PDF',
    exportPdfSubtitle: 'Generate and download a branded, itemized PDF statement for any month.',
    downloadPdf: 'Download PDF Report',
    generatingPdf: 'Generating PDF...',
    selectMonth: 'Select Month',
    selectYear: 'Select Year',
    aiTelemetry: 'Spendora AI Telemetry Observations',
    voiceCommandCenter: 'Voice Command Center',

    // Dashboard Cards & Actions
    totalBalance: 'Total Balance',
    monthlyIncome: 'Monthly Income',
    monthlySpent: 'Monthly Spent',
    activeGroups: 'Active Groups',
    monthlyCashFlow: 'Monthly Cash Flow',
    monthlyBudget: 'Monthly Budget',
    recentTransactions: 'Recent Transactions',
    expensesByCategory: 'Expenses by Category',
    addExpense: '+ Add Expense',
    addIncome: '+ Add Income',
    setBudget: 'Set Budget',
    viewAll: 'View All',
    utilization: 'Utilization',
    remaining: 'Remaining',
    safeStatus: 'Safe: Expenses are well within limits.',
    warningStatus: 'Warning: Approaching monthly budget threshold.',
    exceededStatus: 'Exceeded! Budget limit crossed.',

    // Transaction Filters & Table
    searchPlaceholder: 'Search by transaction description...',
    allTypes: 'All Types',
    incomeOnly: 'Income Only',
    expenseOnly: 'Expenses Only',
    allCategories: 'All Categories',
    dateRange: 'Date Range:',
    to: 'to',
    sort: 'Sort:',
    desc: 'DESC',
    asc: 'ASC',
    colDate: 'DATE',
    colNameSource: 'NAME/SOURCE',
    colCategory: 'CATEGORY',
    colPaymentMethod: 'PAYMENT METHOD',
    colAmount: 'AMOUNT',
    colType: 'TYPE',
    colActions: 'ACTIONS',
    noTransactions: 'No transactions logged yet.',
    incomeType: 'INCOME',
    expenseType: 'EXPENSE',

    // Common Buttons & Modals
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    edit: 'Edit',
    delete: 'Delete',
    amount: 'Amount',
    category: 'Category',
    date: 'Date',
    description: 'Description',
    paymentMethod: 'Payment Method',
    source: 'Source',

    // Categories
    cat_Food: 'Food',
    cat_Transport: 'Transport',
    cat_Healthcare: 'Healthcare',
    cat_Shopping: 'Shopping',
    cat_Rent: 'Rent',
    cat_Bills: 'Bills',
    cat_Entertainment: 'Entertainment',
    cat_Travel: 'Travel',
    cat_Education: 'Education',
    cat_Salary: 'Salary',
    cat_Freelance: 'Freelance',
    cat_Business: 'Business',
    cat_Gift: 'Gift',
    cat_Other: 'Other'
  },
  ta: {
    // Navigation & Workspace
    workspace: 'பணிவிடம்',
    controlPanel: 'நிர்வாக பேனல்',
    dashboard: 'முகப்பு பலகை',
    transactions: 'பரிவர்த்தனைகள்',
    budgets: 'பட்ஜெட்டுகள்',
    groups: 'குழுக்கள்',
    reports: 'அறிக்கைகள்',
    aiInsights: 'AI நுண்ணறிவு',
    voiceAssistant: 'குரல் உதவியாளர்',
    profile: 'சுயவிவரம்',
    logout: 'வெளியேறு',
    adminPanel: 'நிர்வாக பலகை',

    // Headers & Subtitles
    transactionsHistory: 'பரிவர்த்தனை வரலாறு',
    transactionsSubtitle: 'உங்கள் வருமானம் மற்றும் செலவுப் பதிவுகளை நிர்வகித்து கண்காணிக்கவும்.',
    budgetPlanning: 'பட்ஜெட் திட்டமிடல்',
    budgetSubtitle: 'மாதாந்திர வரம்புகளை அமைத்து ஒவ்வொரு பிரிவிலும் செலவைக் கண்காணிக்கவும்.',
    sharedGroups: 'பகிர்வு குழு பதிவேடு',
    sharedGroupsSubtitle: 'பில்களைப் பகிர்ந்து கொள்ளுங்கள், வீட்டுச் செலவுகள் அல்லது பயணச் செலவுகளை நிர்வகிக்கவும்.',
    reportsAnalytics: 'அறிக்கைகள் & பகுப்பாய்வு',
    reportsSubtitle: 'நிதிப் போக்குகள், மாதாந்திர பணப்புழக்கம் மற்றும் வகை பங்கீட்டைப் பாருங்கள்.',
    aiTelemetry: 'ஸ்பெண்டோரா AI அவதானிப்புகள்',
    voiceCommandCenter: 'குரல் கட்டளை மையம்',

    // Dashboard Cards & Actions
    totalBalance: 'மொத்த இருப்பு',
    monthlyIncome: 'மாதாந்திர வருமானம்',
    monthlySpent: 'மாதாந்திர செலவு',
    activeGroups: 'செயலில் உள்ள குழுக்கள்',
    monthlyCashFlow: 'மாதாந்திர பணப் புழக்கம்',
    monthlyBudget: 'மாதாந்திர பட்ஜெட்',
    recentTransactions: 'சமீபத்திய பரிவர்த்தனைகள்',
    expensesByCategory: 'வகை வாரியாக செலவுகள்',
    addExpense: '+ செலவைச் சேர்',
    addIncome: '+ வருமானம் சேர்',
    setBudget: 'பட்ஜெட் அமை',
    viewAll: 'அனைத்தையும் பார்',
    utilization: 'பயன்பாடு',
    remaining: 'மீதம்',
    safeStatus: 'பாதுகாப்பானது: செலவு பட்ஜெட் வரம்பிற்குள் உள்ளது.',
    warningStatus: 'எச்சரிக்கை: பட்ஜெட் வரம்பை நெருங்குகிறது.',
    exceededStatus: 'வரம்பு மீறியது! பட்ஜெட் தாண்டிவிட்டது.',

    // Transaction Filters & Table
    searchPlaceholder: 'விளக்கம் மூலம் தேடுங்கள்...',
    allTypes: 'எல்லா வகைகளும்',
    incomeOnly: 'வருமானம் மட்டும்',
    expenseOnly: 'செலவு மட்டும்',
    allCategories: 'எல்லா பிரிவுகளும்',
    dateRange: 'தேதி வரம்பு:',
    to: 'முதல்',
    sort: 'வரிசைப்படுத்து:',
    desc: 'இறங்குவரிசை',
    asc: 'ஏறுவரிசை',
    colDate: 'தேதி',
    colNameSource: 'பெயர் / ஆதாரம்',
    colCategory: 'பிரிவு',
    colPaymentMethod: 'செலுத்தும் முறை',
    colAmount: 'தொகை',
    colType: 'வகை',
    colActions: 'செயல்கள்',
    noTransactions: 'பரிவர்த்தனைகள் எதுவும் இல்லை.',
    incomeType: 'வருமானம்',
    expenseType: 'செலவு',

    // Common Buttons & Modals
    save: 'சேமி',
    cancel: 'ரத்து செய்',
    confirm: 'உறுதிசெய்',
    edit: 'திருத்து',
    delete: 'நீக்கு',
    amount: 'தொகை',
    category: 'வகை',
    date: 'தேதி',
    description: 'விளக்கம்',
    paymentMethod: 'செலுத்தும் முறை',
    source: 'ஆதாரம்',

    // Categories
    cat_Food: 'உணவு',
    cat_Transport: 'போக்குவரத்து',
    cat_Healthcare: 'சுகாதாரம்',
    cat_Shopping: 'கொள்முதல்',
    cat_Rent: 'வாடகை',
    cat_Bills: 'பில்கள்',
    cat_Entertainment: 'பொழுதுபோக்கு',
    cat_Travel: 'பயணம்',
    cat_Education: 'கல்வி',
    cat_Salary: 'சம்பளம்',
    cat_Freelance: 'ஃப்ரீலான்ஸ்',
    cat_Business: 'வியாபாரம்',
    cat_Gift: 'பரிசு',
    cat_Other: 'மற்றவை'
  },
  te: {
    // Navigation & Workspace
    workspace: 'వర్క్‌స్పేస్',
    controlPanel: 'నియంత్రణ ప్యానెల్',
    dashboard: 'డ్యాష్‌బోర్డ్',
    transactions: 'లావాదేవీలు',
    budgets: 'బడ్జెట్‌లు',
    groups: 'గ్రూప్‌లు',
    reports: 'నివేదికలు',
    aiInsights: 'AI అంతర్దృష్టులు',
    voiceAssistant: 'వాయిస్ అసిస్టెంట్',
    profile: 'ప్రొఫైల్',
    logout: 'లాగ్ అవుట్',
    adminPanel: 'అడ్మిన్ ప్యానెల్',

    // Headers & Subtitles
    transactionsHistory: 'లావాదేవీల చరిత్ర',
    transactionsSubtitle: 'మీ అన్ని ఆదాయాలు మరియు ఖర్చుల నమోదులను నిర్వహించండి మరియు పర్యవేక్షించండి.',
    budgetPlanning: 'బడ్జెట్ ప్రణాళిక',
    budgetSubtitle: 'నెలవారీ పరిమితులను సెట్ చేయండి మరియు వర్గం వారీగా ఖర్చు పరిమితులను ట్రాక్ చేయండి.',
    sharedGroups: 'భాగస్వామ్య గ్రూప్ లెడ్జర్',
    sharedGroupsSubtitle: 'బిల్లులను పంచుకోండి, ఇంటి ఖర్చులను లేదా ప్రయాణ ఖర్చులను నిర్వహించండి.',
    reportsAnalytics: 'నివేదికలు & విశ్లేషణలు',
    reportsSubtitle: 'ఆర్థిక పోకడలు, నెలవారీ నగదు ప్రవాహం మరియు వర్గాల పంపిణీని చూడండి.',
    aiTelemetry: 'స్పెండోరా AI పరిశీలనలు',
    voiceCommandCenter: 'వాయిస్ కమాండ్ సెంటర్',

    // Dashboard Cards & Actions
    totalBalance: 'మొత్తం నిల్వ',
    monthlyIncome: 'నెలవారీ ఆదాయం',
    monthlySpent: 'నెలవారీ ఖర్చు',
    activeGroups: 'యాక్టివ్ గ్రూప్‌లు',
    monthlyCashFlow: 'నెలవారీ నగదు ప్రవాహం',
    monthlyBudget: 'నెలవారీ బడ్జెట్',
    recentTransactions: 'ఇటీవలి లావాదేవీలు',
    expensesByCategory: 'వర్గం వారీగా ఖర్చులు',
    addExpense: '+ ఖర్చు జోడించు',
    addIncome: '+ ఆదాయం జోడించు',
    setBudget: 'బడ్జెట్ సెట్ చేయి',
    viewAll: 'అన్నీ చూడండి',
    utilization: 'వినియోగం',
    remaining: 'మిగిలినది',
    safeStatus: 'సురక్షితం: ఖర్చులు బడ్జెట్ పరిమితిలోనే ఉన్నాయి.',
    warningStatus: 'హెచ్చరిక: బడ్జెట్ పరిమితికి సమీపిస్తోంది.',
    exceededStatus: 'పరిమితి దాటింది! బడ్జెట్ దాటిపోయింది.',

    // Transaction Filters & Table
    searchPlaceholder: 'వివరణ ద్వారా శోధించండి...',
    allTypes: 'అన్ని రకాలు',
    incomeOnly: 'కేవలం ఆదాయం',
    expenseOnly: 'కేవలం ఖర్చులు',
    allCategories: 'అన్ని వర్గాలు',
    dateRange: 'తేదీ పరిధి:',
    to: 'నుండి',
    sort: 'వరుసక్రమం:',
    desc: 'అవరోహణ',
    asc: 'ఆరోహణ',
    colDate: 'తేదీ',
    colNameSource: 'పేరు / మూలం',
    colCategory: 'వర్గం',
    colPaymentMethod: 'చెల్లింపు పద్ధతి',
    colAmount: 'మొత్తం',
    colType: 'రకం',
    colActions: 'చర్యలు',
    noTransactions: 'ఎటువంటి లావాదేవీలు లేవు.',
    incomeType: 'ఆదాయం',
    expenseType: 'ఖర్చు',

    // Common Buttons & Modals
    save: 'సేవ్ చేయి',
    cancel: 'రద్దు చేయి',
    confirm: 'నిర్ధారించు',
    edit: 'సవరించు',
    delete: 'తొలగించు',
    amount: 'మొత్తం',
    category: 'వర్గం',
    date: 'తేదీ',
    description: 'వివరణ',
    paymentMethod: 'చెల్లింపు పద్ధతి',
    source: 'మూలం',

    // Categories
    cat_Food: 'ఆహారం',
    cat_Transport: 'రవాణా',
    cat_Healthcare: 'ఆరోగ్య సంరక్షణ',
    cat_Shopping: 'షాపింగ్',
    cat_Rent: 'అద్దె',
    cat_Bills: 'బిల్లులు',
    cat_Entertainment: 'వినోదం',
    cat_Travel: 'ప్రయాణం',
    cat_Education: 'విద్య',
    cat_Salary: 'జీతం',
    cat_Freelance: 'ఫ్రీలాన్స్',
    cat_Business: 'వ్యాపారం',
    cat_Gift: 'బహుమతి',
    cat_Other: 'ఇతర'
  },
  hi: {
    // Navigation & Workspace
    workspace: 'कार्यक्षेत्र',
    controlPanel: 'नियंत्रण पैनल',
    dashboard: 'डैशबोर्ड',
    transactions: 'लेन-देन',
    budgets: 'बजट',
    groups: 'समूह',
    reports: 'रिपोर्ट',
    aiInsights: 'AI इनसाइट्स',
    voiceAssistant: 'वॉयस असिस्टेंट',
    profile: 'प्रोफ़ाइल',
    logout: 'लॉग आउट',
    adminPanel: 'एडमिन पैनल',

    // Headers & Subtitles
    transactionsHistory: 'लेन-देन का इतिहास',
    transactionsSubtitle: 'अपने सभी आय और व्यय रिकॉर्ड का प्रबंधन और ट्रैक करें।',
    budgetPlanning: 'बजट योजना',
    budgetSubtitle: 'मासिक सीमाएं निर्धारित करें और श्रेणी के अनुसार खर्च ट्रैक करें।',
    sharedGroups: 'साझा समूह लेजर',
    sharedGroupsSubtitle: 'बिल विभाजित करें, घरेलू खर्चों का प्रबंधन करें या यात्रा खर्च व्यवस्थित करें।',
    reportsAnalytics: 'रिपोर्ट और विश्लेषण',
    reportsSubtitle: 'वित्तीय रुझान, मासिक कैश फ्लो और श्रेणी वितरण देखें।',
    aiTelemetry: 'स्पेंडोरा AI अवलोकन',
    voiceCommandCenter: 'वॉयस कमांड सेंटर',

    // Dashboard Cards & Actions
    totalBalance: 'कुल शेष',
    monthlyIncome: 'मासिक आय',
    monthlySpent: 'मासिक खर्च',
    activeGroups: 'सक्रिय समूह',
    monthlyCashFlow: 'मासिक कैश फ्लो',
    monthlyBudget: 'मासिक बजट',
    recentTransactions: 'हाल के लेन-देन',
    expensesByCategory: 'श्रेणी के अनुसार खर्च',
    addExpense: '+ खर्च जोड़ें',
    addIncome: '+ आय जोड़ें',
    setBudget: 'बजट निर्धारित करें',
    viewAll: 'सभी देखें',
    utilization: 'उपयोग',
    remaining: 'शेष',
    safeStatus: 'सुरक्षित: खर्च बजट सीमा के भीतर हैं।',
    warningStatus: 'चेतावनी: बजट सीमा के करीब पहुँच रहे हैं।',
    exceededStatus: 'सीमा पार! बजट पार हो गया।',

    // Transaction Filters & Table
    searchPlaceholder: 'विवरण द्वारा खोजें...',
    allTypes: 'सभी प्रकार',
    incomeOnly: 'केवल आय',
    expenseOnly: 'केवल व्यय',
    allCategories: 'सभी श्रेणियां',
    dateRange: 'तिथि सीमा:',
    to: 'तक',
    sort: 'क्रमानुसार:',
    desc: 'अवरोही',
    asc: 'आरोही',
    colDate: 'तिथि',
    colNameSource: 'नाम / स्रोत',
    colCategory: 'श्रेणी',
    colPaymentMethod: 'भुगतान का तरीका',
    colAmount: 'राशि',
    colType: 'प्रकार',
    colActions: 'कार्रवाइयां',
    noTransactions: 'कोई लेन-देन नहीं मिला।',
    incomeType: 'आय',
    expenseType: 'व्यय',

    // Common Buttons & Modals
    save: 'सहेजें',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    edit: 'संपादित करें',
    delete: 'हटाएं',
    amount: 'राशि',
    category: 'श्रेणी',
    date: 'तिथि',
    description: 'विवरण',
    paymentMethod: 'भुगतान का तरीका',
    source: 'स्रोत',

    // Categories
    cat_Food: 'भोजन',
    cat_Transport: 'परिवहन',
    cat_Healthcare: 'स्वास्थ्य सेवा',
    cat_Shopping: 'खरीदारी',
    cat_Rent: 'किराया',
    cat_Bills: 'बिल',
    cat_Entertainment: 'मनोरंजन',
    cat_Travel: 'यात्रा',
    cat_Education: 'शिक्षा',
    cat_Salary: 'वेतन',
    cat_Freelance: 'फ्रीलांस',
    cat_Business: 'व्यापार',
    cat_Gift: 'उपहार',
    cat_Other: 'अन्य'
  },
  es: {
    // Navigation & Workspace
    workspace: 'Espacio de trabajo',
    controlPanel: 'Panel de control',
    dashboard: 'Panel principal',
    transactions: 'Transacciones',
    budgets: 'Presupuestos',
    groups: 'Grupos',
    reports: 'Reportes',
    aiInsights: 'Perspectivas AI',
    voiceAssistant: 'Asistente de voz',
    profile: 'Perfil',
    logout: 'Cerrar sesión',
    adminPanel: 'Panel de administración',

    // Headers & Subtitles
    transactionsHistory: 'Historial de Transacciones',
    transactionsSubtitle: 'Administre, filtre y realice un seguimiento de sus ingresos y gastos.',
    budgetPlanning: 'Planificación de Presupuesto',
    budgetSubtitle: 'Establezca límites mensuales y realice un seguimiento de los umbrales.',
    sharedGroups: 'Libro Mayor de Grupos',
    sharedGroupsSubtitle: 'Divida facturas, administre gastos compartidos o viajes.',
    reportsAnalytics: 'Reportes y Analíticas',
    reportsSubtitle: 'Visualice tendencias financieras, flujos de caja y distribuciones.',
    aiTelemetry: 'Observaciones IA Spendora',
    voiceCommandCenter: 'Centro de Comandos de Voz',

    // Dashboard Cards & Actions
    totalBalance: 'Saldo Total',
    monthlyIncome: 'Ingresos Mensuales',
    monthlySpent: 'Gastos Mensuales',
    activeGroups: 'Grupos Activos',
    monthlyCashFlow: 'Flujo de Caja Mensual',
    monthlyBudget: 'Presupuesto Mensual',
    recentTransactions: 'Transacciones Recientes',
    expensesByCategory: 'Gastos por Categoría',
    addExpense: '+ Agregar Gasto',
    addIncome: '+ Agregar Ingreso',
    setBudget: 'Establecer Presupuesto',
    viewAll: 'Ver Todo',
    utilization: 'Utilización',
    remaining: 'Restante',
    safeStatus: 'Seguro: Gastos dentro de los límites.',
    warningStatus: 'Advertencia: Cerca del límite presupuestario.',
    exceededStatus: '¡Límite Excedido!',

    // Transaction Filters & Table
    searchPlaceholder: 'Buscar por descripción...',
    allTypes: 'Todos los Tipos',
    incomeOnly: 'Solo Ingresos',
    expenseOnly: 'Solo Gastos',
    allCategories: 'Todas las Categorías',
    dateRange: 'Rango de fechas:',
    to: 'a',
    sort: 'Ordenar:',
    desc: 'DESC',
    asc: 'ASC',
    colDate: 'FECHA',
    colNameSource: 'NOMBRE / FUENTE',
    colCategory: 'CATEGORÍA',
    colPaymentMethod: 'MÉTODO DE PAGO',
    colAmount: 'MONTO',
    colType: 'TIPO',
    colActions: 'ACCIONES',
    noTransactions: 'No hay transacciones registradas.',
    incomeType: 'INGRESO',
    expenseType: 'GASTO',

    // Common Buttons & Modals
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    edit: 'Editar',
    delete: 'Eliminar',
    amount: 'Monto',
    category: 'Categoría',
    date: 'Fecha',
    description: 'Descripción',
    paymentMethod: 'Método de pago',
    source: 'Fuente',

    // Categories
    cat_Food: 'Comida',
    cat_Transport: 'Transporte',
    cat_Healthcare: 'Salud',
    cat_Shopping: 'Compras',
    cat_Rent: 'Alquiler',
    cat_Bills: 'Facturas',
    cat_Entertainment: 'Entretenimiento',
    cat_Travel: 'Viajes',
    cat_Education: 'Educación',
    cat_Salary: 'Salario',
    cat_Freelance: 'Freelance',
    cat_Business: 'Negocios',
    cat_Gift: 'Regalo',
    cat_Other: 'Otros'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('spendora_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('spendora_language', language);
  }, [language]);

  const changeLanguage = (code) => {
    if (LANGUAGES[code]) {
      setLanguage(code);
    }
  };

  /**
   * Returns translated text for given key, with English fallback.
   */
  const t = (key) => {
    const langDict = translations[language] || translations.en;
    return langDict[key] || translations.en[key] || key;
  };

  /**
   * Returns translated category name.
   */
  const tCategory = (catName) => {
    if (!catName) return '';
    const key = `cat_${catName}`;
    const langDict = translations[language] || translations.en;
    return langDict[key] || translations.en[key] || catName;
  };

  const currentLanguage = LANGUAGES[language] || LANGUAGES.en;

  return (
    <LanguageContext.Provider value={{
      language,
      currentLanguage,
      languages: LANGUAGES,
      changeLanguage,
      t,
      tCategory
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
