let settings = {};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners
    document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
    
    // Load settings
    loadSettings();
    
    // Update run times
    updateRunTimes();
    
    // Update run times every minute
    setInterval(updateRunTimes, 60000);
});

// Load settings from API
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
            throw new Error('Failed to fetch settings');
        }
        
        settings = await response.json();
        
        // Update form values
        document.getElementById('bot-enabled').checked = settings.enabled;
        document.getElementById('max-comments').value = settings.max_comments_per_hour;
        document.getElementById('notification-email').value = settings.notification_email || '';
        document.getElementById('error-notification').checked = settings.error_notification;
    } catch (error) {
        console.error('Error loading settings:', error);
        showErrorMessage('Failed to load settings: ' + error.message);
    }
}

// Save settings
async function saveSettings() {
    // Collect form values
    const updatedSettings = {
        enabled: document.getElementById('bot-enabled').checked,
        max_comments_per_hour: parseInt(document.getElementById('max-comments').value, 10),
        notification_email: document.getElementById('notification-email').value,
        error_notification: document.getElementById('error-notification').checked
    };
    
    try {
        const saveButton = document.getElementById('save-settings-btn');
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
        
        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedSettings)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save settings');
        }
        
        const result = await response.json();
        
        if (result.success) {
            settings = updatedSettings;
            showSuccessMessage('Settings saved successfully');
        } else {
            showErrorMessage('Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showErrorMessage('Failed to save settings: ' + error.message);
    } finally {
        const saveButton = document.getElementById('save-settings-btn');
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Save Settings';
    }
}

// Update last run and next run times
function updateRunTimes() {
    // For demo purposes, we'll simulate the last run and next run times
    // In a real application, this would be fetched from the server
    
    const now = new Date();
    
    // Simulate last run time (between 0 and 5 minutes ago)
    const lastRunMinutesAgo = now.getMinutes() % 5;
    const lastRun = new Date(now.getTime() - lastRunMinutesAgo * 60000);
    
    // Next run will be in (5 - lastRunMinutesAgo) minutes
    const nextRunMinutesFromNow = 5 - lastRunMinutesAgo;
    const nextRun = new Date(now.getTime() + nextRunMinutesFromNow * 60000);
    
    document.getElementById('last-run-time').textContent = formatDateTime(lastRun);
    document.getElementById('next-run-time').textContent = formatDateTime(nextRun);
}

// Format date and time
function formatDateTime(date) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    };
    return date.toLocaleString(undefined, options);
}

// Show success message
function showSuccessMessage(message) {
    showAlert('success', message);
}

// Show error message
function showErrorMessage(message) {
    showAlert('danger', message);
}
