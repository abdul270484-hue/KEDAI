import { db } from './firebase-config.js';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { formatCurrency } from './app.js';

// Chart Instances
let weeklyChartInst = null;
let categoryChartInst = null;

const initCharts = () => {
  const ctxWeekly = document.getElementById('weeklyChart').getContext('2d');
  weeklyChartInst = new Chart(ctxWeekly, {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Omzet', data: [], borderColor: '#c5a059', backgroundColor: 'rgba(197, 160, 89, 0.1)', fill: true, tension: 0.4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { color: '#333' } } } }
  });

  const ctxCat = document.getElementById('categoryChart').getContext('2d');
  categoryChartInst = new Chart(ctxCat, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#c5a059', '#b58849', '#8c6b36', '#e0b86a', '#4a4a4a', '#2a2a2a'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#a0a0a0' } } } }
  });
};

const loadDashboardData = () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  // 1. Realtime Today's Analytics
  const qDaily = query(collection(db, 'analytics_daily'), where('__name__', '==', dateStr));
  onSnapshot(qDaily, (snapshot) => {
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      document.getElementById('todayOmzet').textContent = formatCurrency(data.totalSales || 0);
      document.getElementById('todayTrx').textContent = data.totalTransaction || 0;
      
      // Update Category Chart
      if (data.categorySales) {
        const labels = Object.keys(data.categorySales);
        const vals = Object.values(data.categorySales);
        categoryChartInst.data.labels = labels;
        categoryChartInst.data.datasets[0].data = vals;
        categoryChartInst.update();
      }
    }
  });

  // 2. Weekly Data (Last 7 days)
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const qWeekly = query(
    collection(db, 'analytics_daily'), 
    where('__name__', '>=', lastWeek.toISOString().split('T')[0]),
    orderBy('__name__', 'asc')
  );
  
  onSnapshot(qWeekly, (snapshot) => {
    const labels = [];
    const vals = [];
    snapshot.forEach(doc => {
      // Just format the label to be readable (MM-DD)
      const d = doc.id.substring(5);
      labels.push(d);
      vals.push(doc.data().totalSales || 0);
    });
    weeklyChartInst.data.labels = labels;
    weeklyChartInst.data.datasets[0].data = vals;
    weeklyChartInst.update();
  });

  // 3. Best Seller Today (Querying today's transactions to find the best item)
  // Get start of today as Date
  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  const qTrx = query(
    collection(db, 'transactions'),
    where('timestamp', '>=', startOfDay)
  );

  onSnapshot(qTrx, (snapshot) => {
    const itemCounts = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      if(data.items) {
        data.items.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
        });
      }
    });

    let bestItem = '-';
    let maxQty = 0;
    for (const [name, qty] of Object.entries(itemCounts)) {
      if (qty > maxQty) {
        maxQty = qty;
        bestItem = `${name} (${qty})`;
      }
    }
    
    document.getElementById('bestSeller').textContent = bestItem;
  });
};

initCharts();
loadDashboardData();
