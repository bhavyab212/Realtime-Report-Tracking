// admin_dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin Dashboard Loaded - Stable V1");

    // --- LOCAL STORAGE KEY ---
    const LS_REPORTS_KEY = 'dashboard_userReports'; // Read reports submitted by citizens
    const LS_ADMIN_USERNAME_KEY = 'loggedInAdmin'; // To display admin name (optional)

    // --- DOM Elements ---
    const sidebarLinks = document.querySelectorAll('#admin-sidebar .nav-link');
    const views = document.querySelectorAll('.main-content .view');
    const mainContentTitle = document.getElementById('main-content-title');
    const usernameDisplay = document.getElementById('admin-username-display');
    const logoutButton = document.getElementById('admin-logout-button');
    const mobileMenuBtn = document.getElementById('admin-mobile-menu-btn');
    const sidebar = document.getElementById('admin-sidebar');
    const body = document.body;
    const loadingOverlay = document.getElementById('loading-overlay');
    // All Reports View Elements
    const reportsTableBody = document.getElementById('admin-reports-tbody');
    const filterStatusSelect = document.getElementById('filter-status');
    const searchInput = document.getElementById('search-report');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const reportCountSpan = document.getElementById('report-count');
    // Report Detail View Elements
    const reportDetailView = document.getElementById('view-admin-report-detail');
    const reportDetailContent = document.getElementById('admin-report-detail-content');
    const backToReportsBtn = document.getElementById('back-to-admin-reports-btn');
    // Settings View
    const adminClearDataBtn = document.getElementById('admin-clear-all-reports-btn');
    // Stats View Chart Canvases
    const adminCategoryChartCtx = document.getElementById('adminCategoryChart');
    const adminTimeChartCtx = document.getElementById('adminTimeChart');

    // --- Chart Instances ---
    let adminCategoryChartInstance = null;
    let adminTimeChartInstance = null;

    // --- Data ---
    let allReports = []; // Holds all reports loaded from LS
    let filteredReports = []; // Holds reports after filtering/search

    // --- Helper Functions ---
    function escapeHtml(unsafe) { if (typeof unsafe !== 'string') return unsafe; const div = document.createElement('div'); div.textContent = unsafe; return div.innerHTML; }
    function showLoader(message = "Loading...") { if (loadingOverlay) { const p = loadingOverlay.querySelector('p'); if (p) p.textContent = message; loadingOverlay.classList.add('visible'); } }
    function hideLoader() { if (loadingOverlay) loadingOverlay.classList.remove('visible'); }

    // --- Local Storage & Data Loading ---
    function loadAllReports() {
        showLoader("Loading Reports...");
        try {
            const d = localStorage.getItem(LS_REPORTS_KEY);
            allReports = d ? JSON.parse(d) : [];
            // Data Cleaning/Defaulting
            allReports = allReports.map(report => ({
                ...report,
                status: report.status || 'Pending',
                priority: report.priority || 'medium',
                submitter_username: report.submitter_username || 'Citizen', // Provide default
                category_path: report.category_path || 'Unknown',
                title: report.title || 'Untitled Report',
                description: report.description || '',
                submittedAt: report.submittedAt || new Date().toISOString(), // Default date if missing
                id: report.id || `TEMP-${Math.random()}` // Ensure ID exists
            }));
            console.log(`Loaded ${allReports.length} reports.`);
        } catch (e) {
            console.error("LS Load All Reports Error:", e);
            allReports = [];
            alert("Error loading report data. Data might be corrupted.");
        }
        filteredReports = [...allReports]; // Reset filtered list
        hideLoader();
    }

    function saveAllReports() {
        try {
            const reportsToSave = allReports.map(report => {
                const cleanedReport = { ...report };
                delete cleanedReport._password_demo; // Ensure no demo passwords saved
                return cleanedReport;
            });
            localStorage.setItem(LS_REPORTS_KEY, JSON.stringify(reportsToSave));
            console.log("Reports saved back to localStorage.");
            return true;
        } catch (e) {
            console.error("LS Save Reports Error:", e);
            alert("Error saving report changes.");
            return false;
        }
    }

    // --- View Switching ---
    function showAdminView(targetId, reportData = null) {
        console.log("Admin showing view:", targetId);
        let foundTarget = false;
        let newTitle = 'Admin Panel';

        views.forEach(view => {
            const isActive = view.id === targetId;
            // Control visibility with class, let CSS handle display & animation
            view.classList.toggle('active-view', isActive);
            if (isActive) {
                foundTarget = true;
                // Set Title
                if (targetId === 'view-all-reports') newTitle = 'All Reports';
                else if (targetId === 'view-admin-stats') newTitle = 'Statistics Overview';
                else if (targetId === 'view-admin-settings') newTitle = 'Admin Settings';
                else if (targetId === 'view-admin-report-detail' && reportData) {
                    newTitle = `Report Detail #${reportData.id ? reportData.id.split('-')[1] : ''}`;
                    populateAdminReportDetail(reportData); // Populate WHEN view is active
                }
                // Trigger renders AFTER view class is set
                if (targetId === 'view-all-reports') renderAdminReportsTable(filteredReports); // Re-render table
                if (targetId === 'view-admin-stats') renderAdminStatsCharts(); // Re-render charts
            }
        });

        if (mainContentTitle) mainContentTitle.textContent = newTitle;

        if (!foundTarget) { /* Fallback logic (same as before) */ }
        if (window.innerWidth <= 768 && body.classList.contains('sidebar-open')) { body.classList.remove('sidebar-open'); if (sidebar) sidebar.classList.remove('force-open'); }
    }

    // --- Rendering Functions ---
    function renderAdminReportsTable(reportsToRender) {
        if (!reportsTableBody) { console.error("Admin reports table body not found!"); return; }
        reportsTableBody.innerHTML = ''; // Clear
        if (!reportsToRender || reportsToRender.length === 0) { reportsTableBody.innerHTML = '<tr><td colspan="8" class="placeholder-cell">No reports match criteria.</td></tr>'; if (reportCountSpan) reportCountSpan.textContent = 0; return; }

        const sortedReports = reportsToRender.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        if (reportCountSpan) reportCountSpan.textContent = sortedReports.length; // Update count

        sortedReports.forEach(report => {
            const row = document.createElement('tr');
            row.className = 'admin-report-row'; // Use specific class
            row.dataset.reportId = report.id;
            const statusClass = report.status?.toLowerCase() ?? 'pending';
            const shortId = report.id ? `#${report.id.substring(report.id.length - 6)}` : 'N/A';
            const priorityClass = `priority-${report.priority?.toLowerCase() ?? 'medium'}`;

            row.innerHTML = `
                <td>${escapeHtml(shortId)}</td>
                <td title="${escapeHtml(report.title)}">${escapeHtml(report.title.length > 30 ? report.title.substring(0, 30) + '...' : report.title) || 'No Title'}</td>
                <td>${escapeHtml(report.category_path?.split(' > ')[0]) || 'N/A'}</td>
                <td>${escapeHtml(report.submitter_username) || 'Unknown'}</td>
                <td>${new Date(report.submittedAt || Date.now()).toLocaleDateString()}</td>
                <td class="${priorityClass}">${escapeHtml(report.priority) || 'Medium'}</td>
                <td><span class="status ${statusClass}">${escapeHtml(report.status ?? 'Pending')}</span></td>
                <td class="actions-cell">
                    <button type="button" class="action-btn view-btn" data-report-id="${report.id}" title="View Details"><i class='bx bx-show'></i> View</button>
                    <!-- Status change now happens in detail view -->
                </td>
            `;
            reportsTableBody.appendChild(row);
        });
    }

    function populateAdminReportDetail(report) {
        if (!reportDetailContent || !report) { console.error("Cannot populate admin detail view"); return; }
        const safeStatus = escapeHtml(report.status ?? 'Pending');
        const safePriority = escapeHtml(report.priority ?? 'medium').toLowerCase();
        let filesHTML = '<i>None provided.</i>'; if (report.files && report.files.length > 0) { filesHTML = '<ul>' + report.files.map(f => `<li>${escapeHtml(f.name)} (${(f.size / 1024).toFixed(1)} KB)</li>`).join('') + '</ul>'; }
        let locationHTML = `<b>Address/Desc.:</b> ${escapeHtml(report.address || 'N/A')}<br>`; if (report.latitude && report.longitude) { locationHTML += `<b>Coordinates:</b> ${parseFloat(report.latitude).toFixed(6)}, ${parseFloat(report.longitude).toFixed(6)} <a href="https://www.google.com/maps?q=${report.latitude},${report.longitude}" target="_blank" class="map-link">(Map)</a>`; } else { locationHTML += `<b>Coordinates:</b> Not provided`; }

        reportDetailContent.innerHTML = `
             <h3>Report Details: ${escapeHtml(report.title || 'No Title')}</h3>
             <div class="admin-detail-grid">
                <div class="detail-item"><strong>Report ID:</strong> <span>${report.id || 'N/A'}</span></div>
                <div class="detail-item"><strong>Status:</strong> <span class="status ${safeStatus.toLowerCase()}">${safeStatus}</span></div>
                <div class="detail-item"><strong>Priority:</strong> <span class="priority-${safePriority}">${escapeHtml(report.priority) || 'Medium'}</span></div>
                <div class="detail-item"><strong>Submitted:</strong> <span>${new Date(report.submittedAt || Date.now()).toLocaleString()}</span></div>
                <div class="detail-item"><strong>Submitter:</strong> <span>${escapeHtml(report.submitter_username) || 'Unknown'}</span></div>
                <div class="detail-item"><strong>Category:</strong> <span>${escapeHtml(report.category_path || 'N/A')}</span></div>
             </div>
             <div class="detail-section"> <h4>Description</h4> <p>${escapeHtml(report.description)?.replace(/\n/g, '<br>') || '<i>No description.</i>'}</p> </div>
             <div class="detail-section"> <h4>Location</h4> <p>${locationHTML}</p> </div>
             <div class="detail-section"> <h4>Attachments</h4> <div>${filesHTML}</div> </div>
             <div class="status-changer widget">
                 <h4>Update Status</h4>
                 <div style="display: flex; align-items: center; gap: 10px;">
                     <label for="status-update-select-${report.id}" class="sr-only">New Status:</label> <!-- Screen reader label -->
                     <select id="status-update-select-${report.id}">
                         <option value="Pending" ${safeStatus.toLowerCase() === 'pending' ? 'selected' : ''}>Pending</option>
                         <option value="In Review" ${safeStatus.toLowerCase() === 'in review' ? 'selected' : ''}>In Review</option>
                         <option value="Completed" ${safeStatus.toLowerCase() === 'completed' ? 'selected' : ''}>Completed</option>
                     </select>
                     <button type="button" class="btn-secondary update-status-btn" data-report-id="${report.id}"><i class='bx bx-save'></i> Save</button>
                 </div>
                 <div class="message-area" id="status-update-feedback-${report.id}"></div>
             </div>
         `;
    }

    function renderAdminStatsCharts() {
        if (!document.getElementById('view-admin-stats')) return; // Don't render if view isn't visible
        console.log("Rendering Admin Stats...");

        // 1. Category Chart
        if (adminCategoryChartInstance) adminCategoryChartInstance.destroy();
        const categoryChartPlaceholder = adminCategoryChartCtx?.parentElement;
        const categoryCounts = allReports.reduce((acc, report) => { const cat = report.category_path?.split(' > ')[0] || 'Unknown'; acc[cat] = (acc[cat] || 0) + 1; return acc; }, {});
        const categoryLabels = Object.keys(categoryCounts);
        const categoryData = Object.values(categoryCounts);
        if (adminCategoryChartCtx && typeof Chart !== 'undefined' && categoryLabels.length > 0) {
            if (categoryChartPlaceholder?.querySelector('p')) categoryChartPlaceholder.querySelector('p').remove();
            try { adminCategoryChartInstance = new Chart(adminCategoryChartCtx, { type: 'pie', data: { labels: categoryLabels, datasets: [{ data: categoryData, backgroundColor: ['#0d6efd', '#6f42c1', '#198754', '#ffc107', '#dc3545', '#fd7e14', '#20c997', '#6c757d'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } } }); }
            catch (e) { console.error("Admin Cat Chart error", e); if (categoryChartPlaceholder) categoryChartPlaceholder.innerHTML = '<p>(Chart Error)</p>'; }
        } else if (categoryChartPlaceholder) { categoryChartPlaceholder.innerHTML = '<p>(No category data)</p>'; }

        // 2. Time Chart
        if (adminTimeChartInstance) adminTimeChartInstance.destroy();
        const timeChartPlaceholder = adminTimeChartCtx?.parentElement;
        const reportsByDate = {}; const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        allReports.forEach(report => { const reportDate = new Date(report.submittedAt); if (reportDate >= sevenDaysAgo) { const dateString = reportDate.toISOString().split('T')[0]; reportsByDate[dateString] = (reportsByDate[dateString] || 0) + 1; } });
        const timeLabels = []; const timeData = [];
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const dateString = d.toISOString().split('T')[0]; timeLabels.push(dateString); timeData.push(reportsByDate[dateString] || 0); }
        if (adminTimeChartCtx && typeof Chart !== 'undefined' && allReports.length > 0) {
            if (timeChartPlaceholder?.querySelector('p')) timeChartPlaceholder.querySelector('p').remove();
            try { adminTimeChartInstance = new Chart(adminTimeChartCtx, { type: 'line', data: { labels: timeLabels, datasets: [{ label: 'Reports/Day', data: timeData, borderColor: 'var(--admin-primary-color)', backgroundColor: 'rgba(13, 110, 253, 0.1)', tension: 0.1, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } }); }
            catch (e) { console.error("Admin Time Chart error", e); if (timeChartPlaceholder) timeChartPlaceholder.innerHTML = '<p>(Chart Error)</p>'; }
        } else if (timeChartPlaceholder) { timeChartPlaceholder.innerHTML = '<p>(No recent data)</p>'; }

        // 3. Stats Table (Example)
        const statsTableContainer = document.querySelector('#admin-stats-table tbody');
        if (statsTableContainer) {
            const total = allReports.length;
            const pending = allReports.filter(r => r.status === 'Pending').length;
            const review = allReports.filter(r => r.status === 'In Review').length;
            const completed = allReports.filter(r => r.status === 'Completed').length;
            statsTableContainer.innerHTML = `
                <tr><td>Total Reports:</td><td>${total}</td></tr>
                <tr><td>Pending:</td><td>${pending}</td></tr>
                <tr><td>In Review:</td><td>${review}</td></tr>
                <tr><td>Completed:</td><td>${completed}</td></tr>
             `;
        }
    }


    // --- Filter & Search Logic ---
    function applyFiltersAndSearch() {
        const statusFilter = filterStatusSelect ? filterStatusSelect.value : 'all';
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        console.log(`Filtering: Status='${statusFilter}', Search='${searchTerm}'`);

        filteredReports = allReports.filter(report => {
            const reportStatus = report.status || 'Pending';
            const matchesStatus = statusFilter === 'all' || reportStatus === statusFilter;

            const reportId = report.id || '';
            const reportTitle = report.title || '';
            const reportCategory = report.category_path || '';
            const reportSubmitter = report.submitter_username || '';

            const matchesSearch = !searchTerm ||
                reportId.toLowerCase().includes(searchTerm) ||
                reportTitle.toLowerCase().includes(searchTerm) ||
                reportCategory.toLowerCase().includes(searchTerm) ||
                reportSubmitter.toLowerCase().includes(searchTerm);

            return matchesStatus && matchesSearch;
        });
        renderAdminReportsTable(filteredReports);
    }

    // ===========================
    // === EVENT LISTENERS SETUP ===
    // ===========================

    // --- Sidebar Links ---
    if (sidebar && sidebar.querySelector('.sidebar-nav')) {
        sidebar.querySelector('.sidebar-nav').addEventListener('click', (e) => { const link = e.target.closest('.nav-link'); if (link) { e.preventDefault(); const targetId = link.dataset.target; if (targetId && !link.classList.contains('active')) { sidebarLinks.forEach(l => l.classList.remove('active')); link.classList.add('active'); showAdminView(targetId); } } });
    } else { console.error("Admin sidebar nav missing!"); }

    // --- Logout Button ---
    if (logoutButton) { logoutButton.addEventListener('click', () => { localStorage.removeItem(LS_ADMIN_USERNAME_KEY); window.location.href = 'index.html'; }); } // Redirect to login
    else { console.error("Admin logout button missing!"); }

    // --- Mobile Menu ---
    if (mobileMenuBtn && sidebar && body) { mobileMenuBtn.addEventListener('click', () => { const isOpen = body.classList.toggle('sidebar-open'); sidebar.classList.toggle('force-open', isOpen); }); }
    else { console.error("Admin mobile menu elements missing!"); }

    // --- Filters ---
    if (filterStatusSelect) filterStatusSelect.addEventListener('change', applyFiltersAndSearch); else console.error("Status filter select missing!");
    if (searchInput) searchInput.addEventListener('input', applyFiltersAndSearch); else console.error("Search input missing!");
    if (clearFiltersBtn) { clearFiltersBtn.addEventListener('click', () => { if (filterStatusSelect) filterStatusSelect.value = 'all'; if (searchInput) searchInput.value = ''; applyFiltersAndSearch(); }); } else { console.error("Clear filters button missing!"); }

    // --- View/Update Status Buttons (Event Delegation on Table Body) ---
    if (reportsTableBody) {
        reportsTableBody.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.action-btn.view-btn');
            // Status change only happens in detail view now
            if (viewBtn) {
                const reportId = viewBtn.dataset.reportId;
                const report = allReports.find(r => r.id === reportId);
                if (report) {
                    showAdminView('view-admin-report-detail', report);
                    sidebarLinks.forEach(l => l.classList.remove('active')); // Deselect sidebar links
                } else { alert(`Report ${reportId} not found!`); }
            }
        });
    } else { console.error("Admin reports table body missing!"); }

    // --- Back to All Reports Button ---
    if (backToReportsBtn) { backToReportsBtn.addEventListener('click', () => { showAdminView('view-all-reports'); sidebarLinks.forEach(l => l.classList.remove('active')); document.querySelector('.nav-link[data-target="view-all-reports"]')?.classList.add('active'); }); }
    else { console.error("Admin back to reports button missing!"); }

    // --- Update Status Button (Delegated on Detail View Content) ---
    if (reportDetailContent) {
        reportDetailContent.addEventListener('click', (e) => {
            const updateBtn = e.target.closest('.update-status-btn');
            if (updateBtn) {
                const reportId = updateBtn.dataset.reportId;
                const selectElement = reportDetailContent.querySelector(`#status-update-select-${reportId}`);
                const feedbackElement = reportDetailContent.querySelector(`#status-update-feedback-${reportId}`);
                if (!reportId || !selectElement || !feedbackElement) { console.error("Update status elements not found in detail view"); return; }

                const newStatus = selectElement.value;
                const reportIndex = allReports.findIndex(r => r.id === reportId);

                if (reportIndex > -1) {
                    allReports[reportIndex].status = newStatus;
                    if (saveAllReports()) { // Check if save was successful
                        feedbackElement.innerHTML = `<span class="success-message" style="display: inline-block;">Status updated!</span>`;
                        // Refresh detail view parts
                        const statusSpanInDetail = reportDetailContent.querySelector('.detail-meta .status');
                        if (statusSpanInDetail) { statusSpanInDetail.className = `status ${newStatus.toLowerCase()}`; statusSpanInDetail.textContent = newStatus; }
                    } else {
                        feedbackElement.innerHTML = `<span class="error-message" style="display: inline-block;">Error saving update.</span>`;
                        // Optional: revert in-memory change if save failed
                        loadAllReports(); // Revert by reloading
                    }
                    setTimeout(() => { feedbackElement.innerHTML = ''; }, 2500);
                } else { feedbackElement.innerHTML = `<span class="error-message" style="display: inline-block;">Error: Report not found.</span>`; }
            }
        });
    } else { console.error("Report Detail Content container not found!"); }

    // --- Clear Local Storage Button (Admin Settings) ---
    if (adminClearDataBtn) {
        adminClearDataBtn.addEventListener('click', () => {
            if (confirm('DANGER! This will clear ALL citizen reports from this browser\'s storage. This affects the citizen dashboard too. Proceed?')) {
                localStorage.removeItem(LS_REPORTS_KEY);
                localStorage.removeItem(LS_STATS_KEY); // Clear citizen stats too
                allReports = []; filteredReports = []; // Clear in memory
                alert('All citizen report data cleared from local storage.');
                // Refresh the table display
                renderAdminReportsTable(filteredReports);
                // Optionally refresh stats/charts
                renderAdminStatsCharts();
            }
        });
    } else { console.error("Admin clear data button missing!"); }

    // ===========================
    // === INITIALIZATION        ===
    // ===========================
    console.log("Initializing Admin Dashboard...");
    showLoader("Loading Data...");
    loadAllReports(); // Load data
    if (usernameDisplay) usernameDisplay.textContent = localStorage.getItem(LS_ADMIN_USERNAME_KEY) || 'Admin'; // Set admin name
    showAdminView('view-all-reports'); // Show default view (which will call render)
    document.querySelector('.nav-link[data-target="view-all-reports"]')?.classList.add('active'); // Set active link
    hideLoader();
    console.log("Admin Dashboard Initialized.");

}); // End DOMContentLoaded