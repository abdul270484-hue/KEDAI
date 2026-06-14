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

// DOWNLOAD CSV LOGIC
const btnDownloadCsv = document.getElementById('btnDownloadCsv');
if (btnDownloadCsv) {
  btnDownloadCsv.addEventListener('click', async () => {
    try {
      const btn = btnDownloadCsv;
      const originalText = btn.textContent;
      btn.textContent = 'Menyiapkan Data...';
      btn.disabled = true;

      // Ambil transaksi bulan ini
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const q = query(
        collection(db, 'transactions'),
        where('timestamp', '>=', startOfMonth),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert('Belum ada data transaksi bulan ini.');
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      // Header
      csvContent += "ID Transaksi,Tanggal,Jam,Kasir,Meja,Status,Metode Bayar,Total,Detail Pesanan\n";

      snapshot.forEach(doc => {
        const d = doc.data();
        const dateObj = d.timestamp?.toDate() || new Date();
        const dateStr = `${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()}`;
        const timeStr = `${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
        
        let itemStr = "";
        if (d.items) {
          itemStr = d.items.map(i => `${i.qty}x ${i.name}`).join('; ');
        }
        
        // Escape quotes
        itemStr = `"${itemStr}"`;

        const row = [
          doc.id,
          dateStr,
          timeStr,
          d.cashierName || '-',
          d.tableNumber || '-',
          d.paymentStatus || '-',
          d.paymentMethod || '-',
          d.total || 0,
          itemStr
        ].join(",");
        
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Laporan_Kedai_${startOfMonth.getMonth()+1}_${startOfMonth.getFullYear()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      btn.textContent = originalText;
      btn.disabled = false;
    } catch (error) {
      console.error("CSV Download Error:", error);
      alert('Gagal mengunduh laporan.');
      btnDownloadCsv.textContent = 'Download Data (CSV)';
      btnDownloadCsv.disabled = false;
    }
  });
}

initCharts();
loadDashboardData();
