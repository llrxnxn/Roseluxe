// utils/ExportReport.js

import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import { Alert } from 'react-native';

class ExportReport {

  // Helper: get customer name
  static getCustomerNameFromOrder(order) {
    if (!order) return 'N/A';

    // Check shippingInfo first
    if (order.shippingInfo && order.shippingInfo.fullName) {
      return String(order.shippingInfo.fullName).trim();
    }

    // Then userId object
    if (order.userId && order.userId.fullName) {
      return String(order.userId.fullName).trim();
    }

    // Then user object
    if (order.user && order.user.fullName) {
      return String(order.user.fullName).trim();
    }

    // Then fallback keys
    if (order.customerName) return String(order.customerName).trim();
    if (order.userName) return String(order.userName).trim();
    if (order.user?.name) return String(order.user.name).trim();
    if (order.user?.firstName && order.user?.lastName) return `${order.user.firstName} ${order.user.lastName}`;
    if (order.firstName && order.lastName) return `${order.firstName} ${order.lastName}`;

    return 'N/A';
  }

  // PDF generation
  static generatePDFContent(dashboardData) {
    const reportDate = new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });

    const users = dashboardData.users?.slice(0,20) || [];
    const products = dashboardData.products?.slice(0,20) || [];
    const categories = dashboardData.categories?.slice(0,20) || [];
    const orders = dashboardData.orders?.slice(0,20) || [];

    const usersTable = users.map(u => `
      <tr>
        <td>${u.fullName || 'N/A'}</td>
        <td>${u.email || 'N/A'}</td>
      </tr>
    `).join('');

    const productsTable = products.map(p => `
      <tr>
        <td>
  ${
    (p.image || p.images?.[0])
      ? `<img src="${p.image || p.images?.[0]}" width="30" height="30" />`
      : '—'
  }
</td>
        <td>${p.name || 'N/A'}</td>
        <td>₱${(p.price || 0).toFixed(0)}</td>
        <td>${p.stock || 0}</td>
        <td>${p.category?.name || 'N/A'}</td>
      </tr>
    `).join('');

    const categoriesTable = categories.map(c => `
      <tr>
        <td>${c.image ? `<img src="${c.image}" width="30" height="30" />` : '—'}</td>
        <td>${c.name || 'N/A'}</td>
      </tr>
    `).join('');

    const ordersTable = orders.map(o => {
      const customerName = this.getCustomerNameFromOrder(o);
      const itemCount = o.items?.length || 0;
      const status = o.orderStatus || 'N/A';
      const total = o.totals?.totalAmount || o.totalAmount || 0;

      return `
        <tr>
          <td>${customerName}</td>
          <td>${itemCount}</td>
          <td>${status}</td>
          <td>₱${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const months = ['Jan','Feb','Mar','Apr','May','Jun'];
    const monthlyData = dashboardData.monthlyOrderData || [0,0,0,0,0,0];
    const maxMonth = Math.max(...monthlyData, 1);

    const monthlyBars = monthlyData.map((val,i) => {
      const height = (val / maxMonth) * 150;
      return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:180px;">
        <div style="height:${height}px;width:28px;background:linear-gradient(to top,#B76E79,#D49CA6);border-radius:4px;margin-bottom:8px;"></div>
        <div style="font-size:12px;font-weight:bold;color:#333;">${val}</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">${months[i]}</div>
      </div>`;
    }).join('');

    const status = dashboardData.ordersByStatus || {};
    const statusBoxes = [
      { emoji:'🟡', label:'Pending', value:status.pending||0 },
      { emoji:'🔵', label:'Shipped', value:status.shipped||0 },
      { emoji:'🟢', label:'Delivered', value:status.delivered||0 },
      { emoji:'🔴', label:'Cancelled', value:status.cancelled||0 }
    ].map(item => `
      <tr>
        <td><span style="font-size:16px;margin-right:8px;">${item.emoji}</span><strong>${item.label}:</strong></td>
        <td style="text-align:right;font-weight:bold;color:#B76E79;">${item.value}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {font-family:'Segoe UI',Arial,sans-serif;margin:20px;background:#fafafa;color:#333;}
          h1{text-align:center;color:#B76E79;}
          table{width:100%;border-collapse:collapse;margin-bottom:16px;background:white;border:1px solid #ddd;}
          th,td{padding:8px;border-bottom:1px solid #ddd;font-size:12px;}
          th{text-align:left;background:#f2f2f2;}
          .bar-chart{display:flex;gap:8px;align-items:flex-end;height:200px;padding:10px;background:#fafafa;border-radius:6px;}
          .status-table{width:50%;}
        </style>
      </head>
      <body>
        <h1>🌹 ROSELUXE Admin Report</h1>
        <div>Generated on ${reportDate}</div>

        <h2>👥 Users</h2>
        <table><thead><tr><th>Name</th><th>Email</th></tr></thead><tbody>${usersTable}</tbody></table>

        <h2>🌸 Products</h2>
        <table><thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th>Category</th></tr></thead><tbody>${productsTable}</tbody></table>

        <h2>🏷️ Categories</h2>
        <table><thead><tr><th>Image</th><th>Name</th></tr></thead><tbody>${categoriesTable}</tbody></table>

        <h2>🧾 Orders</h2>
        <table><thead><tr><th>Customer</th><th>Items</th><th>Status</th><th>Total</th></tr></thead><tbody>${ordersTable}</tbody></table>

        <h2>📈 Orders Per Month</h2>
        <div class="bar-chart">${monthlyBars}</div>

        <h2>📊 Order Status Summary</h2>
        <table class="status-table"><tbody>${statusBoxes}</tbody></table>

      </body>
      </html>
    `;
  }

  static async exportToPDF(dashboardData) {
    try {
      const html = this.generatePDFContent(dashboardData);
      const { uri } = await Print.printToFileAsync({ html, width:612, height:792 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType:'application/pdf', UTI:'com.adobe.pdf' });
      else Alert.alert('Success','PDF saved successfully!');
      return { success:true, uri };
    } catch (error) {
      console.error('PDF Export Error:', error);
      throw error;
    }
  }

  static async exportToCSV(dashboardData) {
    try {
      let csv = 'ROSELUXE Admin Report\n';
      csv += `Generated: ${new Date().toLocaleString('en-PH')}\n\n`;

      csv += 'USERS\nFull Name,Email\n';
      dashboardData.users?.slice(0,20).forEach(u => csv += `"${u.fullName || 'N/A'}","${u.email || 'N/A'}"\n`);

      csv += '\nPRODUCTS\nName,Price,Stock,Category\n';
      dashboardData.products?.slice(0,20).forEach(p => csv += `"${p.name || 'N/A'}",${p.price||0},${p.stock||0},"${p.category?.name||'N/A'}"\n`);

      csv += '\nORDERS\nCustomer Name,Item Count,Order Status,Total Amount\n';
      dashboardData.orders?.slice(0,20).forEach(o => {
        const customerName = this.getCustomerNameFromOrder(o);
        const itemCount = o.items?.length || 0;
        const status = o.orderStatus || 'N/A';
        const total = o.totals?.totalAmount || o.totalAmount || 0;
        csv += `"${customerName}",${itemCount},"${status}",${total}\n`;
      });

      csv += '\nORDER STATUS SUMMARY\nStatus,Count\n';
      const status = dashboardData.ordersByStatus || {};
      csv += `Pending,${status.pending||0}\nShipped,${status.shipped||0}\nDelivered,${status.delivered||0}\nCancelled,${status.cancelled||0}\n`;

      const fileName = `AdminReport_${Date.now()}.csv`;
      const file = new File(Paths.document, fileName);
      await file.write(csv);

      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType:'text/csv' });
      else Alert.alert('Success', `Saved: ${fileName}`);

      return { success:true, uri:file.uri };
    } catch (error) {
      console.error('CSV Export Error:', error);
      throw error;
    }
  }
}

export default ExportReport;