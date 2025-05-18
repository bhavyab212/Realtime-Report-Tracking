document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard loaded - Final Build");

    // --- LOCAL STORAGE KEYS ---
    const LS_REPORTS_KEY = 'dashboard_userReports';
    const LS_STATS_KEY = 'dashboard_userStats';
    const LS_USERNAME_KEY = 'loggedInUser';
    const LS_THEME_KEY = 'dashboard_theme';

    // --- DOM Element References ---
    const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const views = document.querySelectorAll('.main-content .view');
    const mainContentTitle = document.getElementById('main-content-title');
    const reportIssueBtn = document.getElementById('report-issue-btn');
    const usernameDisplay = document.getElementById('username-display');
    const logoutButton = document.getElementById('logout-button');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const body = document.body;
    const loadingOverlay = document.getElementById('loading-overlay');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    // Report Issue View Elements
    const reportIssueView = document.getElementById('view-report-issue');
    const reportStepTitle = document.getElementById('report-step-title');
    const reportStepsContainer = document.querySelector('.report-steps-container');
    const reportSteps = reportStepsContainer ? reportStepsContainer.querySelectorAll('.report-step') : [];
    const backToDashBtn = document.getElementById('back-to-dash-btn');
    const mainCategoriesContainer = document.querySelector('#report-step-1 .main-categories');
    const subCategoriesContainerLevel2 = document.querySelector('#report-step-1 .sub-categories.level-2');
    const subCategoriesContainerLevel3 = document.querySelector('#report-step-1 .sub-categories.level-3');
    // Step 2 Form
    const reportDetailsForm = document.getElementById('report-details-form');
    const getLocationBtn = document.getElementById('get-location-btn');
    const locationStatus = document.getElementById('location-status');
    const latDisplay = document.getElementById('latitude-display');
    const lonDisplay = document.getElementById('longitude-display');
    const latInput = document.getElementById('latitude-input');
    const lonInput = document.getElementById('longitude-input');
    const fileInput = document.getElementById('issue-files');
    const fileInputLabel = document.querySelector('.file-input-wrapper[for="issue-files"]'); // Select the styled label
    const filePreviewList = document.getElementById('file-preview-list');
    const reportSubmitFeedback = document.getElementById('report-submit-feedback');
    const selectedCategoryDisplay = document.getElementById('selected-category-display');
    const issueTitleInput = document.getElementById('issue-title');
    // Dashboard View Widgets
    const tasksDoneWidgetValue = document.getElementById('stat-tasks-completed');
    const pendingWidgetValue = document.getElementById('stat-pending-requests');
    const messagesWidgetValue = document.getElementById('stat-unread-messages');
    const progressBar = document.getElementById('stat-overall-progress');
    const recentReportsTableBody = document.getElementById('recent-reports-tbody');
    // Reports View Elements
    const reportListContainer = document.getElementById('report-list-container');
    const reportDetailView = document.getElementById('view-report-detail');
    const reportDetailContent = document.getElementById('report-detail-content');
    const backToReportsBtn = document.getElementById('back-to-reports-btn');
    // Progress View Elements
    const progressViewContainer = document.getElementById('view-progress');
    const progressViewContent = document.getElementById('progress-view-content');
    // Settings View Elements
    const settingsUsername = document.getElementById('settings-username');
    const settingsEmail = document.getElementById('settings-email');
    const clearDataBtn = document.getElementById('clear-local-storage-btn');


    // --- Initial State & Data Loading ---
    let selectedCategories = []; // Stores path: [Main, Sub, SubSub]
    let currentCategoryLevel = 1; // Track which level is active (1, 2, or 3)
    let userReports = loadReports();
    let dashboardStats = loadStats();

    // --- Helpers ---
    function showLoader(message = "Processing...") { if (loadingOverlay) { const p = loadingOverlay.querySelector('p'); if (p) p.textContent = message; loadingOverlay.classList.add('visible'); } else console.error("Loading overlay missing"); }
    function hideLoader() { if (loadingOverlay) loadingOverlay.classList.remove('visible'); }

    function showView(targetId, skipTitleUpdate = false, reportData = null) {
        console.log("Showing view:", targetId);
        let foundTarget = false;
        let newTitle = 'Dashboard'; // Default title

        views.forEach(view => {
            const isActive = view.id === targetId;
            view.classList.toggle('active-view', isActive);
            view.style.display = isActive ? 'block' : 'none'; // Explicitly set display

            if (isActive) {
                foundTarget = true;
                if (!skipTitleUpdate) {
                    if (targetId === 'view-report-detail' && reportData) {
                        newTitle = `Report #${reportData.id.split('-')[1]}`;
                        populateReportDetail(reportData); // Populate when view is active
                    } else if (targetId === 'view-dashboard') newTitle = 'Dashboard Overview';
                    else if (targetId === 'view-report-issue') {/* Title set by step */ }
                    else {
                        const titleElement = view.querySelector('h2');
                        newTitle = titleElement ? titleElement.textContent : targetId.replace('view-', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    }
                }
                // Trigger dynamic content rendering
                if (targetId === 'view-reports') renderReportsListView();
                if (targetId === 'view-progress') renderProgressView();
                if (targetId === 'view-settings') displaySettingsInfo();
                if (targetId === 'view-dashboard') updateDashboardDisplay();
            }
        });

        // Update main header title, unless explicitly skipped or it's the report view
        if (mainContentTitle && !skipTitleUpdate && targetId !== 'view-report-issue') {
            mainContentTitle.textContent = newTitle;
        }

        if (!foundTarget) { // Fallback
            console.warn(`View "${targetId}" not found! Defaulting to dashboard.`);
            if (mainContentTitle) mainContentTitle.textContent = 'Dashboard Overview';
            document.getElementById('view-dashboard')?.classList.add('active-view');
            sidebarLinks.forEach(l => l.classList.remove('active'));
            document.querySelector('.nav-link[data-target="view-dashboard"]')?.classList.add('active');
        }
        if (window.innerWidth <= 768 && body.classList.contains('sidebar-open')) { body.classList.remove('sidebar-open'); if (sidebar) sidebar.classList.remove('force-open'); }
    }

    function goToReportStep(stepNumber) {
        console.log(`Going to report step ${stepNumber}`);
        const targetStepId = `report-step-${stepNumber}`;
        let currentActiveStep = null;

        reportSteps.forEach(step => {
            if (step.classList.contains('active-step')) currentActiveStep = step;
            step.classList.remove('active-step', 'is-exiting'); // Clean slate
        });

        // Animate out previous step
        if (currentActiveStep && currentActiveStep.id !== targetStepId) {
            currentActiveStep.classList.add('is-exiting');
            // Clean up after transition - safer inside listener
            currentActiveStep.addEventListener('transitionend', () => {
                // Only remove if it's still the exiting one (prevent race conditions)
                if (currentActiveStep && currentActiveStep.classList.contains('is-exiting')) {
                    currentActiveStep.classList.remove('is-exiting');
                }
            }, { once: true });
        }

        // Activate target step
        const nextStep = document.getElementById(targetStepId);
        if (nextStep) {
            // Ensure display is block before adding class to trigger animation if needed
            nextStep.style.display = 'flex'; // Use flex as defined in CSS
            void nextStep.offsetWidth; // Force reflow maybe needed sometimes
            nextStep.classList.add('active-step');
        }
        else { console.error(`Step element not found: #${targetStepId}`); }

        // Update titles
        const newStepTitle = stepNumber === 1 ? 'Report: Select Category' : 'Report: Provide Details';
        if (reportStepTitle) reportStepTitle.textContent = newStepTitle;
        if (mainContentTitle) mainContentTitle.textContent = newStepTitle;

        // Reset categories/levels when going back to step 1
        if (stepNumber === 1) {
            if (mainCategoriesContainer) { mainCategoriesContainer.style.display = 'grid'; mainCategoriesContainer.classList.add('active-category-level'); }
            if (subCategoriesContainerLevel2) { subCategoriesContainerLevel2.style.display = 'none'; subCategoriesContainerLevel2.innerHTML = ''; subCategoriesContainerLevel2.classList.remove('active-category-level'); }
            if (subCategoriesContainerLevel3) { subCategoriesContainerLevel3.style.display = 'none'; subCategoriesContainerLevel3.innerHTML = ''; subCategoriesContainerLevel3.classList.remove('active-category-level'); }
            selectedCategories = [];
            currentCategoryLevel = 1;
        }
        if (stepNumber === 2 && selectedCategoryDisplay) {
            selectedCategoryDisplay.textContent = selectedCategories.join(' > ') || 'Category Not Selected';
        }
    }











    // --- Theme Toggle Functionality ---
    function initThemeToggle() {
        // Check for saved theme preference or use default
        const savedTheme = localStorage.getItem(LS_THEME_KEY);

        // Apply saved theme or default
        if (savedTheme === 'dark') {
            body.classList.add('dark-theme');
        }

        // Update button appearance based on current theme
        updateThemeToggleButton();

        // Add click event listener to toggle theme
        themeToggleBtn.addEventListener('click', () => {
            // Toggle dark-theme class on body
            body.classList.toggle('dark-theme');

            // Save preference to localStorage
            const isDarkMode = body.classList.contains('dark-theme');
            localStorage.setItem(LS_THEME_KEY, isDarkMode ? 'dark' : 'light');

            // Update button appearance
            updateThemeToggleButton();
        });
    }

    // Helper function to update button appearance based on current theme
    function updateThemeToggleButton() {
        const isDarkMode = body.classList.contains('dark-theme');

        // Update button title
        themeToggleBtn.title = isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme';

        // Add/remove active class to style the button differently if needed
        themeToggleBtn.classList.toggle('dark-active', isDarkMode);
    }

    // Call this function in your initialization code
    initThemeToggle();
    initThemeToggle();    // --- LOCAL STORAGE FUNCTIONS & DATA MANAGEMENT ---
    function loadReports() { try { const d = localStorage.getItem(LS_REPORTS_KEY); return d ? JSON.parse(d) : []; } catch (e) { console.error("LS Load Reports Error:", e); return []; } }
    function saveReports(reports) { try { localStorage.setItem(LS_REPORTS_KEY, JSON.stringify(reports)); console.log("Reports saved"); } catch (e) { console.error("LS Save Reports Error:", e); } }
    function loadStats() { const dS = { tasksCompleted: 0, pendingRequests: 0, unreadMessages: 0, overallProgress: 0 }; try { const d = localStorage.getItem(LS_STATS_KEY); return d ? { ...dS, ...JSON.parse(d) } : dS; } catch (e) { console.error("LS Load Stats Error:", e); return dS; } }
    function saveStats(stats) { try { localStorage.setItem(LS_STATS_KEY, JSON.stringify(stats)); console.log("Stats saved"); } catch (e) { console.error("LS Save Stats Error:", e); } }

    function addReport(reportData) {
        userReports.push(reportData); saveReports(userReports);
        recalculateStats(); // Update stats based on new report array
        saveStats(dashboardStats); updateDashboardDisplay();
    }

    function recalculateStats() {
        dashboardStats.pendingRequests = userReports.filter(r => r.status === 'Pending' || r.status === 'In Review').length;
        dashboardStats.tasksCompleted = userReports.filter(r => r.status === 'Completed').length;
        const totalReports = userReports.length;
        dashboardStats.overallProgress = totalReports > 0 ? Math.round((dashboardStats.tasksCompleted / totalReports) * 100) : 0;
        // dashboardStats.unreadMessages = ...; // Update based on real logic if needed
    }

    function generateReportId() { return `RPT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`; }

    // --- RENDER/DISPLAY FUNCTIONS ---
    // --- Chart Initialization ---
    function initDashboardCharts() {
        // Initialize the existing activity chart
        const activityChartCtx = document.getElementById('activityChart');
        if (activityChartCtx && typeof Chart !== 'undefined') {
            try {
                new Chart(activityChartCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Pending', 'In Review', 'Completed'],
                        datasets: [{
                            label: 'Report Status',
                            data: [
                                userReports.filter(r => r.status === 'Pending').length,
                                userReports.filter(r => r.status === 'In Review').length,
                                userReports.filter(r => r.status === 'Completed').length
                            ],
                            backgroundColor: [
                                'rgba(255, 193, 7, 0.7)',
                                'rgba(13, 110, 253, 0.7)',
                                'rgba(25, 135, 84, 0.7)'
                            ],
                            borderColor: [
                                '#ffc107',
                                '#0d6efd',
                                '#198754'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                                }
                            },
                            title: {
                                display: false
                            }
                        }
                    }
                });
            } catch (error) {
                console.error("Chart error:", error);
            }
        }

        // Initialize the new categories chart
        const categoriesChartCtx = document.getElementById('categoriesChart');
        if (categoriesChartCtx && typeof Chart !== 'undefined') {
            try {
                // Count reports by main category
                const categoryData = {};
                userReports.forEach(report => {
                    const mainCategory = report.category_path.split(' > ')[0];
                    if (mainCategory) {
                        categoryData[mainCategory] = (categoryData[mainCategory] || 0) + 1;
                    }
                });

                // Prepare data for chart
                const labels = Object.keys(categoryData);
                const data = Object.values(categoryData);

                // Generate colors based on number of categories
                const colors = [
                    'rgba(83, 52, 131, 0.7)',    // Primary color
                    'rgba(112, 111, 211, 0.7)',   // Secondary color
                    'rgba(26, 26, 46, 0.7)',      // Dark color
                    'rgba(16, 185, 129, 0.7)',    // Success color
                    'rgba(239, 68, 68, 0.7)',     // Error color
                    'rgba(245, 158, 11, 0.7)',    // Warning color
                    'rgba(59, 130, 246, 0.7)',    // Info color
                    'rgba(139, 92, 246, 0.7)',    // Purple
                    'rgba(236, 72, 153, 0.7)',    // Pink
                    'rgba(6, 182, 212, 0.7)'      // Cyan
                ];

                new Chart(categoriesChartCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Reports by Category',
                            data: data,
                            backgroundColor: labels.map((_, i) => colors[i % colors.length]),
                            borderColor: labels.map((_, i) => colors[i % colors.length].replace('0.7', '1')),
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',  // Horizontal bar chart
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        return `Reports: ${context.raw}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0,
                                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                                },
                                grid: {
                                    color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                                }
                            },
                            y: {
                                ticks: {
                                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                                },
                                grid: {
                                    color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error("Categories chart error:", error);
            }
        }

        // --- NEW: Solved vs Unsolved Pie Chart ---
        // assume you store all reports in localStorage under 'reports'
        const allReports = JSON.parse(localStorage.getItem('reports') || '[]');
        const solvedCount = allReports.filter(r => r.status.toLowerCase() === 'completed').length;
        const unsolvedCount = allReports.length - solvedCount;

        const ctx2 = document.getElementById('resolvedChart').getContext('2d');
        new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: ['Solved', 'Unsolved'],
                datasets: [{
                    data: [solvedCount, unsolvedCount],
                    backgroundColor: [
                        getComputedStyle(document.documentElement).getPropertyValue('--status-completed').trim() || '#198754',
                        getComputedStyle(document.documentElement).getPropertyValue('--status-pending').trim() || '#ffc107'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.label}: ${ctx.parsed} (${((ctx.parsed / allReports.length) * 100).toFixed(1)}%)`
                        }
                    }
                }
            }
        });
    }

    function initUserActivityChart() {
        const ctx = document.getElementById('userActivityChart');
        if (!ctx) return;

        // Load all reports from localStorage (or wherever you keep them)
        const reports = JSON.parse(localStorage.getItem('reports') || '[]');

        // Group by date string
        const countsByDate = reports.reduce((acc, r) => {
            const dateKey = new Date(r.submittedAt).toLocaleDateString();
            acc[dateKey] = (acc[dateKey] || 0) + 1;
            return acc;
        }, {});

        // Sort dates ascending
        const labels = Object.keys(countsByDate)
            .sort((a, b) => new Date(a) - new Date(b));

        const data = labels.map(d => countsByDate[d]);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Reports Submitted',
                    data,
                    borderColor: getComputedStyle(document.documentElement)
                        .getPropertyValue('--secondary-color').trim(),
                    backgroundColor: 'rgba(112, 111, 211, 0.3)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Date' },
                        ticks: { maxRotation: 0, autoSkip: true }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Reports' }
                    }
                }
            }
        });
    }

    // Call chart initialization when dashboard is updated
    function updateDashboardDisplay() {
        console.log("Updating dashboard display, Stats:", dashboardStats);
        if (tasksDoneWidgetValue) tasksDoneWidgetValue.textContent = dashboardStats.tasksCompleted ?? 0; // Use nullish coalescing
        if (pendingWidgetValue) pendingWidgetValue.textContent = dashboardStats.pendingRequests ?? 0;
        if (messagesWidgetValue) messagesWidgetValue.textContent = dashboardStats.unreadMessages ?? 0;
        if (progressBar) {
            const progress = Math.min(100, Math.max(0, dashboardStats.overallProgress ?? 0));
            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${progress}%`;
            progressBar.classList.toggle('low-progress', progress < 30);
        }
        renderRecentReportsTable();

        // Initialize charts after updating data
        initDashboardCharts();
    }

    function renderRecentReportsTable() {
        if (!recentReportsTableBody) return;
        recentReportsTableBody.innerHTML = '';
        const recentReports = userReports.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 3);
        if (recentReports.length === 0) { recentReportsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 15px; color: var(--text-muted);">No recent reports.</td></tr>'; return; }
        recentReports.forEach(report => {
            const row = document.createElement('tr');
            row.className = 'report-table-row'; row.dataset.reportId = report.id; row.title = "Click to view details";
            row.innerHTML = `
                <td>#${report.id.split('-')[1]}</td>
                <td>${escapeHtml(report.title)}</td>
                <td>${new Date(report.submittedAt).toLocaleDateString()}</td>
                <td><span class="status ${report.status?.toLowerCase() ?? 'pending'}">${escapeHtml(report.status ?? 'Unknown')}</span></td>
            `;
            recentReportsTableBody.appendChild(row);
        });
    }

    function renderReportsListView() {
        if (!reportListContainer) { console.error("Report list container missing!"); return; }
        reportListContainer.innerHTML = '';
        if (userReports.length === 0) { reportListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">You have not submitted any reports yet.</p>'; return; }

        const sortedReports = userReports.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        sortedReports.forEach(report => {
            const reportCard = document.createElement('div');
            reportCard.className = 'report-card'; reportCard.dataset.reportId = report.id;
            reportCard.innerHTML = `
                <div class="report-card-header"> <span class="report-card-id">#${report.id.split('-')[1]}</span> <span class="status ${report.status?.toLowerCase() ?? 'pending'}">${escapeHtml(report.status ?? 'Unknown')}</span> </div>
                <h3 class="report-card-title">${escapeHtml(report.title)}</h3>
                <p class="report-card-category">${escapeHtml(report.category_path)}</p>
                <p class="report-card-date">Submitted: ${new Date(report.submittedAt).toLocaleString()}</p>
                <div class="report-card-footer"> <button class="btn-view-report">View Details</button> </div>
            `;
            reportListContainer.appendChild(reportCard);
        });
    }

    function populateReportDetail(report) {
        if (!reportDetailContent) { console.error("Report detail content missing!"); return; }
        console.log("Populating report detail:", report.id);
        const safeStatus = escapeHtml(report.status ?? 'Unknown');
        const safePriority = escapeHtml(report.priority ?? 'medium');

        let filesHTML = 'None provided.';
        if (report.files && report.files.length > 0) {
            filesHTML = '<ul>' + report.files.map(f => `<li>${escapeHtml(f.name)} (${(f.size / 1024).toFixed(1)} KB)</li>`).join('') + '</ul>';
        }

        let locationHTML = `Address/Desc.: ${escapeHtml(report.address || 'N/A')}<br>`;
        if (report.latitude && report.longitude) {
            locationHTML += `Coordinates: ${parseFloat(report.latitude).toFixed(6)}, ${parseFloat(report.longitude).toFixed(6)} <a href="https://www.google.com/maps?q=${report.latitude},${report.longitude}" target="_blank" class="map-link" title="View on Google Maps">(View Map)</a>`;
        } else { locationHTML += `Coordinates: Not provided`; }

        reportDetailContent.innerHTML = `
            <h3>${escapeHtml(report.title)}</h3>
            <div class="detail-meta">
                <span>ID: ${report.id}</span> |
                <span>Status: <span class="status ${safeStatus.toLowerCase()}">${safeStatus}</span></span> |
                <span>Priority: <span class="priority-${safePriority.toLowerCase()}">${safePriority}</span></span> |
                <span>Submitted: ${new Date(report.submittedAt).toLocaleString()}</span>
            </div>
            <div class="detail-section"> <h4>Category:</h4> <p>${escapeHtml(report.category_path)}</p> </div>
            <div class="detail-section"> <h4>Description:</h4> <p>${escapeHtml(report.description).replace(/\n/g, '<br>') || '<i>No description provided.</i>'}</p> </div>
            <div class="detail-section"> <h4>Location:</h4> <p>${locationHTML}</p> </div>
            <div class="detail-section"> <h4>Attachments:</h4> <div>${filesHTML}</div> </div>
             <div class="detail-actions"> <button class="btn-secondary disabled" title="Feature not implemented">Update Status</button> <button class="btn-danger disabled" title="Feature not implemented">Delete Report</button> </div>
        `;
    }

    function renderProgressView() {
        if (!progressViewContent) return;
        progressViewContent.innerHTML = '';

        recalculateStats(); // Ensure stats are up-to-date
        const pending = dashboardStats.pendingRequests;
        const completed = dashboardStats.tasksCompleted;
        const reviewCount = userReports.filter(r => r.status === 'In Review').length;
        const total = pending + completed + reviewCount;

        // Chart
        const chartContainer = document.createElement('div');
        chartContainer.className = 'widget chart-widget';
        chartContainer.innerHTML = `<h3>Report Status Overview</h3><div class="chart-placeholder"><canvas id="progressPieChart"></canvas></div>`;
        progressViewContent.appendChild(chartContainer);
        const progressCtx = document.getElementById('progressPieChart');
        if (progressCtx && typeof Chart !== 'undefined') {
            if (total > 0) {
                try { new Chart(progressCtx, { type: 'doughnut', data: { labels: ['Pending', 'In Review', 'Completed'], datasets: [{ label: 'Report Status', data: [pending, reviewCount, completed], backgroundColor: ['rgba(255, 193, 7, 0.7)', 'rgba(13, 110, 253, 0.7)', 'rgba(25, 135, 84, 0.7)'], borderColor: ['#ffc107', '#0d6efd', '#198754'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } }); }
                catch (e) { console.error("Chart error:", e); progressCtx.parentElement.innerHTML = '<p>(Error loading chart)</p>'; }
            } else { progressCtx.parentElement.innerHTML = '<p>(No report data for chart)</p>'; }
        } else if (progressCtx) { progressCtx.parentElement.innerHTML = '<p>(Chart library not loaded)</p>'; }

        // Timeline
        const timelineContainer = document.createElement('div');
        timelineContainer.className = 'widget';
        timelineContainer.innerHTML = `<h3>Recent Activity Timeline</h3><ul class="progress-timeline">${userReports.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 7).map(r => `<li><span class="status ${r.status.toLowerCase()}">${r.status}</span> ${escapeHtml(r.title)} - ${new Date(r.submittedAt).toLocaleDateString()}</li>`).join('') || '<li>No recent activity.</li>'}</ul>`;
        progressViewContent.appendChild(timelineContainer);
    }

    function displaySettingsInfo() {
        if (settingsUsername) settingsUsername.textContent = localStorage.getItem(LS_USERNAME_KEY) || 'Citizen User';
        // if (settingsEmail) settingsEmail.textContent = 'email_requires_backend@mail.com';
    }

    function escapeHtml(unsafe) { if (typeof unsafe !== 'string') return unsafe; const div = document.createElement('div'); div.textContent = unsafe; return div.innerHTML; }

    function suggestTitle() { /* ... unchanged ... */ }


    // ===========================
    // === MAIN EVENT LISTENERS ===
    // ===========================

    // Sidebar Links (Event Delegation on nav for potential future dynamic links)
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link');
            if (link) {
                e.preventDefault();
                const targetId = link.dataset.target;
                if (targetId && !link.classList.contains('active')) {
                    sidebarLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    showView(targetId);
                }
            }
        });
    }

    // Report Issue Button
    if (reportIssueBtn) { reportIssueBtn.addEventListener('click', () => { /* ... unchanged loader/view switch/step logic ... */ showLoader("Loading Report Form..."); setTimeout(() => { hideLoader(); sidebarLinks.forEach(l => l.classList.remove('active')); showView('view-report-issue', true); goToReportStep(1); }, 800); }); }
    else { console.error("Report Issue Button not found!"); }

    // Back to Dashboard Button
    if (backToDashBtn) { backToDashBtn.addEventListener('click', () => { const link = document.querySelector('.nav-link[data-target="view-dashboard"]'); if (link) { sidebarLinks.forEach(l => l.classList.remove('active')); link.classList.add('active'); } showView('view-dashboard'); }); }
    else { console.error("Back to Dashboard Button not found!"); }

    // Step Back Buttons (delegated)
    if (reportStepsContainer) { reportStepsContainer.addEventListener('click', (e) => { const backBtn = e.target.closest('.step-back-btn'); if (backBtn) { const targetStep = parseInt(backBtn.dataset.targetStep, 10); if (currentCategoryLevel > 1) { selectedCategories.pop(); currentCategoryLevel--; } goToReportStep(targetStep); } }); }


    // Category Selection (delegated)
    function handleCategoryClick(event) {
        const card = event.target.closest('.category-card');
        if (!card || !reportStepsContainer) return; // Need steps container to find level grids

        const categoryName = card.dataset.category;
        const data = card.dataset;
        const currentGrid = card.closest('.category-grid');
        let nextLevel = 0;
        let nextLevelData = null;
        let nextLevelContainer = null;
        let nextLevelClass = '';
        let subCategoryData = null; // Hold L2 data when parsing L1
        let subSubCategoryData = null; // Hold L3 data when parsing L2


        // Determine current level and find next level data/container
        if (currentGrid.classList.contains('main-categories')) {
            currentCategoryLevel = 1;
            selectedCategories = [categoryName]; // Reset path
            try { subCategoryData = data.subcategories ? JSON.parse(data.subcategories) : {}; } catch (e) { console.error("Bad L1 JSON"); return; }
            if (Object.keys(subCategoryData).length > 0) {
                nextLevel = 2;
                nextLevelData = subCategoryData;
                nextLevelContainer = subCategoriesContainerLevel2;
                nextLevelClass = 'sub-card';
            }
        } else if (currentGrid.classList.contains('level-2')) {
            currentCategoryLevel = 2;
            selectedCategories[1] = categoryName; // Add L2 choice
            selectedCategories = selectedCategories.slice(0, 2); // Ensure path length is correct
            try { subSubCategoryData = data.subsubcategories ? JSON.parse(data.subsubcategories) : null; } catch (e) { console.error("Bad L2 JSON"); return; }
            // Check if subSubCategoryData is an array (final leaf nodes) or object (more levels)
            if (subSubCategoryData && (Array.isArray(subSubCategoryData) || typeof subSubCategoryData === 'object') && Object.keys(subSubCategoryData).length > 0) {
                nextLevel = 3;
                nextLevelData = subSubCategoryData; // Could be array or object
                nextLevelContainer = subCategoriesContainerLevel3;
                nextLevelClass = 'subsub-card';
            }
        } else if (currentGrid.classList.contains('level-3')) {
            currentCategoryLevel = 3;
            selectedCategories[2] = categoryName; // Add L3 choice
            selectedCategories = selectedCategories.slice(0, 3); // Ensure path length
            nextLevel = 0; // No level after 3
        }

        console.log(`Level ${currentCategoryLevel} Click:`, categoryName, "| Next Level Data:", nextLevelData);

        // --- Logic to show next level or move to step 2 ---
        if (nextLevel > 0 && nextLevelContainer && nextLevelData && Object.keys(nextLevelData).length > 0) {
            // Hide current grid
            if (currentGrid) {
                currentGrid.classList.remove('active-category-level');
                // Use timeout for smoother visual hide if needed:
                // setTimeout(() => { currentGrid.style.display = 'none'; }, 200);
                currentGrid.style.display = 'none';
            }
            // Hide deeper levels if they were somehow visible
            if (nextLevel === 2 && subCategoriesContainerLevel3) subCategoriesContainerLevel3.style.display = 'none';

            // Populate next level grid
            nextLevelContainer.innerHTML = ''; // Clear previous
            const dataToIterate = Array.isArray(nextLevelData) ? nextLevelData : Object.keys(nextLevelData);

            dataToIterate.forEach(itemName => {
                const nextCard = document.createElement('button');
                nextCard.className = `category-card ${nextLevelClass}`;
                nextCard.dataset.category = itemName;
                nextCard.style.setProperty('--card-color', card.style.getPropertyValue('--card-color') || 'var(--primary-color)');

                let furtherSubData = null;
                if (!Array.isArray(nextLevelData)) { // If it was an object, get the value for the key
                    furtherSubData = nextLevelData[itemName];
                }

                // Check if the *next* item has sub-items (for level 3 data)
                // Logic simplified: Assume only Level 1 -> Level 2 object -> Level 3 Array/empty
                const hasLevel3Items = typeof furtherSubData === 'object' && furtherSubData !== null && furtherSubData.length > 0 && nextLevel === 2 && Array.isArray(furtherSubData);

                if (hasLevel3Items) { // Store L3 items as data for next click (level 2 -> 3)
                    nextCard.dataset.subsubcategories = JSON.stringify(furtherSubData);
                    nextCard.innerHTML = `<i class='bx bx-right-arrow-alt'></i><span>${itemName}</span>`;
                } else { // Leaf node
                    nextCard.innerHTML = `<i class='bx bx-radio-circle-marked'></i><span>${itemName}</span>`;
                }

                nextCard.addEventListener('click', handleCategoryClick);
                nextLevelContainer.appendChild(nextCard);
            });

            nextLevelContainer.style.display = 'grid'; // Show next grid
            nextLevelContainer.classList.add('active-category-level');
            currentCategoryLevel++; // Move to next level

            if (reportStepTitle) reportStepTitle.textContent += ` > ${categoryName}`;

        } else { // Final selection made
            console.log("Final Category Path:", selectedCategories.join(' > '));
            if (selectedCategoryDisplay) selectedCategoryDisplay.textContent = selectedCategories.join(' > ');
            suggestTitle();
            goToReportStep(2);
        }
    }
    if (mainCategoriesContainer) { mainCategoriesContainer.addEventListener('click', handleCategoryClick); }


    // --- Fix File Input Click Trigger ---
    if (fileInputLabel && fileInput) {
        fileInputLabel.addEventListener('click', (e) => {
            console.log("File label clicked, triggering input");
            fileInput.value = null; // Reset input to allow selecting the same file again
            fileInput.click();
        });
    } else { console.error("File input or label missing"); }
    // --- File Input Change Listener (remains the same) ---
    if (fileInput && filePreviewList) {
        fileInput.addEventListener('change', () => {
            if (!filePreviewList) return;
            filePreviewList.innerHTML = '';
            if (fileInput.files.length > 0) {
                const files = Array.from(fileInput.files);
                // filePreviewList.textContent = `${files.length} file(s) selected:`; // Optional header text
                const list = document.createElement('ul');
                files.forEach(file => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)`;
                    list.appendChild(listItem);
                });
                filePreviewList.appendChild(list);
            } else {
                filePreviewList.textContent = 'No files selected.';
            }
        });
    }

    // --- Get Location Button ---
    if (getLocationBtn && locationStatus) {
        getLocationBtn.addEventListener('click', () => {
            if (!navigator.geolocation) { locationStatus.textContent = 'Geolocation not supported.'; locationStatus.className = 'location-feedback error'; return; }
            locationStatus.textContent = 'Getting location...'; locationStatus.className = 'location-feedback loading';
            getLocationBtn.disabled = true;
            console.log("Requesting geolocation...");
            navigator.geolocation.getCurrentPosition(pos => {
                const { latitude: lat, longitude: lon } = pos.coords; console.log(`Location found: Lat=${lat}, Lon=${lon}`);
                if (latDisplay) latDisplay.textContent = lat.toFixed(6); if (lonDisplay) lonDisplay.textContent = lon.toFixed(6);
                if (latInput) latInput.value = lat; if (lonInput) lonInput.value = lon;
                locationStatus.textContent = 'Location acquired!'; locationStatus.className = 'location-feedback success';
                getLocationBtn.disabled = false;
            }, err => {
                console.error("Geolocation Error:", err); let message = 'Could not get location.';
                switch (err.code) { case 1: message = "Permission denied."; break; case 2: message = "Position unavailable."; break; case 3: message = "Request timed out."; break; }
                locationStatus.textContent = message; locationStatus.className = 'location-feedback error';
                getLocationBtn.disabled = false;
                if (latDisplay) latDisplay.textContent = '-'; if (lonDisplay) lonDisplay.textContent = '-'; if (latInput) latInput.value = ''; if (lonInput) lonInput.value = '';
            }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        });
    } else { console.error("Get Location button or status element not found!"); }

    // Report Details Form Submission
    if (reportDetailsForm) {
        reportDetailsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("Report Form Submit triggered");
            if (reportSubmitFeedback) reportSubmitFeedback.innerHTML = '';
            const submitButton = reportDetailsForm.querySelector('.btn-submit-report');
            if (submitButton) submitButton.disabled = true;

            const formData = new FormData(reportDetailsForm);
            const files = fileInput ? Array.from(fileInput.files).map(file => ({ name: file.name, size: file.size, type: file.type })) : [];
            const newReport = { id: generateReportId(), category_path: selectedCategories.join(' > '), title: formData.get('issue-title')?.trim() ?? '', description: formData.get('issue-description')?.trim() ?? '', files: files, latitude: formData.get('latitude') || null, longitude: formData.get('longitude') || null, address: formData.get('address')?.trim() ?? '', priority: formData.get('issue-priority') ?? 'medium', submittedAt: new Date().toISOString(), status: 'Pending' };

            // Validation
            if (!newReport.title || !newReport.description) { if (reportSubmitFeedback) { showMessage('report-submit-feedback', 'Please fill in Title and Description.', false); } if (submitButton) submitButton.disabled = false; return; }
            if (!newReport.latitude && !newReport.address && !newReport.longitude) { if (reportSubmitFeedback) { showMessage('report-submit-feedback', 'Please provide location (GPS or Address).', false); } if (submitButton) submitButton.disabled = false; return; }

            console.log("Saving New Report:", newReport);
            addReport(newReport); // Add to LS & update stats

            if (reportSubmitFeedback) { showMessage('report-submit-feedback', `Report Submitted! (ID: ${newReport.id})`, true); }
            else { alert(`Report submitted (ID: ${newReport.id})!`); }

            // Create and show submission animation
            showSubmissionAnimation(newReport.id);

            reportDetailsForm.reset(); // Reset form
            if (filePreviewList) filePreviewList.textContent = 'No files selected.';
            if (locationStatus) { locationStatus.textContent = ''; locationStatus.className = 'location-feedback'; }
            if (latDisplay) latDisplay.textContent = '-'; if (lonDisplay) lonDisplay.textContent = '-';
            selectedCategories = []; // Reset path

            setTimeout(() => {
                if (reportSubmitFeedback) reportSubmitFeedback.innerHTML = ''; // Clear feedback message
                const dashboardLink = document.querySelector('.nav-link[data-target="view-dashboard"]');
                if (dashboardLink) { sidebarLinks.forEach(l => l.classList.remove('active')); dashboardLink.classList.add('active'); }
                showView('view-dashboard');
                if (submitButton) submitButton.disabled = false; // Re-enable after navigation
            }, 3000); // Increased delay to allow animation to be seen
        });
    } else { console.error("Report Details Form not found!"); }

    // Add this new function to show the submission animation
    function showSubmissionAnimation(reportId) {
        // Create animation container
        const animationContainer = document.createElement('div');
        animationContainer.className = 'submission-animation-container';

        // Create animation content
        animationContainer.innerHTML = `
            <div class="submission-animation">
                <i class='bx bx-check-circle success-icon'></i>
                <h3>Report Submitted Successfully!</h3>
                <p>Your report has been received and will be processed.</p>
                <p>Report ID: <span class="report-id">${reportId}</span></p>
                <p>Thank you for your contribution to our community.</p>
            </div>
        `;

        // Add to body
        document.body.appendChild(animationContainer);

        // Remove after animation completes
        setTimeout(() => {
            animationContainer.style.opacity = '0';
            animationContainer.style.transition = 'opacity 0.5s ease';

            setTimeout(() => {
                document.body.removeChild(animationContainer);
            }, 500);
        }, 2500);
    }

    // Report Row/Card Click Handling (Event Delegation)
    function handleReportClick(event) {
        const reportTrigger = event.target.closest('.report-table-row[data-report-id], .report-card[data-report-id]');
        const reportId = reportTrigger?.dataset.reportId;
        if (reportId) {
            const reportToShow = userReports.find(r => r.id === reportId);
            if (reportToShow) {
                if (!reportDetailView) { alert("Detail view element is missing!"); return; }
                showView('view-report-detail', false, reportToShow);
                sidebarLinks.forEach(l => l.classList.remove('active'));
                document.querySelector('.nav-link[data-target="view-reports"]')?.classList.add('active');
            } else { alert(`Report data for ID ${reportId} not found!`); }
        }
    }
    if (recentReportsTableBody) { recentReportsTableBody.addEventListener('click', handleReportClick); }
    if (reportListContainer) { reportListContainer.addEventListener('click', handleReportClick); }

    // Back to Reports Button
    if (backToReportsBtn) { backToReportsBtn.addEventListener('click', () => { showView('view-reports'); sidebarLinks.forEach(l => l.classList.remove('active')); document.querySelector('.nav-link[data-target="view-reports"]')?.classList.add('active'); }); }
    else { console.error("Back to Reports button not found"); }

    // Clear Local Storage Button
    if (clearDataBtn) { clearDataBtn.addEventListener('click', () => { if (confirm('Clear ALL locally stored reports and stats?')) { localStorage.removeItem(LS_REPORTS_KEY); localStorage.removeItem(LS_STATS_KEY); userReports = []; dashboardStats = loadStats(); alert('Local data cleared.'); updateDashboardDisplay(); renderReportsListView(); renderProgressView(); showView('view-settings'); } }); }
    else { console.error("Clear data button not found"); }

    // Other JS (Username, Logout, Mobile Menu, Chart Init)
    const loggedInUsername = localStorage.getItem(LS_USERNAME_KEY);
    if (usernameDisplay) usernameDisplay.textContent = loggedInUsername || 'User';
    if (logoutButton) { logoutButton.addEventListener('click', () => { localStorage.removeItem(LS_USERNAME_KEY); localStorage.removeItem('loggedInUser'); }); }
    if (mobileMenuBtn && sidebar && body) { mobileMenuBtn.addEventListener('click', () => { const isOpen = body.classList.toggle('sidebar-open'); sidebar.classList.toggle('force-open', isOpen); }); }
    const activityChartCtx = document.getElementById('activityChart');
    if (activityChartCtx && typeof Chart !== 'undefined') { try { new Chart(activityChartCtx, { /* Chart Config */ }); } catch (error) { console.error("Chart error:", error); } }


    // --- Initial State Setup ---
    updateDashboardDisplay();
    showView('view-dashboard');
    document.querySelector('.nav-link[data-target="view-dashboard"]')?.classList.add('active');

}); // End DOMContentLoaded
