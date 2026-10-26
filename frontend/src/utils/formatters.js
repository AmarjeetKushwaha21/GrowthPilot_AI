// ─── Formatters and Utilities ───

export function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatPercentage(val) {
    if (val === null || val === undefined || isNaN(val)) return '0%';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val}%`;
}

export function getInitials(name) {
    if (!name) return 'VA';
    return name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export const MERCHANT_COLORS = {
    'Sharma Café': '#2563eb',
    'Gupta Sweets': '#d97706',
    'FreshBite Corner': '#16a34a'
};

export function getMerchantColor(name) {
    return MERCHANT_COLORS[name] || '#2563eb';
}

export function getTimeGreeting(name) {
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 17) greeting = 'Good Evening';
    return `${greeting}, ${name}`;
}
