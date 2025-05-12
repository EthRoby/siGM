let templates = [];
let templateModal;
let deleteModal;

document.addEventListener('DOMContentLoaded', function() {
    templateModal = new bootstrap.Modal(document.getElementById('templateModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    
    // Initialize event listeners
    document.getElementById('new-template-btn').addEventListener('click', showNewTemplateModal);
    document.getElementById('save-template-btn').addEventListener('click', saveTemplate);
    document.getElementById('confirm-delete-btn').addEventListener('click', deleteTemplate);
    document.getElementById('template-content').addEventListener('input', updateTemplatePreview);
    
    // Load templates
    loadTemplates();
});

// Load templates from API
async function loadTemplates() {
    try {
        const response = await fetch('/api/templates');
        if (!response.ok) {
            throw new Error('Failed to fetch templates');
        }
        
        templates = await response.json();
        renderTemplatesTable();
    } catch (error) {
        console.error('Error loading templates:', error);
        showErrorMessage('Failed to load templates: ' + error.message);
    }
}

// Render templates table
function renderTemplatesTable() {
    const tableBody = document.querySelector('#templatesTable tbody');
    
    if (templates.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    No templates found. Click the "New Template" button to create one.
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = templates.map(template => {
        const previewText = truncateText(template.content, 50);
        const updatedDate = new Date(template.updated_at).toLocaleString();
        const variables = template.variables.length > 0 
            ? template.variables.map(v => `<span class="badge bg-info me-1">${v}</span>`).join(' ')
            : '<span class="text-muted">None</span>';
        
        return `
            <tr>
                <td>${template.name}</td>
                <td>${highlightVariables(previewText)}</td>
                <td>${variables}</td>
                <td>${updatedDate}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-template-btn" data-id="${template.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-template-btn" data-id="${template.id}" data-name="${template.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const templateId = btn.dataset.id;
            editTemplate(templateId);
        });
    });
    
    document.querySelectorAll('.delete-template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const templateId = btn.dataset.id;
            const templateName = btn.dataset.name;
            showDeleteConfirmation(templateId, templateName);
        });
    });
}

// Show modal for creating a new template
function showNewTemplateModal() {
    // Reset form
    document.getElementById('template-id').value = '';
    document.getElementById('template-name').value = '';
    document.getElementById('template-content').value = '';
    document.getElementById('template-preview').innerHTML = 'Your template preview will appear here.';
    document.getElementById('templateModalLabel').textContent = 'New Template';
    
    templateModal.show();
}

// Show modal for editing an existing template
function editTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
        showErrorMessage('Template not found');
        return;
    }
    
    document.getElementById('template-id').value = template.id;
    document.getElementById('template-name').value = template.name;
    document.getElementById('template-content').value = template.content;
    document.getElementById('templateModalLabel').textContent = 'Edit Template';
    
    updateTemplatePreview();
    
    templateModal.show();
}

// Show delete confirmation modal
function showDeleteConfirmation(templateId, templateName) {
    document.getElementById('delete-template-name').textContent = templateName;
    document.getElementById('confirm-delete-btn').dataset.id = templateId;
    
    deleteModal.show();
}

// Extract variables from template content
function extractVariables(content) {
    const regex = /\{([^}]+)\}/g;
    const variables = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
        variables.push(match[1]);
    }
    
    return [...new Set(variables)]; // Remove duplicates
}

// Update template preview
function updateTemplatePreview() {
    const content = document.getElementById('template-content').value;
    const variables = extractVariables(content);
    
    // Update preview
    document.getElementById('template-preview').innerHTML = highlightVariables(content);
    
    // Update variables list
    if (variables.length > 0) {
        document.getElementById('variables-container').innerHTML = variables.map(variable => `
            <div class="badge bg-info p-2 me-2 mb-2">${variable}</div>
        `).join('');
    } else {
        document.getElementById('variables-container').innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No variables detected. Use curly braces to define variables. Example: Hello {name}!
            </div>
        `;
    }
}

// Highlight variables in the text
function highlightVariables(text) {
    return text.replace(/\{([^}]+)\}/g, '<span class="variable-highlight">{$1}</span>');
}

// Save template (create or update)
async function saveTemplate() {
    const templateId = document.getElementById('template-id').value;
    const name = document.getElementById('template-name').value;
    const content = document.getElementById('template-content').value;
    
    if (!name || !content) {
        showErrorMessage('Please fill in all required fields');
        return;
    }
    
    // Extract variables from content
    const variables = extractVariables(content);
    
    const templateData = {
        id: templateId || undefined,
        name,
        content,
        variables
    };
    
    try {
        let response;
        
        if (templateId) {
            // Update existing template
            response = await fetch(`/api/templates/${templateId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(templateData)
            });
        } else {
            // Create new template
            response = await fetch('/api/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(templateData)
            });
        }
        
        if (!response.ok) {
            throw new Error('Failed to save template');
        }
        
        const result = await response.json();
        
        if (result.success) {
            templateModal.hide();
            showSuccessMessage(templateId ? 'Template updated successfully' : 'Template created successfully');
            loadTemplates();
        } else {
            showErrorMessage('Failed to save template');
        }
    } catch (error) {
        console.error('Error saving template:', error);
        showErrorMessage('Failed to save template: ' + error.message);
    }
}

// Delete template
async function deleteTemplate() {
    const templateId = document.getElementById('confirm-delete-btn').dataset.id;
    
    try {
        const response = await fetch(`/api/templates/${templateId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete template');
        }
        
        const result = await response.json();
        
        if (result.success) {
            deleteModal.hide();
            showSuccessMessage('Template deleted successfully');
            loadTemplates();
        } else {
            deleteModal.hide();
            showErrorMessage('Failed to delete template. It may be in use by one or more rules.');
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        deleteModal.hide();
        showErrorMessage('Failed to delete template: ' + error.message);
    }
}

// Show success message
function showSuccessMessage(message) {
    showAlert('success', message);
}

// Show error message
function showErrorMessage(message) {
    showAlert('danger', message);
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}
