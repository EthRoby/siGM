let analyticsData = null;
let commentHistory = [];
let templates = {};
let rules = {};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners
    document.getElementById('status-filter').addEventListener('change', filterHistory);
    
    // Load data
    loadData();
});

// Load all necessary data
async function loadData() {
    try {
        // Load analytics data
        const analyticsResponse = await fetch('/api/analytics');
        if (!analyticsResponse.ok) {
            throw new Error('Failed to fetch analytics data');
        }
        analyticsData = await analyticsResponse.json();
        
        // Load comment history
        const historyResponse = await fetch('/api/history');
        if (!historyResponse.ok) {
            throw new Error('Failed to fetch comment history');
        }
        commentHistory = await historyResponse.json();
        
        // Load templates
        const templatesResponse = await fetch('/api/templates');
        if (!templatesResponse.ok) {
            throw new Error('Failed to fetch templates');
        }
        const templatesArray = await templatesResponse.json();
        templatesArray.forEach(template => {
            templates[template.id] = template;
        });
        
        // Load rules
        const rulesResponse = await fetch('/api/rules');
        if (!rulesResponse.ok) {
            throw new Error('Failed to fetch rules');
        }
        const rulesArray = await rulesResponse.json();
        rulesArray.forEach(rule => {
            rules[rule.id] = rule;
        });
        
        // Initialize charts and render history
        initializeCharts();
        renderCommentHistory();
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorMessage('Failed to load data: ' + error.message);
    }
}

// Initialize charts with analytics data
function initializeCharts() {
    if (!analyticsData) return;
    
    // Activity chart - last 7 days
    const activityCtx = document.getElementById('activityChart').getContext('2d');
    const dailyCounts = analyticsData.daily_counts || [];
    
    // Reverse the data to show chronological order
    const reversedCounts = [...dailyCounts].reverse();
    
    new Chart(activityCtx, {
        type: 'bar',
        data: {
            labels: reversedCounts.map(day => day.date),
            datasets: [
                {
                    label: 'Successful',
                    backgroundColor: 'rgba(40, 167, 69, 0.6)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1,
                    data: reversedCounts.map(day => day.success)
                },
                {
                    label: 'Failed',
                    backgroundColor: 'rgba(220, 53, 69, 0.6)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1,
                    data: reversedCounts.map(day => day.error)
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
    
    // Template usage chart
    const templateCtx = document.getElementById('templateChart').getContext('2d');
    const templateStats = analyticsData.template_stats || [];
    
    // Only show top 5 templates
    const topTemplates = templateStats.slice(0, 5);
    
    new Chart(templateCtx, {
        type: 'doughnut',
        data: {
            labels: topTemplates.map(t => t.name),
            datasets: [{
                data: topTemplates.map(t => t.count),
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Render comment history
function renderCommentHistory() {
    const container = document.getElementById('history-container');
    const statusFilter = document.getElementById('status-filter').value;
    
    // Filter comments based on status if needed
    let filteredHistory = commentHistory;
    if (statusFilter !== 'all') {
        filteredHistory = commentHistory.filter(comment => comment.status === statusFilter);
    }
    
    if (filteredHistory.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <p class="text-muted">No comment history found.</p>
            </div>
        `;
        return;
    }
    
    // Render each comment history item
    container.innerHTML = filteredHistory.map(comment => {
        const template = templates[comment.template_id] || { name: 'Unknown Template' };
        const rule = rules[comment.rule_id] || { name: 'Unknown Rule' };
        const timestamp = new Date(comment.timestamp).toLocaleString();
        
        const statusClass = comment.status === 'success' ? 'success' : 'error';
        const statusBadge = comment.status === 'success' 
            ? '<span class="badge bg-success">Success</span>'
            : `<span class="badge bg-danger">Error</span>`;
        
        return `
            <div class="comment-history-item ${statusClass}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6>${rule.name} ${statusBadge}</h6>
                        <p class="mb-1">${comment.content || 'No content available'}</p>
                        <div class="text-muted small">
                            <span class="me-3">
                                <i class="fas fa-file-alt me-1"></i>${template.name}
                            </span>
                            <span class="me-3">
                                <i class="fas fa-hashtag me-1"></i>${comment.post_id || 'Unknown post'}
                            </span>
                            ${comment.platform ? `
                            <span class="me-3">
                                <i class="fas fa-globe me-1"></i>${comment.platform}
                            </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="text-muted small">${timestamp}</div>
                        ${comment.status === 'error' ? `
                        <div class="text-danger small mt-1">
                            <i class="fas fa-exclamation-circle me-1"></i>${comment.error_message || 'Unknown error'}
                        </div>
                        ` : ''}
                    </div>
                </div>
                ${comment.status === 'success' && comment.engagement ? `
                <div class="mt-2 pt-2 border-top">
                    <div class="text-muted small d-inline-flex align-items-center me-3">
                        <i class="fas fa-thumbs-up me-1"></i> ${comment.engagement.likes || 0} likes
                    </div>
                    <div class="text-muted small d-inline-flex align-items-center">
                        <i class="fas fa-reply me-1"></i> ${comment.engagement.replies || 0} replies
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Filter comment history based on status
function filterHistory() {
    renderCommentHistory();
}

// Show error message
function showErrorMessage(message) {
    showAlert('danger', message);
}
